from sqlmodel import Session, desc, select

from backend.app.core.errors import AppError
from backend.app.db.models import Feedback, Itinerary, TravelSession
from backend.app.schemas.sessions import SessionStateData


class SessionService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_session(self) -> TravelSession:
        travel_session = TravelSession()
        self.session.add(travel_session)
        self.session.commit()
        self.session.refresh(travel_session)
        return travel_session

    def assert_active_session(self, session_id: str) -> TravelSession:
        travel_session = self.session.get(TravelSession, session_id)
        if travel_session is None:
            raise AppError(
                code="SESSION_NOT_FOUND",
                message="Session tidak ditemukan.",
                status_code=404,
                details={"session_id": session_id},
            )
        return travel_session

    def get_session_state(self, session_id: str) -> SessionStateData:
        travel_session = self.assert_active_session(session_id)
        selected_place_ids = self._selected_place_ids(session_id)
        latest_itinerary_id = self._latest_itinerary_id(session_id)
        return SessionStateData(
            session_id=travel_session.id,
            status=travel_session.status,
            detected_categories=[],
            confirmed_categories=[],
            selected_place_ids=selected_place_ids,
            latest_itinerary_id=latest_itinerary_id,
        )

    def _selected_place_ids(self, session_id: str) -> list[str]:
        feedback = self.session.exec(
            select(Feedback)
            .where(Feedback.session_id == session_id)
            .order_by(Feedback.created_at)
        ).all()
        selected: list[str] = []
        for item in feedback:
            if item.action == "select" and item.destination_id not in selected:
                selected.append(item.destination_id)
            if item.action == "unselect" and item.destination_id in selected:
                selected.remove(item.destination_id)
        return selected

    def _latest_itinerary_id(self, session_id: str) -> str | None:
        itinerary = self.session.exec(
            select(Itinerary)
            .where(Itinerary.session_id == session_id)
            .order_by(desc(Itinerary.updated_at))
        ).first()
        return itinerary.id if itinerary else None
