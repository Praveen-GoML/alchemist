import os
import shutil
import time
from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from sqlalchemy import func
from typing import List

import dropbox_storage
import push_service
from database import engine, get_db
from models import Base, User, Project, Member, LeaveRecord, DailyHygiene, Checklist, ChecklistMeta, Improvement, Notification, PushSubscription
from schemas import *
from auth import (
    authenticate_user, create_access_token, get_current_active_user,
    get_password_hash, verify_password, require_admin, require_pm_or_above, require_tl_or_admin
)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Alchemist API", version="1.0.0")

# Ensure uploads directory exists and mount static serving
UPLOAD_DIR = (
    "/tmp/uploads"
    if os.environ.get("VERCEL")
    else os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
)
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/auth/login", response_model=Token)
async def login(request: Request, db: Session = Depends(get_db)):
    username = None
    password = None

    content_type = request.headers.get("content-type", "").lower()
    if "application/json" in content_type:
        try:
            body = await request.json()
            username = body.get("username") or body.get("email")
            password = body.get("password")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid JSON payload",
            )
    else:
        try:
            form_data = await request.form()
            username = form_data.get("username") or form_data.get("email")
            password = form_data.get("password")
        except Exception:
            try:
                body = await request.json()
                username = body.get("username") or body.get("email")
                password = body.get("password")
            except Exception:
                pass

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email/username and password are required",
        )

    user = authenticate_user(db, username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    user_resp = (
        UserResponse.model_validate(user)
        if hasattr(UserResponse, "model_validate")
        else UserResponse.from_orm(user)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_resp,
    }

@app.post("/auth/register", response_model=UserResponse, dependencies=[Depends(require_admin)])
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.post("/auth/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}

@app.get("/auth/users", response_model=List[UserResponse], dependencies=[Depends(require_admin)])
async def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()

# ══════════════════════════════════════════════════════════════════════════════
# PROJECT ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/projects", response_model=List[ProjectResponse])
async def get_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(Project).order_by(Project.sno).all()

@app.post("/projects", response_model=ProjectResponse, dependencies=[Depends(require_pm_or_above)])
async def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    db_project = Project(**project.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@app.put("/projects/{project_id}", response_model=ProjectResponse, dependencies=[Depends(require_pm_or_above)])
async def update_project(project_id: int, project: ProjectUpdate, db: Session = Depends(get_db)):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    for key, value in project.dict(exclude_unset=True).items():
        setattr(db_project, key, value)
    
    db.commit()
    db.refresh(db_project)
    return db_project

@app.delete("/projects/{project_id}", dependencies=[Depends(require_admin)])
async def delete_project(project_id: int, db: Session = Depends(get_db)):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(db_project)
    db.commit()
    return {"message": "Project deleted"}

# ══════════════════════════════════════════════════════════════════════════════
# MEMBER ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/members", response_model=List[MemberResponse])
async def get_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(Member).order_by(Member.name).all()

@app.post("/members", response_model=MemberResponse, dependencies=[Depends(require_pm_or_above)])
async def create_member(member: MemberCreate, db: Session = Depends(get_db)):
    db_member = Member(**member.dict())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

@app.put("/members/{member_id}", response_model=MemberResponse, dependencies=[Depends(require_pm_or_above)])
async def update_member(member_id: int, member: MemberUpdate, db: Session = Depends(get_db)):
    db_member = db.query(Member).filter(Member.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    for key, value in member.dict(exclude_unset=True).items():
        setattr(db_member, key, value)
    
    db.commit()
    db.refresh(db_member)
    return db_member

@app.delete("/members/{member_id}", dependencies=[Depends(require_admin)])
async def delete_member(member_id: int, db: Session = Depends(get_db)):
    db_member = db.query(Member).filter(Member.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(db_member)
    db.commit()
    return {"message": "Member deleted"}

# ══════════════════════════════════════════════════════════════════════════════
# LEAVE TRACKER ENDPOINTS (Users can edit their own leaves)
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/leaves", response_model=List[LeaveResponse])
async def get_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(LeaveRecord).order_by(LeaveRecord.date.desc()).all()

@app.post("/leaves", response_model=LeaveResponse)
async def create_leave(
    leave: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_leave = LeaveRecord(user_id=current_user.id, **leave.dict())
    db.add(db_leave)
    db.commit()
    db.refresh(db_leave)
    return db_leave

@app.put("/leaves/{leave_id}", response_model=LeaveResponse)
async def update_leave(
    leave_id: int,
    leave: LeaveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_leave = db.query(LeaveRecord).filter(LeaveRecord.id == leave_id).first()
    if not db_leave:
        raise HTTPException(status_code=404, detail="Leave record not found")
    
    # Users can edit their own leaves, or PM/TL/Admin can edit any
    if db_leave.user_id != current_user.id:
        if current_user.role not in ['pm', 'tl', 'admin']:
            raise HTTPException(status_code=403, detail="Not authorized to edit this leave")
    
    for key, value in leave.dict(exclude_unset=True).items():
        setattr(db_leave, key, value)
    
    db.commit()
    db.refresh(db_leave)
    return db_leave

@app.delete("/leaves/{leave_id}")
async def delete_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_leave = db.query(LeaveRecord).filter(LeaveRecord.id == leave_id).first()
    if not db_leave:
        raise HTTPException(status_code=404, detail="Leave record not found")
    
    # Users can delete their own leaves
    if db_leave.user_id != current_user.id:
        if current_user.role not in ['pm', 'tl', 'admin']:
            raise HTTPException(status_code=403, detail="Not authorized to delete this leave")
    
    db.delete(db_leave)
    db.commit()
    return {"message": "Leave deleted"}

# ══════════════════════════════════════════════════════════════════════════════
# DAILY HYGIENE ENDPOINTS (Users can edit their own hygiene)
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/daily-hygiene", response_model=List[DailyHygieneResponse])
async def get_daily_hygiene(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(DailyHygiene).order_by(DailyHygiene.date.desc()).all()

@app.post("/daily-hygiene", response_model=DailyHygieneResponse)
async def create_daily_hygiene(
    hygiene: DailyHygieneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_hygiene = DailyHygiene(user_id=current_user.id, **hygiene.dict())
    db.add(db_hygiene)
    db.commit()
    db.refresh(db_hygiene)
    return db_hygiene

@app.put("/daily-hygiene/{hygiene_id}", response_model=DailyHygieneResponse)
async def update_daily_hygiene(
    hygiene_id: int,
    hygiene: DailyHygieneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_hygiene = db.query(DailyHygiene).filter(DailyHygiene.id == hygiene_id).first()
    if not db_hygiene:
        raise HTTPException(status_code=404, detail="Hygiene record not found")
    
    # Users can edit their own hygiene, or PM/TL/Admin can edit any
    if db_hygiene.user_id != current_user.id:
        if current_user.role not in ['pm', 'tl', 'admin']:
            raise HTTPException(status_code=403, detail="Not authorized to edit this hygiene record")
    
    for key, value in hygiene.dict(exclude_unset=True).items():
        setattr(db_hygiene, key, value)
    
    db.commit()
    db.refresh(db_hygiene)
    return db_hygiene

# ══════════════════════════════════════════════════════════════════════════════
# CHECKLIST ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/checklist", response_model=List[ChecklistItemResponse])
async def get_checklist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(Checklist).all()

@app.post("/checklist", response_model=ChecklistItemResponse, dependencies=[Depends(require_pm_or_above)])
async def create_checklist_item(item: ChecklistItemCreate, db: Session = Depends(get_db)):
    db_item = Checklist(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/checklist/{item_id}", response_model=ChecklistItemResponse, dependencies=[Depends(require_pm_or_above)])
async def update_checklist_item(item_id: int, item: ChecklistItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(Checklist).filter(Checklist.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    
    for key, value in item.dict(exclude_unset=True).items():
        setattr(db_item, key, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/checklist-meta", response_model=List[ChecklistMetaResponse])
async def get_checklist_meta(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(ChecklistMeta).all()

@app.get("/checklist-meta/{project_name}", response_model=ChecklistMetaResponse)
async def get_checklist_meta_by_project(
    project_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    meta = db.query(ChecklistMeta).filter(ChecklistMeta.project_name == project_name).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Project metadata not found")
    return meta

@app.post("/checklist-meta", response_model=ChecklistMetaResponse, dependencies=[Depends(require_pm_or_above)])
async def create_checklist_meta(meta: ChecklistMetaCreate, db: Session = Depends(get_db)):
    # Check if exists
    existing = db.query(ChecklistMeta).filter(ChecklistMeta.project_name == meta.project_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project metadata already exists")
    
    db_meta = ChecklistMeta(**meta.dict())
    db.add(db_meta)
    db.commit()
    db.refresh(db_meta)
    return db_meta

@app.put("/checklist-meta/{project_name}", response_model=ChecklistMetaResponse, dependencies=[Depends(require_pm_or_above)])
async def update_checklist_meta(
    project_name: str,
    meta: ChecklistMetaUpdate,
    db: Session = Depends(get_db)
):
    db_meta = db.query(ChecklistMeta).filter(ChecklistMeta.project_name == project_name).first()
    if not db_meta:
        raise HTTPException(status_code=404, detail="Project metadata not found")
    
    for key, value in meta.dict(exclude_unset=True).items():
        setattr(db_meta, key, value)
    
    db.commit()
    db.refresh(db_meta)
    return db_meta

# ══════════════════════════════════════════════════════════════════════════════
# IMPROVEMENT ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/improvements", response_model=List[ImprovementResponse])
async def get_improvements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(Improvement).order_by(Improvement.n).all()

@app.post("/improvements", response_model=ImprovementResponse, dependencies=[Depends(require_pm_or_above)])
async def create_improvement(improvement: ImprovementCreate, db: Session = Depends(get_db)):
    db_improvement = Improvement(**improvement.dict())
    db.add(db_improvement)
    db.commit()
    db.refresh(db_improvement)
    return db_improvement

@app.put("/improvements/{improvement_id}", response_model=ImprovementResponse, dependencies=[Depends(require_pm_or_above)])
async def update_improvement(
    improvement_id: int,
    improvement: ImprovementUpdate,
    db: Session = Depends(get_db)
):
    db_improvement = db.query(Improvement).filter(Improvement.id == improvement_id).first()
    if not db_improvement:
        raise HTTPException(status_code=404, detail="Improvement not found")
    
    for key, value in improvement.dict(exclude_unset=True).items():
        setattr(db_improvement, key, value)
    
    db.commit()
    db.refresh(db_improvement)
    return db_improvement

@app.delete("/improvements/{improvement_id}", dependencies=[Depends(require_admin)])
async def delete_improvement(improvement_id: int, db: Session = Depends(get_db)):
    db_improvement = db.query(Improvement).filter(Improvement.id == improvement_id).first()
    if not db_improvement:
        raise HTTPException(status_code=404, detail="Improvement not found")
    db.delete(db_improvement)
    db.commit()
    return {"message": "Improvement deleted"}

# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS (in-app, delivered per person by email)
# ══════════════════════════════════════════════════════════════════════════════

NOTIFY_KINDS = {"leave", "assignment", "info"}
NOTIFY_ROLES = {"pm", "tl", "admin"}          # roles that can be addressed as a group
MANAGER_ROLES = {"admin", "pm", "tl"}         # who may notify named people directly
MAX_RECIPIENTS = 50


@app.get("/notifications")
def list_notifications(
    limit: int = 40,
    unread_only: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """The signed-in user's notifications, newest first, plus the unread count."""
    email = current_user.email.lower()
    q = db.query(Notification).filter(func.lower(Notification.recipient_email) == email)
    unread = q.filter(Notification.read_at.is_(None)).count()
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    rows = q.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(max(1, min(limit, 100))).all()
    return {"unread": unread, "items": [NotificationOut.model_validate(r) for r in rows]}


@app.post("/notifications")
def create_notifications(
    payload: NotificationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Notify named people and/or everyone holding a role. The sender is never notified."""
    kind = payload.kind if payload.kind in NOTIFY_KINDS else "info"
    title = payload.title.strip()[:200]
    if not title:
        raise HTTPException(status_code=400, detail="Title is required.")
    actor_role = (current_user.role or "").lower()

    roles = {r.lower() for r in payload.roles}
    if not roles <= NOTIFY_ROLES:
        raise HTTPException(status_code=400, detail="Unsupported role.")
    emails = {e.strip().lower() for e in payload.recipients if e and "@" in e}
    # Regular members can only notify the managers (e.g. "I applied for leave"), never named colleagues.
    if actor_role not in MANAGER_ROLES and emails:
        raise HTTPException(status_code=403, detail="Only PMs, TLs and admins can notify specific people.")

    if roles:
        for (email,) in db.query(User.email).filter(User.is_active == True, func.lower(User.role).in_(roles)):  # noqa: E712
            emails.add(email.lower())
    emails.discard(current_user.email.lower())
    if payload.to_self:
        emails.add(current_user.email.lower())   # a confirmation for the sender; always allowed
    if len(emails) > MAX_RECIPIENTS:
        raise HTTPException(status_code=400, detail="Too many recipients.")

    rows = []
    for email in emails:
        row = Notification(
            recipient_email=email, kind=kind, title=title,
            body=(payload.body or "").strip()[:1000], link=(payload.link or "")[:200],
            actor_name=current_user.name, actor_email=current_user.email,
        )
        db.add(row)
        rows.append(row)
    db.commit()

    # Also show it on their devices (phone / Windows notification centre), even when the app is closed.
    pushed = 0
    if rows and push_service.is_configured():
        for row in rows:
            subs = db.query(PushSubscription).filter(func.lower(PushSubscription.user_email) == row.recipient_email.lower()).all()
            if not subs:
                continue
            dead = push_service.send_to_subscriptions(subs, f"{row.title}", row.body, row.link or "", row.id)
            pushed += len(subs) - len(dead)
            if dead:
                db.query(PushSubscription).filter(PushSubscription.id.in_(dead)).delete(synchronize_session=False)
                db.commit()
    return {"created": len(emails), "pushed": pushed}


# ── Device push subscriptions ──
MAX_SUBSCRIPTIONS_PER_USER = 10


@app.get("/push/public-key")
def push_public_key():
    """Public VAPID key the browser needs to subscribe. Empty when push is not configured."""
    return {"enabled": push_service.is_configured(), "key": push_service.public_key()}


@app.post("/push/subscribe")
def push_subscribe(
    payload: PushSubscribe,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not push_service.is_configured():
        raise HTTPException(status_code=503, detail="Device notifications are not configured on the server.")
    endpoint = payload.endpoint.strip()
    if not endpoint.startswith("https://") or len(endpoint) > 2000:
        raise HTTPException(status_code=400, detail="Invalid subscription endpoint.")

    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).first()
    if existing:
        # same device, possibly a different person signed in now: move it to the current user
        existing.user_email = current_user.email
        existing.p256dh, existing.auth = payload.keys.p256dh, payload.keys.auth
    else:
        count = db.query(PushSubscription).filter(func.lower(PushSubscription.user_email) == current_user.email.lower()).count()
        if count >= MAX_SUBSCRIPTIONS_PER_USER:
            oldest = db.query(PushSubscription).filter(func.lower(PushSubscription.user_email) == current_user.email.lower()).order_by(PushSubscription.created_at).first()
            if oldest:
                db.delete(oldest)
        db.add(PushSubscription(
            user_email=current_user.email, endpoint=endpoint,
            p256dh=payload.keys.p256dh, auth=payload.keys.auth,
            user_agent=(request.headers.get("user-agent") or "")[:200],
        ))
    db.commit()
    return {"subscribed": True}


@app.get("/push/status")
def push_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """How many of the signed-in user's devices will receive device notifications."""
    n = db.query(PushSubscription).filter(func.lower(PushSubscription.user_email) == current_user.email.lower()).count()
    return {"enabled": push_service.is_configured(), "devices": n}


@app.post("/push/test")
def push_test(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Send a sample notification to the signed-in user's own devices."""
    row = Notification(
        recipient_email=current_user.email.lower(), kind="info",
        title="Test notification",
        body="If you can see this on your phone or computer, device notifications are working.",
        link="", actor_name="Alchemist", actor_email="",
    )
    db.add(row)
    db.commit()
    subs = db.query(PushSubscription).filter(func.lower(PushSubscription.user_email) == current_user.email.lower()).all()
    if not subs:
        return {"devices": 0, "pushed": 0}
    dead = push_service.send_to_subscriptions(subs, row.title, row.body, "", row.id)
    if dead:
        db.query(PushSubscription).filter(PushSubscription.id.in_(dead)).delete(synchronize_session=False)
        db.commit()
    return {"devices": len(subs), "pushed": len(subs) - len(dead)}


@app.post("/push/unsubscribe")
def push_unsubscribe(
    payload: PushUnsubscribe,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == payload.endpoint,
        func.lower(PushSubscription.user_email) == current_user.email.lower(),
    ).delete(synchronize_session=False)
    db.commit()
    return {"subscribed": False}


@app.post("/notifications/read")
def mark_notifications_read(
    payload: NotificationRead,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    q = db.query(Notification).filter(
        func.lower(Notification.recipient_email) == current_user.email.lower(),
        Notification.read_at.is_(None),
    )
    if not payload.all:
        if not payload.ids:
            return {"updated": 0}
        q = q.filter(Notification.id.in_(payload.ids))
    n = q.update({Notification.read_at: datetime.utcnow()}, synchronize_session=False)
    db.commit()
    return {"updated": n}


@app.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    row = db.query(Notification).filter(
        Notification.id == notification_id,
        func.lower(Notification.recipient_email) == current_user.email.lower(),
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found.")
    db.delete(row)
    db.commit()
    return {"message": "Deleted"}

# ══════════════════════════════════════════════════════════════════════════════
# FILE UPLOAD ENDPOINT (Zero Keys, Zero CORS Errors)
# ══════════════════════════════════════════════════════════════════════════════

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
ALLOWED_UPLOAD_EXT = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".ppt", ".pptx",
    ".txt", ".md", ".png", ".jpg", ".jpeg", ".zip",
}


@app.get("/upload/status")
async def upload_status(current_user: User = Depends(get_current_active_user)):
    """Tells the UI where files will be stored."""
    return {"storage": "dropbox" if dropbox_storage.is_configured() else "local", "max_mb": MAX_UPLOAD_BYTES // (1024 * 1024)}


@app.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    project: str = Form("General"),
    current_user: User = Depends(require_pm_or_above),
):
    safe_name = os.path.basename(file.filename or "uploaded_doc")
    ext = os.path.splitext(safe_name)[1].lower()
    if ext not in ALLOWED_UPLOAD_EXT:
        raise HTTPException(status_code=400, detail=f"File type {ext or '(none)'} is not allowed.")

    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File is larger than {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.")

    if dropbox_storage.is_configured():
        try:
            stored = dropbox_storage.upload(project, safe_name, data)
        except dropbox_storage.DropboxError as e:
            raise HTTPException(status_code=502, detail=str(e))
        return {
            "success": True, "filename": safe_name, "size": len(data),
            "url": stored["url"], "path": stored["path"], "storage": "dropbox",
        }

    # No Dropbox configured: keep the file on the server disk (dev only; not durable on serverless hosts)
    clean_name = f"{int(time.time() * 1000)}_{safe_name}"
    with open(os.path.join(UPLOAD_DIR, clean_name), "wb") as buffer:
        buffer.write(data)
    base_url = str(request.base_url).rstrip("/")
    return {
        "success": True, "filename": safe_name, "size": len(data),
        "url": f"{base_url}/uploads/{clean_name}", "path": f"/uploads/{clean_name}", "storage": "local",
    }

# ══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {
        "message": "Alchemist API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
