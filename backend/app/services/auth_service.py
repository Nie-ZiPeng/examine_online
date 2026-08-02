from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.utils.security import verify_password, create_access_token, hash_password
from app.redis_client import redis_client

async def authenticate_user(db: AsyncSession, username: str, password: str):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user

async def create_token(user: User) -> str:
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role}
    )
    return access_token

async def logout_user(token: str):
    await redis_client.set(f"blacklist:token:{token}", "1", ex=7200)

async def change_password(db: AsyncSession, user: User, old_password: str, new_password: str):
    if not verify_password(old_password, user.password_hash):
        return False, "原密码错误"
    if len(new_password) < 6:
        return False, "新密码长度不能少于6位"
    user.password_hash = hash_password(new_password)
    await db.commit()
    await db.refresh(user)
    return True, None
