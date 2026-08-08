import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from app.models.auth import User
from sqlalchemy import select

async def main():
    try:
        async with AsyncSessionLocal() as session:
            # Check if user already exists
            result = await session.execute(select(User).where(User.email == "test_user_new@example.com"))
            existing_user = result.scalars().first()
            if not existing_user:
                # Create a user
                new_user = User(
                    email="test_user_new@example.com",
                    display_name="Test User New",
                    password_hash="fakehash"
                )
                session.add(new_user)
                await session.commit()
                await session.refresh(new_user)
                print(f"SUCCESS: Created new user in DB: {new_user.email} with ID: {new_user.id}")
            else:
                print(f"User already exists: {existing_user.email}")
            
            # Retrieve the user
            result = await session.execute(select(User).where(User.email == "test_user_new@example.com"))
            user = result.scalars().first()
            if user:
                print(f"SUCCESS: Retrieved user from DB: {user.display_name} ({user.email})")
            else:
                print("ERROR: User not found after creation!")
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
