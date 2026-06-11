import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey, Date, Enum as SAEnum, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.session import Base


class FlagStatus(str, enum.Enum):
    ON_TIME = "ON_TIME"
    LATE = "LATE"
    VERY_LATE = "VERY_LATE"
    ABSENT_FLAG = "ABSENT_FLAG"


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)

    # Clock In
    clock_in_time = Column(DateTime, nullable=True)
    clock_in_photo = Column(String(500), nullable=True)
    clock_in_latitude = Column(Float, nullable=True)
    clock_in_longitude = Column(Float, nullable=True)
    clock_in_location_name = Column(String(255), nullable=True)
    clock_in_flag = Column(SAEnum(FlagStatus, name="flag_status", create_type=False), nullable=True)
    clock_in_device_id = Column(String(255), nullable=True)
    idempotency_key_clock_in = Column(String(64), nullable=True, unique=True)

    # Clock Out
    clock_out_time = Column(DateTime, nullable=True)
    clock_out_photo = Column(String(500), nullable=True)
    clock_out_latitude = Column(Float, nullable=True)
    clock_out_longitude = Column(Float, nullable=True)
    clock_out_location_name = Column(String(255), nullable=True)
    clock_out_notes = Column(Text, nullable=True)
    idempotency_key_clock_out = Column(String(64), nullable=True, unique=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = relationship("User", back_populates="attendance_logs", foreign_keys=[employee_id])

    __table_args__ = (
        UniqueConstraint("employee_id", "date", name="unique_employee_daily_attendance"),
    )