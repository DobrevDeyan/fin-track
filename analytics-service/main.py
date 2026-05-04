from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routers import analytics, forecast, anomaly, reports, investments

app = FastAPI(title="Pocket Analytics Service", version="1.0.0")

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "https://fin-track-adc2c.web.app,https://fin-track-adc2c.firebaseapp.com,http://localhost:3000,http://localhost:3001",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(analytics.router, prefix="/api/analytics")
app.include_router(forecast.router, prefix="/api/forecast")
app.include_router(anomaly.router, prefix="/api/anomaly")
app.include_router(reports.router, prefix="/api/reports")
app.include_router(investments.router, prefix="/api/investments")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "pocket-analytics"}
