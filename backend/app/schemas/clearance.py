from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid


# ---- Enums as strings for schema ----
class ClearanceCategory(str):
    IT_EQUIPMENT = "IT_EQUIPMENT"
    DOCUMENTS = "DOCUMENTS"
    FINANCE = "FINANCE"
    FACILITIES = "FACILITIES"
    HR_ADMIN = "HR_ADMIN"
    SUPERVISOR = "SUPERVISOR"
    OTHER = "OTHER"


class ClearanceItemStatus(str):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    WAIVED = "WAIVED"


class ResignationStatus(str):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    CLEARED = "CLEARED"
    CANCELLED = "CANCELLED"


class EmploymentStatus(str):
    ACTIVE = "ACTIVE"
    RESIGNED = "RESIGNED"
    TERMINATED = "TERMINATED"


# =============================================================================
# Clearance Config Item (HR Setup)
# =============================================================================
class ClearanceConfigItemCreate(BaseModel):
    item_name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    category: str = Field(..., pattern="^(IT_EQUIPMENT|DOCUMENTS|FINANCE|FACILITIES|HR_ADMIN|SUPERVISOR|OTHER)$")
    requires_proof: bool = False
    order_index: int = 0


class ClearanceConfigItemUpdate(BaseModel):
    item_name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(None, pattern="^(IT_EQUIPMENT|DOCUMENTS|FINANCE|FACILITIES|HR_ADMIN|SUPERVISOR|OTHER)$")
    requires_proof: Optional[bool] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


class ClearanceConfigItemResponse(BaseModel):
    id: uuid.UUID
    item_name: str
    description: Optional[str]
    category: str
    requires_proof: bool
    order_index: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# Resignation
# =============================================================================
class ResignationCreate(BaseModel):
    employee_id: uuid.UUID
    resignation_date: datetime
    last_work_date: datetime
    reason: Optional[str] = None


class ResignationApprove(BaseModel):
    notes: Optional[str] = None


class ResignationCancel(BaseModel):
    notes: Optional[str] = None


class ResignationResponse(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: Optional[str] = None
    resignation_date: datetime
    last_work_date: datetime
    reason: Optional[str]
    status: str
    initiated_by: uuid.UUID
    initiator_name: Optional[str] = None
    approved_by: Optional[uuid.UUID] = None
    approver_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str]
    total_items: int = 0
    completed_items: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# Clearance Item
# =============================================================================
class ClearanceItemComplete(BaseModel):
    notes: Optional[str] = None
    proof_url: Optional[str] = None
    waive: bool = False  # True = waive item instead of complete


class ClearanceItemResponse(BaseModel):
    id: uuid.UUID
    resignation_id: uuid.UUID
    config_item_id: Optional[uuid.UUID]
    item_name: str
    item_category: str
    status: str
    completed_by: Optional[uuid.UUID]
    completer_name: Optional[str] = None
    completed_at: Optional[datetime]
    notes: Optional[str]
    proof_url: Optional[str]
    requires_proof: bool = False  # from config template
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# Dashboard summary
# =============================================================================
class ClearanceDashboardStats(BaseModel):
    pending_initiations: int = 0
    in_progress: int = 0
    cleared_this_month: int = 0
    total_active_resignations: int = 0


class ResignationDetailResponse(ResignationResponse):
    clearance_items: List[ClearanceItemResponse] = []