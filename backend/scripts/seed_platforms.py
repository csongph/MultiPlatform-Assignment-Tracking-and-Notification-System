"""
Run once after migrations, to insert the platform rows that
oauth_connections.platform_id foreign-keys against.

Usage (from backend/ folder, with venv activated):
    python -m scripts.seed_platforms
"""
import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.core import Platform

PLATFORM_NAMES = ["google_classroom", "microsoft_teams"]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        for name in PLATFORM_NAMES:
            result = await session.execute(select(Platform).where(Platform.name == name))
            if result.scalar_one_or_none() is None:
                session.add(Platform(name=name))
                print(f"  + adding platform '{name}'")
            else:
                print(f"  = platform '{name}' already exists, skipping")
        await session.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(seed())
