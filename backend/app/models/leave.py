import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, Enum as SAEnum, ForeignKey, Date, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.session import Base


class LeaveStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED_L1 = "APPROVED_L1"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class ApprovalLevel(str, enum.Enum):
    SINGLE = "SINGLE"
    DOUBLE = "DOUBLE"
    MANAGEMENT = "MANAGEMENT"


class QuotaUnit(str, enum.Enum):
    DAYS = "DAYS"
    HOURS = "HOURS"


class LeaveType(Base):
    __tablename__ = "leave_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type_name = Column(String(100), nullable=False)
    type_code = Column(String(5), unique=True, nullable=False)
    default_quota = Column(Integer, nullable=False, default=12)
    quota_unit = Column(SAEnum(QuotaUnit, name="quota_unit", create_type=False), default=QuotaUnit.DAYS)
    carry_over_enabled = Column(Boolean, default=False)
    carry_over_max = Column(Integer, nullable=True)
    requires_attachment = Column(Boolean, default=False)
    min_notice_days = Column(Integer, default=0)
    approval_level = Column(String(20), default="SINGLE")  # SINGLE, DOUBLE, MANAGEMENT
    is_active = Column(Boolean, default=True)
    color_code = Column(String(7), default="#3B82F6")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    leave_requests = relationship("LeaveRequest", back_populates="leave_type")
    leave_balances = relationship("LeaveBalance", back_populates="leave_type")


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    leave_type_id = Column(UUID(as_uuid=True), ForeignKey("leave_types.id"), nullable=False, index=True)
    total_quota = Column(Integer, nullable=False, default=0)
    used = Column(Integer, nullable=False, default=0)
    pending = Column(Integer, nullable=False, default=0)
    quota_year = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("User", back_populates="leave_balances", foreign_keys=[employee_id])
    leave_type = relationship("LeaveType", back_populates="leave_balances")

    __table_args__ = (
        UniqueConstraint("employee_id", "leave_type_id", "quota_year", name="unique_employee_leave_year"),
    )


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    leave_type_id = Column(UUID(as_uuid=True), ForeignKey("leave_types.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    days_requested = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    half_day = Column(Boolean, default=False)
    half_day_type = Column(String(20), nullable=True)  # MORNING | AFTERNOON
    status = Column(SAEnum(LeaveStatus, name="leave_status_enum", create_type=False), default=LeaveStatus.PENDING)
    current_approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    idempotency_key = Column(String(64), unique=True, nullable=True)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("User", back_populates="leave_requests", foreign_keys=[employee_id])
    leave_type = relationship("LeaveType", back_populates="leave_requests")
    approvals = relationship("LeaveApproval", back_populates="leave_request")


class LeaveApproval(Base):
    __tablename__ = "leave_approvals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    leave_request_id = Column(UUID(as_uuid=True), ForeignKey("leave_requests.id"), nullable=False)
    level = Column(Integer, nullable=False)  # 1, 2, 3
    approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default="PENDING")  # PENDING | APPROVED | REJECTED
    action_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    leave_request = relationship("LeaveRequest", back_populates="approvals")