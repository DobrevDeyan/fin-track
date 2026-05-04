import firebase_admin
from firebase_admin import firestore
from datetime import datetime
import os

if not firebase_admin._apps:
    firebase_admin.initialize_app()

_db = None


def get_db():
    global _db
    if _db is None:
        _db = firestore.client()
    return _db


def _strip_tz(dt: datetime) -> datetime:
    return dt.replace(tzinfo=None) if dt.tzinfo is not None else dt


def _normalize(doc_data: dict, doc_id: str) -> dict:
    doc_data["id"] = doc_id
    for key in ("date", "createdAt", "updatedAt"):
        val = doc_data.get(key)
        if isinstance(val, datetime):
            doc_data[key] = _strip_tz(val)
    return doc_data


def get_entries_by_date_range(uid: str, start: datetime, end: datetime) -> list[dict]:
    db = get_db()
    start = _strip_tz(start)
    end = _strip_tz(end)
    query = (
        db.collection("entries")
        .where("userId", "==", uid)
        .where("date", ">=", start)
        .where("date", "<=", end)
        .order_by("date", direction=firestore.Query.DESCENDING)
    )
    return [_normalize(doc.to_dict(), doc.id) for doc in query.stream()]


def get_financial_summary(uid: str) -> dict | None:
    db = get_db()
    doc = db.collection("financialSummaries").document(uid).get()
    return doc.to_dict() if doc.exists else None


def get_user_document(uid: str) -> dict | None:
    db = get_db()
    doc = db.collection("users").document(uid).get()
    return doc.to_dict() if doc.exists else None


def get_budgets(uid: str) -> list[dict]:
    db = get_db()
    query = (
        db.collection("budgets")
        .where("userId", "==", uid)
        .where("isActive", "==", True)
    )
    return [{"id": d.id, **d.to_dict()} for d in query.stream()]


def get_goals(uid: str) -> list[dict]:
    db = get_db()
    query = (
        db.collection("goals")
        .where("userId", "==", uid)
        .where("isActive", "==", True)
    )
    return [{"id": d.id, **d.to_dict()} for d in query.stream()]


def get_household_entries(household_id: str, start: datetime, end: datetime) -> list[dict]:
    db = get_db()
    household_doc = db.collection("households").document(household_id).get()
    if not household_doc.exists:
        return []
    member_uids: list[str] = household_doc.to_dict().get("memberUids", [])
    all_entries = []
    for uid in member_uids:
        entries = get_entries_by_date_range(uid, start, end)
        for entry in entries:
            entry["memberUid"] = uid
        all_entries.extend(entries)
    return all_entries
