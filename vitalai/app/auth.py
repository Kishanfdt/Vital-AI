from fastapi import Header, HTTPException
from app.database import supabase


def get_current_user(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        response = supabase.auth.get_user(token)
    except Exception as e:
        print("AUTH ERROR:", repr(e))
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not response or not response.user:
        print("AUTH ERROR: no user in response:", response)
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return response.user.id