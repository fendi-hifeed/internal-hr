import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.session import Base


class ClearanceCategory(str, enum.Enum):
    IT_EQUIPMENT = "IT_EQUIPMENT"
    DOCUMENTS = "DOCUMENTS"
    FINANCE = "FINANCE"
    FACILITIES = "FACILITIES"
    HR_ADMIN = "HR_ADMIN"
    SUPERVISOR = "SUPERVISOR"
    OTHER = "OTHER"


class ClearanceItemStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    WAIVED = "WAIVED"


class ResignationStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    CLEARED = "CLEARED"
    CANCELLED = "CANCELLED"


class EmploymentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    RESIGNED = "RESIGNED"
    TERMINATED = "TERMINATED"


# =============================================================================
# Clearance Config Item — template checklist yang di-setup HR
# =============================================================================
class ClearanceConfigItem(Base):
    __tablename__ = "clearance_config_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(SAEnum(ClearanceCategory, name="clearance_category", create_type=False), nullable=False)
    requires_proof = Column(Boolean, default=False)  # upload bukti clearance
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    clearance_items = relationship("ClearanceItem", back_populates="config_item")


# =============================================================================
# Resignation — tracking pengajuan resign + clearance process
# =============================================================================
class Resignation(Base):
    __tablename__ = "resignations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    resignation_date = Column(DateTime, nullable=False)
    last_work_date = Column(DateTime, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(SAEnum(ResignationStatus, name="resignation_status", create_type=False), default=ResignationStatus.PENDING)
    initiated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = relationship("User", foreign_keys=[employee_id], backref="resignations")
    initiator = relationship("User", foreign_keys=[initiated_by])
    approver = relationship("User", foreign_keys=[approved_by])
    clearance_items = relationship("ClearanceItem", back_populates="resignation", cascade="all, delete-orphan")


# =============================================================================
# Clearance Item — checklist item per employee resignation
# =============================================================================
class ClearanceItem(Base):
    __tablename__ = "clearance_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resignation_id = Column(UUID(as_uuid=True), ForeignKey("resignations.id"), nullable=False, index=True)
    config_item_id = Column(UUID(as_uuid=True), ForeignKey("clearance_config_items.id"), nullable=True)
    item_name = Column(String(200), nullable=False)
    item_category = Column(SAEnum(ClearanceCategory, name="clearance_category", create_type=False), nullable=False)
    status = Column(SAEnum(ClearanceItemStatus, name="clearance_item_status", create_type=False), default=ClearanceItemStatus.PENDING)
    completed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    proof_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    resignation = relationship("Resignation", back_populates="clearance_items")
    config_item = relationship("ClearanceConfigItem", back_populates="clearance_items")
    completer = relationship("User", foreign_keys=[completed_by])
