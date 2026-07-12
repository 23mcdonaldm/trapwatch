from fastapi import Header, HTTPException

import firebase_admin
from firebase_admin import auth as firebase_auth


def _ensure_firebase_app() -> None:
    """Initialize the Firebase Admin app once (uses Application Default Credentials)."""
    if not firebase_admin._apps:
        firebase_admin.initialize_app()


async def get_current_user(authorization: str | None = Header(None)) -> dict:
    """
    FastAPI dependency: verify the Firebase ID token from the Authorization header
    and return the caller's identity: {"uid": str, "name": str | None}.

    The frontend sends `Authorization: Bearer <firebase-id-token>` obtained from
    firebase/auth `currentUser.getIdToken()`. The uid from the VERIFIED token is
    the only user identity we trust — never a user_id from the request body.
    The name claim seeds users/{uid}.displayName on first write.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    _ensure_firebase_app()
    token = authorization.split(" ", 1)[1]
    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {"uid": decoded["uid"], "name": decoded.get("name")}


async def get_current_user_id(authorization: str | None = Header(None)) -> str:
    """FastAPI dependency: verified uid only (see get_current_user)."""
    user = await get_current_user(authorization)
    return user["uid"]
