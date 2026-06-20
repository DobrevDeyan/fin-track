from pydantic import BaseModel
from typing import Optional


class CategoryBreakdown(BaseModel):
    category: str
    amount: float
    pct: float
    count: int


class SummaryResponse(BaseModel):
    totalIncome: float
    totalExpenses: float
    netSavings: float
    savingsRate: float
    topCategories: list[CategoryBreakdown]
    entryCount: int


class MonthlyDataPoint(BaseModel):
    month: str
    income: float
    expenses: float
    netSavings: float


class MonthlyResponse(BaseModel):
    months: list[MonthlyDataPoint]


class CategoryTrend(BaseModel):
    category: str
    amounts: list[float]
    months: list[str]
    trend: float


class CategoriesResponse(BaseModel):
    categories: list[CategoryBreakdown]
    trends: list[CategoryTrend]


class ForecastDataPoint(BaseModel):
    date: str
    predicted: float
    lower: float
    upper: float


class ForecastResponse(BaseModel):
    forecast: list[ForecastDataPoint]
    model: str
    confidence: float


class AnomalyEntry(BaseModel):
    id: str
    date: str
    description: str
    category: str
    amount: float
    currency: str
    anomalyScore: float
    reason: str


class AnomalyResponse(BaseModel):
    anomalies: list[AnomalyEntry]
    scannedCount: int


class HouseholdMemberSpend(BaseModel):
    uid: str
    totalExpenses: float
    totalIncome: float
    topCategories: list[CategoryBreakdown]
    pctOfHouseholdExpenses: float


class HouseholdResponse(BaseModel):
    members: list[HouseholdMemberSpend]
    totalHouseholdExpenses: float
    totalHouseholdIncome: float
