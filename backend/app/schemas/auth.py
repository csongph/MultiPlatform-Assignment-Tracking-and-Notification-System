import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


def _validate_bcrypt_password_size(value: str) -> str:
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 UTF-8 bytes")
    return value


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    _password_size = field_validator("password")(_validate_bcrypt_password_size)


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


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyPasswordRecoveryCodeRequest(BaseModel):
    email: EmailStr
    otp: str = Field(pattern=r"^\d{6}$")


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=72)

    _password_size = field_validator("new_password")(_validate_bcrypt_password_size)


class OnboardingConnections(BaseModel):
    google: bool = False
    microsoft: bool = False


class OnboardingStatusResponse(BaseModel):
    has_connection: bool
    connections: OnboardingConnections


class OnboardingUpdateRequest(BaseModel):
    provider: str
    connected: bool
