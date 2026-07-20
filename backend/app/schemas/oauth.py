import uuid
from datetime import datetime

from pydantic import BaseModel


class AuthorizeUrlResponse(BaseModel):
    authorization_url: str


class OAuthConnectionOut(BaseModel):
    id: uuid.UUID
    platform_id: int
    platform_name: str
    status: str
    token_expires_at: datetime | None
    connected_at: datetime

    model_config = {"from_attributes": True}
