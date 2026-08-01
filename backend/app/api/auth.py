from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.user import LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import authenticate_user, create_token, logout_user
from app.utils.deps import get_current_user
from app.utils.response import success_response, error_response
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["认证"])

@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, request.username, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )
    token = await create_token(user)
    return success_response(
        data=TokenResponse(access_token=token).model_dump(),
        message="登录成功"
    )

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    # 实际项目中需要将token加入黑名单
    return success_response(message="登出成功")

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    user_data = UserResponse.model_validate(current_user).model_dump()
    return success_response(data=user_data)
