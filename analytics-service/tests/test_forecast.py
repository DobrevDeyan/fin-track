import pytest
from datetime import datetime
from services.forecasting import forecast_cashflow, forecast_savings_goal

MOCK_ENTRIES = []
for i in range(6):
    month = i + 1
    MOCK_ENTRIES.append({
        "type": "income",
        "amount": 3000.0 + i * 50,
        "currency": "EUR",
        "category": "Salary",
        "date": datetime(2026, month, 1),
    })
    MOCK_ENTRIES.append({
        "type": "expense",
        "amount": 1500.0 + i * 20,
        "currency": "EUR",
        "category": "Food & Dining",
        "date": datetime(2026, month, 15),
    })


def test_forecast_cashflow_structure():
    result = forecast_cashflow(MOCK_ENTRIES, days=30)
    assert isinstance(result, list)
    assert len(result) == 30
    first = result[0]
    assert "date" in first
    assert "predicted" in first
    assert "lower" in first
    assert "upper" in first


def test_forecast_cashflow_confidence_interval():
    result = forecast_cashflow(MOCK_ENTRIES, days=10)
    for point in result:
        assert point["lower"] <= point["predicted"]
        assert point["predicted"] <= point["upper"]


def test_forecast_cashflow_empty():
    assert forecast_cashflow([], days=30) == []


def test_forecast_cashflow_single_month():
    entries = [
        {"type": "income", "amount": 3000.0, "currency": "EUR", "category": "Salary", "date": datetime(2026, 1, 1)},
        {"type": "expense", "amount": 1500.0, "currency": "EUR", "category": "Food", "date": datetime(2026, 1, 15)},
    ]
    result = forecast_cashflow(entries, days=30)
    assert result == []


def test_forecast_savings_goal_normal():
    result = forecast_savings_goal(500.0, 1000.0, 200.0)
    assert result is not None
    assert len(result) == 10  # YYYY-MM-DD


def test_forecast_savings_goal_already_reached():
    result = forecast_savings_goal(1000.0, 500.0, 200.0)
    assert result == "Already reached"


def test_forecast_savings_goal_no_contribution():
    result = forecast_savings_goal(500.0, 1000.0, 0.0)
    assert result is None


def test_forecast_savings_goal_negative_contribution():
    result = forecast_savings_goal(500.0, 1000.0, -100.0)
    assert result is None


def test_forecast_cashflow_date_sequence():
    result = forecast_cashflow(MOCK_ENTRIES, days=5)
    dates = [r["date"] for r in result]
    assert dates == sorted(dates)
