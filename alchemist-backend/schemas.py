from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date

# ── Auth Schemas ──
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str  # 'admin', 'pm', 'tl', 'developer', 'ml'

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# ── Project Schemas ──
class ProjectBase(BaseModel):
    sno: Optional[int] = None
    name: str
    team: Optional[str] = None
    start: Optional[date] = None
    end: Optional[date] = None
    p_uat_start: Optional[date] = None
    p_uat_sign: Optional[date] = None
    r_uat_start: Optional[date] = None
    r_uat_sign: Optional[date] = None
    status: Optional[str] = None
    sub: Optional[str] = None
    update: Optional[str] = None
    blocker: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    name: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ── Member Schemas ──
class MemberBase(BaseModel):
    role: Optional[str] = None
    name: str
    projects: Optional[List[str]] = []
    email: Optional[str] = None
    github: Optional[str] = None
    skills: Optional[str] = None
    combo: Optional[str] = None
    note: Optional[str] = None

class MemberCreate(MemberBase):
    pass

class MemberUpdate(MemberBase):
    name: Optional[str] = None

class MemberResponse(MemberBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ── Leave Schemas ──
class LeaveBase(BaseModel):
    member_name: str
    date: date
    leave_type: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[str] = 'approved'

class LeaveCreate(LeaveBase):
    pass

class LeaveUpdate(BaseModel):
    date: Optional[date] = None
    leave_type: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[str] = None

class LeaveResponse(LeaveBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ── Daily Hygiene Schemas ──
class DailyHygieneBase(BaseModel):
    member_name: str
    date: date
    standup_attended: bool = False
    wsr_submitted: bool = False
    commits_made: bool = False
    notes: Optional[str] = None

class DailyHygieneCreate(DailyHygieneBase):
    pass

class DailyHygieneUpdate(BaseModel):
    standup_attended: Optional[bool] = None
    wsr_submitted: Optional[bool] = None
    commits_made: Optional[bool] = None
    notes: Optional[str] = None

class DailyHygieneResponse(DailyHygieneBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ── Checklist Schemas ──
class ChecklistItemBase(BaseModel):
    project_name: str
    item_number: int
    status: Optional[str] = None

class ChecklistItemCreate(ChecklistItemBase):
    pass

class ChecklistItemUpdate(BaseModel):
    status: Optional[str] = None

class ChecklistItemResponse(ChecklistItemBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ChecklistMetaBase(BaseModel):
    project_name: str
    client: Optional[str] = None
    combo: Optional[str] = None
    kickoff: Optional[date] = None
    uat: Optional[date] = None
    email: Optional[str] = None
    github: Optional[str] = None

class ChecklistMetaCreate(ChecklistMetaBase):
    pass

class ChecklistMetaUpdate(BaseModel):
    client: Optional[str] = None
    combo: Optional[str] = None
    kickoff: Optional[date] = None
    uat: Optional[date] = None
    email: Optional[str] = None
    github: Optional[str] = None

class ChecklistMetaResponse(ChecklistMetaBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ── Improvement Schemas ──
class ImprovementBase(BaseModel):
    n: Optional[int] = None
    type: Optional[str] = None
    title: str
    desc: Optional[str] = None
    owner: Optional[str] = None
    target: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None

class ImprovementCreate(ImprovementBase):
    pass

class ImprovementUpdate(ImprovementBase):
    title: Optional[str] = None

class ImprovementResponse(ImprovementBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
