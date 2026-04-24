"""
X-CLEAN Routes
"""
from fastapi import APIRouter
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.customers import router as customers_router
from routes.services import router as services_router
from routes.workers import router as workers_router
from routes.jobs import router as jobs_router
from routes.shifts import router as shifts_router
from routes.bookings import router as bookings_router
from routes.inventory import router as inventory_router
from routes.day_records import router as day_records_router
from routes.stats import router as stats_router
from routes.notifications import router as notifications_router
from routes.blacklist import router as blacklist_router
from routes.ai import router as ai_router
from routes.misc import router as misc_router
from routes.files import router as files_router
from routes.invoices import router as invoices_router
from routes.events import router as events_router
from routes.reviews import router as reviews_router
from routes.alerts import router as alerts_router

api_router = APIRouter(prefix="/api")

# Include all routers
api_router.include_router(auth_router, tags=["Auth"])
api_router.include_router(users_router, tags=["Users"])
api_router.include_router(customers_router, tags=["Customers"])
api_router.include_router(services_router, tags=["Services"])
api_router.include_router(workers_router, tags=["Workers"])
api_router.include_router(jobs_router, tags=["Jobs"])
api_router.include_router(shifts_router, tags=["Shifts"])
api_router.include_router(bookings_router, tags=["Bookings"])
api_router.include_router(inventory_router, tags=["Inventory"])
api_router.include_router(day_records_router, tags=["Day Records"])
api_router.include_router(stats_router, tags=["Statistics"])
api_router.include_router(notifications_router, tags=["Notifications"])
api_router.include_router(blacklist_router, tags=["Blacklist"])
api_router.include_router(ai_router, tags=["AI"])
api_router.include_router(misc_router, tags=["Misc"])
api_router.include_router(files_router, tags=["Files"])
api_router.include_router(invoices_router, tags=["Invoices"])
api_router.include_router(events_router, tags=["Events"])
api_router.include_router(reviews_router, tags=["Reviews"])
api_router.include_router(alerts_router, tags=["Alerts"])
