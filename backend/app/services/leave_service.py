from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import uuid

from app.models.leave import (
    LeaveType, LeaveBalance, LeaveRequest, LeaveApproval,
    LeaveStatus, ApprovalLevel,
)
from app.models.user import User


async def get_leave_balances_for_employee(
    db: AsyncSession,
    employee_id: uuid.UUID,
    year: Optional[int] = None,
) -> List[LeaveBalance]:
    """Get all leave balances for an employee for a given year."""
    if year is None:
        year = date.today().year

    result = await db.execute(
        select(LeaveBalance).where(
            and_(
                LeaveBalance.employee_id == employee_id,
                LeaveBalance.quota_year == year,
            )
        ).options(selectinload(LeaveBalance.leave_type))
    )
    return list(result.scalars().all())


async def get_available_balance(
    db: AsyncSession,
    employee_id: uuid.UUID,
    leave_type_id: uuid.UUID,
    year: Optional[int] = None,
) -> int:
    """Get available leave balance (total - used - pending)."""
    if year is None:
        year = date.today().year

    result = await db.execute(
        select(LeaveBalance).where(
            and_(
                LeaveBalance.employee_id == employee_id,
                LeaveBalance.leave_type_id == leave_type_id,
                LeaveBalance.quota_year == year,
            )
        )
    )
    balance = result.scalar_one_or_none()
    if not balance:
        return 0
    return balance.total_quota - balance.used - balance.pending


async def get_leave_type_by_id(
    db: AsyncSession,
    leave_type_id: uuid.UUID,
) -> Optional[LeaveType]:
    result = await db.execute(
        select(LeaveType).where(LeaveType.id == leave_type_id)
    )
    return result.scalar_one_or_none()


async def create_leave_request(
    db: AsyncSession,
    employee_id: uuid.UUID,
    data: dict,
) -> Tuple[LeaveRequest, Optional[str]]:
    """
    Create a leave request with balance check.
    Returns (request, error_message).
    """
    leave_type_id = data["leave_type_id"]
    days_requested = data["days_requested"]
    year = data.get("start_date", date.today()).year

    # Check available balance
    available = await get_available_balance(db, employee_id, leave_type_id, year)
    if available < days_requested:
        return None, f"Sisa cuti tidak mencukupi. Tersedia: {available} hari, Diminta: {days_requested} hari"

    # Get leave type for approval level
    leave_type = await get_leave_type_by_id(db, leave_type_id)
    if not leave_type:
        return None, "Tipe cuti tidak ditemukan"

    # Idempotency check
    idempotency_key = data.get("idempotency_key")
    if idempotency_key:
        existing = await db.execute(
            select(LeaveRequest).where(LeaveRequest.idempotency_key == idempotency_key)
        )
        existing_req = existing.scalar_one_or_none()
        if existing_req:
            return existing_req, None

    # Create request
    request = LeaveRequest(
        employee_id=employee_id,
        leave_type_id=leave_type_id,
        start_date=data["start_date"],
        end_date=data["end_date"],
        days_requested=days_requested,
        reason=data["reason"],
        attachment_url=data.get("attachment_url"),
        half_day=data.get("half_day", False),
        half_day_type=data.get("half_day_type"),
        status=LeaveStatus.PENDING,
        idempotency_key=idempotency_key,
    )
    db.add(request)
    await db.flush()

    # Create initial approval record
    approval_level_count = _get_approval_level_count(leave_type.approval_level)
    for level in range(1, approval_level_count + 1):
        approval = LeaveApproval(
            leave_request_id=request.id,
            level=level,
            status="PENDING",
        )
        db.add(approval)

    # Update pending balance
    balance_result = await db.execute(
        select(LeaveBalance).where(
            and_(
                LeaveBalance.employee_id == employee_id,
                LeaveBalance.leave_type_id == leave_type_id,
                LeaveBalance.quota_year == year,
            )
        )
    )
    balance = balance_result.scalar_one_or_none()
    if balance:
        balance.pending += days_requested

    await db.commit()
    await db.refresh(request)
    return request, None


