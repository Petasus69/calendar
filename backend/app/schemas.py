from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    start: datetime
    end: datetime


class EventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None


class EventOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    start: datetime
    end: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class CalendarCreateOut(BaseModel):
    uuid: str
    share_url: str


class CalendarOut(BaseModel):
    uuid: str
    events: List[EventOut]


