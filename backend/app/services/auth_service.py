from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.auth import User
from app.repositories.user_repository import UserRepository


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.users = UserRepository(db)

    async def register(self, email: str, password: str, display_name: str) -> User:
        existing = await self.users.get_by_email(email)
        if existing:
            raise ConflictError("An account with this email already exists")
        return await self.users.create(
            email=email,
            password_hash=hash_password(password),
            display_name=display_name,
        )

    async def authenticate(self, email: str, password: str) -> User:
        user = await self.users.get_by_email(email)
        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            raise UnauthorizedError("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedError("This account has been deactivated")
        return user

    @staticmethod
    def issue_tokens(user: User) -> tuple[str, str]:
        return create_access_token(user.id), create_refresh_token(user.id)
