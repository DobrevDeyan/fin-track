from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
import pandas as pd
import numpy as np

from services.auth import verify_token
from services.firestore import (
    get_entries_by_date_range,
    get_financial_summary,
    get_user_document,
    get_household_entries,
)

router = APIRouter(tags=["analytics"])


class DateRangeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: str = Field(alias="from")
    to: str
    currency: Optional[str] = "EUR"


def _parse_range(req: DateRangeRequest) -> tuple[datetime, datetime]:
    try:
        start = datetime.fromisoformat(req.from_)
        end = datetime.fromisoformat(req.to + "T23:59:59")
        return start, end
    except ValueError:
        raise HTTPException(400, "Invalid date format. Expected YYYY-MM-DD")


def _category_breakdown(df: pd.DataFrame, total: float) -> list[dict]:
    cat_totals = df.groupby("category")["amount"].sum().sort_values(ascending=False)
    result = []
    for cat, amt in cat_totals.items():
        result.append({
            "category": cat,
            "amount": round(float(amt), 2),
            "pct": round(float(amt) / total * 100, 1) if total > 0 else 0.0,
            "count": int((df["category"] == cat).sum()),
        })
    return result


@router.post("/summary")
def get_summary(req: DateRangeRequest, uid: str = Depends(verify_token)):
    start, end = _parse_range(req)
    entries = get_entries_by_date_range(uid, start, end)

    if not entries:
        return {
            "totalIncome": 0.0,
            "totalExpenses": 0.0,
            "netSavings": 0.0,
            "savingsRate": 0.0,
            "topCategories": [],
            "entryCount": 0,
        }

    df = pd.DataFrame(entries)
    total_income = float(df[df["type"] == "income"]["amount"].sum())
    total_expenses = float(df[df["type"] == "expense"]["amount"].sum())
    net_savings = total_income - total_expenses
    savings_rate = (net_savings / total_income * 100) if total_income > 0 else 0.0

    expense_df = df[df["type"] == "expense"]
    top_cats = _category_breakdown(expense_df, total_expenses)[:5]

    return {
        "totalIncome": round(total_income, 2),
        "totalExpenses": round(total_expenses, 2),
        "netSavings": round(net_savings, 2),
        "savingsRate": round(savings_rate, 1),
        "topCategories": top_cats,
        "entryCount": len(entries),
    }


@router.post("/categories")
def get_categories(req: DateRangeRequest, uid: str = Depends(verify_token)):
    start, end = _parse_range(req)
    entries = get_entries_by_date_range(uid, start, end)

    if not entries:
        return {"categories": [], "trends": []}

    df = pd.DataFrame(entries)
    df["date"] = pd.to_datetime(df["date"])
    df["month_str"] = df["date"].dt.to_period("M").astype(str)

    expense_df = df[df["type"] == "expense"].copy()
    total_expenses = float(expense_df["amount"].sum())

    categories = _category_breakdown(expense_df, total_expenses)

    pivot = expense_df.pivot_table(
        index="month_str", columns="category", values="amount", aggfunc="sum", fill_value=0
    )
    months_sorted = sorted(pivot.index.tolist())

    trends = []
    for cat in pivot.columns:
        amounts = [round(float(pivot.loc[m, cat]) if m in pivot.index else 0.0, 2) for m in months_sorted]
        if len(amounts) >= 2:
            slope = float(np.polyfit(np.arange(len(amounts)), amounts, 1)[0])
        else:
            slope = 0.0
        trends.append({
            "category": cat,
            "amounts": amounts,
            "months": months_sorted,
            "trend": round(slope, 2),
        })

    return {"categories": categories, "trends": trends}


@router.post("/monthly")
def get_monthly(uid: str = Depends(verify_token)):
    summary = get_financial_summary(uid)

    if not summary or "months" not in summary:
        return {"months": []}

    result = []
    for month_key in sorted(summary["months"].keys()):
        data = summary["months"][month_key]
        income = float(data.get("income", 0))
        expenses = float(data.get("expenses", 0))
        result.append({
            "month": month_key,
            "income": round(income, 2),
            "expenses": round(expenses, 2),
            "netSavings": round(income - expenses, 2),
        })

    return {"months": result}


@router.post("/household")
def get_household(req: DateRangeRequest, uid: str = Depends(verify_token)):
    start, end = _parse_range(req)

    user = get_user_document(uid)
    if not user or not user.get("householdId"):
        raise HTTPException(404, "User is not part of a household")

    entries = get_household_entries(user["householdId"], start, end)

    if not entries:
        return {"members": [], "totalHouseholdExpenses": 0.0, "totalHouseholdIncome": 0.0}

    df = pd.DataFrame(entries)
    total_expenses = float(df[df["type"] == "expense"]["amount"].sum())
    total_income = float(df[df["type"] == "income"]["amount"].sum())

    members = []
    for member_uid in df["memberUid"].unique():
        mdf = df[df["memberUid"] == member_uid]
        m_expenses = float(mdf[mdf["type"] == "expense"]["amount"].sum())
        m_income = float(mdf[mdf["type"] == "income"]["amount"].sum())
        top_cats = _category_breakdown(mdf[mdf["type"] == "expense"], m_expenses)[:3]
        members.append({
            "uid": member_uid,
            "totalExpenses": round(m_expenses, 2),
            "totalIncome": round(m_income, 2),
            "topCategories": top_cats,
            "pctOfHouseholdExpenses": round(m_expenses / total_expenses * 100, 1) if total_expenses > 0 else 0.0,
        })

    return {
        "members": members,
        "totalHouseholdExpenses": round(total_expenses, 2),
        "totalHouseholdIncome": round(total_income, 2),
    }
