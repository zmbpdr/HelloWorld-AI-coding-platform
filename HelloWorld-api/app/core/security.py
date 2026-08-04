"""安全模块 - JWT token 创建和验证、密码哈希"""

from datetime import datetime, timedelta, timezone

import jwt
from jwt import PyJWTError
from passlib.context import CryptContext

from app.config import settings

# 密码哈希上下文：使用 bcrypt 算法进行密码加密和验证
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证明文密码与哈希密码是否匹配"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """生成密码的 bcrypt 哈希值"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """创建 JWT 访问令牌

    Args:
        data: 要编码到 token 中的数据（通常包含 sub 字段，即用户 ID）
        expires_delta: 自定义过期时间间隔，默认使用配置中的值
    Returns:
        编码后的 JWT 字符串
    """
    to_encode = data.copy()
    # 设置过期时间：优先使用传入的 expires_delta，否则使用全局配置
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    # 使用 HMAC-SHA256 算法对 payload 进行签名
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict | None:
    """解码并验证 JWT 访问令牌

    Args:
        token: JWT 字符串
    Returns:
        解码后的载荷字典，验证失败返回 None
    """
    try:
        # 使用配置的密钥和算法解码，自动验证签名和过期时间
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except PyJWTError:
        # 任何 JWT 相关错误（过期、签名无效等）均返回 None
        return None
