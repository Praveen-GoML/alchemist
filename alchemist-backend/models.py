from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "alchemist_users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'admin', 'pm', 'tl', 'developer', 'ml'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Project(Base):
    __tablename__ = "alchemist_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    sno = Column(Integer)
    name = Column(String, nullable=False, index=True)
    team = Column(String)
    start = Column(Date)
    end = Column(Date)
    p_uat_start = Column(Date)
    p_uat_sign = Column(Date)
    r_uat_start = Column(Date)
    r_uat_sign = Column(Date)
    status = Column(String)
    sub = Column(String)
    update = Column(Text)
    blocker = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Member(Base):
    __tablename__ = "alchemist_members"
    
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String)  # PM, Lead, FE, BE, ML, etc.
    name = Column(String, nullable=False)
    projects = Column(JSON)  # List of project names
    email = Column(String)
    github = Column(String)
    skills = Column(Text)
    combo = Column(String)
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class LeaveRecord(Base):
    __tablename__ = "alchemist_leaves"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('alchemist_users.id'))
    member_name = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    leave_type = Column(String)  # 'full', 'half', 'planned', etc.
    reason = Column(Text)
    status = Column(String, default='approved')  # 'pending', 'approved', 'rejected'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DailyHygiene(Base):
    __tablename__ = "alchemist_daily_hygiene"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('alchemist_users.id'))
    member_name = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    standup_attended = Column(Boolean, default=False)
    wsr_submitted = Column(Boolean, default=False)
    commits_made = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Checklist(Base):
    __tablename__ = "alchemist_checklist"
    
    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String, nullable=False, index=True)
    item_number = Column(Integer, nullable=False)
    status = Column(String)  # 'Done', 'In progress', 'Blocked', 'N/A'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ChecklistMeta(Base):
    __tablename__ = "alchemist_checklist_meta"
    
    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String, unique=True, nullable=False, index=True)
    client = Column(String)
    combo = Column(String)
    kickoff = Column(Date)
    uat = Column(Date)
    email = Column(String)
    github = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Improvement(Base):
    __tablename__ = "alchemist_improvements"
    
    id = Column(Integer, primary_key=True, index=True)
    n = Column(Integer)
    type = Column(String)
    title = Column(String, nullable=False)
    desc = Column(Text)
    owner = Column(String)
    target = Column(String)
    status = Column(String)
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Notification(Base):
    """In-app notification for one person (matched by email)."""
    __tablename__ = "alchemist_notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String, index=True, nullable=False)
    kind = Column(String, default="info")  # 'leave', 'assignment', 'info'
    title = Column(String, nullable=False)
    body = Column(Text, default="")
    link = Column(String, default="")
    actor_name = Column(String, default="")
    actor_email = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    read_at = Column(DateTime, nullable=True)


class PushSubscription(Base):
    """A browser/phone that agreed to receive device notifications for a user."""
    __tablename__ = "alchemist_push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=False)
    endpoint = Column(Text, unique=True, nullable=False)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    user_agent = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class HubState(Base):
    """Shared hub data (projects, leave, docs, ...). One row per key; `version` makes concurrent edits safe."""
    __tablename__ = "alchemist_hub_state"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)  # JSON text
    version = Column(Integer, nullable=False, default=1)
    updated_by = Column(String, default="")
    updated_at = Column(DateTime, default=datetime.utcnow)
