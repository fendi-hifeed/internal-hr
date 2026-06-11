from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import date, time, datetime


class ClockInRequest(BaseModel):
    photo: Optional[str] = None  # base64 or URL
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    location_name: Optional[str] = None
    idempotency_key: str = Field(..., min_length=1, max_length=64)
    device_id: Optional[str] = None


class ClockOutRequest(BaseModel):
    photo: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    location_name: Optional[str] = None
    idempotency_key: str = Field(..., min_length=1, max_length=64)
    notes: Optional[str] = None
    device_id: Optional[str] = None


class AttendanceLogResponse(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    date: date
    clock_in_time: Optional[time] = None
    clock_in_photo: Optional[str] = None
    clock_in_latitude: Optional[float] = None
    clock_in_longitude: Optional[float] = None
    clock_in_location_name: Optional[str] = None
    clock_in_flag: Optional[str] = None
    clock_in_device_id: Optional[str] = None
    clock_out_time: Optional[time] = None
    clock_out_photo: Optional[str] = None
    clock_out_latitude: Optional[float] = None
    clock_out_longitude: Optional[float] = None
    clock_out_location_name: Optional[str] = None
    clock_out_notes: Optional[str] = None
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True


class AttendanceStatsResponse(BaseModel):
    total_work_days: int
    present_days: int
    absent_days: int
    on_time_count: int
    late_count: int
    very_late_count: int
    attendance_rate: float
    on_time_rate: float
    average_clock_in: Optional[str] = None
    late_count_this_month: int


class AdminDashboardResponse(BaseModel):
    total_employees: int
    present_today: int
    late_today: int
    on_leave_today: int
    attendance_rate: float
    on_time_rate: float
    pending_leave_requests: int
    avg_approval_time_hours: float