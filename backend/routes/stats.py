"""
Statistics Routes
"""
from fastapi import APIRouter, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta
from dependencies import get_current_user
from database import db
from models.user import User

router = APIRouter()

@router.get("/stats/dashboard")
async def get_dashboard_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get dashboard statistics"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    month_start = today.replace(day=1)
    
    query_base = {}
    if location:
        query_base["location"] = location
    
    if user.role == "dolgozo":
        worker = await db.workers.find_one({"user_id": user.user_id}, {"_id": 0})
        if worker:
            query_base["worker_id"] = worker["worker_id"]
    
    today_query = {
        **query_base,
        "status": "kesz",
        "date": {"$gte": today.isoformat(), "$lt": tomorrow.isoformat()}
    }
    today_jobs = await db.jobs.find(today_query, {"_id": 0}).to_list(1000)
    today_cars = len(today_jobs)
    today_revenue = sum(j["price"] for j in today_jobs)
    today_cash = sum(j["price"] for j in today_jobs if j.get("payment_method") == "keszpenz")
    today_card = sum(j["price"] for j in today_jobs if j.get("payment_method") == "kartya")
    
    month_query = {
        **query_base,
        "status": "kesz",
        "date": {"$gte": month_start.isoformat(), "$lt": tomorrow.isoformat()}
    }
    month_jobs = await db.jobs.find(month_query, {"_id": 0}).to_list(1000)
    month_cars = len(month_jobs)
    month_revenue = sum(j["price"] for j in month_jobs)
    month_cash = sum(j["price"] for j in month_jobs if j.get("payment_method") == "keszpenz")
    month_card = sum(j["price"] for j in month_jobs if j.get("payment_method") == "kartya")
    
    return {
        "today_cars": today_cars,
        "today_revenue": today_revenue,
        "today_cash": today_cash,
        "today_card": today_card,
        "month_cars": month_cars,
        "month_revenue": month_revenue,
        "month_cash": month_cash,
        "month_card": month_card
    }

@router.get("/stats/daily")
async def get_daily_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get daily statistics for current month"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)
    
    query = {"status": "kesz", "date": {"$gte": month_start.isoformat()}}
    if location:
        query["location"] = location
    
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(1000)
    
    daily_stats = {}
    for job in jobs:
        date_str = job["date"][:10]
        if date_str not in daily_stats:
            daily_stats[date_str] = {"date": date_str, "count": 0, "revenue": 0}
        daily_stats[date_str]["count"] += 1
        daily_stats[date_str]["revenue"] += job["price"]
    
    return list(daily_stats.values())

@router.get("/stats/monthly")
async def get_monthly_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get monthly statistics"""
    query = {"status": "kesz"}
    if location:
        query["location"] = location
    
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(10000)
    
    monthly_stats = {}
    for job in jobs:
        month_str = job["date"][:7]
        if month_str not in monthly_stats:
            monthly_stats[month_str] = {"month": month_str, "count": 0, "revenue": 0}
        monthly_stats[month_str]["count"] += 1
        monthly_stats[month_str]["revenue"] += job["price"]
    
    return sorted(monthly_stats.values(), key=lambda x: x["month"])

@router.get("/stats/workers")
async def get_worker_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get worker statistics"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)
    
    query = {"status": "kesz", "date": {"$gte": month_start.isoformat()}}
    if location:
        query["location"] = location
    
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(1000)
    
    worker_stats = {}
    for job in jobs:
        worker_id = job.get("worker_id")
        if not worker_id:
            continue
        if worker_id not in worker_stats:
            worker_stats[worker_id] = {
                "worker_id": worker_id,
                "worker_name": job.get("worker_name", "Ismeretlen"),
                "count": 0,
                "revenue": 0
            }
        worker_stats[worker_id]["count"] += 1
        worker_stats[worker_id]["revenue"] += job["price"]
    
    return list(worker_stats.values())

@router.get("/stats/services")
async def get_service_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get service statistics"""
    query = {"status": "kesz"}
    if location:
        query["location"] = location
    
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(10000)
    
    service_stats = {}
    for job in jobs:
        service_id = job.get("service_id")
        if not service_id:
            continue
        if service_id not in service_stats:
            service_stats[service_id] = {
                "service_id": service_id,
                "service_name": job.get("service_name", "Ismeretlen"),
                "count": 0,
                "revenue": 0
            }
        service_stats[service_id]["count"] += 1
        service_stats[service_id]["revenue"] += job["price"]
    
    return sorted(service_stats.values(), key=lambda x: x["count"], reverse=True)

