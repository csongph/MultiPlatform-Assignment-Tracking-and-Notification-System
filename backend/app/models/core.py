import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.auth import User


class Platform(Base):
    __tablename__ = "platforms"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # google_classroom, microsoft_teams


class OAuthConnection(Base):
    __tablename__ = "oauth_connections"
    __table_args__ = (UniqueConstraint("user_id", "platform_id", name="uq_oauth_user_platform"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    platform_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("platforms.id"), nullable=False)

    access_token_enc: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="connected", nullable=False)  # connected/expired/broken
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="oauth_connections")
    platform: Mapped["Platform"] = relationship()


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = (
        UniqueConstraint(
            "platform_id", "external_course_id", "user_id", name="uq_course_platform_external_user"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    platform_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("platforms.id"), nullable=False)
    external_course_id: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="courses")
    platform: Mapped["Platform"] = relationship()
    assignments: Mapped[list["Assignment"]] = relationship(back_populates="course")


class Assignment(Base):
    __tablename__ = "assignments"
    __table_args__ = (
        UniqueConstraint("course_id", "external_assignment_id", name="uq_assignment_course_external"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    external_assignment_id: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True, nullable=True)
    source_status: Mapped[str] = mapped_column(String(30), nullable=False)
    computed_status: Mapped[str] = mapped_column(String(20), index=True, nullable=False)  # not_submitted/submitted/overdue
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    course: Mapped["Course"] = relationship(back_populates="assignments")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="assignment")


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False
    )
    lead_time_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)  # 1-43200
    new_assignment_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    due_soon_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    overdue_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    channel: Mapped[str] = mapped_column(String(20), default="push", nullable=False)  # push/email/both

    user: Mapped["User"] = relationship(back_populates="notification_settings")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assignment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assignments.id"), nullable=True
    )
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # new/due_soon/overdue
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True, nullable=False)
    retry_count: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="notifications")
    assignment: Mapped["Assignment"] = relationship(back_populates="notifications")