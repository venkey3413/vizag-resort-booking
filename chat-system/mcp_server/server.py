"""
Tool definitions for Vizag Resort Booking (Keey)
"""

import requests
from datetime import datetime

BASE_URL = "http://centralized-db-api:3003"


def safe_get(url):
    try:
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            return res.json()
    except Exception:
        pass
    return None


def parse_date(value: str):
    return datetime.fromisoformat(value.split("T")[0])


def get_refund_policy():
    return (
        "Refund Policy:\n\n"
        "• Free cancellation if cancelled 3+ days before check-in\n"
        "• 75% refund if cancelled between 3 days and 24 hours\n"
        "• No refund within 24 hours of check-in\n"
        "• Refunds processed in 3–5 business days"
    )


def get_checkin_checkout_policy():
    return (
        "Check-in & Check-out Policy:\n\n"
        "• Check-in: 11:00 AM onwards\n"
        "• Check-out: 9:00 AM (strict)\n"
        "• Valid government ID required at check-in"
    )


def get_resort_rules():
    return (
        "Resort Rules:\n\n"
        "• Music allowed until 10:00 PM\n"
        "• Outside food not allowed\n"
        "• Pool timings: 6:00 AM – 8:00 PM\n"
        "• Smoking only in designated areas"
    )


def check_resort_availability(resort_name: str, check_in: str, check_out: str):
    resorts = safe_get(f"{BASE_URL}/api/resorts")
    if not resorts:
        return "⚠️ Unable to fetch resort data. Please try again later."

    resort = next(
        (r for r in resorts if r["name"].lower() == resort_name.lower()),
        None
    )

    if not resort:
        return "❌ Resort not found."

    resort_id = resort["id"]

    blocked = safe_get(f"{BASE_URL}/api/blocked-dates/{resort_id}") or []
    bookings = safe_get(f"{BASE_URL}/api/bookings") or []

    ci = parse_date(check_in)
    co = parse_date(check_out)

    if co <= ci:
        return "❌ Check-out date must be after check-in date."

    for b in blocked:
        d = parse_date(b["date"])
        if ci <= d < co:
            return f"❌ {resort_name} is blocked on selected dates."

    for bk in bookings:
    booking_resort_id = (
        bk.get("resortId")
        or bk.get("resort_id")
        or bk.get("resort")
    )

    if booking_resort_id != resort_id:
        continue

    check_in_val = bk.get("checkIn") or bk.get("check_in")
    check_out_val = bk.get("checkOut") or bk.get("check_out")

    # 🚨 HARD SAFETY CHECKS
    if not check_in_val or not check_out_val:
        continue

    try:
        bci = parse_date(check_in_val)
        bco = parse_date(check_out_val)
    except Exception:
        continue  # skip malformed booking safely

    if ci < bco and co > bci:
        return f"❌ {resort_name} is already booked for the selected dates."

