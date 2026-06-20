from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest


def detect_anomalies(entries: list[dict], contamination: float = 0.05) -> list[dict]:
    df = pd.DataFrame(entries)
    df = df[df["type"] == "expense"].copy()

    if len(df) < 10:
        return []

    df["date_parsed"] = pd.to_datetime(df["date"])
    df["amount_log"] = np.log1p(df["amount"].astype(float))
    df["category_code"] = pd.Categorical(df["category"]).codes
    df["day_of_month"] = df["date_parsed"].dt.day

    features = df[["amount_log", "category_code", "day_of_month"]].values
    n_contamination = max(1, int(len(df) * contamination))
    actual_contamination = n_contamination / len(df)

    clf = IsolationForest(contamination=actual_contamination, random_state=42, n_estimators=100)
    labels = clf.fit_predict(features)
    raw_scores = clf.score_samples(features)

    min_s, max_s = raw_scores.min(), raw_scores.max()
    if max_s > min_s:
        normalized = (raw_scores - max_s) / (min_s - max_s)
    else:
        normalized = np.zeros_like(raw_scores)

    df["is_anomaly"] = labels == -1
    df["anomaly_score"] = normalized

    anomalies = df[df["is_anomaly"]].sort_values("anomaly_score", ascending=False)

    result = []
    for _, row in anomalies.iterrows():
        cat = row["category"]
        amount = float(row["amount"])
        cat_mean = float(df[df["category"] == cat]["amount"].mean())

        if cat_mean > 0 and amount > cat_mean * 2:
            reason = f"Amount is {amount / cat_mean:.1f}x the average for {cat}"
        else:
            reason = f"Unusual spending pattern in {cat}"

        date_val = row["date"]
        date_str = date_val.strftime("%Y-%m-%d") if isinstance(date_val, datetime) else str(date_val)[:10]

        result.append({
            "id": row.get("id", ""),
            "date": date_str,
            "description": str(row.get("description", "")),
            "category": cat,
            "amount": amount,
            "currency": str(row.get("currency", "EUR")),
            "anomalyScore": round(float(row["anomaly_score"]), 4),
            "reason": reason,
        })

    return result
