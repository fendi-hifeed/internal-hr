from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.db.session import get_db
from app.models.user import User, EmploymentStatus
from app.models.clearance import (
    ClearanceConfigItem, Resignation, ClearanceItem,
    ClearanceCategory, ClearanceItemStatus, ResignationStatus,
)
from app.schemas.clearance import (
    ClearanceConfigItemCreate, ClearanceConfigItemUpdate, ClearanceConfigItemResponse,
    ResignationCreate, ResignationApprove, ResignationCancel,
    ResignationResponse, ResignationDetailResponse,
    ClearanceItemComplete, ClearanceItemResponse,
    ClearanceDashboardStats,
)
from app.core.security import get_current_user, get_current_admin

router = APIRouter(prefix="/clearance", tags=["Clearance & Resignation"])


# =============================================================================
# Helper
# =============================================================================
def _category_label(cat: str) -> str:
    labels = {
        "IT_EQUIPMENT": "IT & Peralatan",
        "DOCUMENTS": "Dokumen",
        "FINANCE": "Keuangan",
        "FACILITIES": "Fasilitas",
        "HR_ADMIN": "HR & Admin",
        "SUPERVISOR": "Supervisor",
        "OTHER": "Lainnya",
    }
    return labels.get(cat, cat)


# =============================================================================
# Dashboard Stats
# =============================================================================
@router.get("/stats", response_model=ClearanceDashboardStats)
async def get_clearance_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get clearance dashboard summary."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    # DB stores naive datetimes — strip tzinfo for comparison
    month_start_naive = month_start.replace(tzinfo=None)

    pending_q = await db.execute(
        select(func.count(Resignation.id)).where(Resignation.status == ResignationStatus.PENDING)
    )
    in_progress_q = await db.execute(
        select(func.count(Resignation.id)).where(Resignation.status == ResignationStatus.IN_PROGRESS)
    )
    cleared_q = await db.execute(
        select(func.count(Resignation.id)).where(
            Resignation.status == ResignationStatus.CLEARED,
            Resignation.updated_at >= month_start_naive,
        )
    )
    total_active_q = await db.execute(
        select(func.count(Resignation.id)).where(
            Resignation.status.in_([ResignationStatus.PENDING, ResignationStatus.IN_PROGRESS])
        )
    )

    return ClearanceDashboardStats(
        pending_initiations=pending_q.scalar() or 0,
        in_progress=in_progress_q.scalar() or 0,
        cleared_this_month=cleared_q.scalar() or 0,
        total_active_resignations=total_active_q.scalar() or 0,
    )


