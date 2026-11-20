from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth_middleware import require_roles
from app.services.ticket_service import (
    get_customer_tickets,
    get_customer_ticket_detail,
)

router = APIRouter(
    prefix="/api/tickets",
    tags=["Tickets"],
)


# ==========================================
# CUSTOMER - GET MY TICKETS
# ==========================================

@router.get("/my-tickets")
def my_tickets(
    current_user: dict = Depends(require_roles("customer")),
):
    try:
        tickets = get_customer_tickets(
            customer_id=current_user["id"],
        )
        return {
            "success": True,
            "data": tickets,
        }
    except Exception as error:
        print("GET MY TICKETS ERROR:", repr(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengambil daftar tiket.",
        )


# ==========================================
# CUSTOMER - GET TICKET DETAIL
# ==========================================

@router.get("/{ticket_id}")
def ticket_detail(
    ticket_id: UUID,
    current_user: dict = Depends(require_roles("customer")),
):
    try:
        ticket = get_customer_ticket_detail(
            ticket_id=str(ticket_id),
            customer_id=current_user["id"],
        )
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tiket tidak ditemukan.",
            )
        return {
            "success": True,
            "data": ticket,
        }
    except HTTPException:
        raise
    except Exception as error:
        print("GET TICKET DETAIL ERROR:", repr(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengambil detail tiket.",
        )
