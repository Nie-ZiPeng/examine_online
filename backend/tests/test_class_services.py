import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.class_service import (
    create_class, get_classes, get_all_classes, update_class,
    delete_class, get_class_students,
)


@pytest.mark.asyncio
async def test_create_and_get_classes(db: AsyncSession):
    await create_class(db, "计算机2024级1班", "2024级", "测试")
    await create_class(db, "软件2024级1班")
    classes, total = await get_classes(db)
    assert total == 2
    assert classes[0].name == "计算机2024级1班"


@pytest.mark.asyncio
async def test_get_classes_keyword(db: AsyncSession):
    await create_class(db, "计算机2024级1班")
    await create_class(db, "软件2024级1班")
    _, total = await get_classes(db, keyword="计算机")
    assert total == 1


@pytest.mark.asyncio
async def test_update_class(db: AsyncSession):
    class_ = await create_class(db, "旧名称")
    updated = await update_class(db, class_.id, name="新名称")
    assert updated is not None
    assert updated.name == "新名称"


@pytest.mark.asyncio
async def test_update_class_not_found(db: AsyncSession):
    assert await update_class(db, 999, name="x") is None


@pytest.mark.asyncio
async def test_delete_class(db: AsyncSession):
    class_ = await create_class(db, "待删除")
    assert await delete_class(db, class_.id) is True
    _, total = await get_classes(db)
    assert total == 0


@pytest.mark.asyncio
async def test_delete_class_clears_student_class_id(db: AsyncSession):
    class_ = await create_class(db, "班级A")
    db.add(User(username="stu1", password_hash="x", role="student",
                name="学生1", class_id=class_.id))
    await db.commit()
    assert await delete_class(db, class_.id) is True
    result = await db.execute(
        __import__("sqlalchemy").select(User).where(User.username == "stu1")
    )
    assert result.scalar_one().class_id is None


@pytest.mark.asyncio
async def test_get_class_students(db: AsyncSession):
    class_ = await create_class(db, "班级B")
    db.add_all([
        User(username="s1", password_hash="x", role="student",
             name="学生1", class_id=class_.id),
        User(username="s2", password_hash="x", role="student",
             name="学生2", class_id=class_.id),
        User(username="t1", password_hash="x", role="teacher", name="教师1"),
    ])
    await db.commit()
    students = await get_class_students(db, class_.id)
    assert len(students) == 2


@pytest.mark.asyncio
async def test_get_all_classes(db: AsyncSession):
    await create_class(db, "一班")
    await create_class(db, "二班")
    assert len(await get_all_classes(db)) == 2
