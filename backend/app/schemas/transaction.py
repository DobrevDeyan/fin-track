from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"


class TransactionBase(BaseModel):
    amount: float
    description: str
    transaction_type: TransactionType
    date: datetime
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    category_id: Optional[int] = None


class TransactionCreate(TransactionBase):
    is_recurring: bool = False
    recurring_frequency: Optional[str] = None
    recurring_end_date: Optional[datetime] = None
    bank_account: Optional[str] = None


class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    transaction_type: Optional[TransactionType] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    category_id: Optional[int] = None


class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    category_id: Optional[int] = None
    is_recurring: bool
    recurring_frequency: Optional[str] = None
    recurring_end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    external_id: Optional[str] = None
    bank_account: Optional[str] = None

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    transactions: List[TransactionResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
