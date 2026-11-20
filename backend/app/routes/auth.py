
from fastapi import APIRouter, HTTPException, Depends

from app.schemas.auth import RegisterRequest, LoginRequest
from app.services.auth_service import (
    register_user,
    login_user,
    get_user_profile
)
from app.middleware.auth_middleware import require_roles


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


# =========================
# REGISTER
# =========================
@router.post("/register")
def register(data: RegisterRequest):
    try:
        response = register_user(
            data.full_name,
            data.email,
            data.password
        )

        user_id = response.user.id if response.user else None
        profile = None
        if user_id:
            try:
                profile = get_user_profile(user_id)
            except Exception:
                profile = None

        user_data = profile or {
            "id": user_id,
            "full_name": data.full_name,
            "email": data.email,
            "role": "customer"
        }

        access_token = response.session.access_token if response.session else ""
        refresh_token = response.session.refresh_token if response.session else ""

        return {
            "success": True,
            "message": "Registrasi berhasil.",
            "data": {
                "user_id": user_id,
                "email": data.email,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "user": user_data
            }
        }

    except Exception as error:
        print("REGISTER ERROR:", repr(error))

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


# =========================
# LOGIN
# =========================
@router.post("/login")
def login(data: LoginRequest):
    try:
        print("LOGIN: mencoba autentikasi")

        response = login_user(
            data.email,
            data.password
        )

        print("LOGIN: autentikasi berhasil")

        if not response.user or not response.session:
            raise HTTPException(
                status_code=401,
                detail="Email atau password salah."
            )

        print("LOGIN: mengambil profil")

        profile = get_user_profile(response.user.id)

        print("LOGIN: profil berhasil diambil")

        return {
            "success": True,
            "message": "Login berhasil.",
            "data": {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "token_type": "bearer",
                "user": profile
            }
        }

    except HTTPException:
        raise

    except Exception as error:
        print("LOGIN ERROR:", repr(error))

        raise HTTPException(
            status_code=401,
            detail="Login gagal. Periksa email dan password."
        )


# =========================
# GET CURRENT USER PROFILE
# =========================
@router.get("/me")
def get_current_profile(
    current_user: dict = Depends(
    require_roles("customer", "admin", "event_organizer")
)
):
    return {
        "success": True,
        "message": "Profil berhasil diambil.",
        "data": {
            "user": current_user
        }
    }
