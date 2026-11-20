
from fastapi import APIRouter, Depends, HTTPException, Request
from uuid import UUID

from app.middleware.auth_middleware import require_roles
from app.services.payment_service import (
    create_payment,
    handle_midtrans_notification,
    get_payment_status,
    get_client_key,
    retry_payment,
)

router = APIRouter(
    prefix="/api/payments",
    tags=["Payments"]
)


# ==========================================
# GET MIDTRANS CLIENT KEY (untuk mobile / frontend)
# ==========================================

@router.get("/client-key")
def midtrans_client_key():
    """Endpoint publik — kembalikan Midtrans Client Key."""
    try:
        key = get_client_key()
        return {"client_key": key}
    except ValueError as error:
        raise HTTPException(status_code=503, detail=str(error))


# ==========================================
# CREATE PAYMENT (buat Snap Token baru)
# ==========================================

@router.post("/create")
def create_new_payment(
    payload: dict,
    current_user: dict = Depends(require_roles("customer"))
):
    order_id = payload.get("order_id")

    if not order_id:
        raise HTTPException(status_code=400, detail="order_id wajib diisi.")

    try:
        result = create_payment(
            order_id=str(order_id),
            customer_id=current_user["id"]
        )
        return {
            "success": True,
            "message": "Transaksi pembayaran berhasil dibuat.",
            "data": result
        }
    except ValueError as error:
        message = str(error)
        status_code = 502 if "Gagal membuat transaksi" in message else 400
        raise HTTPException(status_code=status_code, detail=message)
    except Exception as error:
        print("CREATE PAYMENT ROUTE ERROR:", repr(error))
        raise HTTPException(status_code=500, detail="Terjadi kesalahan saat membuat pembayaran.")


# ==========================================
# RETRY PAYMENT (bayar ulang pesanan lama)
# ==========================================

@router.post("/retry")
def retry_existing_payment(
    payload: dict,
    current_user: dict = Depends(require_roles("customer"))
):
    order_id = payload.get("order_id")

    if not order_id:
        raise HTTPException(status_code=400, detail="order_id wajib diisi.")

    try:
        result = retry_payment(
            order_id=str(order_id),
            customer_id=current_user["id"]
        )
        return {
            "success": True,
            "message": "Token pembayaran baru berhasil dibuat.",
            "data": result
        }
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        print("RETRY PAYMENT ERROR:", repr(error))
        raise HTTPException(status_code=500, detail="Gagal membuat ulang pembayaran.")


# ==========================================
# GET PAYMENT STATUS
# ==========================================

@router.get("/status/{order_id}")
def payment_status(
    order_id: UUID,
    current_user: dict = Depends(require_roles("customer"))
):
    try:
        result = get_payment_status(
            order_id=str(order_id),
            customer_id=current_user["id"]
        )
        return {"success": True, "data": result}
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except Exception as error:
        print("GET PAYMENT STATUS ERROR:", repr(error))
        raise HTTPException(status_code=500, detail="Gagal mengambil status pembayaran.")


# ==========================================
# MIDTRANS WEBHOOK NOTIFICATION
# ==========================================

@router.post("/notification")
async def midtrans_notification(request: Request):
    try:
        notification = await request.json()
        result = handle_midtrans_notification(notification)
        return {"success": True, **result}
    except ValueError as error:
        print("PAYMENT NOTIFICATION VALIDATION ERROR:", repr(error))
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        print("PAYMENT NOTIFICATION ERROR:", repr(error))
        raise HTTPException(status_code=500, detail="Gagal memproses notifikasi pembayaran.")
