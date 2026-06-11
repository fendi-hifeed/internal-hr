from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import date, datetime


class LeaveTypeBase(BaseModel):
    type_name: str = Field(..., min_length=1, max_length=100)
    type_code: str = Field(..., min_length=1, max_length=5)
    default_quota: int = Field(..., ge=0)
    quota_unit: str = "DAYS"
    carry_over_enabled: bool = False
    carry_over_max: Optional[int] = Field(None, ge=0)
    requires_attachment: bool = False
    min_notice_days: int = Field(0, ge=0)
    approval_level: str = "SINGLE"
    is_active: bool = True
    color_code: str = "#3B82F6"
    description: Optional[str] = None


class LeaveTypeCreate(LeaveTypeBase):
    pass


class LeaveTypeUpdate(BaseModel):
    type_name: Optional[str] = Field(None, min_length=1, max_length=100)
    default_quota: Optional[int] = Field(None, ge=0)
    quota_unit: Optional[str] = None
    carry_over_enabled: Optional[bool] = None
    carry_over_max: Optional[int] = Field(None, ge=0)
    requires_attachment: Optional[bool] = None
    min_notice_days: Optional[int] = Field(None, ge=0)
    approval_level: Optional[str] = None
    is_active: Optional[bool] = None
    color_code: Optional[str] = None
    description: Optional[str] = None


class LeaveTypeResponse(BaseModel):
    id: uuid.UUID
    type_name: str
    type_code: str
    default_quota: int
    quota_unit: str
    carry_over_enabled: bool
    carry_over_max: Optional[int]
    requires_attachment: bool
    min_notice_days: int
    approval_level: str
    is_active: bool
    color_code: str
    description: Optional[str]

    class Config:
        from_attributes = True


class LeaveBalanceResponse(BaseModel):
    leave_type_id: uuid.UUID
    leave_type_name: str
    leave_type_code: str
    color_code: str
    total_quota: int
    used: int
    pending: int
    available: int
    quota_unit: str

    class Config:
        from_attributes = True


class LeaveApprovalResponse(BaseModel):
    level: int
    approver_id: Optional[uuid.UUID] = None
    approver_name: Optional[str] = None
    approver_role: Optional[str] = None
    status: str
    action_at: Optional[datetime] = None
    notes: Optional[str] = None


class LeaveRequestCreate(BaseModel):
    leave_type_id: uuid.UUID
    start_date: date
    end_date: date
    reason: str = Field(..., min_length=1)
    attachment_url: Optional[str] = None
    half_day: bool = False
    half_day_type: Optional[str] = None
    idempotency_key: Optional[str] = Field(None, max_length=64)


class LeaveRequestResponse(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: Optional[str] = None
    leave_type_id: uuid.UUID
    leave_type_name: Optional[str] = None
    leave_type_code: Optional[str] = None
    color_code: Optional[str] = None
    start_date: date
    end_date: date
    days_requested: int
    reason: str
    attachment_url: Optional[str] = None
    half_day: bool
    half_day_type: Optional[str] = None
    status: str
    current_approver_id: Optional[uuid.UUID] = None
    current_approver_name: Optional[str] = None
    approval_history: List[LeaveApprovalResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeaveApprovalAction(BaseModel):
    notes: Optional[str] = None
    version: int = Field(..., ge=1)


class LeaveQuotaUpdate(BaseModel):
    custom_quota: int = Field(..., ge=0)
    notes: Optional[str] = None