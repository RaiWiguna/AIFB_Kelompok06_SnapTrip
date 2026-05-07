from fastapi import APIRouter, Depends
from sqlmodel import Session

from backend.app.db.session import get_db_session
from backend.app.schemas.common import EmptyRequest
from backend.app.schemas.sessions import (
    SessionCreateData,
    SessionCreateResponse,
    SessionStateResponse,
)
from backend.app.services.sessions import SessionService


router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionCreateResponse, status_code=201)
def create_session(
    _: EmptyRequest | None = None,
    db_session: Session = Depends(get_db_session),
) -> SessionCreateResponse:
    session_service = SessionService(db_session)
    travel_session = session_service.create_session()
    return SessionCreateResponse(
        data=SessionCreateData(
            session_id=travel_session.id,
            status=travel_session.status,
            created_at=travel_session.created_at,
        )
    )


@router.get("/{session_id}", response_model=SessionStateResponse)
def get_session_state(
    session_id: str,
    db_session: Session = Depends(get_db_session),
) -> SessionStateResponse:
    session_service = SessionService(db_session)
    return SessionStateResponse(data=session_service.get_session_state(session_id))
