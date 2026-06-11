import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.session import Base


class UserRole(str, enum.Enum):
    HR_ADMIN = "HR_ADMIN"
    EMPLOYEE = "EMPLOYEE"


class EmploymentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    RESIGNED = "RESIGNED"
    TERMINATED = "TERMINATED"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole, name="user_role", create_type=False), default=UserRole.EMPLOYEE, nullable=False)
    department = Column(String(100), nullable=True)
    supervisor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    join_date = Column(DateTime, default=datetime.utcnow)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    employment_status = Column(SAEnum(EmploymentStatus, name="employment_status", create_type=False), default=EmploymentStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    supervisor = relationship("User", remote_side=[id], backref="subordinates")
    attendance_logs = relationship("AttendanceLog", back_populates="employee", foreign_keys="AttendanceLog.employee_id")
    leave_requests = relationship("LeaveRequest", back_populates="employee", foreign_keys="LeaveRequest.employee_id")
    leave_balances = relationship("LeaveBalance", back_populates="employee", foreign_keys="LeaveBalance.employee_id")