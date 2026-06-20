from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime


class EntryModel(BaseModel):
    id: str
    userId: str
    type: Literal["income", "expense"]
    amount: float
    currency: str
    description: str
    category: str
    date: datetime
    categoryId: Optional[str] = None
    tags: Optional[list[str]] = None
    notes: Optional[str] = None
    recurring: Optional[bool] = None
    recurringId: Optional[str] = None


class DateRangeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: str = Field(alias="from")
    to: str
    currency: Optional[str] = "EUR"
