from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid

from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.attendance import AttendanceLog, FlagStatus
from app.models.leave import LeaveRequest, LeaveStatus
from app.schemas.auth import UserCreate, UserUpdate, UserResponse
from app.schemas.geo_zone import GeoZoneCreate, GeoZoneUpdate, GeoZoneResponse
from app.core.security import get_current_user, get_current_admin, hash_password

router = APIRouter(prefix="/admin", tags=["Admin"])


# ===== Employees =====
@router.get("/employees", response_model=List[UserResponse])
async def list_employees(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """List all employees (Admin only)."""
    query = select(User)
    if not include_inactive:
        query = query.where(User.is_active == True)
    result = await db.execute(query.order_by(User.name))
    users = result.scalars().all()
    return [_user_to_response(u) for u in users]


@router.post("/employees", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: UserCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new employee (Admin only)."""
    existing = await db.execute(
        select(User).where(User.email == data.email.lower().strip())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")

    user = User(
        name=data.name,
        email=data.email.lower().strip(),
        hashed_password=hash_password(data.password),
        role=UserRole(data.role) if data.role in [r.value for r in UserRole] else UserRole.EMPLOYEE,
        department=data.department,
        supervisor_id=data.supervisor_id,
    )
    db.add(user)
    await db.flush()

    # Create leave balances for all active leave types
    leave_types_result = await db.execute(
        select(type).where(type.is_active == True)
    )
    leave_types = leave_types_result.scalars().all()
    from app.models.leave import LeaveBalance
    from datetime import date
    year = date.today().year
    for lt in leave_types:
        balance = LeaveBalance(
            employee_id=user.id,
            leave_type_id=lt.id,
            total_quota=lt.default_quota,
            used=0,
            pending=0,
            quota_year=year,
        )
        db.add(balance)

    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)


@router.put("/employees/{user_id}", response_model=UserResponse)
async def update_employee(
    user_id: uuid.UUID,
    data: UserUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update an employee (Admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)


@router.delete("/employees/{user_id}")
async def deactivate_employee(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate an employee (Admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Tidak bisa menonaktifkan diri sendiri")

    user.is_active = False
    await db.commit()
    return {"message": "Karyawan dinonaktifkan"}


# ===== Geo Zones =====
@router.get("/geo-zones", response_model=List[GeoZoneResponse])
async def list_geo_zones(
    include_inactive: bool = False,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List geo zones (Admin only)."""
    from app.models.geo_zone import GeoZone
    query = select(GeoZone)
    if not include_inactive:
        query = query.where(GeoZone.is_active == True)
    result = await db.execute(query.order_by(GeoZone.zone_name))
    return list(result.scalars().all())


@router.post("/geo-zones", response_model=GeoZoneResponse)
async def create_geo_zone(
    data: GeoZoneCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a geo zone (Admin only)."""
    from app.models.geo_zone import GeoZone, GeoZoneType
    zone = GeoZone(
        zone_name=data.zone_name,
        zone_type=GeoZoneType(data.zone_type),
        latitude=data.latitude,
        longitude=data.longitude,
        radius_meters=data.radius_meters,
        address=data.address,
    )
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return zone


@router.put("/geo-zones/{zone_id}", response_model=GeoZoneResponse)
async def update_geo_zone(
    zone_id: uuid.UUID,
    data: GeoZoneUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a geo zone (Admin only)."""
    from app.models.geo_zone import GeoZone
    result = await db.execute(select(GeoZone).where(GeoZone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Geo zone tidak ditemukan")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(zone, key, value)

    await db.commit()
    await db.refresh(zone)
    return zone


@router.delete("/geo-zones/{zone_id}")
async def delete_geo_zone(
    zone_id: uuid.UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a geo zone (Admin only)."""
    from app.models.geo_zone import GeoZone
    result = await db.execute(select(GeoZone).where(GeoZone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Geo zone tidak ditemukan")
    zone.is_active = False
    await db.commit()
    return {"message": "Geo zone dihapus"}


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        department=user.department,
        supervisor_id=user.supervisor_id,
        join_date=user.join_date.isoformat() if user.join_date else None,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
    )