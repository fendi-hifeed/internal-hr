from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    department: Optional[str] = None
    supervisor_id: Optional[uuid.UUID] = None
    join_date: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = "EMPLOYEE"
    department: Optional[str] = None
    supervisor_id: Optional[uuid.UUID] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    department: Optional[str] = None
    supervisor_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    department: Optional[str] = None
    supervisor_id: Optional[uuid.UUID] = None
    join_date: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


# Forward reference
LoginResponse.model_rebuild()