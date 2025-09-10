from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import declarative_base, relationship


Base = declarative_base()


class Calendar(Base):
    """Календарь, к которому имеют доступ по UUID-ссылке."""
    __tablename__ = "calendars"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    events = relationship("Event", back_populates="calendar", cascade="all, delete-orphan")


class Event(Base):
    """Событие в календаре. Даты/время храним как naive local ISO строки, но
    на уровне БД — в UTC/naive datetime (конвертация на клиенте)."""
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    calendar_id = Column(Integer, ForeignKey("calendars.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start = Column(DateTime, nullable=False)
    end = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    calendar = relationship("Calendar", back_populates="events")


Index("ix_events_calendar_id_start", Event.calendar_id, Event.start)


