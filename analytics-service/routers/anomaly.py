from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

from services.auth import verify_token
from services.firestore import get_entries_by_date_range
from services.anomaly_detection import detect_anomalies

router = APIRouter(tags=["anomaly"])


class ScanRequest(BaseModel):
    lookback_days: Optional[int] = 90
    contamination: Optional[float] = 0.05


class CategoryRequest(BaseModel):
    category: str
    lookback_months: Optional[int] = 6


@router.post("/scan")
def scan_anomalies(req: ScanRequest, uid: str = Depends(verify_token)):
    lookback = min(max(req.lookback_days or 90, 7), 365)
    start = datetime.now() - timedelta(days=lookback)
    entries = get_entries_by_date_range(uid, start, datetime.now())

    if not entries:
        return {"anomalies": [], "scannedCount": 0}

    contamination = max(0.01, min(req.contamination or 0.05, 0.5))
    anomalies = detect_anomalies(entries, contamination=contamination)

    return {"anomalies": anomalies, "scannedCount": len(entries)}


@router.post("/category")
def category_anomaly(req: CategoryRequest, uid: str = Depends(verify_token)):
    lookback = min(max(req.lookback_months or 6, 2), 24)
    start = datetime.now() - timedelta(days=lookback * 30)
    entries = get_entries_by_date_range(uid, start, datetime.now())

    if not entries:
        return {"category": req.category, "spikes": [], "monthlyData": []}

    df = pd.DataFrame(entries)
    cat_df = df[(df["type"] == "expense") & (df["category"] == req.category)].copy()

    if cat_df.empty:
        return {"category": req.category, "spikes": [], "monthlyData": [], "message": "No entries for this category"}

    cat_df["month"] = pd.to_datetime(cat_df["date"]).dt.to_period("M").astype(str)
    monthly = cat_df.groupby("month")["amount"].sum().sort_index()

    mean = float(monthly.mean())
    std = float(monthly.std()) if len(monthly) > 1 else 0.0

    spikes = []
    for month, amount in monthly.items():
        z = (float(amount) - mean) / std if std > 0 else 0.0
        if z > 1.5:
            spikes.append({
                "month": month,
                "amount": round(float(amount), 2),
                "average": round(mean, 2),
                "zScore": round(z, 2),
                "percentAboveAverage": round((float(amount) - mean) / mean * 100, 1) if mean > 0 else 0.0,
            })

    return {
        "category": req.category,
        "spikes": sorted(spikes, key=lambda x: x["zScore"], reverse=True),
        "monthlyAverage": round(mean, 2),
        "monthlyData": [{"month": m, "amount": round(float(a), 2)} for m, a in monthly.items()],
    }
