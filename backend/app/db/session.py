from collections.abc import Generator
from functools import lru_cache

from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine

from backend.app.core.config import get_settings
from backend.app.db import models  # noqa: F401
from backend.app.db.seed import seed_destinations


@lru_cache
def get_engine() -> Engine:
    return create_engine(get_settings().database_url, pool_pre_ping=True)


def init_db(engine: Engine | None = None) -> None:
    db_engine = engine or get_engine()
    SQLModel.metadata.create_all(db_engine)
    with Session(db_engine) as session:
        seed_destinations(session)


def get_db_session() -> Generator[Session, None, None]:
    init_db()
    with Session(get_engine()) as session:
        yield session
