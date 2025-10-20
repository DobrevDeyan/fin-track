from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings
from app.database import engine
from app.models import Base

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="FinTrack API",
    description="Personal Finance Management API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "FinTrack API is running"}

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to FinTrack API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# Include routers
from app.routers import auth
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])

# Additional routers will be added in next phases
# from app.routers import users, transactions, categories, budgets, analytics
# app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
# app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["transactions"])
# app.include_router(categories.router, prefix="/api/v1/categories", tags=["categories"])
# app.include_router(budgets.router, prefix="/api/v1/budgets", tags=["budgets"])
# app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