@router.get("/stats/locations")
async def get_location_stats(user: User = Depends(get_current_user)):
    """Get location statistics"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)
    
    query = {"status": "kesz", "date": {"$gte": month_start.isoformat()}}
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(1000)
    
    location_stats = {}
    for job in jobs:
        loc = job.get("location")
        if not loc or loc != "Debrecen":  # Only Debrecen
            continue
        if loc not in location_stats:
            location_stats[loc] = {"location": loc, "count": 0, "revenue": 0}
        location_stats[loc]["count"] += 1
        location_stats[loc]["revenue"] += job["price"]
    
    return list(location_stats.values())

@router.get("/stats/advanced")
async def get_advanced_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get advanced analytics"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)
    
    if month_start.month == 1:
        prev_month_start = month_start.replace(year=month_start.year - 1, month=12)
    else:
        prev_month_start = month_start.replace(month=month_start.month - 1)
    prev_month_end = month_start
    
    query_base = {"status": "kesz"}
    if location:
        query_base["location"] = location
    
    current_month_query = {**query_base, "date": {"$gte": month_start.isoformat()}}
    current_jobs = await db.jobs.find(current_month_query, {"_id": 0}).to_list(10000)
    
    prev_month_query = {**query_base, "date": {"$gte": prev_month_start.isoformat(), "$lt": prev_month_end.isoformat()}}
    prev_jobs = await db.jobs.find(prev_month_query, {"_id": 0}).to_list(10000)
    
    all_jobs = await db.jobs.find(query_base, {"_id": 0}).to_list(50000)
    
    current_cars = len(current_jobs)
    current_revenue = sum(j["price"] for j in current_jobs)
    prev_cars = len(prev_jobs)
    prev_revenue = sum(j["price"] for j in prev_jobs)
    
    avg_revenue_per_car = current_revenue / current_cars if current_cars > 0 else 0
    
    customer_job_counts = {}
    for job in all_jobs:
        cid = job.get("customer_id")
        if cid:
            customer_job_counts[cid] = customer_job_counts.get(cid, 0) + 1
    returning_customers = sum(1 for count in customer_job_counts.values() if count > 1)
    
    customer_spending = {}
    for job in all_jobs:
        cid = job.get("customer_id")
        cname = job.get("customer_name", "Ismeretlen")
        if cid:
            if cid not in customer_spending:
                customer_spending[cid] = {"customer_id": cid, "name": cname, "total": 0, "jobs": 0}
            customer_spending[cid]["total"] += job["price"]
            customer_spending[cid]["jobs"] += 1
    
    top_customers = sorted(customer_spending.values(), key=lambda x: x["total"], reverse=True)[:10]
    
    employee_revenue = {}
    for job in current_jobs:
        wid = job.get("worker_id")
        wname = job.get("worker_name", "Ismeretlen")
        if wid:
            if wid not in employee_revenue:
                employee_revenue[wid] = {"worker_id": wid, "name": wname, "revenue": 0, "cars": 0}
            employee_revenue[wid]["revenue"] += job["price"]
            employee_revenue[wid]["cars"] += 1
    
    location_revenue = {}
    for job in current_jobs:
        loc = job.get("location")
        if loc and loc == "Debrecen":
            if loc not in location_revenue:
                location_revenue[loc] = {"location": loc, "revenue": 0, "cars": 0}
            location_revenue[loc]["revenue"] += job["price"]
            location_revenue[loc]["cars"] += 1
    
    cars_change = ((current_cars - prev_cars) / prev_cars * 100) if prev_cars > 0 else 0
    revenue_change = ((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    
    day_performance = {i: {"day": i, "revenue": 0, "cars": 0, "count": 0} for i in range(7)}
    day_names = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"]
    
    for job in all_jobs:
        try:
            job_date = datetime.fromisoformat(job["date"].replace("Z", "+00:00"))
            dow = job_date.weekday()
            day_performance[dow]["revenue"] += job["price"]
            day_performance[dow]["cars"] += 1
            day_performance[dow]["count"] += 1
        except:
            pass
    
    for i in range(7):
        d = day_performance[i]
        d["name"] = day_names[i]
        d["avg_revenue"] = round(d["revenue"] / max(d["count"], 1), 0)
        d["avg_cars"] = round(d["cars"] / max(d["count"], 1), 1)
    
    return {
        "avg_revenue_per_car": round(avg_revenue_per_car, 0),
        "returning_customers": returning_customers,
        "total_customers": len(customer_job_counts),
        "top_customers": top_customers,
        "employee_revenue": list(employee_revenue.values()),
        "location_revenue": list(location_revenue.values()),
        "month_comparison": {
            "current_month": {"cars": current_cars, "revenue": current_revenue},
            "previous_month": {"cars": prev_cars, "revenue": prev_revenue},
            "cars_change_percent": round(cars_change, 1),
            "revenue_change_percent": round(revenue_change, 1)
        },
        "day_performance": list(day_performance.values())
    }