# =============================================================================
# Clearance Config Items (HR Setup)
# =============================================================================
@router.get("/config", response_model=List[ClearanceConfigItemResponse])
async def list_config_items(
    include_inactive: bool = False,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all clearance config template items."""
    query = select(ClearanceConfigItem)
    if not include_inactive:
        query = query.where(ClearanceConfigItem.is_active == True)
    result = await db.execute(query.order_by(ClearanceConfigItem.order_index, ClearanceConfigItem.item_name))
    return list(result.scalars().all())


@router.post("/config", response_model=ClearanceConfigItemResponse, status_code=status.HTTP_201_CREATED)
async def create_config_item(
    data: ClearanceConfigItemCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new clearance config item template."""
    item = ClearanceConfigItem(
        item_name=data.item_name,
        description=data.description,
        category=ClearanceCategory(data.category),
        requires_proof=data.requires_proof,
        order_index=data.order_index,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/config/{item_id}", response_model=ClearanceConfigItemResponse)
async def update_config_item(
    item_id: uuid.UUID,
    data: ClearanceConfigItemUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a clearance config item."""
    result = await db.execute(select(ClearanceConfigItem).where(ClearanceConfigItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")

    update_data = data.model_dump(exclude_unset=True)
    if "category" in update_data:
        update_data["category"] = ClearanceCategory(update_data["category"])
    for key, value in update_data.items():
        setattr(item, key, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/config/{item_id}")
async def delete_config_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a clearance config item (set is_active=False)."""
    result = await db.execute(select(ClearanceConfigItem).where(ClearanceConfigItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    item.is_active = False
    await db.commit()
    return {"message": "Item dihapus dari template"}


@router.post("/config/reorder")
async def reorder_config_items(
    item_orders: List[dict],  # [{id: uuid, order_index: int}]
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Bulk reorder clearance config items."""
    for entry in item_orders:
        result = await db.execute(select(ClearanceConfigItem).where(ClearanceConfigItem.id == entry["id"]))
        item = result.scalar_one_or_none()
        if item:
            item.order_index = entry["order_index"]
    await db.commit()
    return {"message": "Urutan item diupdate"}


# =============================================================================
# Resignations
# =============================================================================
@router.get("/resignations", response_model=List[ResignationResponse])
async def list_resignations(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all resignations. HR_ADMIN sees all, employee sees own."""
    query = select(Resignation).options(
        selectinload(Resignation.employee),
        selectinload(Resignation.initiator),
        selectinload(Resignation.approver),
        selectinload(Resignation.clearance_items),
    )

    if current_user.role.value != "HR_ADMIN":
        query = query.where(Resignation.employee_id == current_user.id)
    elif status_filter:
        query = query.where(Resignation.status == ResignationStatus(status_filter))

    result = await db.execute(query.order_by(Resignation.created_at.desc()))
    resignations = result.scalars().all()

    return [_to_resignation_response(r) for r in resignations]


@router.get("/resignations/{resignation_id}", response_model=ResignationDetailResponse)
async def get_resignation(
    resignation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get resignation detail with clearance items."""
    result = await db.execute(
        select(Resignation).where(Resignation.id == resignation_id).options(
            selectinload(Resignation.employee),
            selectinload(Resignation.initiator),
            selectinload(Resignation.approver),
            selectinload(Resignation.clearance_items).selectinload(ClearanceItem.completer),
        )
    )
    resignation = result.scalar_one_or_none()
    if not resignation:
        raise HTTPException(status_code=404, detail="Resignasi tidak ditemukan")

    if current_user.role.value != "HR_ADMIN" and resignation.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Akses ditolak")

    return _to_resignation_detail_response(resignation)


@router.post("/resignations", response_model=ResignationResponse, status_code=status.HTTP_201_CREATED)
async def initiate_resignation(
    data: ResignationCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Initiate a resignation/clearance process for an employee (HR Admin only)."""
    # Check employee exists
    emp_result = await db.execute(select(User).where(User.id == data.employee_id))
    employee = emp_result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan")

    if employee.employment_status != EmploymentStatus.ACTIVE:
        raise HTTPException(status_code=400, detail=f"Karyawan sudah berstatus {employee.employment_status.value}")

    # Check no active resignation exists
    active_result = await db.execute(
        select(Resignation).where(
            Resignation.employee_id == data.employee_id,
            Resignation.status.in_([ResignationStatus.PENDING, ResignationStatus.IN_PROGRESS]),
        )
    )
    if active_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Karyawan sudah memiliki proses resign aktif")

    # Create resignation
    resignation = Resignation(
        employee_id=data.employee_id,
        resignation_date=data.resignation_date,
        last_work_date=data.last_work_date,
        reason=data.reason,
        status=ResignationStatus.PENDING,
        initiated_by=current_user.id,
    )
    db.add(resignation)
    await db.flush()

    # Generate clearance items from config template
    config_result = await db.execute(
        select(ClearanceConfigItem).where(ClearanceConfigItem.is_active == True).order_by(ClearanceConfigItem.order_index)
    )
    config_items = config_result.scalars().all()

    for ci in config_items:
        clearance_item = ClearanceItem(
            resignation_id=resignation.id,
            config_item_id=ci.id,
            item_name=ci.item_name,
            item_category=ci.category,
            status=ClearanceItemStatus.PENDING,
        )
        db.add(clearance_item)

    await db.commit()
    await db.refresh(resignation)

    # Reload with relationships
    result = await db.execute(
        select(Resignation).where(Resignation.id == resignation.id).options(
            selectinload(Resignation.employee),
            selectinload(Resignation.initiator),
            selectinload(Resignation.approver),
            selectinload(Resignation.clearance_items),
        )
    )
    return _to_resignation_response(result.scalar_one())


@router.post("/resignations/{resignation_id}/approve")
async def approve_resignation(
    resignation_id: uuid.UUID,
    data: ResignationApprove,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """HR Admin approves resignation → status changes to IN_PROGRESS."""
    result = await db.execute(select(Resignation).where(Resignation.id == resignation_id))
    resignation = result.scalar_one_or_none()
    if not resignation:
        raise HTTPException(status_code=404, detail="Resignasi tidak ditemukan")

    if resignation.status != ResignationStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Resignasi sudah berstatus {resignation.status.value}")

    resignation.status = ResignationStatus.IN_PROGRESS
    resignation.approved_by = current_user.id
    resignation.approved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    if data.notes:
        resignation.notes = (resignation.notes or "") + f"\n[APPROVE] {data.notes}"

    await db.commit()
    return {"message": "Resignasi disetujui, clearance berjalan"}


@router.post("/resignations/{resignation_id}/complete")
async def complete_resignation(
    resignation_id: uuid.UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Complete resignation — mark employee as RESIGNED if all clearance items done."""
    result = await db.execute(
        select(Resignation).where(Resignation.id == resignation_id).options(
            selectinload(Resignation.employee),
            selectinload(Resignation.clearance_items),
        )
    )
    resignation = result.scalar_one_or_none()
    if not resignation:
        raise HTTPException(status_code=404, detail="Resignasi tidak ditemukan")

    if resignation.status == ResignationStatus.CLEARED:
        raise HTTPException(status_code=400, detail="Resignasi sudah completed")

    # Check all items completed or waived
    pending_items = [ci for ci in resignation.clearance_items if ci.status == ClearanceItemStatus.PENDING]
    if pending_items:
        raise HTTPException(
            status_code=400,
            detail=f"Masih ada {len(pending_items)} item clearance belum selesai"
        )

    resignation.status = ResignationStatus.CLEARED
    resignation.employee.employment_status = EmploymentStatus.RESIGNED
    resignation.employee.is_active = False

    await db.commit()
    return {"message": "Clearance selesai, karyawan ditandai resign"}


@router.post("/resignations/{resignation_id}/cancel")
async def cancel_resignation(
    resignation_id: uuid.UUID,
    data: ResignationCancel,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a resignation."""
    result = await db.execute(select(Resignation).where(Resignation.id == resignation_id))
    resignation = result.scalar_one_or_none()
    if not resignation:
        raise HTTPException(status_code=404, detail="Resignasi tidak ditemukan")

    if resignation.status == ResignationStatus.CLEARED:
        raise HTTPException(status_code=400, detail="Tidak bisa cancel resignasi yang sudah cleared")

    resignation.status = ResignationStatus.CANCELLED
    if data.notes:
        resignation.notes = (resignation.notes or "") + f"\n[CANCEL] {data.notes}"

    await db.commit()
    return {"message": "Resignasi dibatalkan"}


# =============================================================================
# Clearance Items
# =============================================================================
@router.get("/resignations/{resignation_id}/items", response_model=List[ClearanceItemResponse])
async def list_clearance_items(
    resignation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all clearance items for a resignation."""
    result = await db.execute(
        select(ClearanceItem).where(ClearanceItem.resignation_id == resignation_id).options(
            selectinload(ClearanceItem.completer),
            selectinload(Resignation).selectinload(Resignation.employee),
        )
    )
    items = result.scalars().all()

    # Non-HR can only see own resignation items
    if current_user.role.value != "HR_ADMIN":
        items = [i for i in items if i.resignation.employee_id == current_user.id]

    return [_to_clearance_item_response(i) for i in items]


@router.put("/resignations/{resignation_id}/items/{item_id}", response_model=ClearanceItemResponse)
async def update_clearance_item(
    resignation_id: uuid.UUID,
    item_id: uuid.UUID,
    data: ClearanceItemComplete,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a clearance item as completed or waived."""
    result = await db.execute(
        select(ClearanceItem).where(
            ClearanceItem.id == item_id,
            ClearanceItem.resignation_id == resignation_id,
        ).options(selectinload(ClearanceItem.resignation))
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")

    if item.resignation.status not in [ResignationStatus.PENDING, ResignationStatus.IN_PROGRESS]:
        raise HTTPException(status_code=400, detail="Resignasi sudah tidak aktif")

    item.status = ClearanceItemStatus.WAIVED if data.waive else ClearanceItemStatus.COMPLETED
    item.completed_by = current_user.id
    item.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    if data.notes:
        item.notes = data.notes
    if data.proof_url:
        item.proof_url = data.proof_url

    await db.commit()
    await db.refresh(item)

    result2 = await db.execute(select(ClearanceItem).where(ClearanceItem.id == item_id).options(selectinload(ClearanceItem.completer)))
    return _to_clearance_item_response(result2.scalar_one())


# =============================================================================
# My Resignation (Employee self-view)
# =============================================================================
@router.get("/my", response_model=Optional[ResignationDetailResponse])
async def get_my_resignation(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's active resignation with clearance items."""
    result = await db.execute(
        select(Resignation).where(
            Resignation.employee_id == current_user.id,
            Resignation.status.in_([ResignationStatus.PENDING, ResignationStatus.IN_PROGRESS]),
        ).options(
            selectinload(Resignation.employee),
            selectinload(Resignation.initiator),
            selectinload(Resignation.approver),
            selectinload(Resignation.clearance_items).selectinload(ClearanceItem.completer),
        )
    )
    resignation = result.scalar_one_or_none()
    if not resignation:
        return None
    return _to_resignation_detail_response(resignation)


# =============================================================================
# Serializers
# =============================================================================
def _to_resignation_response(r: Resignation) -> ResignationResponse:
    total = len(r.clearance_items) if r.clearance_items else 0
    completed = sum(1 for ci in (r.clearance_items or []) if ci.status in [ClearanceItemStatus.COMPLETED, ClearanceItemStatus.WAIVED])
    return ResignationResponse(
        id=r.id,
        employee_id=r.employee_id,
        employee_name=r.employee.name if r.employee else None,
        resignation_date=r.resignation_date,
        last_work_date=r.last_work_date,
        reason=r.reason,
        status=r.status.value,
        initiated_by=r.initiated_by,
        initiator_name=r.initiator.name if r.initiator else None,
        approved_by=r.approved_by,
        approver_name=r.approver.name if r.approver else None,
        approved_at=r.approved_at,
        notes=r.notes,
        total_items=total,
        completed_items=completed,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


def _to_resignation_detail_response(r: Resignation) -> ResignationDetailResponse:
    base = _to_resignation_response(r)
    items = [_to_clearance_item_response(ci) for ci in (r.clearance_items or [])]
    return ResignationDetailResponse(**base.model_dump(), clearance_items=items)


def _to_clearance_item_response(ci: ClearanceItem) -> ClearanceItemResponse:
    return ClearanceItemResponse(
        id=ci.id,
        resignation_id=ci.resignation_id,
        config_item_id=ci.config_item_id,
        item_name=ci.item_name,
        item_category=ci.item_category.value if ci.item_category else ci.item_category,
        status=ci.status.value,
        completed_by=ci.completed_by,
        completer_name=ci.completer.name if ci.completer else None,
        completed_at=ci.completed_at,
        notes=ci.notes,
        proof_url=ci.proof_url,
        created_at=ci.created_at,
    )