```python
from logging.config import fileConfig
from pathlib import Path
import sys

from alembic import context
from sqlalchemy import create_engine, pool

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.models import Base

config = context.config

# Convert async PostgreSQL URL to a synchronous URL for Alembic.
_raw_url = settings.DATABASE_URL.replace("+asyncpg", "")

# Handle Neon PostgreSQL SSL configuration.
if "?ssl=require" in _raw_url:
    _raw_url = _raw_url.replace("?ssl=require", "")
    _SYNC_SSL = True
else:
    _SYNC_SSL = False

config.set_main_option("sqlalchemy.url", _raw_url)

# Configure logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Register model metadata for Alembic autogenerate.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without creating a database connection."""
    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations using a synchronous SQLAlchemy engine."""
    url = config.get_main_option("sqlalchemy.url")

    connect_args = {"sslmode": "require"} if _SYNC_SSL else {}

    connectable = create_engine(
        url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    try:
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
            )

            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```