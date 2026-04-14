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
async def get_dashboard_stats(location: Optional[str] = None, date: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get dashboard statistics for a specific date (defaults to today)"""
    
    # Parse the target date
    if date:
        try:
            target_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            target_date = datetime.now(timezone.utc)
    else:
        target_date = datetime.now(timezone.utc)
    
    # Create date strings for matching (handle multiple formats)
    date_str = target_date.strftime("%Y-%m-%d")  # e.g., "2025-03-25"
    month_str = target_date.strftime("%Y-%m")    # e.g., "2025-03"
    
    query_base = {}
    if location:
        query_base["location"] = location
    
    if user.role == "dolgozo":
        worker = await db.workers.find_one({"user_id": user.user_id}, {"_id": 0})
        if worker:
            query_base["worker_id"] = worker["worker_id"]
    
    # Get today's completed jobs using regex to match date prefix
    today_query = {
        **query_base,
        "status": "kesz",
        "date": {"$regex": f"^{date_str}"}
    }
    today_jobs = await db.jobs.find(today_query, {"_id": 0}).to_list(1000)
    today_cars = len(today_jobs)
    today_revenue = sum(j.get("price", 0) for j in today_jobs)
    today_cash = sum(j.get("price", 0) for j in today_jobs if j.get("payment_method") == "keszpenz")
    today_card = sum(j.get("price", 0) for j in today_jobs if j.get("payment_method") == "kartya")
    
    # Get month's completed jobs
    month_query = {
        **query_base,
        "status": "kesz",
        "date": {"$regex": f"^{month_str}"}
    }
    month_jobs = await db.jobs.find(month_query, {"_id": 0}).to_list(10000)
    month_cars = len(month_jobs)
    month_revenue = sum(j.get("price", 0) for j in month_jobs)
    month_cash = sum(j.get("price", 0) for j in month_jobs if j.get("payment_method") == "keszpenz")
    month_card = sum(j.get("price", 0) for j in month_jobs if j.get("payment_method") == "kartya")
    
    return {
        "today_cars": today_cars,
        "today_revenue": today_revenue,
        "today_cash": today_cash,
        "today_card": today_card,
        "cash": today_cash,  # Alias for compatibility
        "month_cars": month_cars,
        "month_revenue": month_revenue,
        "month_cash": month_cash,
        "month_card": month_card,
        # Cancelled/no-show stats
        "today_cancelled": await db.jobs.count_documents({
            **query_base,
            "status": {"$in": ["nem_jott_el", "lemondta"]},
            "date": {"$regex": f"^{date_str}"}
        }),
        "month_cancelled": await db.jobs.count_documents({
            **query_base,
            "status": {"$in": ["nem_jott_el", "lemondta"]},
            "date": {"$regex": f"^{month_str}"}
        })
    }

@router.get("/stats/daily")
async def get_daily_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get daily statistics for current month"""
    today = datetime.now(timezone.utc)
    month_str = today.strftime("%Y-%m")  # e.g., "2025-03"
    
    query = {"status": "kesz", "date": {"$regex": f"^{month_str}"}}
    if location:
        query["location"] = location
    
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(1000)
    
    daily_stats = {}
    for job in jobs:
        date_str = job.get("date", "")[:10]
        if not date_str:
            continue
        if date_str not in daily_stats:
            daily_stats[date_str] = {"date": date_str, "count": 0, "revenue": 0}
        daily_stats[date_str]["count"] += 1
        daily_stats[date_str]["revenue"] += job.get("price", 0)
    
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
    today = datetime.now(timezone.utc)
    month_str = today.strftime("%Y-%m")  # e.g., "2025-03"
    
    query = {"status": "kesz", "date": {"$regex": f"^{month_str}"}}
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
    today = datetime.now(timezone.utc)
    month_str = today.strftime("%Y-%m")
    
    query = {"status": "kesz", "date": {"$regex": f"^{month_str}"}}
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(1000)
    
    location_stats = {}
    for job in jobs:
        loc = job.get("location")
        if not loc or loc != "Debrecen":  # Only Debrecen
            continue
        if loc not in location_stats:
            location_stats[loc] = {"location": loc, "count": 0, "revenue": 0}
        location_stats[loc]["count"] += 1
        location_stats[loc]["revenue"] += job.get("price", 0)
    
    return list(location_stats.values())

@router.get("/stats/advanced")
async def get_advanced_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get advanced analytics"""
    today = datetime.now(timezone.utc)
    month_str = today.strftime("%Y-%m")
    
    # Calculate previous month
    if today.month == 1:
        prev_month_str = f"{today.year - 1}-12"
    else:
        prev_month_str = f"{today.year}-{today.month - 1:02d}"
    
    query_base = {"status": "kesz"}
    if location:
        query_base["location"] = location
    
    current_month_query = {**query_base, "date": {"$regex": f"^{month_str}"}}
    current_jobs = await db.jobs.find(current_month_query, {"_id": 0}).to_list(10000)
    
    prev_month_query = {**query_base, "date": {"$regex": f"^{prev_month_str}"}}
    prev_jobs = await db.jobs.find(prev_month_query, {"_id": 0}).to_list(10000)
    
    all_jobs = await db.jobs.find(query_base, {"_id": 0}).to_list(50000)
    
    current_cars = len(current_jobs)
    current_revenue = sum(j.get("price", 0) for j in current_jobs)
    prev_cars = len(prev_jobs)
    prev_revenue = sum(j.get("price", 0) for j in prev_jobs)
    
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
            customer_spending[cid]["total"] += job.get("price", 0)
            customer_spending[cid]["jobs"] += 1
    
    top_customers = sorted(customer_spending.values(), key=lambda x: x["total"], reverse=True)[:10]
    
    employee_revenue = {}
    for job in current_jobs:
        wid = job.get("worker_id")
        wname = job.get("worker_name", "Ismeretlen")
        if wid:
            if wid not in employee_revenue:
                employee_revenue[wid] = {"worker_id": wid, "name": wname, "revenue": 0, "cars": 0}
            employee_revenue[wid]["revenue"] += job.get("price", 0)
            employee_revenue[wid]["cars"] += 1
    
    location_revenue = {}
    for job in current_jobs:
        loc = job.get("location")
        if loc and loc == "Debrecen":
            if loc not in location_revenue:
                location_revenue[loc] = {"location": loc, "revenue": 0, "cars": 0}
            location_revenue[loc]["revenue"] += job.get("price", 0)
            location_revenue[loc]["cars"] += 1
    
    cars_change = ((current_cars - prev_cars) / prev_cars * 100) if prev_cars > 0 else 0
    revenue_change = ((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    
    day_performance = {i: {"day": i, "revenue": 0, "cars": 0, "count": 0} for i in range(7)}
    day_names = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"]
    
    for job in all_jobs:
        try:
            date_str = job.get("date", "")
            if date_str:
                job_date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                dow = job_date.weekday()
                day_performance[dow]["revenue"] += job.get("price", 0)
                day_performance[dow]["cars"] += 1
                day_performance[dow]["count"] += 1
        except (ValueError, KeyError, TypeError):
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



@router.get("/stats/report")
async def get_report_data(
    period: str = "daily",
    date: str = None,
    location: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get detailed report data for PDF generation.
    period: daily, weekly, monthly
    date: target date (YYYY-MM-DD)
    """
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    try:
        target = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        target = datetime.now(timezone.utc)
    
    if period == "daily":
        start_date = date
        end_date = date
        date_regex = f"^{date}"
    elif period == "weekly":
        weekday = target.weekday()
        monday = target - timedelta(days=weekday)
        sunday = monday + timedelta(days=6)
        start_date = monday.strftime("%Y-%m-%d")
        end_date = sunday.strftime("%Y-%m-%d")
        date_regex = None
    elif period == "monthly":
        start_date = target.strftime("%Y-%m-01")
        if target.month == 12:
            last_day = datetime(target.year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = datetime(target.year, target.month + 1, 1) - timedelta(days=1)
        end_date = last_day.strftime("%Y-%m-%d")
        date_regex = f"^{target.strftime('%Y-%m')}"
    else:
        start_date = date
        end_date = date
        date_regex = f"^{date}"
    
    query = {"status": "kesz"}
    if location:
        query["location"] = location
    
    if date_regex:
        query["date"] = {"$regex": date_regex}
    else:
        query["date"] = {"$gte": start_date, "$lte": end_date + "T23:59:59"}
    
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(50000)
    
    total_cars = len(jobs)
    total_revenue = sum(j.get("price", 0) for j in jobs)
    cash_revenue = sum(j.get("price", 0) for j in jobs if j.get("payment_method") == "keszpenz")
    card_revenue = sum(j.get("price", 0) for j in jobs if j.get("payment_method") == "kartya")
    
    worker_map = {}
    for job in jobs:
        wid = job.get("worker_id")
        wname = job.get("worker_name", "Ismeretlen")
        if not wid:
            continue
        if wid not in worker_map:
            worker_map[wid] = {"worker_id": wid, "name": wname, "cars": 0, "revenue": 0, "cash": 0, "card": 0, "services": {}}
        w = worker_map[wid]
        w["cars"] += 1
        w["revenue"] += job.get("price", 0)
        if job.get("payment_method") == "keszpenz":
            w["cash"] += job.get("price", 0)
        else:
            w["card"] += job.get("price", 0)
        sname = job.get("service_name", "Ismeretlen")
        w["services"][sname] = w["services"].get(sname, 0) + 1
    
    worker_breakdown = []
    for w in worker_map.values():
        services_list = [{"name": k, "count": v} for k, v in w["services"].items()]
        services_list.sort(key=lambda x: x["count"], reverse=True)
        worker_breakdown.append({
            "worker_id": w["worker_id"],
            "name": w["name"],
            "cars": w["cars"],
            "revenue": w["revenue"],
            "cash": w["cash"],
            "card": w["card"],
            "services": services_list
        })
    worker_breakdown.sort(key=lambda x: x["revenue"], reverse=True)
    
    service_map = {}
    for job in jobs:
        sid = job.get("service_id")
        sname = job.get("service_name", "Ismeretlen")
        if not sid:
            continue
        if sid not in service_map:
            service_map[sid] = {"service_id": sid, "name": sname, "count": 0, "revenue": 0}
        service_map[sid]["count"] += 1
        service_map[sid]["revenue"] += job.get("price", 0)
    
    service_breakdown = sorted(service_map.values(), key=lambda x: x["count"], reverse=True)
    
    daily_breakdown = {}
    for job in jobs:
        d = job.get("date", "")[:10]
        if not d:
            continue
        if d not in daily_breakdown:
            daily_breakdown[d] = {"date": d, "cars": 0, "revenue": 0, "cash": 0, "card": 0}
        daily_breakdown[d]["cars"] += 1
        daily_breakdown[d]["revenue"] += job.get("price", 0)
        if job.get("payment_method") == "keszpenz":
            daily_breakdown[d]["cash"] += job.get("price", 0)
        else:
            daily_breakdown[d]["card"] += job.get("price", 0)
    
    daily_list = sorted(daily_breakdown.values(), key=lambda x: x["date"])
    
    return {
        "period": period,
        "date_range": {"start": start_date, "end": end_date},
        "location": location or "Összes",
        "summary": {
            "total_cars": total_cars,
            "total_revenue": total_revenue,
            "cash_revenue": cash_revenue,
            "card_revenue": card_revenue
        },
        "worker_breakdown": worker_breakdown,
        "service_breakdown": service_breakdown,
        "daily_breakdown": daily_list
    }


@router.get("/stats/orphaned-data")
async def get_orphaned_data(user: User = Depends(get_current_user)):
    """Get data that belongs to deleted workers/customers"""
    if user.role != "admin":
        return {"error": "Csak admin használhatja"}
    
    # Get all current worker IDs
    workers = await db.workers.find({}, {"worker_id": 1, "_id": 0}).to_list(1000)
    active_worker_ids = set(w["worker_id"] for w in workers)
    
    # Get all current customer IDs
    customers = await db.customers.find({}, {"customer_id": 1, "_id": 0}).to_list(10000)
    active_customer_ids = set(c["customer_id"] for c in customers)
    
    # Find jobs with deleted workers
    all_jobs = await db.jobs.find({}, {"_id": 0, "job_id": 1, "worker_id": 1, "worker_name": 1, "customer_id": 1, "customer_name": 1, "plate_number": 1, "date": 1, "price": 1}).to_list(10000)
    
    orphaned_worker_jobs = []
    orphaned_worker_names = set()
    for job in all_jobs:
        if job.get("worker_id") and job["worker_id"] not in active_worker_ids:
            orphaned_worker_jobs.append(job)
            if job.get("worker_name"):
                orphaned_worker_names.add(job["worker_name"])
    
    orphaned_customer_jobs = []
    orphaned_customer_names = set()
    for job in all_jobs:
        if job.get("customer_id") and job["customer_id"] not in active_customer_ids:
            orphaned_customer_jobs.append(job)
            if job.get("customer_name"):
                orphaned_customer_names.add(job["customer_name"])
    
    return {
        "orphaned_workers": list(orphaned_worker_names),
        "orphaned_worker_job_count": len(orphaned_worker_jobs),
        "orphaned_customers": list(orphaned_customer_names),
        "orphaned_customer_job_count": len(orphaned_customer_jobs),
        "sample_jobs": orphaned_worker_jobs[:10]
    }

@router.delete("/stats/cleanup-worker/{worker_name}")
async def cleanup_worker_data(worker_name: str, user: User = Depends(get_current_user)):
    """Delete all jobs and data associated with a worker name"""
    if user.role != "admin":
        return {"error": "Csak admin használhatja"}
    
    # Delete jobs by worker name
    result = await db.jobs.delete_many({"worker_name": worker_name})
    jobs_deleted = result.deleted_count
    
    # Delete bookings by worker name
    booking_result = await db.bookings.delete_many({"worker_name": worker_name})
    bookings_deleted = booking_result.deleted_count
    
    # Delete shifts by worker name (if any remain)
    shift_result = await db.shifts.delete_many({"worker_name": worker_name})
    shifts_deleted = shift_result.deleted_count
    
    return {
        "message": f"{worker_name} adatai törölve",
        "jobs_deleted": jobs_deleted,
        "bookings_deleted": bookings_deleted,
        "shifts_deleted": shifts_deleted
    }

@router.delete("/stats/cleanup-customer/{customer_name}")
async def cleanup_customer_data(customer_name: str, user: User = Depends(get_current_user)):
    """Delete all jobs and data associated with a customer name"""
    if user.role != "admin":
        return {"error": "Csak admin használhatja"}
    
    # Delete jobs by customer name
    result = await db.jobs.delete_many({"customer_name": customer_name})
    jobs_deleted = result.deleted_count
    
    # Delete bookings by customer name
    booking_result = await db.bookings.delete_many({"customer_name": customer_name})
    bookings_deleted = booking_result.deleted_count
    
    return {
        "message": f"{customer_name} adatai törölve",
        "jobs_deleted": jobs_deleted,
        "bookings_deleted": bookings_deleted
    }

@router.delete("/stats/cleanup-all-orphaned")
async def cleanup_all_orphaned_data(user: User = Depends(get_current_user)):
    """Delete all jobs belonging to deleted workers and customers"""
    if user.role != "admin":
        return {"error": "Csak admin használhatja"}
    
    # Get all current worker IDs
    workers = await db.workers.find({}, {"worker_id": 1, "_id": 0}).to_list(1000)
    active_worker_ids = [w["worker_id"] for w in workers]
    
    # Get all current customer IDs  
    customers = await db.customers.find({}, {"customer_id": 1, "_id": 0}).to_list(10000)
    active_customer_ids = [c["customer_id"] for c in customers]
    
    # Delete orphaned worker jobs
    worker_result = await db.jobs.delete_many({
        "worker_id": {"$nin": active_worker_ids, "$ne": None, "$exists": True}
    })
    
    # Delete orphaned customer jobs
    customer_result = await db.jobs.delete_many({
        "customer_id": {"$nin": active_customer_ids, "$ne": None, "$exists": True}
    })
    
    return {
        "message": "Árva adatok törölve",
        "orphaned_worker_jobs_deleted": worker_result.deleted_count,
        "orphaned_customer_jobs_deleted": customer_result.deleted_count
    }
