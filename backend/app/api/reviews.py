"""Authenticated review creation (a logged-in guest reviews their booking)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_host
from app.core.database import get_db
from app.models.host import Host
from app.schemas.review import ReviewCreate, ReviewOut
from app.services import review_service

router = APIRouter(tags=["reviews"])


@router.post("/reviews", response_model=ReviewOut, status_code=201)
def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    user: Host = Depends(get_current_host),
) -> ReviewOut:
    try:
        review = review_service.create_review(
            db,
            booking_id=payload.booking_id,
            reviewer_email=user.email,
            rating=payload.rating,
            comment=payload.comment,
        )
    except review_service.ReviewForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except review_service.ReviewConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except review_service.ReviewError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ReviewOut.model_validate(review)
