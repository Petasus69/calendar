import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


# Конфигурация подключения к БД (контейнер db в docker-compose)
POSTGRES_USER = os.getenv("POSTGRES_USER", "calendar")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "calendar")
POSTGRES_DB = os.getenv("POSTGRES_DB", "calendar")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

DATABASE_URL = (
    f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=5,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Зависимость FastAPI: выдаёт SQLAlchemy-сессию и корректно закрывает её."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


