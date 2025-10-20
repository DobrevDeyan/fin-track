from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Category details
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)  # Icon name or emoji
    color = Column(String(7), nullable=True)  # Hex color code
    
    # Category type and hierarchy
    category_type = Column(String(20), nullable=False)  # income, expense, transfer
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    is_default = Column(Boolean, default=False)  # System default categories
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Budget settings
    budget_limit = Column(Float, nullable=True)
    budget_period = Column(String(20), nullable=True)  # monthly, weekly, yearly
    
    # Relationships
    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")
    parent = relationship("Category", remote_side=[id], backref="children")
