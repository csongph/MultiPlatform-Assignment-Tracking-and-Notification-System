import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    user: UserOut


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int


class OnboardingConnections(BaseModel):
    google: bool = False
    microsoft: bool = False


class OnboardingStatusResponse(BaseModel):
    has_connection: bool
    connections: OnboardingConnections


class OnboardingUpdateRequest(BaseModel):
    provider: str
    connected: bool