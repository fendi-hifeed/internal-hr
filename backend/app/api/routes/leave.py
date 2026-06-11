from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid

from app.db.session import get_db
from app.models.user import User
from app.models.leave import LeaveType, LeaveBalance, LeaveRequest, LeaveApproval, LeaveStatus
from app.schemas.leave import (
    LeaveTypeCreate, LeaveTypeUpdate, LeaveTypeResponse,
    LeaveBalanceResponse, LeaveRequestCreate, LeaveRequestResponse,
    LeaveApprovalAction,
)
from app.schemas.auth import UserResponse
from app.core.security import get_current_user, get_current_admin
from app.services.leave_service import (
    get_leave_balances_for_employee, create_leave_request,
    approve_leave_request, reject_leave_request, calculate_work_days,
    get_leave_type_by_id,
)

router = APIRouter(prefix="/leave", tags=["Leave Management"])


# ===== Leave Types (Admin) =====
@router.get("/types", response_model=List[LeaveTypeResponse])
async def list_leave_types(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """List all leave types."""
    query = select(LeaveType)
    if not include_inactive:
        query = query.where(LeaveType.is_active == True)
    result = await db.execute(query.order_by(LeaveType.type_name))
    return list(result.scalars().all())


@router.post("/types", response_model=LeaveTypeResponse)
async def create_leave_type(
    data: LeaveTypeCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new leave type (Admin only)."""
    # Check duplicate code
    existing = await db.execute(
        select(LeaveType).where(LeaveType.type_code == data.type_code.upper())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Kode tipe cuti sudah ada")

    leave_type = LeaveType(
        type_name=data.type_name,
        type_code=data.type_code.upper(),
        default_quota=data.default_quota,
        quota_unit=data.quota_unit,
        carry_over_enabled=data.carry_over_enabled,
        carry_over_max=data.carry_over_max,
        requires_attachment=data.requires_attachment,
        min_notice_days=data.min_notice_days,
        approval_level=data.approval_level,
        is_active=data.is_active,
        color_code=data.color_code,
        description=data.description,
    )
    db.add(leave_type)
    await db.commit()
    await db.refresh(leave_type)
    return leave_type


@router.put("/types/{type_id}", response_model=LeaveTypeResponse)
async def update_leave_type(
    type_id: uuid.UUID,
    data: LeaveTypeUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a leave type (Admin only)."""
    result = await db.execute(select(LeaveType).where(LeaveType.id == type_id))
    leave_type = result.scalar_one_or_none()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Tipe cuti tidak ditemukan")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(leave_type, key, value)

    await db.commit()
    await db.refresh(leave_type)
    return leave_type


@router.delete("/types/{type_id}")
async def delete_leave_type(
    type_id: uuid.UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a leave type (Admin only)."""
    result = await db.execute(select(LeaveType).where(LeaveType.id == type_id))
    leave_type = result.scalar_one_or_none()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Tipe cuti tidak ditemukan")

    leave_type.is_active = False
    await db.commit()
    return {"message": "Tipe cuti dinonaktifkan"}


# ===== Leave Balances =====
@router.get("/balance", response_model=List[LeaveBalanceResponse])
async def get_my_balance(
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's leave balances."""
    balances = await get_leave_balances_for_employee(db, current_user.id, year)
    return [
        LeaveBalanceResponse(
            leave_type_id=b.leave_type_id,
            leave_type_name=b.leave_type.type_name if b.leave_type else "",
            leave_type_code=b.leave_type.type_code if b.leave_type else "",
            color_code=b.leave_type.color_code if b.leave_type else "#3B82F6",
            total_quota=b.total_quota,
            used=b.used,
            pending=b.pending,
            available=b.total_quota - b.used - b.pending,
            quota_unit=b.leave_type.quota_unit.value if b.leave_type else "DAYS",
        )
        for b in balances
    ]


# ===== Leave Requests =====
@router.post("/request", response_model=LeaveRequestResponse, status_code=status.HTTP_201_CREATED)
async def submit_leave_request(
    data: LeaveRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a new leave request."""
    if data.start_date > data.end_date:
        raise HTTPException(status_code=400, detail="Tanggal mulai harus sebelum tanggal selesai")

    days = calculate_work_days(data.start_date, data.end_date)
    if days <= 0:
        raise HTTPException(status_code=400, detail="Tanggal tidak valid")

    # Check leave type
    leave_type = await get_leave_type_by_id(db, data.leave_type_id)
    if not leave_type or not leave_type.is_active:
        raise HTTPException(status_code=400, detail="Tipe cuti tidak valid")

    # Check min notice
    days_notice = (data.start_date - date.today()).days
    if days_notice < leave_type.min_notice_days:
        raise HTTPException(
            status_code=400,
            detail=f"Pengajuan harus minimal {leave_type.min_notice_days} hari sebelum tanggal cuti",
        )

    request_data = {
        "leave_type_id": data.leave_type_id,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "days_requested": days,
        "reason": data.reason,
        "attachment_url": data.attachment_url,
        "half_day": data.half_day,
        "half_day_type": data.half_day_type,
        "idempotency_key": data.idempotency_key,
    }

    request, err = await create_leave_request(db, current_user.id, request_data)
    if err:
        raise HTTPException(status_code=400, detail=err)

    # Re-fetch with eager-loaded relationships to avoid greenlet lazy-load error
    result = await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.id == request.id)
        .options(
            selectinload(LeaveRequest.leave_type),
            selectinload(LeaveRequest.approvals),
        )
    )
    request = result.scalar_one()
    return _to_leave_request_response(request, current_user.name)


@router.get("/my-requests", response_model=List[LeaveRequestResponse])
async def get_my_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's leave requests."""
    result = await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.employee_id == current_user.id)
        .options(
            selectinload(LeaveRequest.leave_type),
            selectinload(LeaveRequest.approvals),
        )
        .order_by(LeaveRequest.created_at.desc())
    )
    requests = result.scalars().all()
    return [_to_leave_request_response(r, current_user.name) for r in requests]


@router.get("/pending", response_model=List[LeaveRequestResponse])
async def get_pending_requests(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get all pending leave requests (Admin only)."""
    result = await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED_L1]))
        .options(
            selectinload(LeaveRequest.employee),
            selectinload(LeaveRequest.leave_type),
            selectinload(LeaveRequest.approvals),
        )
        .order_by(LeaveRequest.created_at.asc())
    )
    requests = result.scalars().all()
    return [_to_leave_request_response(r, r.employee.name if r.employee else "") for r in requests]


@router.get("/all", response_model=List[LeaveRequestResponse])
async def get_all_requests(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get all leave requests (Admin only)."""
    query = select(LeaveRequest).options(
        selectinload(LeaveRequest.employee),
        selectinload(LeaveRequest.leave_type),
        selectinload(LeaveRequest.approvals),
    )
    if status_filter:
        query = query.where(LeaveRequest.status == status_filter)
    result = await db.execute(query.order_by(LeaveRequest.created_at.desc()))
    requests = result.scalars().all()
    return [_to_leave_request_response(r, r.employee.name if r.employee else "") for r in requests]


@router.post("/{request_id}/approve", response_model=LeaveRequestResponse)
async def approve_request(
    request_id: uuid.UUID,
    data: LeaveApprovalAction,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve a leave request (Admin only)."""
    request, err = await approve_leave_request(
        db, request_id, current_user.id, data.version, data.notes
    )
    if err:
        raise HTTPException(status_code=409, detail=err)
    # Re-fetch with eager-loaded relationships
    result = await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.id == request_id)
        .options(
            selectinload(LeaveRequest.leave_type),
            selectinload(LeaveRequest.approvals),
        )
    )
    request = result.scalar_one()
    return _to_leave_request_response(request, "")


@router.post("/{request_id}/reject", response_model=LeaveRequestResponse)
async def reject_request(
    request_id: uuid.UUID,
    data: LeaveApprovalAction,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reject a leave request (Admin only)."""
    request, err = await reject_leave_request(
        db, request_id, current_user.id, data.version, data.notes
    )
    if err:
        raise HTTPException(status_code=409, detail=err)
    # Re-fetch with eager-loaded relationships
    result = await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.id == request_id)
        .options(
            selectinload(LeaveRequest.leave_type),
            selectinload(LeaveRequest.approvals),
        )
    )
    request = result.scalar_one()
    return _to_leave_request_response(request, "")


def _to_leave_request_response(req: LeaveRequest, employee_name: str = "") -> LeaveRequestResponse:
    return LeaveRequestResponse(
        id=req.id,
        employee_id=req.employee_id,
        employee_name=employee_name,
        leave_type_id=req.leave_type_id,
        leave_type_name=req.leave_type.type_name if req.leave_type else "",
        leave_type_code=req.leave_type.type_code if req.leave_type else "",
        color_code=req.leave_type.color_code if req.leave_type else "#3B82F6",
        start_date=req.start_date,
        end_date=req.end_date,
        days_requested=req.days_requested,
        reason=req.reason,
        attachment_url=req.attachment_url,
        half_day=req.half_day,
        half_day_type=req.half_day_type,
        status=req.status.value if req.status else "PENDING",
        current_approver_id=req.current_approver_id,
        current_approver_name=None,
        approval_history=[
            {
                "level": a.level,
                "approver_id": a.approver_id,
                "approver_name": "",
                "approver_role": "",
                "status": a.status,
                "action_at": a.action_at,
                "notes": a.notes,
            }
            for a in sorted(req.approvals or [], key=lambda x: x.level)
        ],
        created_at=req.created_at,
        updated_at=req.updated_at,
    )