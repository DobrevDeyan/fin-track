import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from datetime import datetime

from main import app
from services.auth import verify_token

MOCK_UID = "test-uid-123"

MOCK_ENTRIES = [
    {
        "id": "1", "userId": MOCK_UID, "type": "expense", "amount": 50.0,
        "currency": "EUR", "description": "Groceries", "category": "Food & Dining",
        "date": datetime(2026, 4, 15),
    },
    {
        "id": "2", "userId": MOCK_UID, "type": "expense", "amount": 30.0,
        "currency": "EUR", "description": "Bus ticket", "category": "Transportation",
        "date": datetime(2026, 4, 10),
    },
    {
        "id": "3", "userId": MOCK_UID, "type": "income", "amount": 3000.0,
        "currency": "EUR", "description": "Salary", "category": "Salary",
        "date": datetime(2026, 4, 1),
    },
]


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[verify_token] = lambda: MOCK_UID
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_summary_no_auth():
    app.dependency_overrides.clear()
    response = client.post("/api/analytics/summary", json={"from": "2026-01-01", "to": "2026-04-30"})
    assert response.status_code in (401, 422)
    app.dependency_overrides[verify_token] = lambda: MOCK_UID


def test_summary_invalid_date():
    response = client.post(
        "/api/analytics/summary",
        json={"from": "not-a-date", "to": "2026-04-30"},
    )
    assert response.status_code == 400


def test_summary_empty_entries():
    with patch("routers.analytics.get_entries_by_date_range", return_value=[]):
        response = client.post(
            "/api/analytics/summary",
            json={"from": "2026-04-01", "to": "2026-04-30"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["totalIncome"] == 0.0
    assert data["totalExpenses"] == 0.0


def test_summary_with_entries():
    with patch("routers.analytics.get_entries_by_date_range", return_value=MOCK_ENTRIES):
        response = client.post(
            "/api/analytics/summary",
            json={"from": "2026-04-01", "to": "2026-04-30"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["totalIncome"] == 3000.0
    assert data["totalExpenses"] == 80.0
    assert data["netSavings"] == 2920.0
    assert data["entryCount"] == 3
    assert len(data["topCategories"]) == 2


def test_categories_with_entries():
    with patch("routers.analytics.get_entries_by_date_range", return_value=MOCK_ENTRIES):
        response = client.post(
            "/api/analytics/categories",
            json={"from": "2026-04-01", "to": "2026-04-30"},
        )
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert "trends" in data


def test_monthly_no_summary():
    with patch("routers.analytics.get_financial_summary", return_value=None):
        response = client.post("/api/analytics/monthly")
    assert response.status_code == 200
    assert response.json()["months"] == []


def test_monthly_with_summary():
    mock_summary = {
        "userId": MOCK_UID,
        "months": {
            "2026-03": {"income": 3000.0, "expenses": 1200.0},
            "2026-04": {"income": 3000.0, "expenses": 900.0},
        },
    }
    with patch("routers.analytics.get_financial_summary", return_value=mock_summary):
        response = client.post("/api/analytics/monthly")
    assert response.status_code == 200
    months = response.json()["months"]
    assert len(months) == 2
    assert months[0]["month"] == "2026-03"
    assert months[0]["netSavings"] == 1800.0


def test_household_no_household():
    with patch("routers.analytics.get_user_document", return_value={"uid": MOCK_UID}):
        response = client.post(
            "/api/analytics/household",
            json={"from": "2026-04-01", "to": "2026-04-30"},
        )
    assert response.status_code == 404
