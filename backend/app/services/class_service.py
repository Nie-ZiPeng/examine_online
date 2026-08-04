from typing import List, Optional, Tuple

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.class_ import SchoolClass
from app.models.user import User


async def get_classes(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    keyword: Optional[str] = None,
) -> Tuple[List[SchoolClass], int]:
    query = select(SchoolClass)
    if keyword:
        query = query.where(SchoolClass.name.contains(keyword))
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    return list(result.scalars().all()), total


async def get_all_classes(db: AsyncSession) -> List[SchoolClass]:
    result = await db.execute(select(SchoolClass).order_by(SchoolClass.id))
    return list(result.scalars().all())


async def create_class(
    db: AsyncSession,
    name: str,
    grade: Optional[str] = None,
    description: Optional[str] = None,
) -> SchoolClass:
    class_ = SchoolClass(name=name, grade=grade, description=description)
    db.add(class_)
    await db.commit()
    await db.refresh(class_)
    return class_


async def update_class(
    db: AsyncSession,
    class_id: int,
    name: Optional[str] = None,
    grade: Optional[str] = None,
    description: Optional[str] = None,
) -> Optional[SchoolClass]:
    class_ = await db.get(SchoolClass, class_id)
    if not class_:
        return None
    if name is not None:
        class_.name = name
    if grade is not None:
        class_.grade = grade
    if description is not None:
        class_.description = description
    await db.commit()
    await db.refresh(class_)
    return class_


async def delete_class(db: AsyncSession, class_id: int) -> bool:
    class_ = await db.get(SchoolClass, class_id)
    if not class_:
        return False
    # 清空该班级下学生的 class_id，避免外键残留
    from sqlalchemy import update as sa_update

    await db.execute(sa_update(User).where(User.class_id == class_id).values(class_id=None))
    await db.delete(class_)
    await db.commit()
    return True


async def get_class_students(db: AsyncSession, class_id: int) -> List[User]:
    result = await db.execute(
        select(User).where(User.class_id == class_id, User.role == "student")
    )
    return list(result.scalars().all())
