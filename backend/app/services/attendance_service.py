from datetime import date, datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
import math

from app.models.attendance import AttendanceLog, FlagStatus
from app.core.config import settings


def get_flag_status(submit_time: datetime) -> FlagStatus:
    """Determine flag status based on submit time in WIB (UTC+7)."""
    wib_time = submit_time + timedelta(hours=7)
    hour_decimal = wib_time.hour + wib_time.minute / 60.0 + wib_time.second / 3600.0

    if hour_decimal <= settings.ON_TIME_CUTOFF_HOUR:
        return FlagStatus.ON_TIME
    elif hour_decimal <= settings.LATE_CUTOFF_HOUR:
        return FlagStatus.LATE
    elif hour_decimal <= 12.0:
        return FlagStatus.VERY_LATE
    else:
        return FlagStatus.ABSENT_FLAG


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates in meters."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def is_within_geofence(
    lat: float, lon: float,
    zone_lat: float, zone_lon: float,
    radius_meters: int,
) -> bool:
    """Check if location is within geo-fence."""
    dist = haversine_meters(lat, lon, zone_lat, zone_lon)
    return dist <= radius_meters


def calculate_distance_to_geofence(
    lat: float, lon: float,
    zone_lat: float, zone_lon: float,
) -> float:
    """Get distance to nearest geo-fence in meters."""
    return haversine_meters(lat, lon, zone_lat, zone_lon)


def get_wib_date(dt: datetime) -> date:
    """Get date in WIB timezone."""
    return (dt + timedelta(hours=7)).date()


async def get_today_attendance(
    db: AsyncSession,
    employee_id: str,
) -> Optional[AttendanceLog]:
    """Get today's attendance log for an employee."""
    today = get_wib_date(datetime.now(timezone.utc))
    result = await db.execute(
        select(AttendanceLog).where(
            and_(
                AttendanceLog.employee_id == employee_id,
                AttendanceLog.date == today,
            )
        )
    )
    return result.scalar_one_or_none()


async def get_employee_stats(
    db: AsyncSession,
    employee_id: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
) -> dict:
    """Get attendance statistics for an employee."""
    today = get_wib_date(datetime.now(timezone.utc))
    if year is None:
        year = today.year
    if month is None:
        month = today.month

    start_of_month = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_of_month = start_of_month.replace(year=year + 1, month=1)
    else:
        end_of_month = start_of_month.replace(month=month + 1)

    result = await db.execute(
        select(AttendanceLog).where(
            and_(
                AttendanceLog.employee_id == employee_id,
                AttendanceLog.date >= start_of_month.date(),
                AttendanceLog.date < end_of_month.date(),
            )
        )
    )
    logs = result.scalars().all()

    total = len(logs)
    on_time = sum(1 for l in logs if l.clock_in_flag == FlagStatus.ON_TIME)
    late = sum(1 for l in logs if l.clock_in_flag == FlagStatus.LATE)
    very_late = sum(1 for l in logs if l.clock_in_flag == FlagStatus.VERY_LATE)
    present = sum(1 for l in logs if l.clock_in_time is not None)

    # Calculate average clock-in time
    clock_in_times = [l.clock_in_time for l in logs if l.clock_in_time]
    avg_str = None
    if clock_in_times:
        total_minutes = sum(t.hour * 60 + t.minute for t in clock_in_times)
        avg_minutes = total_minutes // len(clock_in_times)
        avg_str = f"{avg_minutes // 60:02d}:{avg_minutes % 60:02d}"

    # Work days this month (weekdays only, simplified)
    work_days = total  # total attendance records = present days
    absent_days = 0  # we don't track absent records directly

    return {
        "total_work_days": total,
        "present_days": present,
        "absent_days": absent_days,
        "on_time_count": on_time,
        "late_count": late,
        "very_late_count": very_late,
        "attendance_rate": round(present / max(total, 1) * 100, 2),
        "on_time_rate": round(on_time / max(present, 1) * 100, 2),
        "average_clock_in": avg_str,
        "late_count_this_month": late,
    }