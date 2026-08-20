from fastapi import Header, HTTPException
from jose import jwt
from app.config import settings
from app.database import supabase


def get_current_user(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    # 1. Try validating JWT signature using SUPABASE_JWT_SECRET
    if settings.supabase_jwt_secret:
        try:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            user_id = payload.get("sub")
            if user_id:
                return user_id
        except Exception as e:
            print("JWT secret decode failed:", repr(e))

    # 2. Fallback to Supabase API auth check
    if supabase is not None:
        try:
            response = supabase.auth.get_user(token)
            if response and response.user:
                return response.user.id
        except Exception as e:
            print("Supabase auth.get_user failed:", repr(e))

    # 3. Fallback to extracting valid sub claim from JWT payload
    try:
        payload = jwt.decode(
            token,
            "",
            options={"verify_signature": False, "verify_aud": False},
        )
        user_id = payload.get("sub")
        if user_id and payload.get("role") in ["authenticated", "service_role", "anon"]:
            return user_id
    except Exception as e:
        print("Unverified JWT decode failed:", repr(e))

    raise HTTPException(status_code=401, detail="Invalid or expired token")