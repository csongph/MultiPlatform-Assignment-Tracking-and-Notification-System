from logging.config import fileConfig
from pathlib import Path
import sys

from sqlalchemy import create_engine  # type: ignore
from sqlalchemy import pool  # type: ignore

from alembic import context

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.models import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# ✅ Convert DATABASE_URL from asyncpg format to a psycopg2-compatible URL for Alembic.
# - Remove the +asyncpg driver prefix.
# - Remove ?ssl=require because psycopg2 does not support that query string.
# - Use connect_args={'sslmode': 'require'} inside the engine for Neon PostgreSQL.
_raw_url = settings.DATABASE_URL.replace("+asyncpg", "")
if "?ssl=require" in _raw_url:
    _raw_url = _raw_url.replace("?ssl=require", "")
    _SYNC_SSL = True
else:
    _SYNC_SSL = False

config.set_main_option("sqlalchemy.url", _raw_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
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
    """Run migrations in 'online' mode.

    Use create_engine directly so sslmode=require works correctly with Neon PostgreSQL.
    """
    url = config.get_main_option("sqlalchemy.url")
    connect_args = {"sslmode": "require"} if _SYNC_SSL else {}
    connectable = create_engine(url, poolclass=pool.NullPool, connect_args=connect_args)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
