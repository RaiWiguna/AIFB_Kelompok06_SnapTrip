from sqlmodel import Session, select

from backend.app.db.models import Destination


class DestinationService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_destinations(self, city: str | None = None) -> list[Destination]:
        statement = select(Destination)
        if city:
            statement = statement.where(Destination.city == city)
        return list(self.session.exec(statement).all())
