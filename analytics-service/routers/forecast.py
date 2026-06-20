from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import pandas as pd

from services.auth import verify_token
from services.firestore import get_entries_by_date_range, get_goals
from services.forecasting import forecast_cashflow, forecast_savings_goal

router = APIRouter(tags=["forecast"])


class CashflowRequest(BaseModel):
    days: Optional[int] = 90
    lookback_months: Optional[int] = 6


class SavingsRequest(BaseModel):
    goal_id: str


@router.post("/cashflow")
def cashflow_forecast(req: CashflowRequest, uid: str = Depends(verify_token)):
    lookback = min(max(req.lookback_months or 6, 2), 24)
    start = datetime.now() - timedelta(days=lookback * 30)
    entries = get_entries_by_date_range(uid, start, datetime.now())

    if not entries:
        raise HTTPException(422, "No transaction data found for forecasting")

    forecast_data = forecast_cashflow(entries, days=min(req.days or 90, 365))

    if not forecast_data:
        raise HTTPException(422, "Minimum 2 months of data required for forecasting")

    return {
        "forecast": forecast_data,
        "model": "linear_trend_with_ema",
        "confidence": 0.95,
    }


@router.post("/budget")
def budget_forecast(uid: str = Depends(verify_token)):
    now = datetime.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    entries = get_entries_by_date_range(uid, month_start, now)

    if not entries:
        return {
            "projectedExpenses": 0.0,
            "spentSoFar": 0.0,
            "daysElapsed": now.day,
            "daysInMonth": _days_in_month(now.year, now.month),
            "dailyRate": 0.0,
        }

    df = pd.DataFrame(entries)
    spent = float(df[df["type"] == "expense"]["amount"].sum())
    days_elapsed = now.day
    days_in_month = _days_in_month(now.year, now.month)
    daily_rate = spent / days_elapsed if days_elapsed > 0 else 0.0

    return {
        "projectedExpenses": round(daily_rate * days_in_month, 2),
        "spentSoFar": round(spent, 2),
        "daysElapsed": days_elapsed,
        "daysInMonth": days_in_month,
        "dailyRate": round(daily_rate, 2),
    }


@router.post("/savings")
def savings_forecast(req: SavingsRequest, uid: str = Depends(verify_token)):
    goals = get_goals(uid)
    goal = next((g for g in goals if g["id"] == req.goal_id), None)

    if not goal:
        raise HTTPException(404, "Goal not found")

    start = datetime.now() - timedelta(days=90)
    entries = get_entries_by_date_range(uid, start, datetime.now())

    if entries:
        df = pd.DataFrame(entries)
        monthly_income = float(df[df["type"] == "income"]["amount"].sum()) / 3
        monthly_expenses = float(df[df["type"] == "expense"]["amount"].sum()) / 3
        monthly_savings = monthly_income - monthly_expenses
    else:
        monthly_savings = 0.0

    current = float(goal.get("currentAmount", 0))
    target = float(goal.get("targetAmount", 0))
    completion = forecast_savings_goal(current, target, monthly_savings)

    return {
        "goalId": req.goal_id,
        "goalName": goal.get("name", ""),
        "currentAmount": round(current, 2),
        "targetAmount": round(target, 2),
        "remainingAmount": round(target - current, 2),
        "avgMonthlyContribution": round(monthly_savings, 2),
        "estimatedCompletionDate": completion,
        "progressPct": round(current / target * 100, 1) if target > 0 else 0.0,
    }


def _days_in_month(year: int, month: int) -> int:
    import calendar
    return calendar.monthrange(year, month)[1]
