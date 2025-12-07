from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class WatchTarget(Base):
    """URLs to monitor"""
    __tablename__ = "watch_targets"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)  # Optional friendly name
    check_interval_seconds = Column(Integer, default=300)  # How often to check
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    checks = relationship("ContentCheck", back_populates="target", cascade="all, delete-orphan")


class ContentCheck(Base):
    """All results from polling a URL"""
    __tablename__ = "content_checks"

    id = Column(Integer, primary_key=True, index=True)
    target_id = Column(Integer, ForeignKey("watch_targets.id"), nullable=False, index=True)
    checked_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Health metrics
    status_code = Column(Integer, nullable=True)
    response_time_ms = Column(Float, nullable=True)
    is_success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)

    # Content data
    content_body = Column(Text, nullable=True)
    content_hash = Column(String, nullable=True, index=True)
    content_changed = Column(Boolean, default=False)

    # Response metadata
    content_type = Column(String, nullable=True)
    content_length = Column(Integer, nullable=True)

    # Relationship
    target = relationship("WatchTarget", back_populates="checks")