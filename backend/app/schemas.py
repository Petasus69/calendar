from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    """Схема создания события. Время может быть опционально на фронте,
    но до API приходит ISO-строка с датой и временем."""
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    start: datetime
    end: datetime


class EventUpdate(BaseModel):
    """Частичное обновление события."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None


class EventOut(BaseModel):
    """Схема выдачи события наружу."""
    id: int
    title: str
    description: Optional[str]
    start: datetime
    end: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class CalendarCreateOut(BaseModel):
    """Ответ при создании календаря."""
    uuid: str
    share_url: str


class CalendarOut(BaseModel):
    """Календарь с событиями."""
    uuid: str
    events: List[EventOut]


