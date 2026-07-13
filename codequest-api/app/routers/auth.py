"""认证路由 - 注册/登录/刷新令牌"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, RefreshToken
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.core.rate_limit import register_limiter, login_limiter

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """用户注册"""
    await register_limiter(request=request)
    # 检查用户名是否已存在
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="用户名已存在")

    # 检查邮箱是否已存在
    if user_data.email:
        result = await db.execute(select(User).where(User.email == user_data.email))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="邮箱已被注册")

    # 创建用户
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    await db.commit()
    return user


@router.post("/login", response_model=Token)
async def login(request: Request, user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """用户登录"""
    await login_limiter(request=request)
    result = await db.execute(select(User).where(User.username == user_data.username))
    user = result.scalars().first()

    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    # 检查用户是否被封禁
    if getattr(user, 'is_banned', False):
        reason = getattr(user, 'banned_reason', None) or "账号已被禁用"
        raise HTTPException(status_code=403, detail=f"账号已被禁用：{reason}")

    # 更新最后登录时间
    from datetime import datetime, timezone
    user.last_login_at = datetime.now(timezone.utc)

    # 生成 JWT
    access_token = create_access_token(data={"sub": str(user.id)})
    await db.commit()
    return Token(access_token=access_token, token_type="bearer")


@router.post("/refresh", response_model=Token)
async def refresh_token(data: RefreshToken):
    """刷新令牌"""
    payload = decode_access_token(data.refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="无效的令牌")

    # 显式检查令牌未过期（防御性编程，与 jwt.decode 默认验证并行）
    exp = payload.get("exp")
    if not exp:
        raise HTTPException(status_code=401, detail="无效的令牌")
    from datetime import datetime, timezone
    if datetime.now(timezone.utc).timestamp() > exp:
        raise HTTPException(status_code=401, detail="令牌已过期")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="无效的令牌")

    access_token = create_access_token(data={"sub": user_id})
    return Token(access_token=access_token, token_type="bearer")
