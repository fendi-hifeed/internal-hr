from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Optional, List
import uuid

from app.db.session import get_db
from app.models.user import User
from app.models.attendance import AttendanceLog, FlagStatus
from app.models.leave import LeaveRequest, LeaveStatus
from app.schemas.attendance import (
    ClockInRequest, ClockOutRequest, AttendanceLogResponse, AttendanceStatsResponse,
)
from app.schemas.auth import UserResponse
from app.core.security import get_current_user, get_current_admin
from app.services.attendance_service import (
    get_flag_status, get_today_attendance, get_employee_stats, get_wib_date,
)
from app.core.config import settings

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.get("/today", response_model=Optional[AttendanceLogResponse])
async def get_today(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get today's attendance for current user."""
    log = await get_today_attendance(db, str(current_user.id))
    if not log:
        return None
    return _to_attendance_response(log)


@router.post("/clock-in", response_model=AttendanceLogResponse)
async def clock_in(
    data: ClockInRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit clock-in with selfie and geo-location."""
    # Idempotency check
    existing_by_key = await db.execute(
        select(AttendanceLog).where(
            AttendanceLog.idempotency_key_clock_in == data.idempotency_key
        )
    )
    if existing_by_key.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Clock-in sudah pernah disubmit",
        )

    today = get_wib_date(datetime.now(timezone.utc))

    # Check existing for today
    existing_today = await get_today_attendance(db, str(current_user.id))
    if existing_today and existing_today.clock_in_time:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sudah clock-in hari ini",
        )

    now_aware = datetime.now(timezone.utc)
    flag = get_flag_status(now_aware)  # uses UTC +7h for WIB
    now = now_aware.replace(tzinfo=None)  # store as naive UTC

    if existing_today:
        # Update existing record
        existing_today.clock_in_time = now
        existing_today.clock_in_photo = data.photo
        existing_today.clock_in_latitude = data.latitude
        existing_today.clock_in_longitude = data.longitude
        existing_today.clock_in_location_name = data.location_name
        existing_today.clock_in_flag = flag
        existing_today.clock_in_device_id = data.device_id
        existing_today.idempotency_key_clock_in = data.idempotency_key
        log = existing_today
    else:
        log = AttendanceLog(
            employee_id=current_user.id,
            date=today,
            clock_in_time=now,
            clock_in_photo=data.photo,
            clock_in_latitude=data.latitude,
            clock_in_longitude=data.longitude,
            clock_in_location_name=data.location_name,
            clock_in_flag=flag,
            clock_in_device_id=data.device_id,
            idempotency_key_clock_in=data.idempotency_key,
        )
        db.add(log)

    await db.commit()
    await db.refresh(log)
    return _to_attendance_response(log)


@router.post("/clock-out", response_model=AttendanceLogResponse)
async def clock_out(
    data: ClockOutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit clock-out."""
    existing_by_key = await db.execute(
        select(AttendanceLog).where(
            AttendanceLog.idempotency_key_clock_out == data.idempotency_key
        )
    )
    if existing_by_key.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Clock-out sudah pernah disubmit",
        )

    log = await get_today_attendance(db, str(current_user.id))
    if not log or not log.clock_in_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Belum clock-in hari ini",
        )
    if log.clock_out_time:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sudah clock-out hari ini",
        )

    now_aware = datetime.now(timezone.utc)
    log.clock_out_time = now_aware.replace(tzinfo=None)  # store as naive UTC
    log.clock_out_photo = data.photo
    log.clock_out_latitude = data.latitude
    log.clock_out_longitude = data.longitude
    log.clock_out_location_name = data.location_name
    log.clock_out_notes = data.notes
    log.idempotency_key_clock_out = data.idempotency_key

    await db.commit()
    await db.refresh(log)
    return _to_attendance_response(log)


@router.get("/history", response_model=List[AttendanceLogResponse])
async def get_history(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get attendance history for current user."""
    offset = (page - 1) * limit
    result = await db.execute(
        select(AttendanceLog)
        .where(AttendanceLog.employee_id == current_user.id)
        .order_by(AttendanceLog.date.desc())
        .offset(offset)
        .limit(limit)
    )
    logs = result.scalars().all()
    return [_to_attendance_response(log) for log in logs]


@router.get("/stats/personal", response_model=AttendanceStatsResponse)
async def get_personal_stats(
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get personal attendance statistics."""
    stats = await get_employee_stats(db, str(current_user.id), year, month)
    return AttendanceStatsResponse(**stats)


# Alias for frontend compatibility
@router.get("/stats", response_model=AttendanceStatsResponse)
async def get_personal_stats_alias(
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get personal attendance statistics (alias for /stats/personal)."""
    stats = await get_employee_stats(db, str(current_user.id), year, month)
    return AttendanceStatsResponse(**stats)


@router.get("/stats/admin", response_model=dict)
async def get_admin_stats(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get company-wide attendance stats for admin."""
    today = get_wib_date(datetime.now(timezone.utc))

    # Total employees
    total_emp_result = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    total_employees = total_emp_result.scalar() or 0

    # Present today
    present_result = await db.execute(
        select(func.count(AttendanceLog.id))
        .where(
            and_(
                AttendanceLog.date == today,
                AttendanceLog.clock_in_time.isnot(None),
            )
        )
    )
    present_today = present_result.scalar() or 0

    # Late today
    late_result = await db.execute(
        select(func.count(AttendanceLog.id))
        .where(
            and_(
                AttendanceLog.date == today,
                AttendanceLog.clock_in_flag.in_([FlagStatus.LATE, FlagStatus.VERY_LATE]),
            )
        )
    )
    late_today = late_result.scalar() or 0

    # Pending leave requests
    pending_result = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.status == LeaveStatus.PENDING
        )
    )
    pending_leave_requests = pending_result.scalar() or 0

    # Calculate rates (simplified - based on present/total)
    attendance_rate = round(present_today / max(total_employees, 1) * 100, 2)
    on_time_rate = round(
        (present_today - late_today) / max(present_today, 1) * 100, 2
    )

    return {
        "total_employees": total_employees,
        "present_today": present_today,
        "late_today": late_today,
        "on_leave_today": 0,
        "attendance_rate": attendance_rate,
        "on_time_rate": on_time_rate,
        "pending_leave_requests": pending_leave_requests,
        "avg_approval_time_hours": 0,
    }


def _to_attendance_response(log: AttendanceLog) -> AttendanceLogResponse:
    return AttendanceLogResponse(
        id=log.id,
        employee_id=log.employee_id,
        date=log.date,
        clock_in_time=log.clock_in_time.time() if log.clock_in_time else None,
        clock_in_photo=log.clock_in_photo,
        clock_in_latitude=log.clock_in_latitude,
        clock_in_longitude=log.clock_in_longitude,
        clock_in_location_name=log.clock_in_location_name,
        clock_in_flag=log.clock_in_flag.value if log.clock_in_flag else None,
        clock_in_device_id=log.clock_in_device_id,
        clock_out_time=log.clock_out_time.time() if log.clock_out_time else None,
        clock_out_photo=log.clock_out_photo,
        clock_out_latitude=log.clock_out_latitude,
        clock_out_longitude=log.clock_out_longitude,
        clock_out_location_name=log.clock_out_location_name,
        clock_out_notes=log.clock_out_notes,
        employee_name=None,
    )
