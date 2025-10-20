from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PeriodType(str, Enum):
    MONTHLY = "monthly"
    WEEKLY = "weekly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class BudgetBase(BaseModel):
    name: str
    description: Optional[str] = None
    amount: float
    period_type: PeriodType
    start_date: datetime
    end_date: Optional[datetime] = None


class BudgetCreate(BudgetBase):
    category_id: Optional[int] = None
    alert_threshold: float = 0.8
    is_recurring: bool = False


class BudgetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    period_type: Optional[PeriodType] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    category_id: Optional[int] = None
    alert_threshold: Optional[float] = None
    is_recurring: Optional[bool] = None
    is_active: Optional[bool] = None


class BudgetResponse(BudgetBase):
    id: int
    user_id: int
    category_id: Optional[int] = None
    spent_amount: float
    is_active: bool
    alert_threshold: float
    is_recurring: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BudgetListResponse(BaseModel):
    budgets: List[BudgetResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
