from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import requests
import os

from shared.database import get_db
from shared.models import WatchTarget, ContentCheck
from .schemas import (
    WatchTargetCreate,
    WatchTargetUpdate,
    WatchTargetResponse,
    ContentCheckResponse,
)

# Watcher Checker API URL (use environment variable or default)
CHECKER_API_URL = os.getenv("CHECKER_API_URL", "http://watcher-checker:8001")

app = FastAPI(title="Watcher Viewer API", version="1.0.0")


def notify_checker_reload():
    """Notify the checker service to reload its schedules"""
    try:
        response = requests.post(f"{CHECKER_API_URL}/reload", timeout=5)
        response.raise_for_status()
        print(f"✓ Notified checker to reload schedules")
    except requests.RequestException as e:
        print(f"⚠ Failed to notify checker: {e}")
        # Don't fail the request if notification fails


@app.get("/")
def read_root():
    return {
        "service": "Watcher Viewer API",
        "version": "1.0.0",
        "endpoints": {
            "targets": "/targets",
            "checks": "/targets/{target_id}/checks",
        }
    }


# Watch Target endpoints
@app.get("/targets", response_model=List[WatchTargetResponse])
def list_targets(
    enabled: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """List all watch targets"""
    query = db.query(WatchTarget)
    if enabled is not None:
        query = query.filter(WatchTarget.enabled == enabled)
    return query.all()


@app.get("/targets/{target_id}", response_model=WatchTargetResponse)
def get_target(target_id: int, db: Session = Depends(get_db)):
    """Get a specific watch target"""
    target = db.query(WatchTarget).filter(WatchTarget.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    return target


@app.post("/targets", response_model=WatchTargetResponse, status_code=201)
def create_target(target: WatchTargetCreate, db: Session = Depends(get_db)):
    """Create a new watch target"""
    # Check if URL already exists
    existing = db.query(WatchTarget).filter(WatchTarget.url == target.url).first()
    if existing:
        raise HTTPException(status_code=400, detail="URL already exists")

    db_target = WatchTarget(**target.model_dump())
    db.add(db_target)
    db.commit()
    db.refresh(db_target)

    # Notify checker to reload schedules
    notify_checker_reload()

    return db_target


@app.patch("/targets/{target_id}", response_model=WatchTargetResponse)
def update_target(
    target_id: int,
    target_update: WatchTargetUpdate,
    db: Session = Depends(get_db)
):
    """Update a watch target"""
    db_target = db.query(WatchTarget).filter(WatchTarget.id == target_id).first()
    if not db_target:
        raise HTTPException(status_code=404, detail="Target not found")

    update_data = target_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_target, field, value)

    db_target.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_target)

    # Notify checker to reload schedules
    notify_checker_reload()

    return db_target


@app.delete("/targets/{target_id}", status_code=204)
def delete_target(target_id: int, db: Session = Depends(get_db)):
    """Delete a watch target"""
    db_target = db.query(WatchTarget).filter(WatchTarget.id == target_id).first()
    if not db_target:
        raise HTTPException(status_code=404, detail="Target not found")

    db.delete(db_target)
    db.commit()

    # Notify checker to reload schedules
    notify_checker_reload()

    return None


# Content Check endpoints
@app.get("/targets/{target_id}/checks", response_model=List[ContentCheckResponse])
def list_checks(
    target_id: int,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List content checks for a target"""
    # Verify target exists
    target = db.query(WatchTarget).filter(WatchTarget.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    checks = (
        db.query(ContentCheck)
        .filter(ContentCheck.target_id == target_id)
        .order_by(ContentCheck.checked_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return checks


@app.get("/targets/{target_id}/checks/latest", response_model=ContentCheckResponse)
def get_latest_check(target_id: int, db: Session = Depends(get_db)):
    """Get the latest check for a target"""
    check = (
        db.query(ContentCheck)
        .filter(ContentCheck.target_id == target_id)
        .order_by(ContentCheck.checked_at.desc())
        .first()
    )
    if not check:
        raise HTTPException(status_code=404, detail="No checks found for this target")
    return check


@app.get("/checks/{check_id}", response_model=ContentCheckResponse)
def get_check(check_id: int, db: Session = Depends(get_db)):
    """Get a specific check"""
    check = db.query(ContentCheck).filter(ContentCheck.id == check_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="Check not found")
    return check


@app.get("/checks/changes", response_model=List[ContentCheckResponse])
def list_changes(limit: int = 50, db: Session = Depends(get_db)):
    """List all checks where content changed"""
    checks = (
        db.query(ContentCheck)
        .filter(ContentCheck.content_changed == True)
        .order_by(ContentCheck.checked_at.desc())
        .limit(limit)
        .all()
    )
    return checks
