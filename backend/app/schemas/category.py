from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class CategoryType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    category_type: CategoryType
    parent_id: Optional[int] = None


class CategoryCreate(CategoryBase):
    budget_limit: Optional[float] = None
    budget_period: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    category_type: Optional[CategoryType] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None
    budget_limit: Optional[float] = None
    budget_period: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: int
    user_id: int
    is_default: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    budget_limit: Optional[float] = None
    budget_period: Optional[str] = None

    class Config:
        from_attributes = True


class CategoryListResponse(BaseModel):
    categories: List[CategoryResponse]
    total: int
