from pydantic import BaseModel, Field
from typing import Optional
import uuid


class GeoZoneCreate(BaseModel):
    zone_name: str = Field(..., min_length=1, max_length=100)
    zone_type: str = "OFFICE"
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_meters: int = Field(100, ge=10, le=5000)
    address: Optional[str] = None


class GeoZoneUpdate(BaseModel):
    zone_name: Optional[str] = None
    zone_type: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    radius_meters: Optional[int] = Field(None, ge=10, le=5000)
    address: Optional[str] = None
    is_active: Optional[bool] = None


class GeoZoneResponse(BaseModel):
    id: uuid.UUID
    zone_name: str
    zone_type: str
    latitude: float
    longitude: float
    radius_meters: int
    address: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True