async def approve_leave_request(
    db: AsyncSession,
    request_id: uuid.UUID,
    approver_id: uuid.UUID,
    version: int,
    notes: Optional[str] = None,
) -> Tuple[LeaveRequest, Optional[str]]:
    """
    Approve a leave request with optimistic locking.
    Returns (request, error_message).
    """
    result = await db.execute(
        select(LeaveRequest).where(LeaveRequest.id == request_id).options(
            selectinload(LeaveRequest.approvals),
            selectinload(LeaveRequest.leave_type),
        )
    )
    request = result.scalar_one_or_none()
    if not request:
        return None, "Pengajuan cuti tidak ditemukan"

    if request.version != version:
        return None, "Pengajuan sudah diproses oleh orang lain. Silakan refresh dan coba lagi."

    if request.status not in [LeaveStatus.PENDING, LeaveStatus.APPROVED_L1]:
        return None, f"Pengajuan sudah dalam status '{request.status.value}'"

    # Determine current approval level
    pending_approvals = [a for a in request.approvals if a.status == "PENDING"]
    if not pending_approvals:
        return None, "Tidak ada approval yang menunggu"

    current_approval = min(pending_approvals, key=lambda a: a.level)
    current_approval.approver_id = approver_id
    current_approval.status = "APPROVED"
    current_approval.action_at = datetime.utcnow()
    current_approval.notes = notes

    # Determine new status
    remaining_pending = [a for a in pending_approvals if a.level > current_approval.level]
    if remaining_pending:
        request.status = LeaveStatus.APPROVED_L1
    else:
        request.status = LeaveStatus.APPROVED
        # Deduct from used balance
        year = request.start_date.year
        balance_result = await db.execute(
            select(LeaveBalance).where(
                and_(
                    LeaveBalance.employee_id == request.employee_id,
                    LeaveBalance.leave_type_id == request.leave_type_id,
                    LeaveBalance.quota_year == year,
                )
            )
        )
        balance = balance_result.scalar_one_or_none()
        if balance:
            balance.used += request.days_requested
            balance.pending = max(0, balance.pending - request.days_requested)

    request.version += 1
    request.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(request)
    return request, None


async def reject_leave_request(
    db: AsyncSession,
    request_id: uuid.UUID,
    approver_id: uuid.UUID,
    version: int,
    notes: Optional[str] = None,
) -> Tuple[LeaveRequest, Optional[str]]:
    """Reject a leave request."""
    result = await db.execute(
        select(LeaveRequest).where(LeaveRequest.id == request_id).options(
            selectinload(LeaveRequest.approvals),
        )
    )
    request = result.scalar_one_or_none()
    if not request:
        return None, "Pengajuan cuti tidak ditemukan"

    if request.version != version:
        return None, "Pengajuan sudah diproses oleh orang lain. Silakan refresh dan coba lagi."

    if request.status not in [LeaveStatus.PENDING, LeaveStatus.APPROVED_L1]:
        return None, f"Pengajuan sudah dalam status '{request.status.value}'"

    request.status = LeaveStatus.REJECTED
    request.version += 1
    request.updated_at = datetime.utcnow()

    # Release pending balance
    year = request.start_date.year
    balance_result = await db.execute(
        select(LeaveBalance).where(
            and_(
                LeaveBalance.employee_id == request.employee_id,
                LeaveBalance.leave_type_id == request.leave_type_id,
                LeaveBalance.quota_year == year,
            )
        )
    )
    balance = balance_result.scalar_one_or_none()
    if balance:
        balance.pending = max(0, balance.pending - request.days_requested)

    # Update pending approval
    pending_approvals = [a for a in request.approvals if a.status == "PENDING"]
    if pending_approvals:
        current_approval = min(pending_approvals, key=lambda a: a.level)
        current_approval.approver_id = approver_id
        current_approval.status = "REJECTED"
        current_approval.action_at = datetime.utcnow()
        current_approval.notes = notes

    await db.commit()
    await db.refresh(request)
    return request, None


def _get_approval_level_count(level) -> int:
    mapping = {
        "SINGLE": 1,
        "DOUBLE": 2,
        "MANAGEMENT": 3,
    }
    # Handle both string and enum types
    lvl = getattr(level, 'value', level)  # extract .value if enum, else use as-is
    return mapping.get(lvl, 1)


def calculate_work_days(start_date: date, end_date: date) -> int:
    """Calculate number of work days between two dates (weekdays Mon-Fri only)."""
    if start_date > end_date:
        return 0
    days = 0
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:  # Monday=0 to Friday=4
            days += 1
        current += timedelta(days=1)
    return days