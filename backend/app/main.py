import os
import uuid as uuidlib
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select
from .database import get_db, engine
from .models import Base, Calendar, Event
from .schemas import EventCreate, EventUpdate, EventOut, CalendarCreateOut, CalendarOut


app = FastAPI(title="Link Calendar API")


# CORS
frontend_origin = os.getenv("CORS_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin] if frontend_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Подождать готовность БД с несколькими ретраями
    import time
    from sqlalchemy import text
    attempts = 0
    last_err = None
    while attempts < 30:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            break
        except Exception as e:
            last_err = e
            time.sleep(1)
            attempts += 1
    if attempts == 30 and last_err is not None:
        raise last_err
    Base.metadata.create_all(bind=engine)


@app.post("/api/calendars", response_model=CalendarCreateOut)
def create_calendar(db: Session = Depends(get_db)):
    calendar_uuid = str(uuidlib.uuid4())
    calendar = Calendar(uuid=calendar_uuid)
    db.add(calendar)
    db.commit()
    db.refresh(calendar)

    public_origin = os.getenv("PUBLIC_ORIGIN", "http://localhost")
    share_url = f"{public_origin}/c/{calendar.uuid}"
    return CalendarCreateOut(uuid=calendar.uuid, share_url=share_url)


def get_calendar_by_uuid_or_404(db: Session, uuid: str) -> Calendar:
    calendar = db.execute(select(Calendar).where(Calendar.uuid == uuid)).scalar_one_or_none()
    if calendar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar not found")
    return calendar


@app.get("/api/calendars/{uuid}", response_model=CalendarOut)
def get_calendar(uuid: str, db: Session = Depends(get_db)):
    calendar = get_calendar_by_uuid_or_404(db, uuid)
    events = db.execute(select(Event).where(Event.calendar_id == calendar.id)).scalars().all()
    return CalendarOut(uuid=calendar.uuid, events=events)


@app.get("/api/calendars/{uuid}/events", response_model=list[EventOut])
def list_events(uuid: str, db: Session = Depends(get_db)):
    calendar = get_calendar_by_uuid_or_404(db, uuid)
    events = db.execute(select(Event).where(Event.calendar_id == calendar.id)).scalars().all()
    return events


@app.post("/api/calendars/{uuid}/events", response_model=EventOut, status_code=201)
def create_event(uuid: str, payload: EventCreate, db: Session = Depends(get_db)):
    if payload.end < payload.start:
        raise HTTPException(status_code=400, detail="end must be >= start")
    calendar = get_calendar_by_uuid_or_404(db, uuid)
    ev = Event(
        calendar_id=calendar.id,
        title=payload.title,
        description=payload.description,
        start=payload.start,
        end=payload.end,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@app.put("/api/calendars/{uuid}/events/{event_id}", response_model=EventOut)
def update_event(uuid: str, event_id: int, payload: EventUpdate, db: Session = Depends(get_db)):
    calendar = get_calendar_by_uuid_or_404(db, uuid)
    ev = db.execute(
        select(Event).where(Event.id == event_id, Event.calendar_id == calendar.id)
    ).scalar_one_or_none()
    if ev is None:
        raise HTTPException(status_code=404, detail="Event not found")

    if payload.title is not None:
        ev.title = payload.title
    if payload.description is not None:
        ev.description = payload.description
    if payload.start is not None:
        ev.start = payload.start
    if payload.end is not None:
        ev.end = payload.end
    if ev.end < ev.start:
        raise HTTPException(status_code=400, detail="end must be >= start")

    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@app.delete("/api/calendars/{uuid}/events/{event_id}", status_code=204)
def delete_event(uuid: str, event_id: int, db: Session = Depends(get_db)):
    calendar = get_calendar_by_uuid_or_404(db, uuid)
    ev = db.execute(
        select(Event).where(Event.id == event_id, Event.calendar_id == calendar.id)
    ).scalar_one_or_none()
    if ev is None:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(ev)
    db.commit()
    return None


