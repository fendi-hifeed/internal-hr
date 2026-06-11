from fastapi import APIRouter
from app.api.routes import auth, attendance, leave, admin, clearance

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(attendance.router)
api_router.include_router(leave.router)
api_router.include_router(admin.router)
api_router.include_router(clearance.router)
