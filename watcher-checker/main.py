import hashlib
import time
import threading
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import requests
from sqlalchemy.orm import Session
from fastapi import FastAPI
import uvicorn

from shared.database import SessionLocal
from shared.models import WatchTarget, ContentCheck

# Global scheduler instance
scheduler = None

# FastAPI app
app = FastAPI(title="Watcher Checker API", version="1.0.0")


def hash_content(content: str) -> str:
    """Generate SHA256 hash of content"""
    return hashlib.sha256(content.encode()).hexdigest()


def check_target(target: WatchTarget, db: Session):
    """Poll a single URL and store the results"""
    print(f"Checking {target.url} ({target.name or 'unnamed'})...")

    start_time = time.time()
    check = ContentCheck(target_id=target.id)

    try:
        response = requests.get(target.url, timeout=30)
        response_time_ms = (time.time() - start_time) * 1000

        # Store health metrics
        check.status_code = response.status_code
        check.response_time_ms = response_time_ms
        check.is_success = response.ok

        # Store content metadata
        check.content_type = response.headers.get('Content-Type')
        check.content_length = len(response.content)

        # Store content body and hash
        check.content_body = response.text
        current_hash = hash_content(response.text)
        check.content_hash = current_hash

        # Check if content changed from last check
        last_check = (
            db.query(ContentCheck)
            .filter(ContentCheck.target_id == target.id)
            .order_by(ContentCheck.checked_at.desc())
            .first()
        )

        if last_check and last_check.content_hash:
            check.content_changed = (current_hash != last_check.content_hash)
        else:
            check.content_changed = False  # First check

        print(f"  ✓ {response.status_code} - {response_time_ms:.2f}ms - Changed: {check.content_changed}")

    except requests.RequestException as e:
        response_time_ms = (time.time() - start_time) * 1000
        check.response_time_ms = response_time_ms
        check.is_success = False
        check.error_message = str(e)
        print(f"  ✗ Error: {e}")

    # Save check result
    db.add(check)
    db.commit()
    db.refresh(check)

    return check


def check_all_targets():
    """Check all enabled targets"""
    db = SessionLocal()
    try:
        targets = db.query(WatchTarget).filter(WatchTarget.enabled == True).all()

        if not targets:
            print("No enabled targets to check")
            return

        print(f"\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}] Checking {len(targets)} target(s)...")

        for target in targets:
            check_target(target, db)

    finally:
        db.close()


def schedule_target_checks(sched):
    """Schedule individual checks for each target based on their interval"""
    db = SessionLocal()
    try:
        targets = db.query(WatchTarget).filter(WatchTarget.enabled == True).all()

        # Get all existing job IDs for targets
        existing_job_ids = {job.id for job in sched.get_jobs() if job.id.startswith("check_")}
        current_target_ids = {f"check_{target.id}" for target in targets}

        # Remove jobs for deleted targets
        for job_id in existing_job_ids - current_target_ids:
            sched.remove_job(job_id)
            print(f"Removed job {job_id}")

        # Add or update jobs for current targets
        for target in targets:
            job_id = f"check_{target.id}"

            # Remove existing job if it exists
            if sched.get_job(job_id):
                sched.remove_job(job_id)

            # Add new job with target's interval
            sched.add_job(
                func=lambda t=target: check_target(t, SessionLocal()),
                trigger=IntervalTrigger(seconds=target.check_interval_seconds),
                id=job_id,
                name=f"Check {target.url}",
                replace_existing=True
            )

            print(f"Scheduled {target.url} - every {target.check_interval_seconds}s")

    finally:
        db.close()


@app.get("/")
def read_root():
    return {
        "service": "Watcher Checker API",
        "version": "1.0.0",
        "status": "running"
    }


@app.post("/reload")
def reload_schedules():
    """Reload target schedules from database"""
    global scheduler
    if scheduler is None:
        return {"error": "Scheduler not initialized"}, 500

    print("\n[API] Reloading target schedules...")
    schedule_target_checks(scheduler)
    return {"status": "success", "message": "Schedules reloaded"}


def main():
    """Main watcher service"""
    global scheduler

    print("Starting Watcher Checker Service...")

    # Use BackgroundScheduler so it runs in a separate thread
    scheduler = BackgroundScheduler()

    # Schedule a job to re-read targets every 5 minutes (in case intervals change)
    scheduler.add_job(
        func=lambda: schedule_target_checks(scheduler),
        trigger=IntervalTrigger(minutes=5),
        id="refresh_schedules",
        name="Refresh target schedules"
    )

    # Start the scheduler
    scheduler.start()

    # Initial scheduling
    schedule_target_checks(scheduler)

    # Run an immediate check on startup
    check_all_targets()

    print("\nWatcher Checker service is running.")
    print("API server starting on port 8001...\n")

    # Run FastAPI server (this blocks)
    uvicorn.run(app, host="0.0.0.0", port=8001)


if __name__ == "__main__":
    main()
