from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from app.models.user import User
from app.utils.security import hash_password

async def get_users(db: AsyncSession, page: int = 1, page_size: int = 10, role: str = None):
    query = select(User)
    if role:
        query = query.where(User.role == role)

    # 获取总数
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # 分页
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()

    return users, total

async def get_user(db: AsyncSession, user_id: int):
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, user_data: dict):
    user = User(
        username=user_data["username"],
        password_hash=hash_password(user_data["password"]),
        role=user_data["role"],
        name=user_data["name"],
        email=user_data.get("email"),
        phone=user_data.get("phone"),
        class_id=user_data.get("class_id") if user_data.get("role") == "student" else None
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="用户名已存在")
    await db.refresh(user)
    return user

async def update_user(db: AsyncSession, user_id: int, user_data: dict):
    user = await get_user(db, user_id)
    if not user:
        return None

    for key, value in user_data.items():
        if key == "class_id":
            setattr(user, key, value)
        elif value is not None:
            setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return user

async def delete_user(db: AsyncSession, user_id: int):
    user = await get_user(db, user_id)
    if not user:
        return False

    await db.delete(user)
    await db.commit()
    return True
