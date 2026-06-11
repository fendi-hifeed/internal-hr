import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.session import Base


class GeoZoneType(str, enum.Enum):
    OFFICE = "OFFICE"
    BRANCH = "BRANCH"
    REMOTE = "REMOTE"


class GeoZone(Base):
    __tablename__ = "geo_zones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_name = Column(String(100), nullable=False)
    zone_type = Column(SAEnum(GeoZoneType, name="geo_zone_type", create_type=False), default=GeoZoneType.OFFICE)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_meters = Column(Integer, default=100)
    address = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
