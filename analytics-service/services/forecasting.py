from datetime import datetime, timedelta
from typing import Optional
import numpy as np
import pandas as pd


def forecast_cashflow(entries: list[dict], days: int = 90) -> list[dict]:
    if not entries:
        return []

    df = pd.DataFrame(entries)
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")

    income = df[df["type"] == "income"].groupby("month")["amount"].sum()
    expenses = df[df["type"] == "expense"].groupby("month")["amount"].sum()
    all_months = income.index.union(expenses.index).sort_values()

    if len(all_months) < 2:
        return []

    net = pd.Series(
        [float(income.get(m, 0)) - float(expenses.get(m, 0)) for m in all_months],
        index=all_months,
    )

    y = net.values.astype(float)
    x = np.arange(len(y))

    slope, intercept = np.polyfit(x, y, 1)

    # Exponential smoothing for last-value correction
    alpha = 0.3
    ema = float(y[0])
    for v in y[1:]:
        ema = alpha * float(v) + (1 - alpha) * ema

    monthly_std = float(np.std(y)) if len(y) > 1 else abs(ema) * 0.2
    daily_std = monthly_std / np.sqrt(30)
    avg_daily = ema / 30
    daily_trend = slope / 30

    last_month_end = all_months[-1].to_timestamp("M")

    result = []
    for i in range(1, days + 1):
        forecast_date = last_month_end + timedelta(days=i)
        predicted = avg_daily + daily_trend * i
        result.append({
            "date": forecast_date.strftime("%Y-%m-%d"),
            "predicted": round(float(predicted), 2),
            "lower": round(float(predicted - 1.96 * daily_std), 2),
            "upper": round(float(predicted + 1.96 * daily_std), 2),
        })

    return result


def forecast_savings_goal(
    current_amount: float,
    target_amount: float,
    monthly_contribution: float,
) -> Optional[str]:
    if monthly_contribution <= 0:
        return None
    remaining = target_amount - current_amount
    if remaining <= 0:
        return "Already reached"
    months_needed = remaining / monthly_contribution
    completion = datetime.now() + timedelta(days=int(months_needed * 30.44))
    return completion.strftime("%Y-%m-%d")
