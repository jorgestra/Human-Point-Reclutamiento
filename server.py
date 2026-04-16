from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query, Form
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum

import db as database

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

SECRET_KEY = os.environ.get('JWT_SECRET', 'humanpoint-ats-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

app = FastAPI(title="Human Point ATS", version="2.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ ENUMS ============
class UserRole(str, Enum):
    ADMIN = "admin"
    RECRUITER = "recruiter"
    HIRING_MANAGER = "hiring_manager"
    VIEWER = "viewer"

class RequisitionStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    CLOSED = "closed"

class VacancyStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    ON_HOLD = "on_hold"

class PipelineStage(str, Enum):
    APPLIED = "applied"
    PRE_FILTER = "pre_filter"
    INTERVIEW_HR = "interview_hr"
    INTERVIEW_TECH = "interview_tech"
    TESTS = "tests"
    FINALIST = "finalist"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"

class OfferStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    FINALIZED = "finalized"

class Currency(str, Enum):
    GTQ = "GTQ"
    USD = "USD"
    MXN = "MXN"

class CandidateStatus(str, Enum):
    AVAILABLE = "available"
    DISQUALIFIED = "disqualified"
    TALENT_POOL = "talent_pool"
    NO_RESPONSE = "no_response"
    REJECTED_OFFER = "rejected_offer"

class ExperienceRange(str, Enum):
    RANGE_0_2 = "0-2"
    RANGE_3_5 = "3-5"
    RANGE_5_10 = "5-10"
    RANGE_10_PLUS = "+10"

# ============ MODELS ============
class AuditMixin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    tenant_id: str = "default"

class CompanyCreate(BaseModel):
    name: str
    short_name: Optional[str] = None
    rfc: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    is_active: bool = True

class Company(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    short_name: Optional[str] = None
    rfc: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    is_active: bool = True

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole = UserRole.VIEWER
    department: Optional[str] = None
    is_active: bool = True
    tenant_id: str = "default"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: UserRole = UserRole.VIEWER
    department: Optional[str] = None
    tenant_id: str = "default"

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class RequisitionCreate(BaseModel):
    title: str
    department: str
    requesting_area: str
    justification: str
    positions_count: int = 1
    salary_min: float
    salary_max: float
    currency: str = "GTQ"
    job_type: str = "full_time"
    location: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    empresa_id: Optional[str] = None

class Requisition(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    department: str
    requesting_area: str
    justification: str
    positions_count: int = 1
    salary_min: float
    salary_max: float
    currency: str = "GTQ"
    job_type: str = "full_time"
    location: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    status: RequisitionStatus = RequisitionStatus.DRAFT
    vacancy_id: Optional[str] = None
    empresa_id: Optional[str] = None

class ApprovalAction(BaseModel):
    action: str
    comments: Optional[str] = None

class VacancyCreate(BaseModel):
    requisition_id: str
    title: str
    description: str
    requirements: str
    benefits: Optional[str] = None
    location: str
    job_type: str = "full_time"
    salary_min: float
    salary_max: float
    currency: str = "GTQ"
    is_internal: bool = False
    is_external: bool = True
    deadline: Optional[datetime] = None
    empresa_id: Optional[str] = None

class Vacancy(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    requisition_id: str
    title: str
    description: str
    requirements: str
    benefits: Optional[str] = None
    location: str
    job_type: str = "full_time"
    salary_min: float
    salary_max: float
    currency: str = "GTQ"
    is_internal: bool = False
    is_external: bool = True
    deadline: Optional[datetime] = None
    status: VacancyStatus = VacancyStatus.DRAFT
    applications_count: int = 0
    views_count: int = 0
    empresa_id: Optional[str] = None

class Education(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    institution: str
    degree: str
    field_of_study: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class Experience(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company: str
    position: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False

class CandidateCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None
    expected_salary: Optional[float] = None
    salary_currency: str = "GTQ"
    skills: List[str] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    source: str = "portal"
    notes: Optional[str] = None
    candidate_status: str = "available"
    disqualification_reason: Optional[str] = None
    experience_range: Optional[str] = None
    professional_level_id: Optional[str] = None

class Candidate(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None
    expected_salary: Optional[float] = None
    salary_currency: str = "GTQ"
    skills: List[str] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    source: str = "portal"
    notes: Optional[str] = None
    cv_url: Optional[str] = None
    candidate_status: str = "available"
    disqualification_reason: Optional[str] = None
    experience_range: Optional[str] = None
    professional_level_id: Optional[str] = None

class CandidateAreaCreate(BaseModel):
    candidate_id: str
    professional_area_id: str

class CandidateArea(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    candidate_id: str
    professional_area_id: str

class CandidateLanguageCreate(BaseModel):
    candidate_id: str
    language_id: str

class CandidateLanguage(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    candidate_id: str
    language_id: str

class ApplicationCreate(BaseModel):
    vacancy_id: str
    candidate_id: Optional[str] = None
    candidate_data: Optional[CandidateCreate] = None

class Application(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vacancy_id: str
    candidate_id: str
    current_stage: PipelineStage = PipelineStage.APPLIED
    score: Optional[float] = None
    is_active: bool = True

class PipelineMove(BaseModel):
    new_stage: PipelineStage
    notes: Optional[str] = None

class InterviewCreate(BaseModel):
    application_id: str
    scheduled_at: datetime
    duration_minutes: int = 60
    interview_type: str = "hr"
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    evaluators: List[str] = Field(default_factory=list)
    notes: Optional[str] = None

class Interview(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    application_id: str
    scheduled_at: datetime
    duration_minutes: int = 60
    interview_type: str = "hr"
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    evaluators: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    status: str = "scheduled"
    completion_notes: Optional[str] = None
    closed_at: Optional[str] = None
    closed_by: Optional[str] = None

class EvaluationCreate(BaseModel):
    interview_id: str
    scores: Dict[str, int]
    overall_score: int
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    recommendation: str
    comments: Optional[str] = None

class InterviewCompletion(BaseModel):
    completion_notes: str

class Evaluation(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    interview_id: str
    evaluator_id: str
    scores: Dict[str, int]
    overall_score: int
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    recommendation: str
    comments: Optional[str] = None

class OfferCreate(BaseModel):
    application_id: str
    position_title: str
    base_salary: float
    currency: str = "GTQ"
    bonus: Optional[float] = None
    benefits: Optional[str] = None
    start_date: datetime
    expiration_date: datetime
    contract_type: str = "indefinite"
    additional_terms: Optional[str] = None

class Offer(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    application_id: str
    candidate_id: str
    vacancy_id: str
    position_title: str
    base_salary: float
    currency: str = "GTQ"
    bonus: Optional[float] = None
    benefits: Optional[str] = None
    start_date: datetime
    expiration_date: datetime
    contract_type: str = "indefinite"
    additional_terms: Optional[str] = None
    status: OfferStatus = OfferStatus.DRAFT
    empresa_id: Optional[str] = None

class HRPersonnelCreate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    active: Optional[bool] = None

class HRPersonnel(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True

class ProfessionalLevelCreate(BaseModel):
    name: str
    description: Optional[str] = None
    order: int = 0

class ProfessionalLevel(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    order: int = 0
    is_active: bool = True

class ProfessionalAreaCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProfessionalArea(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    is_active: bool = True

class LanguageCreate(BaseModel):
    name: str
    code: Optional[str] = None
    level: Optional[str] = None

class Language(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: Optional[str] = None
    level: Optional[str] = None
    is_active: bool = True

class HiringCreate(BaseModel):
    application_id: str
    offer_id: str
    employee_number: Optional[str] = None
    department: str
    position: str
    start_date: datetime
    contract_type: str
    salary: float
    currency: str = "GTQ"
    supervisor_id: Optional[str] = None
    empresa_id: Optional[str] = None

class Hiring(AuditMixin):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    application_id: str
    offer_id: str
    candidate_id: str
    vacancy_id: str
    employee_number: str
    department: str
    position: str
    start_date: datetime
    contract_type: str
    salary: float
    currency: str = "GTQ"
    supervisor_id: Optional[str] = None
    employee_record_created: bool = False
    empresa_id: Optional[str] = None

# ============ HELPERS ============
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await database.fetch_one(
            "SELECT id, tenant_id, email, first_name, last_name, role, department, is_active FROM ATS_USERS WHERE id = ?",
            (user_id,)
        )
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def check_role(allowed_roles: List[UserRole]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in [r.value for r in allowed_roles]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

def serialize_doc(doc: dict) -> dict:
    if doc is None:
        return None
    result = {}
    for k, v in doc.items():
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result

def serialize_list(docs: list) -> list:
    return [serialize_doc(d) for d in docs]

# ============ AUTH ROUTES ============
@api_router.post("/auth/register")
async def register_user(user_data: UserCreate):
    existing = await database.fetch_one("SELECT id FROM ATS_USERS WHERE email = ?", (user_data.email,))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    password_hash = hash_password(user_data.password)
    await database.execute(
        """INSERT INTO ATS_USERS (id, tenant_id, email, password_hash, first_name, last_name, role, department)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, user_data.tenant_id, user_data.email, password_hash,
         user_data.first_name, user_data.last_name, user_data.role.value, user_data.department)
    )
    return {"message": "User registered successfully", "user_id": user_id}

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await database.fetch_one(
        "SELECT * FROM ATS_USERS WHERE email = ? AND is_active = 1",
        (credentials.email,)
    )
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": user['id'], "tenant_id": user['tenant_id'], "role": user['role']})
    user_data = {k: v for k, v in user.items() if k != 'password_hash'}
    return {"access_token": token, "token_type": "bearer", "user": serialize_doc(user_data)}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.get("/users")
async def list_users(user: dict = Depends(check_role([UserRole.ADMIN]))):
    rows = await database.fetch_all(
        "SELECT id, tenant_id, email, first_name, last_name, role, department, is_active, created_at FROM ATS_USERS WHERE tenant_id = ?",
        (user['tenant_id'],)
    )
    return serialize_list(rows)

# ============ COMPANIES ROUTES ============
@api_router.post("/companies")
async def create_company(data: CompanyCreate, user: dict = Depends(check_role([UserRole.ADMIN]))):
    if data.rfc:
        existing = await database.fetch_one(
            "SELECT id FROM ATS_EMPRESAS WHERE rfc = ? AND tenant_id = ?",
            (data.rfc, user['tenant_id'])
        )
        if existing:
            raise HTTPException(status_code=400, detail="RFC ya registrado")
    company_id = str(uuid.uuid4())
    await database.execute(
        """INSERT INTO ATS_EMPRESAS (id, tenant_id, name, short_name, rfc, address, phone, website, industry, is_active, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (company_id, user['tenant_id'], data.name, data.short_name, data.rfc,
         data.address, data.phone, data.website, data.industry, 1, user['id'])
    )
    return await database.fetch_one("SELECT * FROM ATS_EMPRESAS WHERE id = ?", (company_id,))

@api_router.get("/companies")
async def list_companies(user: dict = Depends(get_current_user)):
    rows = await database.fetch_all(
        "SELECT * FROM ATS_EMPRESAS WHERE tenant_id = ? AND is_active = 1 ORDER BY name",
        (user['tenant_id'],)
    )
    return serialize_list(rows)

@api_router.get("/companies/{company_id}")
async def get_company(company_id: str, user: dict = Depends(get_current_user)):
    row = await database.fetch_one(
        "SELECT * FROM ATS_EMPRESAS WHERE id = ? AND tenant_id = ?",
        (company_id, user['tenant_id'])
    )
    if not row:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return serialize_doc(row)

@api_router.put("/companies/{company_id}")
async def update_company(company_id: str, data: CompanyCreate, user: dict = Depends(check_role([UserRole.ADMIN]))):
    result = await database.execute(
        """UPDATE ATS_EMPRESAS SET name=?, short_name=?, rfc=?, address=?, phone=?, website=?, industry=?,
           is_active=?, updated_at=GETUTCDATE(), updated_by=? WHERE id = ? AND tenant_id = ?""",
        (data.name, data.short_name, data.rfc, data.address, data.phone,
         data.website, data.industry, 1 if data.is_active else 0, user['id'], company_id, user['tenant_id'])
    )
    if result == 0:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return await database.fetch_one("SELECT * FROM ATS_EMPRESAS WHERE id = ?", (company_id,))

@api_router.delete("/companies/{company_id}")
async def delete_company(company_id: str, user: dict = Depends(check_role([UserRole.ADMIN]))):
    await database.execute(
        "UPDATE ATS_EMPRESAS SET is_active=0, updated_at=GETUTCDATE() WHERE id = ? AND tenant_id = ?",
        (company_id, user['tenant_id'])
    )
    return {"message": "Empresa desactivada"}

# ============ REQUISITIONS ROUTES ============
@api_router.post("/requisitions")
async def create_requisition(data: RequisitionCreate, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER]))):
    req_id = str(uuid.uuid4())
    await database.execute(
        """INSERT INTO ATS_REQUISICIONES
           (id, tenant_id, empresa_id, title, department, requesting_area, justification,
            positions_count, salary_min, salary_max, currency, job_type, location, requirements, benefits, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (req_id, user['tenant_id'], data.empresa_id, data.title, data.department,
         data.requesting_area, data.justification, data.positions_count,
         data.salary_min, data.salary_max, data.currency, data.job_type,
         data.location, data.requirements, data.benefits, user['id'])
    )
    row = await database.fetch_one("SELECT * FROM ATS_REQUISICIONES WHERE id = ?", (req_id,))
    return serialize_doc(row)

@api_router.get("/requisitions")
async def list_requisitions(
    page: int = 1, limit: int = 20,
    status: Optional[str] = None, empresa_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    where = "WHERE tenant_id = ?"
    params = [user['tenant_id']]
    if status:
        where += " AND status = ?"; params.append(status)
    if empresa_id:
        where += " AND empresa_id = ?"; params.append(empresa_id)

    total = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_REQUISICIONES {where}", tuple(params))
    sql = database.paginate(f"SELECT * FROM ATS_REQUISICIONES {where} ORDER BY created_at DESC", page, limit)
    rows = await database.fetch_all(sql, tuple(params))

    # Enrich with empresa_name
    result = []
    for r in rows:
        d = serialize_doc(r)
        if d.get('empresa_id'):
            emp = await database.fetch_one("SELECT name FROM ATS_EMPRESAS WHERE id = ?", (d['empresa_id'],))
            d['empresa_name'] = emp['name'] if emp else None
        # Load approval chain
        d['approval_chain'] = await database.get_approval_chain(d['id'])
        result.append(d)

    return {"total": total, "page": page, "limit": limit, "items": result}

@api_router.get("/requisitions/{req_id}")
async def get_requisition(req_id: str, user: dict = Depends(get_current_user)):
    row = await database.fetch_one(
        "SELECT * FROM ATS_REQUISICIONES WHERE id = ? AND tenant_id = ?",
        (req_id, user['tenant_id'])
    )
    if not row:
        raise HTTPException(status_code=404, detail="Requisición no encontrada")
    d = serialize_doc(row)
    d['approval_chain'] = await database.get_approval_chain(req_id)
    if d.get('empresa_id'):
        emp = await database.fetch_one("SELECT name FROM ATS_EMPRESAS WHERE id = ?", (d['empresa_id'],))
        d['empresa_name'] = emp['name'] if emp else None
    return d

@api_router.put("/requisitions/{req_id}")
async def update_requisition(req_id: str, data: RequisitionCreate, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER]))):
    result = await database.execute(
        """UPDATE ATS_REQUISICIONES SET title=?, department=?, requesting_area=?, justification=?,
           positions_count=?, salary_min=?, salary_max=?, currency=?, job_type=?, location=?,
           requirements=?, benefits=?, empresa_id=?, updated_at=GETUTCDATE(), updated_by=?
           WHERE id = ? AND tenant_id = ?""",
        (data.title, data.department, data.requesting_area, data.justification,
         data.positions_count, data.salary_min, data.salary_max, data.currency,
         data.job_type, data.location, data.requirements, data.benefits,
         data.empresa_id, user['id'], req_id, user['tenant_id'])
    )
    if result == 0:
        raise HTTPException(status_code=404, detail="Requisición no encontrada")
    return await get_requisition(req_id, user)

@api_router.delete("/requisitions/{req_id}")
async def delete_requisition(req_id: str, user: dict = Depends(check_role([UserRole.ADMIN]))):
    await database.execute(
        "DELETE FROM ATS_REQUISICIONES WHERE id = ? AND tenant_id = ?",
        (req_id, user['tenant_id'])
    )
    return {"message": "Requisición eliminada"}

@api_router.post("/requisitions/{req_id}/submit")
async def submit_requisition(req_id: str, user: dict = Depends(get_current_user)):
    result = await database.execute(
        "UPDATE ATS_REQUISICIONES SET status=?, updated_at=GETUTCDATE() WHERE id = ? AND tenant_id = ?",
        (RequisitionStatus.PENDING_APPROVAL.value, req_id, user['tenant_id'])
    )
    if result == 0:
        raise HTTPException(status_code=404, detail="Requisición no encontrada")
    return {"message": "Enviada a aprobación"}

@api_router.post("/requisitions/{req_id}/approve")
async def approve_requisition(req_id: str, action: ApprovalAction, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.HIRING_MANAGER]))):
    req = await database.fetch_one("SELECT * FROM ATS_REQUISICIONES WHERE id = ? AND tenant_id = ?", (req_id, user['tenant_id']))
    if not req:
        raise HTTPException(status_code=404, detail="Requisición no encontrada")

    new_status = RequisitionStatus.APPROVED.value if action.action == "approve" else RequisitionStatus.REJECTED.value
    approver_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()

    ops = [
        ("UPDATE ATS_REQUISICIONES SET status=?, updated_at=GETUTCDATE() WHERE id = ?", (new_status, req_id)),
        ("""INSERT INTO ATS_REQUISICIONES_APROBACIONES (id, requisition_id, approver_id, approver_name, action, comments)
            VALUES (?, ?, ?, ?, ?, ?)""",
         (str(uuid.uuid4()), req_id, user['id'], approver_name, action.action, action.comments))
    ]
    await database.execute_transaction(ops)
    return {"message": f"Requisición {action.action}d", "status": new_status}

# ============ VACANCIES ROUTES ============
@api_router.post("/vacancies")
async def create_vacancy(data: VacancyCreate, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    req = await database.fetch_one("SELECT * FROM ATS_REQUISICIONES WHERE id = ? AND tenant_id = ?", (data.requisition_id, user['tenant_id']))
    if not req:
        raise HTTPException(status_code=404, detail="Requisición no encontrada")

    empresa_id = data.empresa_id or req.get('empresa_id')
    description = data.description or (req.get('justification', '') + '\n' + (req.get('requirements') or ''))

    vac_id = str(uuid.uuid4())
    await database.execute(
        """INSERT INTO ATS_VACANTES
           (id, tenant_id, empresa_id, requisition_id, title, description, requirements, benefits,
            location, job_type, salary_min, salary_max, currency, is_internal, is_external, deadline, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (vac_id, user['tenant_id'], empresa_id, data.requisition_id, data.title,
         description, data.requirements, data.benefits, data.location, data.job_type,
         data.salary_min, data.salary_max, data.currency,
         1 if data.is_internal else 0, 1 if data.is_external else 0,
         data.deadline, user['id'])
    )
    # Link vacancy to requisition
    await database.execute(
        "UPDATE ATS_REQUISICIONES SET vacancy_id=? WHERE id=?", (vac_id, data.requisition_id)
    )
    row = await database.fetch_one("SELECT * FROM ATS_VACANTES WHERE id = ?", (vac_id,))
    return serialize_doc(row)

@api_router.get("/vacancies")
async def list_vacancies(
    page: int = 1, limit: int = 20,
    status: Optional[str] = None, empresa_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    where = "WHERE tenant_id = ?"
    params = [user['tenant_id']]
    if status:
        where += " AND status = ?"; params.append(status)
    if empresa_id:
        where += " AND empresa_id = ?"; params.append(empresa_id)

    total = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_VACANTES {where}", tuple(params))
    sql = database.paginate(f"SELECT * FROM ATS_VACANTES {where} ORDER BY created_at DESC", page, limit)
    rows = await database.fetch_all(sql, tuple(params))

    result = []
    for r in rows:
        d = serialize_doc(r)
        if d.get('empresa_id'):
            emp = await database.fetch_one("SELECT name FROM ATS_EMPRESAS WHERE id = ?", (d['empresa_id'],))
            d['empresa_name'] = emp['name'] if emp else None
        result.append(d)
    return {"total": total, "page": page, "limit": limit, "items": result}

@api_router.get("/vacancies/public")
async def list_public_vacancies(tenant_id: str = "default"):
    rows = await database.fetch_all(
        "SELECT * FROM ATS_VACANTES WHERE tenant_id = ? AND status = 'published' ORDER BY created_at DESC",
        (tenant_id,)
    )
    return serialize_list(rows)

@api_router.get("/vacancies/{vacancy_id}")
async def get_vacancy(vacancy_id: str, user: dict = Depends(get_current_user)):
    row = await database.fetch_one(
        "SELECT * FROM ATS_VACANTES WHERE id = ? AND tenant_id = ?",
        (vacancy_id, user['tenant_id'])
    )
    if not row:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    return serialize_doc(row)

@api_router.get("/vacancies/{vacancy_id}/public")
async def get_public_vacancy(vacancy_id: str):
    row = await database.fetch_one("SELECT * FROM ATS_VACANTES WHERE id = ?", (vacancy_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    # Increment views
    await database.execute("UPDATE ATS_VACANTES SET views_count = views_count + 1 WHERE id = ?", (vacancy_id,))
    return serialize_doc(row)

@api_router.put("/vacancies/{vacancy_id}")
async def update_vacancy(vacancy_id: str, data: VacancyCreate, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    result = await database.execute(
        """UPDATE ATS_VACANTES SET title=?, description=?, requirements=?, benefits=?, location=?,
           job_type=?, salary_min=?, salary_max=?, currency=?, is_internal=?, is_external=?,
           deadline=?, empresa_id=?, updated_at=GETUTCDATE(), updated_by=?
           WHERE id = ? AND tenant_id = ?""",
        (data.title, data.description, data.requirements, data.benefits, data.location,
         data.job_type, data.salary_min, data.salary_max, data.currency,
         1 if data.is_internal else 0, 1 if data.is_external else 0,
         data.deadline, data.empresa_id, user['id'], vacancy_id, user['tenant_id'])
    )
    if result == 0:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    return await get_vacancy(vacancy_id, user)

@api_router.post("/vacancies/{vacancy_id}/publish")
async def publish_vacancy(vacancy_id: str, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    await database.execute(
        "UPDATE ATS_VACANTES SET status='published', updated_at=GETUTCDATE() WHERE id = ? AND tenant_id = ?",
        (vacancy_id, user['tenant_id'])
    )
    return {"message": "Vacante publicada"}

@api_router.post("/vacancies/{vacancy_id}/close")
async def close_vacancy(vacancy_id: str, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    await database.execute(
        "UPDATE ATS_VACANTES SET status='closed', updated_at=GETUTCDATE() WHERE id = ? AND tenant_id = ?",
        (vacancy_id, user['tenant_id'])
    )
    return {"message": "Vacante cerrada"}

# ============ CANDIDATES ROUTES ============
async def _enrich_candidate(d: dict) -> dict:
    """Agrega skills, educación, experiencia, documentos, áreas e idiomas al candidato."""
    cid = d['id']
    d['skills'] = await database.get_candidate_skills(cid)
    d['education'] = await database.get_candidate_education(cid)
    d['experience'] = await database.get_candidate_experience(cid)
    d['documents'] = await database.get_candidate_documents(cid)
    areas = await database.get_candidate_areas(cid)
    d['professional_areas'] = [{"id": a['professional_area_id'], "name": a['area_name']} for a in areas]
    langs = await database.get_candidate_languages(cid)
    d['languages'] = [{"id": l['language_id'], "name": l['language_name'], "level": l['language_level']} for l in langs]
    if d.get('professional_level_id'):
        lvl = await database.fetch_one("SELECT name FROM ATS_NIVELES_PROFESIONALES WHERE id = ?", (d['professional_level_id'],))
        d['professional_level_name'] = lvl['name'] if lvl else None
    return d

@api_router.post("/candidates")
async def create_candidate(data: CandidateCreate, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    existing = await database.fetch_one(
        "SELECT id FROM ATS_CANDIDATOS WHERE email = ? AND tenant_id = ?",
        (data.email, user['tenant_id'])
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado para este tenant")

    cid = str(uuid.uuid4())
    await database.execute(
        """INSERT INTO ATS_CANDIDATOS
           (id, tenant_id, first_name, last_name, email, phone, linkedin_url, portfolio_url,
            location, expected_salary, salary_currency, source, notes, candidate_status,
            disqualification_reason, experience_range, professional_level_id, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (cid, user['tenant_id'], data.first_name, data.last_name, data.email,
         data.phone, data.linkedin_url, data.portfolio_url, data.location,
         data.expected_salary, data.salary_currency, data.source, data.notes,
         data.candidate_status, data.disqualification_reason, data.experience_range,
         data.professional_level_id, user['id'])
    )
    # Insert related lists
    for s in data.skills:
        await database.execute(
            "INSERT INTO ATS_CANDIDATOS_SKILLS (id, candidate_id, skill_name) VALUES (?, ?, ?)",
            (str(uuid.uuid4()), cid, s)
        )
    for edu in data.education:
        ed = edu.model_dump()
        await database.execute(
            """INSERT INTO ATS_CANDIDATOS_EDUCACION (id, candidate_id, institution, degree, field_of_study, start_date, end_date)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (ed.get('id', str(uuid.uuid4())), cid, ed['institution'], ed['degree'], ed['field_of_study'], ed.get('start_date'), ed.get('end_date'))
        )
    for exp in data.experience:
        ex = exp.model_dump()
        await database.execute(
            """INSERT INTO ATS_CANDIDATOS_EXPERIENCIA (id, candidate_id, company, position, description, start_date, end_date, is_current)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (ex.get('id', str(uuid.uuid4())), cid, ex['company'], ex['position'], ex.get('description'), ex.get('start_date'), ex.get('end_date'), 1 if ex.get('is_current') else 0)
        )
    row = await database.fetch_one("SELECT * FROM ATS_CANDIDATOS WHERE id = ?", (cid,))
    return serialize_doc(row)

@api_router.get("/candidates")
async def list_candidates(
    page: int = 1, limit: int = 20,
    search: Optional[str] = None,
    source: Optional[str] = None,
    candidate_status: Optional[str] = None,
    experience_range: Optional[str] = None,
    sort_by: str = "created_at", sort_dir: str = "DESC",
    user: dict = Depends(get_current_user)
):
    where = "WHERE tenant_id = ?"
    params = [user['tenant_id']]
    if search:
        where += " AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)"
        s = f"%{search}%"; params += [s, s, s]
    if source:
        where += " AND source = ?"; params.append(source)
    if candidate_status:
        where += " AND candidate_status = ?"; params.append(candidate_status)
    if experience_range:
        where += " AND experience_range = ?"; params.append(experience_range)

    allowed_cols = {"created_at", "first_name", "last_name", "email"}
    col = sort_by if sort_by in allowed_cols else "created_at"
    direction = "DESC" if sort_dir.upper() == "DESC" else "ASC"

    total = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_CANDIDATOS {where}", tuple(params))
    sql = database.paginate(f"SELECT * FROM ATS_CANDIDATOS {where} ORDER BY {col} {direction}", page, limit)
    rows = await database.fetch_all(sql, tuple(params))

    result = []
    for r in rows:
        d = serialize_doc(r)
        d['skills'] = await database.get_candidate_skills(d['id'])
        if d.get('professional_level_id'):
            lvl = await database.fetch_one("SELECT name FROM ATS_NIVELES_PROFESIONALES WHERE id = ?", (d['professional_level_id'],))
            d['professional_level_name'] = lvl['name'] if lvl else None
        areas = await database.get_candidate_areas(d['id'])
        d['professional_areas'] = [{"id": a['professional_area_id'], "name": a['area_name']} for a in areas]
        langs = await database.get_candidate_languages(d['id'])
        d['languages'] = [{"id": l['language_id'], "name": l['language_name'], "level": l['language_level']} for l in langs]
        # Last application
        last_app = await database.fetch_one(
            "SELECT TOP 1 * FROM ATS_APLICACIONES WHERE candidate_id = ? ORDER BY created_at DESC",
            (d['id'],)
        )
        if last_app:
            d['last_application_stage'] = last_app['current_stage']
            vac = await database.fetch_one("SELECT title FROM ATS_VACANTES WHERE id = ?", (last_app['vacancy_id'],))
            d['last_vacancy_title'] = vac['title'] if vac else None
        result.append(d)
    return {"total": total, "page": page, "limit": limit, "items": result}

@api_router.get("/candidates/search/advanced")
async def advanced_search(
    q: Optional[str] = None,
    candidate_status: Optional[str] = None,
    experience_range: Optional[str] = None,
    professional_level_id: Optional[str] = None,
    professional_area_ids: Optional[str] = None,
    language_ids: Optional[str] = None,
    salary_min: Optional[float] = None,
    salary_max: Optional[float] = None,
    source: Optional[str] = None,
    sort_by: str = "created_at", sort_dir: str = "DESC",
    page: int = 1, limit: int = 20,
    user: dict = Depends(get_current_user)
):
    where = "WHERE c.tenant_id = ?"
    where_params = [user['tenant_id']]
    join_sql = ""
    join_params: list = []

    if q:
        where += " AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)"
        s = f"%{q}%"; where_params += [s, s, s]
    if candidate_status:
        where += " AND c.candidate_status = ?"; where_params.append(candidate_status)
    if experience_range:
        where += " AND c.experience_range = ?"; where_params.append(experience_range)
    if professional_level_id:
        where += " AND c.professional_level_id = ?"; where_params.append(professional_level_id)
    if salary_min is not None:
        where += " AND c.expected_salary >= ?"; where_params.append(salary_min)
    if salary_max is not None:
        where += " AND c.expected_salary <= ?"; where_params.append(salary_max)
    if source:
        where += " AND c.source = ?"; where_params.append(source)

    # Filter by areas (M:N)
    if professional_area_ids:
        area_list = [a.strip() for a in professional_area_ids.split(',') if a.strip()]
        placeholders = ','.join(['?' for _ in area_list])
        join_sql += f" INNER JOIN ATS_CANDIDATO_AREAS ca ON ca.candidate_id = c.id AND ca.professional_area_id IN ({placeholders})"
        join_params += area_list

    # Filter by languages (M:N)
    if language_ids:
        lang_list = [l.strip() for l in language_ids.split(',') if l.strip()]
        placeholders = ','.join(['?' for _ in lang_list])
        join_sql += f" INNER JOIN ATS_CANDIDATO_IDIOMAS ci ON ci.candidate_id = c.id AND ci.language_id IN ({placeholders})"
        join_params += lang_list

    col = sort_by if sort_by in {"created_at", "first_name", "last_name"} else "created_at"
    direction = "DESC" if sort_dir.upper() == "DESC" else "ASC"

    base_sql = f"SELECT DISTINCT c.* FROM ATS_CANDIDATOS c{join_sql}"
    all_params = tuple(join_params + where_params)

    try:
        total = await database.fetch_val(f"SELECT COUNT(DISTINCT c.id) FROM ATS_CANDIDATOS c{join_sql} {where}", all_params)
        sql = database.paginate(f"{base_sql} {where} ORDER BY c.{col} {direction}", page, limit)
        rows = await database.fetch_all(sql, all_params)
    except Exception as e:
        logger.error(f"advanced_search error: {e} | SQL: {base_sql} | params: {all_params}")
        raise HTTPException(status_code=500, detail=f"Error en búsqueda: {str(e)}")

    result = []
    for r in rows:
        d = serialize_doc(r)
        d['skills'] = await database.get_candidate_skills(d['id'])
        areas = await database.get_candidate_areas(d['id'])
        d['professional_areas'] = [{"id": a['professional_area_id'], "name": a['area_name']} for a in areas]
        langs = await database.get_candidate_languages(d['id'])
        d['languages'] = [{"id": l['language_id'], "name": l['language_name'], "level": l['language_level']} for l in langs]
        result.append(d)
    return {"total": total, "page": page, "limit": limit, "items": result}

@api_router.get("/candidates/{candidate_id}")
async def get_candidate(candidate_id: str, user: dict = Depends(get_current_user)):
    row = await database.fetch_one(
        "SELECT * FROM ATS_CANDIDATOS WHERE id = ? AND tenant_id = ?",
        (candidate_id, user['tenant_id'])
    )
    if not row:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
    d = serialize_doc(row)
    d = await _enrich_candidate(d)
    # Applications
    apps = await database.fetch_all(
        "SELECT * FROM ATS_APLICACIONES WHERE candidate_id = ? ORDER BY created_at DESC",
        (candidate_id,)
    )
    d['applications'] = []
    for app in apps:
        ad = serialize_doc(app)
        vac = await database.fetch_one("SELECT id, title, location FROM ATS_VACANTES WHERE id = ?", (app['vacancy_id'],))
        ad['vacancy'] = serialize_doc(vac) if vac else None
        ad['vacancy_title'] = vac['title'] if vac else None
        d['applications'].append(ad)
    return d

@api_router.put("/candidates/{candidate_id}")
async def update_candidate(candidate_id: str, data: CandidateCreate, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    row = await database.fetch_one("SELECT id FROM ATS_CANDIDATOS WHERE id = ? AND tenant_id = ?", (candidate_id, user['tenant_id']))
    if not row:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
    await database.execute(
        """UPDATE ATS_CANDIDATOS SET first_name=?, last_name=?, email=?, phone=?, linkedin_url=?,
           portfolio_url=?, location=?, expected_salary=?, salary_currency=?, source=?, notes=?,
           candidate_status=?, disqualification_reason=?, experience_range=?, professional_level_id=?,
           updated_at=GETUTCDATE(), updated_by=? WHERE id = ? AND tenant_id = ?""",
        (data.first_name, data.last_name, data.email, data.phone, data.linkedin_url,
         data.portfolio_url, data.location, data.expected_salary, data.salary_currency,
         data.source, data.notes, data.candidate_status, data.disqualification_reason,
         data.experience_range, data.professional_level_id, user['id'], candidate_id, user['tenant_id'])
    )
    # Sync skills
    await database.replace_candidate_skills(candidate_id, data.skills)
    return await get_candidate(candidate_id, user)

@api_router.delete("/candidates/{candidate_id}")
async def delete_candidate(candidate_id: str, user: dict = Depends(check_role([UserRole.ADMIN]))):
    await database.execute(
        "DELETE FROM ATS_CANDIDATOS WHERE id = ? AND tenant_id = ?",
        (candidate_id, user['tenant_id'])
    )
    return {"message": "Candidato eliminado"}

# File upload
@api_router.post("/candidates/{candidate_id}/upload-cv")
async def upload_candidate_cv(candidate_id: str, file: UploadFile = File(...), user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    cand = await database.fetch_one("SELECT id FROM ATS_CANDIDATOS WHERE id = ? AND tenant_id = ?", (candidate_id, user['tenant_id']))
    if not cand:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Solo se permiten PDFs")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo muy grande (máx 5MB)")
    upload_dir = ROOT_DIR / "uploads" / "candidates"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    stored = f"{file_id}.pdf"
    (upload_dir / stored).write_bytes(content)
    file_url = f"/api/candidates/{candidate_id}/files/{file_id}"
    await database.execute(
        "UPDATE ATS_CANDIDATOS SET cv_url=?, updated_at=GETUTCDATE() WHERE id = ?",
        (file_url, candidate_id)
    )
    await database.execute(
        """INSERT INTO ATS_CANDIDATOS_DOCUMENTOS (id, candidate_id, document_type, document_name, file_url, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (file_id, candidate_id, 'cv', file.filename or 'curriculum.pdf', file_url, user['id'])
    )
    return {"message": "CV subido", "file_id": file_id, "url": file_url}

@api_router.get("/candidates/{candidate_id}/files/{file_id}")
async def get_candidate_file(candidate_id: str, file_id: str):
    upload_dir = ROOT_DIR / "uploads" / "candidates"
    media_types = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png'
    }
    for ext, media_type in media_types.items():
        file_path = upload_dir / f"{file_id}{ext}"
        if file_path.exists():
            return FileResponse(str(file_path), media_type=media_type)
    raise HTTPException(status_code=404, detail="Archivo no encontrado")

@api_router.delete("/candidates/{candidate_id}/files/{file_id}")
async def delete_candidate_file(candidate_id: str, file_id: str, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    upload_dir = ROOT_DIR / "uploads" / "candidates"
    for ext in ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']:
        file_path = upload_dir / f"{file_id}{ext}"
        if file_path.exists():
            file_path.unlink()
            break
    await database.execute(
        "DELETE FROM ATS_CANDIDATOS_DOCUMENTOS WHERE id = ? AND candidate_id = ?",
        (file_id, candidate_id)
    )
    return {"message": "Documento eliminado"}

@api_router.post("/candidates/{candidate_id}/upload-document")
async def upload_candidate_document(
    candidate_id: str,
    document_type: str = Form("other"),
    file: UploadFile = File(...),
    user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))
):
    cand = await database.fetch_one(
        "SELECT id FROM ATS_CANDIDATOS WHERE id = ? AND tenant_id = ?",
        (candidate_id, user['tenant_id'])
    )
    if not cand:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
    allowed_types = {
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'image/jpeg': '.jpg',
        'image/png': '.png'
    }
    ext = allowed_types.get(file.content_type)
    if not ext:
        raise HTTPException(status_code=400, detail="Tipo no permitido. Use PDF, DOC, DOCX, JPG o PNG")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo muy grande (máx 10MB)")
    upload_dir = ROOT_DIR / "uploads" / "candidates"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    (upload_dir / f"{file_id}{ext}").write_bytes(content)
    file_url = f"/api/candidates/{candidate_id}/files/{file_id}"
    if document_type == 'cv':
        await database.execute(
            "UPDATE ATS_CANDIDATOS SET cv_url=?, updated_at=GETUTCDATE() WHERE id = ?",
            (file_url, candidate_id)
        )
    await database.execute(
        """INSERT INTO ATS_CANDIDATOS_DOCUMENTOS (id, candidate_id, document_type, document_name, file_url, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (file_id, candidate_id, document_type, file.filename or f'documento{ext}', file_url, user['id'])
    )
    return {"message": "Documento subido", "file_id": file_id, "url": file_url}

# Experience CRUD
@api_router.post("/candidates/{candidate_id}/experience")
async def add_experience(candidate_id: str, exp: Experience, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    cand = await database.fetch_one("SELECT id FROM ATS_CANDIDATOS WHERE id = ? AND tenant_id = ?", (candidate_id, user['tenant_id']))
    if not cand:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
    exp_id = exp.id or str(uuid.uuid4())
    await database.execute(
        """INSERT INTO ATS_CANDIDATOS_EXPERIENCIA (id, candidate_id, company, position, description, start_date, end_date, is_current)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (exp_id, candidate_id, exp.company, exp.position, exp.description, exp.start_date, exp.end_date, 1 if exp.is_current else 0)
    )
    return {"message": "Experiencia agregada", "experience_id": exp_id}

@api_router.put("/candidates/{candidate_id}/experience/{exp_id}")
async def update_experience(candidate_id: str, exp_id: str, exp: Experience, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    await database.execute(
        """UPDATE ATS_CANDIDATOS_EXPERIENCIA SET company=?, position=?, description=?, start_date=?, end_date=?, is_current=?
           WHERE id = ? AND candidate_id = ?""",
        (exp.company, exp.position, exp.description, exp.start_date, exp.end_date, 1 if exp.is_current else 0, exp_id, candidate_id)
    )
    return {"message": "Experiencia actualizada"}

@api_router.delete("/candidates/{candidate_id}/experience/{exp_id}")
async def delete_experience(candidate_id: str, exp_id: str, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    await database.execute(
        "DELETE FROM ATS_CANDIDATOS_EXPERIENCIA WHERE id = ? AND candidate_id = ?",
        (exp_id, candidate_id)
    )
    return {"message": "Experiencia eliminada"}

# Education CRUD
@api_router.post("/candidates/{candidate_id}/education")
async def add_education(candidate_id: str, edu: Education, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    cand = await database.fetch_one("SELECT id FROM ATS_CANDIDATOS WHERE id = ? AND tenant_id = ?", (candidate_id, user['tenant_id']))
    if not cand:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
    edu_id = edu.id or str(uuid.uuid4())
    await database.execute(
        """INSERT INTO ATS_CANDIDATOS_EDUCACION (id, candidate_id, institution, degree, field_of_study, start_date, end_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (edu_id, candidate_id, edu.institution, edu.degree, edu.field_of_study, edu.start_date, edu.end_date)
    )
    return {"message": "Educación agregada", "education_id": edu_id}

@api_router.put("/candidates/{candidate_id}/education/{edu_id}")
async def update_education(candidate_id: str, edu_id: str, edu: Education, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    await database.execute(
        """UPDATE ATS_CANDIDATOS_EDUCACION SET institution=?, degree=?, field_of_study=?, start_date=?, end_date=?
           WHERE id = ? AND candidate_id = ?""",
        (edu.institution, edu.degree, edu.field_of_study, edu.start_date, edu.end_date, edu_id, candidate_id)
    )
    return {"message": "Educación actualizada"}

@api_router.delete("/candidates/{candidate_id}/education/{edu_id}")
async def delete_education(candidate_id: str, edu_id: str, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    await database.execute(
        "DELETE FROM ATS_CANDIDATOS_EDUCACION WHERE id = ? AND candidate_id = ?",
        (edu_id, candidate_id)
    )
    return {"message": "Educación eliminada"}

# Areas & Languages
@api_router.get("/candidates/{candidate_id}/areas")
async def get_candidate_areas_ep(candidate_id: str, user: dict = Depends(get_current_user)):
    return await database.get_candidate_areas(candidate_id)

@api_router.post("/candidates/{candidate_id}/areas")
async def add_candidate_area(candidate_id: str, data: CandidateAreaCreate, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    existing = await database.fetch_one(
        "SELECT id FROM ATS_CANDIDATO_AREAS WHERE candidate_id = ? AND professional_area_id = ?",
        (candidate_id, data.professional_area_id)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Área ya asignada")
    rel_id = str(uuid.uuid4())
    await database.execute(
        "INSERT INTO ATS_CANDIDATO_AREAS (id, candidate_id, professional_area_id, tenant_id, created_by) VALUES (?, ?, ?, ?, ?)",
        (rel_id, candidate_id, data.professional_area_id, user['tenant_id'], user['id'])
    )
    return {"message": "Área agregada", "id": rel_id}

@api_router.put("/candidates/{candidate_id}/areas/sync")
async def sync_candidate_areas(candidate_id: str, area_ids: List[str], user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    cand = await database.fetch_one("SELECT id FROM ATS_CANDIDATOS WHERE id = ? AND tenant_id = ?", (candidate_id, user['tenant_id']))
    if not cand:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
    ops = [("DELETE FROM ATS_CANDIDATO_AREAS WHERE candidate_id = ?", (candidate_id,))]
    for area_id in area_ids:
        area = await database.fetch_one("SELECT id FROM ATS_AREAS_PROFESIONALES WHERE id = ? AND tenant_id = ?", (area_id, user['tenant_id']))
        if area:
            ops.append((
                "INSERT INTO ATS_CANDIDATO_AREAS (id, candidate_id, professional_area_id, tenant_id, created_by) VALUES (?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), candidate_id, area_id, user['tenant_id'], user['id'])
            ))
    await database.execute_transaction(ops)
    return {"message": f"{len(area_ids)} áreas sincronizadas"}

@api_router.delete("/candidates/{candidate_id}/areas/{rel_id}")
async def remove_candidate_area(candidate_id: str, rel_id: str, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    await database.execute("DELETE FROM ATS_CANDIDATO_AREAS WHERE id = ? AND candidate_id = ?", (rel_id, candidate_id))
    return {"message": "Área removida"}

@api_router.get("/candidates/{candidate_id}/languages")
async def get_candidate_languages_ep(candidate_id: str, user: dict = Depends(get_current_user)):
    return await database.get_candidate_languages(candidate_id)

@api_router.post("/candidates/{candidate_id}/languages")
async def add_candidate_language(candidate_id: str, data: CandidateLanguageCreate, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    existing = await database.fetch_one(
        "SELECT id FROM ATS_CANDIDATO_IDIOMAS WHERE candidate_id = ? AND language_id = ?",
        (candidate_id, data.language_id)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Idioma ya asignado")
    lang = await database.fetch_one("SELECT name, level FROM ATS_IDIOMAS WHERE id = ?", (data.language_id,))
    rel_id = str(uuid.uuid4())
    await database.execute(
        "INSERT INTO ATS_CANDIDATO_IDIOMAS (id, candidate_id, language_id, tenant_id, created_by) VALUES (?, ?, ?, ?, ?)",
        (rel_id, candidate_id, data.language_id, user['tenant_id'], user['id'])
    )
    return {"message": "Idioma agregado", "id": rel_id, "language_name": lang['name'] if lang else None, "language_level": lang['level'] if lang else None}

@api_router.put("/candidates/{candidate_id}/languages/sync")
async def sync_candidate_languages(candidate_id: str, language_ids: List[str], user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    cand = await database.fetch_one("SELECT id FROM ATS_CANDIDATOS WHERE id = ? AND tenant_id = ?", (candidate_id, user['tenant_id']))
    if not cand:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
    ops = [("DELETE FROM ATS_CANDIDATO_IDIOMAS WHERE candidate_id = ?", (candidate_id,))]
    for lang_id in language_ids:
        lang = await database.fetch_one("SELECT id FROM ATS_IDIOMAS WHERE id = ? AND tenant_id = ?", (lang_id, user['tenant_id']))
        if lang:
            ops.append((
                "INSERT INTO ATS_CANDIDATO_IDIOMAS (id, candidate_id, language_id, tenant_id, created_by) VALUES (?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), candidate_id, lang_id, user['tenant_id'], user['id'])
            ))
    await database.execute_transaction(ops)
    return {"message": f"{len(language_ids)} idiomas sincronizados"}

@api_router.delete("/candidates/{candidate_id}/languages/{rel_id}")
async def remove_candidate_language(candidate_id: str, rel_id: str, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    await database.execute("DELETE FROM ATS_CANDIDATO_IDIOMAS WHERE id = ? AND candidate_id = ?", (rel_id, candidate_id))
    return {"message": "Idioma removido"}

@api_router.get("/candidates/{candidate_id}/interviews")
async def get_candidate_interviews(candidate_id: str, user: dict = Depends(get_current_user)):
    rows = await database.fetch_all(
        """SELECT e.*, a.vacancy_id FROM ATS_ENTREVISTAS e
           JOIN ATS_APLICACIONES a ON a.id = e.application_id
           WHERE a.candidate_id = ?
           ORDER BY e.scheduled_at DESC""",
        (candidate_id,)
    )
    result = []
    for r in rows:
        d = serialize_doc(r)
        vac = await database.fetch_one("SELECT title FROM ATS_VACANTES WHERE id = ?", (r['vacancy_id'],))
        d['vacancy_title'] = vac['title'] if vac else None
        d['evaluators'] = await database.get_interview_evaluators(d['id'])
        result.append(d)
    return result

# ============ APPLICATIONS ROUTES ============
@api_router.post("/applications")
async def create_application(data: ApplicationCreate, user: dict = Depends(get_current_user)):
    vac = await database.fetch_one("SELECT id FROM ATS_VACANTES WHERE id = ? AND tenant_id = ?", (data.vacancy_id, user['tenant_id']))
    if not vac:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")

    candidate_id = data.candidate_id
    if data.candidate_data and not data.candidate_id:
        existing = await database.fetch_one("SELECT id FROM ATS_CANDIDATOS WHERE email = ? AND tenant_id = ?", (data.candidate_data.email, user['tenant_id']))
        candidate_id = existing['id'] if existing else None
        if not candidate_id:
            cand_resp = await create_candidate(data.candidate_data, user)
            candidate_id = cand_resp['id']

    if not candidate_id:
        raise HTTPException(status_code=400, detail="Se requiere candidate_id o candidate_data")

    existing_app = await database.fetch_one("SELECT id FROM ATS_APLICACIONES WHERE vacancy_id = ? AND candidate_id = ?", (data.vacancy_id, candidate_id))
    if existing_app:
        raise HTTPException(status_code=400, detail="Aplicación ya existe")

    app_id = str(uuid.uuid4())
    await database.execute(
        """INSERT INTO ATS_APLICACIONES (id, tenant_id, vacancy_id, candidate_id, created_by)
           VALUES (?, ?, ?, ?, ?)""",
        (app_id, user['tenant_id'], data.vacancy_id, candidate_id, user['id'])
    )
    await database.execute("UPDATE ATS_VACANTES SET applications_count = applications_count + 1 WHERE id = ?", (data.vacancy_id,))

    # Insert initial pipeline history
    await database.execute(
        "INSERT INTO ATS_PIPELINE_HISTORIAL (id, application_id, from_stage, to_stage, moved_by) VALUES (?, ?, NULL, ?, ?)",
        (str(uuid.uuid4()), app_id, PipelineStage.APPLIED.value, user['id'])
    )
    return await database.fetch_one("SELECT * FROM ATS_APLICACIONES WHERE id = ?", (app_id,))

@api_router.get("/applications")
async def list_applications(
    vacancy_id: Optional[str] = None, candidate_id: Optional[str] = None,
    page: int = 1, limit: int = 50,
    user: dict = Depends(get_current_user)
):
    where = "WHERE tenant_id = ?"
    params = [user['tenant_id']]
    if vacancy_id:
        where += " AND vacancy_id = ?"; params.append(vacancy_id)
    if candidate_id:
        where += " AND candidate_id = ?"; params.append(candidate_id)

    total = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_APLICACIONES {where}", tuple(params))
    sql = database.paginate(f"SELECT * FROM ATS_APLICACIONES {where} ORDER BY created_at DESC", page, limit)
    rows = await database.fetch_all(sql, tuple(params))
    result = []
    for r in rows:
        d = serialize_doc(r)
        cand = await database.fetch_one("SELECT * FROM ATS_CANDIDATOS WHERE id = ?", (r['candidate_id'],))
        vac = await database.fetch_one("SELECT title FROM ATS_VACANTES WHERE id = ?", (r['vacancy_id'],))
        d['candidate'] = serialize_doc(cand)
        d['vacancy_title'] = vac['title'] if vac else None
        result.append(d)
    return {"total": total, "page": page, "limit": limit, "items": result}

@api_router.get("/applications/{app_id}")
async def get_application(app_id: str, user: dict = Depends(get_current_user)):
    row = await database.fetch_one("SELECT * FROM ATS_APLICACIONES WHERE id = ? AND tenant_id = ?", (app_id, user['tenant_id']))
    if not row:
        raise HTTPException(status_code=404, detail="Aplicación no encontrada")
    d = serialize_doc(row)
    cand = await database.fetch_one("SELECT * FROM ATS_CANDIDATOS WHERE id = ?", (row['candidate_id'],))
    vac = await database.fetch_one("SELECT * FROM ATS_VACANTES WHERE id = ?", (row['vacancy_id'],))
    d['candidate'] = serialize_doc(cand)
    d['vacancy'] = serialize_doc(vac)
    d['pipeline_history'] = await database.get_pipeline_history(app_id)
    interviews = await database.fetch_all("SELECT * FROM ATS_ENTREVISTAS WHERE application_id = ?", (app_id,))
    d['interviews'] = serialize_list(interviews)
    return d

@api_router.put("/applications/{app_id}/move")
async def move_pipeline(app_id: str, move: PipelineMove, user: dict = Depends(get_current_user)):
    app_row = await database.fetch_one("SELECT * FROM ATS_APLICACIONES WHERE id = ? AND tenant_id = ?", (app_id, user['tenant_id']))
    if not app_row:
        raise HTTPException(status_code=404, detail="Aplicación no encontrada")

    # Evitar mover a la misma etapa
    current_stage = app_row.get('current_stage') or PipelineStage.APPLIED.value
    if current_stage == move.new_stage.value:
        return {"message": "Candidato ya está en esta etapa", "new_stage": move.new_stage.value}

    moved_by_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    ops = [
        ("UPDATE ATS_APLICACIONES SET current_stage=?, updated_at=GETUTCDATE() WHERE id = ?",
         (move.new_stage.value, app_id)),
        ("INSERT INTO ATS_PIPELINE_HISTORIAL (id, application_id, from_stage, to_stage, moved_by, moved_by_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
         (str(uuid.uuid4()), app_id, current_stage, move.new_stage.value, user['id'], moved_by_name, move.notes))
    ]
    await database.execute_transaction(ops)
    return {"message": "Candidato movido", "new_stage": move.new_stage.value}

# ============ INTERVIEWS ROUTES ============
@api_router.post("/interviews")
async def create_interview(data: InterviewCreate, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    app_row = await database.fetch_one("SELECT * FROM ATS_APLICACIONES WHERE id = ? AND tenant_id = ?", (data.application_id, user['tenant_id']))
    if not app_row:
        raise HTTPException(status_code=404, detail="Aplicación no encontrada")

    int_id = str(uuid.uuid4())
    await database.execute(
        """INSERT INTO ATS_ENTREVISTAS (id, tenant_id, application_id, scheduled_at, duration_minutes,
           interview_type, location, meeting_link, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (int_id, user['tenant_id'], data.application_id, data.scheduled_at,
         data.duration_minutes, data.interview_type, data.location, data.meeting_link,
         data.notes, user['id'])
    )
    for ev_id in data.evaluators:
        await database.execute(
            "INSERT INTO ATS_ENTREVISTAS_EVALUADORES (id, interview_id, evaluator_id) VALUES (?, ?, ?)",
            (str(uuid.uuid4()), int_id, ev_id)
        )
    row = await database.fetch_one("SELECT * FROM ATS_ENTREVISTAS WHERE id = ?", (int_id,))
    d = serialize_doc(row)
    d['evaluators'] = await database.get_interview_evaluators(int_id)
    return d

@api_router.get("/interviews")
async def list_interviews(
    status: Optional[str] = None, empresa_id: Optional[str] = None,
    sort_dir: str = "ASC", user: dict = Depends(get_current_user)
):
    direction = "DESC" if sort_dir.upper() == "DESC" else "ASC"
    if empresa_id:
        vacancy_ids = await database.fetch_all(
            "SELECT id FROM ATS_VACANTES WHERE empresa_id = ? AND tenant_id = ?",
            (empresa_id, user['tenant_id'])
        )
        if not vacancy_ids:
            return []
        vid_list = [v['id'] for v in vacancy_ids]
        app_ids = await database.fetch_all(
            f"SELECT id FROM ATS_APLICACIONES WHERE vacancy_id IN ({','.join(['?']*len(vid_list))})",
            tuple(vid_list)
        )
        if not app_ids:
            return []
        aid_list = [a['id'] for a in app_ids]
        placeholders = ','.join(['?'] * len(aid_list))
        where = f"WHERE e.tenant_id = ? AND e.application_id IN ({placeholders})"
        params = [user['tenant_id']] + aid_list
    else:
        where = "WHERE e.tenant_id = ?"
        params = [user['tenant_id']]

    if status:
        where += " AND e.status = ?"; params.append(status)

    rows = await database.fetch_all(
        f"SELECT e.* FROM ATS_ENTREVISTAS e {where} ORDER BY e.scheduled_at {direction}",
        tuple(params)
    )
    result = []
    for r in rows:
        d = serialize_doc(r)
        app = await database.fetch_one("SELECT candidate_id, vacancy_id FROM ATS_APLICACIONES WHERE id = ?", (r['application_id'],))
        if app:
            cand = await database.fetch_one("SELECT id, first_name, last_name, email FROM ATS_CANDIDATOS WHERE id = ?", (app['candidate_id'],))
            vac = await database.fetch_one("SELECT title, empresa_id FROM ATS_VACANTES WHERE id = ?", (app['vacancy_id'],))
            d['candidate'] = serialize_doc(cand)
            d['vacancy_title'] = vac['title'] if vac else None
            if vac and vac.get('empresa_id'):
                emp = await database.fetch_one("SELECT name FROM ATS_EMPRESAS WHERE id = ?", (vac['empresa_id'],))
                d['empresa_name'] = emp['name'] if emp else None
        d['evaluators'] = await database.get_interview_evaluators(d['id'])
        result.append(d)
    return result

@api_router.get("/interviews/{interview_id}")
async def get_interview(interview_id: str, user: dict = Depends(get_current_user)):
    row = await database.fetch_one("SELECT * FROM ATS_ENTREVISTAS WHERE id = ? AND tenant_id = ?", (interview_id, user['tenant_id']))
    if not row:
        raise HTTPException(status_code=404, detail="Entrevista no encontrada")
    d = serialize_doc(row)
    d['evaluators'] = await database.get_interview_evaluators(interview_id)
    return d

@api_router.put("/interviews/{interview_id}")
async def update_interview(interview_id: str, data: InterviewCreate, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    existing = await database.fetch_one(
        "SELECT id FROM ATS_ENTREVISTAS WHERE id = ? AND tenant_id = ?",
        (interview_id, user['tenant_id'])
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Entrevista no encontrada")
    # Actualizar entrevista y sync evaluadores en transacción atómica
    ops = [
        ("""UPDATE ATS_ENTREVISTAS SET scheduled_at=?, duration_minutes=?, interview_type=?,
            location=?, meeting_link=?, notes=?, updated_at=GETUTCDATE(), updated_by=?
            WHERE id = ? AND tenant_id = ?""",
         (data.scheduled_at, data.duration_minutes, data.interview_type,
          data.location, data.meeting_link, data.notes, user['id'], interview_id, user['tenant_id'])),
        ("DELETE FROM ATS_ENTREVISTAS_EVALUADORES WHERE interview_id = ?", (interview_id,)),
    ]
    for ev_id in data.evaluators:
        ops.append((
            "INSERT INTO ATS_ENTREVISTAS_EVALUADORES (id, interview_id, evaluator_id) VALUES (?, ?, ?)",
            (str(uuid.uuid4()), interview_id, ev_id)
        ))
    await database.execute_transaction(ops)
    return await get_interview(interview_id, user)
@api_router.post("/interviews/{interview_id}/complete")
async def complete_interview(interview_id: str, data: InterviewCompletion, user: dict = Depends(get_current_user)):
    await database.execute(
        """UPDATE ATS_ENTREVISTAS SET status='completed', completion_notes=?,
           closed_at=?, closed_by=?, updated_at=GETUTCDATE()
           WHERE id = ? AND tenant_id = ?""",
        (data.completion_notes, _now(), user['id'], interview_id, user['tenant_id'])
    )
    return {"message": "Entrevista completada"}

@api_router.post("/interviews/{interview_id}/cancel")
async def cancel_interview(interview_id: str, user: dict = Depends(get_current_user)):
    await database.execute(
        "UPDATE ATS_ENTREVISTAS SET status='cancelled', updated_at=GETUTCDATE() WHERE id = ? AND tenant_id = ?",
        (interview_id, user['tenant_id'])
    )
    return {"message": "Entrevista cancelada"}

# ============ EVALUATIONS ROUTES ============
@api_router.post("/evaluations")
async def create_evaluation(data: EvaluationCreate, user: dict = Depends(get_current_user)):
    interview = await database.fetch_one("SELECT * FROM ATS_ENTREVISTAS WHERE id = ? AND tenant_id = ?", (data.interview_id, user['tenant_id']))
    if not interview:
        raise HTTPException(status_code=404, detail="Entrevista no encontrada")
    eval_id = str(uuid.uuid4())
    ops = [
        ("""INSERT INTO ATS_EVALUACIONES (id, tenant_id, interview_id, evaluator_id, overall_score, strengths, weaknesses, recommendation, comments, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
         (eval_id, user['tenant_id'], data.interview_id, user['id'], data.overall_score,
          data.strengths, data.weaknesses, data.recommendation, data.comments, user['id']))
    ]
    for crit, score in data.scores.items():
        ops.append((
            "INSERT INTO ATS_EVALUACIONES_CRITERIOS (id, evaluation_id, criterion_name, score) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), eval_id, crit, score)
        ))
    await database.execute_transaction(ops)
    return {"message": "Evaluación creada", "evaluation_id": eval_id}

@api_router.get("/evaluations")
async def list_evaluations(interview_id: str, user: dict = Depends(get_current_user)):
    rows = await database.fetch_all(
        "SELECT * FROM ATS_EVALUACIONES WHERE interview_id = ? AND tenant_id = ?",
        (interview_id, user['tenant_id'])
    )
    result = []
    for r in rows:
        d = serialize_doc(r)
        d['scores'] = await database.get_evaluation_scores(d['id'])
        result.append(d)
    return result

# ============ OFFERS ROUTES ============
@api_router.post("/interviews/{interview_id}/upload-document")
async def upload_interview_document(
    interview_id: str,
    document_type: str = Form("exam"),
    file: UploadFile = File(...),
    user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))
):
    """Sube un archivo a una entrevista (examen, prueba, resultado, etc.)"""
    interview = await database.fetch_one(
        "SELECT id FROM ATS_ENTREVISTAS WHERE id = ? AND tenant_id = ?",
        (interview_id, user['tenant_id'])
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Entrevista no encontrada")

    allowed_types = {
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'image/jpeg': '.jpg',
        'image/png': '.png'
    }
    ext = allowed_types.get(file.content_type)
    if not ext:
        raise HTTPException(status_code=400, detail="Tipo no permitido. Use PDF, DOC, DOCX, JPG o PNG")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo muy grande (máx 10MB)")

    upload_dir = ROOT_DIR / "uploads" / "interviews"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    (upload_dir / f"{file_id}{ext}").write_bytes(content)
    file_url = f"/api/interviews/{interview_id}/files/{file_id}"

    await database.execute(
        """INSERT INTO ATS_CANDIDATOS_DOCUMENTOS (id, candidate_id, document_type, document_name, file_url, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (file_id, interview_id, document_type, file.filename or f'documento{ext}', file_url, user['id'])
    )
    return {"message": "Archivo subido", "file_id": file_id, "url": file_url}

@api_router.get("/interviews/{interview_id}/files/{file_id}")
async def get_interview_file(interview_id: str, file_id: str):
    upload_dir = ROOT_DIR / "uploads" / "interviews"
    media_types = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png'
    }
    for ext, media_type in media_types.items():
        file_path = upload_dir / f"{file_id}{ext}"
        if file_path.exists():
            return FileResponse(str(file_path), media_type=media_type)
    raise HTTPException(status_code=404, detail="Archivo no encontrado")

@api_router.get("/interviews/{interview_id}/documents")
async def list_interview_documents(interview_id: str, user: dict = Depends(get_current_user)):
    rows = await database.fetch_all(
        "SELECT * FROM ATS_CANDIDATOS_DOCUMENTOS WHERE candidate_id = ? ORDER BY id DESC",
        (interview_id,)
    )
    return [serialize_doc(r) for r in rows]

@api_router.delete("/interviews/{interview_id}/files/{file_id}")
async def delete_interview_file(interview_id: str, file_id: str, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    upload_dir = ROOT_DIR / "uploads" / "interviews"
    for ext in ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']:
        file_path = upload_dir / f"{file_id}{ext}"
        if file_path.exists():
            file_path.unlink()
            break
    await database.execute(
        "DELETE FROM ATS_CANDIDATOS_DOCUMENTOS WHERE id = ? AND candidate_id = ?",
        (file_id, interview_id)
    )
    return {"message": "Archivo eliminado"}

@api_router.post("/offers")
async def create_offer(data: OfferCreate, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    app_row = await database.fetch_one("SELECT * FROM ATS_APLICACIONES WHERE id = ? AND tenant_id = ?", (data.application_id, user['tenant_id']))
    if not app_row:
        raise HTTPException(status_code=404, detail="Aplicación no encontrada")
    vac = await database.fetch_one("SELECT empresa_id FROM ATS_VACANTES WHERE id = ?", (app_row['vacancy_id'],))
    empresa_id = vac['empresa_id'] if vac else None

    offer_id = str(uuid.uuid4())
    await database.execute(
        """INSERT INTO ATS_OFERTAS (id, tenant_id, empresa_id, application_id, candidate_id, vacancy_id,
           position_title, base_salary, currency, bonus, benefits, start_date, expiration_date,
           contract_type, additional_terms, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (offer_id, user['tenant_id'], empresa_id, data.application_id, app_row['candidate_id'],
         app_row['vacancy_id'], data.position_title, data.base_salary, data.currency,
         data.bonus, data.benefits, data.start_date, data.expiration_date,
         data.contract_type, data.additional_terms, user['id'])
    )
    row = await database.fetch_one("SELECT * FROM ATS_OFERTAS WHERE id = ?", (offer_id,))
    return serialize_doc(row)

@api_router.get("/offers")
async def list_offers(
    page: int = 1, limit: int = 20,
    status: Optional[str] = None, empresa_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    where = "WHERE tenant_id = ?"
    params = [user['tenant_id']]
    if status:
        where += " AND status = ?"; params.append(status)
    if empresa_id:
        where += " AND empresa_id = ?"; params.append(empresa_id)

    total = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_OFERTAS {where}", tuple(params))
    sql = database.paginate(f"SELECT * FROM ATS_OFERTAS {where} ORDER BY created_at DESC", page, limit)
    rows = await database.fetch_all(sql, tuple(params))

    result = []
    for r in rows:
        d = serialize_doc(r)
        cand = await database.fetch_one("SELECT first_name, last_name FROM ATS_CANDIDATOS WHERE id = ?", (r['candidate_id'],))
        if cand:
            d['candidate_name'] = f"{cand['first_name']} {cand['last_name']}"
        vac = await database.fetch_one("SELECT title, empresa_id FROM ATS_VACANTES WHERE id = ?", (r['vacancy_id'],))
        if vac:
            d['vacancy_title'] = vac['title']
            if vac.get('empresa_id'):
                emp = await database.fetch_one("SELECT name FROM ATS_EMPRESAS WHERE id = ?", (vac['empresa_id'],))
                d['empresa_name'] = emp['name'] if emp else None
        result.append(d)
    return {"total": total, "page": page, "limit": limit, "items": result}

@api_router.get("/offers/{offer_id}")
async def get_offer(offer_id: str, user: dict = Depends(get_current_user)):
    row = await database.fetch_one("SELECT * FROM ATS_OFERTAS WHERE id = ? AND tenant_id = ?", (offer_id, user['tenant_id']))
    if not row:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    return serialize_doc(row)

class OfferUpdate(BaseModel):
    base_salary: Optional[float] = None
    currency: Optional[str] = None
    start_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    benefits: Optional[str] = None
    bonus: Optional[float] = None
    additional_terms: Optional[str] = None

@api_router.put("/offers/{offer_id}")
async def update_offer(offer_id: str, data: OfferUpdate, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    existing = await database.fetch_one(
        "SELECT id FROM ATS_OFERTAS WHERE id = ? AND tenant_id = ?",
        (offer_id, user['tenant_id'])
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")

    # Solo actualizar campos enviados (excluir None)
    updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    set_clause = ", ".join([f"{k}=?" for k in updates])
    vals = list(updates.values()) + [offer_id, user['tenant_id']]
    await database.execute(
        f"UPDATE ATS_OFERTAS SET {set_clause}, updated_at=GETUTCDATE() WHERE id = ? AND tenant_id = ?",
        tuple(vals)
    )
    return await get_offer(offer_id, user)

@api_router.post("/offers/{offer_id}/send")
async def send_offer(offer_id: str, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    await database.execute(
        "UPDATE ATS_OFERTAS SET status='sent', updated_at=GETUTCDATE() WHERE id = ? AND tenant_id = ? AND status IN ('draft','pending')",
        (offer_id, user['tenant_id'])
    )
    return {"message": "Oferta enviada"}

@api_router.post("/offers/{offer_id}/accept")
async def accept_offer(offer_id: str, user: dict = Depends(get_current_user)):
    offer = await database.fetch_one("SELECT * FROM ATS_OFERTAS WHERE id = ? AND tenant_id = ?", (offer_id, user['tenant_id']))
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    ops = [
        ("UPDATE ATS_OFERTAS SET status='accepted', updated_at=GETUTCDATE() WHERE id = ?", (offer_id,)),
        ("UPDATE ATS_APLICACIONES SET current_stage='offer' WHERE id = ?", (offer['application_id'],))
    ]
    await database.execute_transaction(ops)
    return {"message": "Oferta aceptada"}

@api_router.post("/offers/{offer_id}/reject")
async def reject_offer(offer_id: str, user: dict = Depends(get_current_user)):
    await database.execute(
        "UPDATE ATS_OFERTAS SET status='rejected', updated_at=GETUTCDATE() WHERE id = ? AND tenant_id = ?",
        (offer_id, user['tenant_id'])
    )
    return {"message": "Oferta rechazada"}

@api_router.post("/offers/{offer_id}/process-hiring")
async def process_hiring_from_offer(offer_id: str, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    offer = await database.fetch_one("SELECT * FROM ATS_OFERTAS WHERE id = ? AND tenant_id = ?", (offer_id, user['tenant_id']))
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    app_row = await database.fetch_one("SELECT * FROM ATS_APLICACIONES WHERE id = ?", (offer['application_id'],))
    if not app_row:
        raise HTTPException(status_code=404, detail="Aplicación no encontrada")

    existing = await database.fetch_one("SELECT id FROM ATS_CONTRATACIONES WHERE application_id = ?", (offer['application_id'],))
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una contratación para esta aplicación")

    count = await database.fetch_val("SELECT COUNT(*) FROM ATS_CONTRATACIONES WHERE tenant_id = ?", (user['tenant_id'],))
    emp_number = f"EMP-{(count or 0) + 1:04d}"
    hiring_id = str(uuid.uuid4())

    vac = await database.fetch_one("SELECT * FROM ATS_VACANTES WHERE id = ?", (app_row['vacancy_id'],))
    req = None
    if vac:
        req = await database.fetch_one("SELECT * FROM ATS_REQUISICIONES WHERE id = ?", (vac['requisition_id'],))
    department = (req['department'] if req else None) or 'General'
    position = offer['position_title']

    cand = await database.fetch_one("SELECT * FROM ATS_CANDIDATOS WHERE id = ?", (app_row['candidate_id'],))

    ops = [
        ("""INSERT INTO ATS_CONTRATACIONES (id, tenant_id, empresa_id, application_id, offer_id, candidate_id,
            vacancy_id, employee_number, department, position, start_date, contract_type, salary, currency, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
         (hiring_id, user['tenant_id'], offer.get('empresa_id'), offer['application_id'], offer_id,
          app_row['candidate_id'], app_row['vacancy_id'], emp_number, department, position,
          offer['start_date'], offer['contract_type'], offer['base_salary'], offer['currency'], user['id'])),
        ("UPDATE ATS_APLICACIONES SET current_stage='hired', is_active=0 WHERE id = ?", (offer['application_id'],)),
        ("UPDATE ATS_OFERTAS SET status='finalized', updated_at=GETUTCDATE() WHERE id = ?", (offer_id,)),
    ]
    await database.execute_transaction(ops)

    # Create employee record
    emp_id = str(uuid.uuid4())
    await database.execute(
        """INSERT INTO ATS_EMPLEADOS (id, tenant_id, empresa_id, hiring_id, candidate_id, employee_number,
           first_name, last_name, email, phone, department, position, start_date, salary, currency, contract_type, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (emp_id, user['tenant_id'], offer.get('empresa_id'), hiring_id, app_row['candidate_id'],
         emp_number, cand['first_name'] if cand else '', cand['last_name'] if cand else '',
         cand['email'] if cand else '', cand['phone'] if cand else None,
         department, position, offer['start_date'], offer['base_salary'],
         offer['currency'], offer['contract_type'], user['id'])
    )
    await database.execute("UPDATE ATS_CONTRATACIONES SET employee_record_created=1 WHERE id = ?", (hiring_id,))

    # Close vacancy/requisition if quota filled
    if vac:
        req_row = req
        if req_row:
            hired_count = await database.fetch_val("SELECT COUNT(*) FROM ATS_CONTRATACIONES WHERE vacancy_id = ?", (app_row['vacancy_id'],))
            if hired_count >= req_row.get('positions_count', 1):
                await database.execute("UPDATE ATS_VACANTES SET status='closed' WHERE id = ?", (app_row['vacancy_id'],))
                await database.execute("UPDATE ATS_REQUISICIONES SET status='closed' WHERE id = ?", (req_row['id'],))

    return {"message": "Contratación procesada exitosamente", "hiring_id": hiring_id, "employee_number": emp_number}

# ============ HIRINGS ROUTES ============
@api_router.post("/hirings")
async def create_hiring(data: HiringCreate, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    app_row = await database.fetch_one("SELECT * FROM ATS_APLICACIONES WHERE id = ? AND tenant_id = ?", (data.application_id, user['tenant_id']))
    if not app_row:
        raise HTTPException(status_code=404, detail="Aplicación no encontrada")
    offer = await database.fetch_one("SELECT * FROM ATS_OFERTAS WHERE id = ? AND status = 'accepted'", (data.offer_id,))
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta aceptada no encontrada")
    existing = await database.fetch_one("SELECT id FROM ATS_CONTRATACIONES WHERE application_id = ?", (data.application_id,))
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una contratación")

    count = await database.fetch_val("SELECT COUNT(*) FROM ATS_CONTRATACIONES WHERE tenant_id = ?", (user['tenant_id'],))
    emp_number = data.employee_number or f"EMP-{(count or 0) + 1:04d}"
    hiring_id = str(uuid.uuid4())
    cand = await database.fetch_one("SELECT * FROM ATS_CANDIDATOS WHERE id = ?", (app_row['candidate_id'],))

    ops = [
        ("""INSERT INTO ATS_CONTRATACIONES (id, tenant_id, empresa_id, application_id, offer_id, candidate_id,
            vacancy_id, employee_number, department, position, start_date, contract_type, salary, currency, supervisor_id, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
         (hiring_id, user['tenant_id'], data.empresa_id, data.application_id, data.offer_id,
          app_row['candidate_id'], app_row['vacancy_id'], emp_number, data.department, data.position,
          data.start_date, data.contract_type, data.salary, data.currency, data.supervisor_id, user['id'])),
        ("UPDATE ATS_APLICACIONES SET current_stage='hired', is_active=0 WHERE id = ?", (data.application_id,)),
        ("UPDATE ATS_OFERTAS SET status='finalized', updated_at=GETUTCDATE() WHERE id = ?", (data.offer_id,)),
    ]
    await database.execute_transaction(ops)

    emp_id = str(uuid.uuid4())
    await database.execute(
        """INSERT INTO ATS_EMPLEADOS (id, tenant_id, empresa_id, hiring_id, candidate_id, employee_number,
           first_name, last_name, email, phone, department, position, start_date, salary, currency, contract_type, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (emp_id, user['tenant_id'], data.empresa_id, hiring_id, app_row['candidate_id'],
         emp_number, cand['first_name'] if cand else '', cand['last_name'] if cand else '',
         cand['email'] if cand else '', cand['phone'] if cand else None,
         data.department, data.position, data.start_date, data.salary, data.currency, data.contract_type, user['id'])
    )
    await database.execute("UPDATE ATS_CONTRATACIONES SET employee_record_created=1 WHERE id = ?", (hiring_id,))
    return await database.fetch_one("SELECT * FROM ATS_CONTRATACIONES WHERE id = ?", (hiring_id,))

@api_router.get("/hirings")
async def list_hirings(page: int = 1, limit: int = 20, empresa_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    where = "WHERE tenant_id = ?"
    params = [user['tenant_id']]
    if empresa_id:
        where += " AND empresa_id = ?"; params.append(empresa_id)
    total = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_CONTRATACIONES {where}", tuple(params))
    sql = database.paginate(f"SELECT * FROM ATS_CONTRATACIONES {where} ORDER BY created_at DESC", page, limit)
    rows = await database.fetch_all(sql, tuple(params))
    return {"total": total, "page": page, "limit": limit, "items": serialize_list(rows)}

@api_router.get("/hirings/{hiring_id}")
async def get_hiring(hiring_id: str, user: dict = Depends(get_current_user)):
    row = await database.fetch_one("SELECT * FROM ATS_CONTRATACIONES WHERE id = ? AND tenant_id = ?", (hiring_id, user['tenant_id']))
    if not row:
        raise HTTPException(status_code=404, detail="Contratación no encontrada")
    return serialize_doc(row)

# ============ EMPLOYEES ROUTES ============
@api_router.get("/employees")
async def list_employees(
    page: int = 1, limit: int = 20,
    search: Optional[str] = None, empresa_id: Optional[str] = None,
    sort_by: str = "created_at", sort_dir: str = "DESC",
    user: dict = Depends(get_current_user)
):
    where = "WHERE tenant_id = ?"
    params = [user['tenant_id']]
    if search:
        where += " AND (first_name LIKE ? OR last_name LIKE ? OR employee_number LIKE ? OR position LIKE ?)"
        s = f"%{search}%"; params += [s, s, s, s]
    if empresa_id:
        where += " AND empresa_id = ?"; params.append(empresa_id)

    allowed = {"created_at", "first_name", "last_name", "employee_number", "position"}
    col = sort_by if sort_by in allowed else "created_at"
    direction = "DESC" if sort_dir.upper() == "DESC" else "ASC"

    total = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_EMPLEADOS {where}", tuple(params))
    sql = database.paginate(f"SELECT * FROM ATS_EMPLEADOS {where} ORDER BY {col} {direction}", page, limit)
    rows = await database.fetch_all(sql, tuple(params))

    result = []
    for r in rows:
        d = serialize_doc(r)
        if d.get('empresa_id'):
            emp = await database.fetch_one("SELECT name FROM ATS_EMPRESAS WHERE id = ?", (d['empresa_id'],))
            d['empresa_name'] = emp['name'] if emp else None
        result.append(d)
    return {"total": total, "page": page, "limit": limit, "items": result}

@api_router.get("/employees/{emp_id}")
async def get_employee(emp_id: str, user: dict = Depends(get_current_user)):
    row = await database.fetch_one("SELECT * FROM ATS_EMPLEADOS WHERE id = ? AND tenant_id = ?", (emp_id, user['tenant_id']))
    if not row:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return serialize_doc(row)

# ============ HR PERSONNEL ROUTES ============
@api_router.post("/hr-personnel")
async def create_hr_personnel(data: HRPersonnelCreate, user: dict = Depends(check_role([UserRole.ADMIN]))):
    hr_id = str(uuid.uuid4())
    is_active = data.active if data.active is not None else data.is_active
    await database.execute(
        """INSERT INTO ATS_HR_PERSONAL (id, tenant_id, name, first_name, last_name, email, position, department, phone, is_active, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (hr_id, user['tenant_id'], data.name, data.first_name, data.last_name, data.email,
         data.position, data.department, data.phone, 1 if is_active else 0, user['id'])
    )
    return await database.fetch_one("SELECT * FROM ATS_HR_PERSONAL WHERE id = ?", (hr_id,))

@api_router.get("/hr-personnel")
async def list_hr_personnel(include_inactive: bool = False, user: dict = Depends(get_current_user)):
    if include_inactive:
        rows = await database.fetch_all(
            "SELECT * FROM ATS_HR_PERSONAL WHERE tenant_id = ? ORDER BY COALESCE(name, first_name)",
            (user['tenant_id'],)
        )
    else:
        rows = await database.fetch_all(
            "SELECT * FROM ATS_HR_PERSONAL WHERE tenant_id = ? AND is_active = 1 ORDER BY COALESCE(name, first_name)",
            (user['tenant_id'],)
        )
    return serialize_list(rows)

@api_router.get("/hr-personnel/{personnel_id}")
async def get_hr_personnel(personnel_id: str, user: dict = Depends(get_current_user)):
    row = await database.fetch_one("SELECT * FROM ATS_HR_PERSONAL WHERE id = ? AND tenant_id = ?", (personnel_id, user['tenant_id']))
    if not row:
        raise HTTPException(status_code=404, detail="Personal no encontrado")
    return serialize_doc(row)

@api_router.put("/hr-personnel/{personnel_id}")
async def update_hr_personnel(personnel_id: str, data: HRPersonnelCreate, user: dict = Depends(check_role([UserRole.ADMIN]))):
    is_active = data.active if data.active is not None else data.is_active
    await database.execute(
        """UPDATE ATS_HR_PERSONAL SET name=?, first_name=?, last_name=?, email=?, position=?,
           department=?, phone=?, is_active=?, updated_at=GETUTCDATE(), updated_by=?
           WHERE id = ? AND tenant_id = ?""",
        (data.name, data.first_name, data.last_name, data.email, data.position,
         data.department, data.phone, 1 if is_active else 0, user['id'], personnel_id, user['tenant_id'])
    )
    return await get_hr_personnel(personnel_id, user)

@api_router.delete("/hr-personnel/{personnel_id}")
async def delete_hr_personnel(personnel_id: str, user: dict = Depends(check_role([UserRole.ADMIN]))):
    await database.execute(
        "UPDATE ATS_HR_PERSONAL SET is_active=0, updated_at=GETUTCDATE() WHERE id = ? AND tenant_id = ?",
        (personnel_id, user['tenant_id'])
    )
    return {"message": "Personal desactivado"}

# ============ CATALOGS ROUTES ============
@api_router.get("/catalogs/professional-levels")
async def list_professional_levels(user: dict = Depends(get_current_user)):
    rows = await database.fetch_all(
        "SELECT * FROM ATS_NIVELES_PROFESIONALES WHERE tenant_id = ? AND is_active = 1 ORDER BY [order]",
        (user['tenant_id'],)
    )
    return serialize_list(rows)

@api_router.post("/catalogs/professional-levels")
async def create_professional_level(data: ProfessionalLevelCreate, user: dict = Depends(check_role([UserRole.ADMIN]))):
    lvl_id = str(uuid.uuid4())
    await database.execute(
        "INSERT INTO ATS_NIVELES_PROFESIONALES (id, tenant_id, name, description, [order], created_by) VALUES (?, ?, ?, ?, ?, ?)",
        (lvl_id, user['tenant_id'], data.name, data.description, data.order, user['id'])
    )
    return await database.fetch_one("SELECT * FROM ATS_NIVELES_PROFESIONALES WHERE id = ?", (lvl_id,))

@api_router.put("/catalogs/professional-levels/{level_id}")
async def update_professional_level(level_id: str, data: ProfessionalLevelCreate, user: dict = Depends(check_role([UserRole.ADMIN]))):
    await database.execute(
        "UPDATE ATS_NIVELES_PROFESIONALES SET name=?, description=?, [order]=?, updated_at=GETUTCDATE() WHERE id = ?",
        (data.name, data.description, data.order, level_id)
    )
    return await database.fetch_one("SELECT * FROM ATS_NIVELES_PROFESIONALES WHERE id = ?", (level_id,))

@api_router.delete("/catalogs/professional-levels/{level_id}")
async def delete_professional_level(level_id: str, user: dict = Depends(check_role([UserRole.ADMIN]))):
    await database.execute("UPDATE ATS_NIVELES_PROFESIONALES SET is_active=0 WHERE id = ?", (level_id,))
    return {"message": "Nivel desactivado"}

@api_router.get("/catalogs/professional-areas")
async def list_professional_areas(user: dict = Depends(get_current_user)):
    rows = await database.fetch_all(
        "SELECT * FROM ATS_AREAS_PROFESIONALES WHERE tenant_id = ? AND is_active = 1 ORDER BY name",
        (user['tenant_id'],)
    )
    return serialize_list(rows)

@api_router.post("/catalogs/professional-areas")
async def create_professional_area(data: ProfessionalAreaCreate, user: dict = Depends(check_role([UserRole.ADMIN]))):
    area_id = str(uuid.uuid4())
    await database.execute(
        "INSERT INTO ATS_AREAS_PROFESIONALES (id, tenant_id, name, description, created_by) VALUES (?, ?, ?, ?, ?)",
        (area_id, user['tenant_id'], data.name, data.description, user['id'])
    )
    return await database.fetch_one("SELECT * FROM ATS_AREAS_PROFESIONALES WHERE id = ?", (area_id,))

@api_router.put("/catalogs/professional-areas/{area_id}")
async def update_professional_area(area_id: str, data: ProfessionalAreaCreate, user: dict = Depends(check_role([UserRole.ADMIN]))):
    await database.execute(
        "UPDATE ATS_AREAS_PROFESIONALES SET name=?, description=?, updated_at=GETUTCDATE() WHERE id = ?",
        (data.name, data.description, area_id)
    )
    return await database.fetch_one("SELECT * FROM ATS_AREAS_PROFESIONALES WHERE id = ?", (area_id,))

@api_router.delete("/catalogs/professional-areas/{area_id}")
async def delete_professional_area(area_id: str, user: dict = Depends(check_role([UserRole.ADMIN]))):
    await database.execute("UPDATE ATS_AREAS_PROFESIONALES SET is_active=0 WHERE id = ?", (area_id,))
    return {"message": "Área desactivada"}

@api_router.get("/catalogs/languages")
async def list_languages(user: dict = Depends(get_current_user)):
    rows = await database.fetch_all(
        "SELECT * FROM ATS_IDIOMAS WHERE tenant_id = ? AND is_active = 1 ORDER BY name",
        (user['tenant_id'],)
    )
    return serialize_list(rows)

@api_router.post("/catalogs/languages")
async def create_language(data: LanguageCreate, user: dict = Depends(check_role([UserRole.ADMIN]))):
    lang_id = str(uuid.uuid4())
    await database.execute(
        "INSERT INTO ATS_IDIOMAS (id, tenant_id, name, level, code, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        (lang_id, user['tenant_id'], data.name, data.level, data.code, user['id'])
    )
    return await database.fetch_one("SELECT * FROM ATS_IDIOMAS WHERE id = ?", (lang_id,))

@api_router.put("/catalogs/languages/{lang_id}")
async def update_language(lang_id: str, data: LanguageCreate, user: dict = Depends(check_role([UserRole.ADMIN]))):
    await database.execute(
        "UPDATE ATS_IDIOMAS SET name=?, level=?, code=?, updated_at=GETUTCDATE() WHERE id = ?",
        (data.name, data.level, data.code, lang_id)
    )
    return await database.fetch_one("SELECT * FROM ATS_IDIOMAS WHERE id = ?", (lang_id,))

@api_router.delete("/catalogs/languages/{lang_id}")
async def delete_language(lang_id: str, user: dict = Depends(check_role([UserRole.ADMIN]))):
    await database.execute("UPDATE ATS_IDIOMAS SET is_active=0 WHERE id = ?", (lang_id,))
    return {"message": "Idioma desactivado"}

@api_router.post("/catalogs/seed")
async def seed_catalogs(user: dict = Depends(check_role([UserRole.ADMIN]))):
    tid = user['tenant_id']
    levels = [("Junior", 1), ("Semi Senior", 2), ("Senior", 3), ("Manager", 4), ("Director", 5)]
    for name, order in levels:
        ex = await database.fetch_one("SELECT id FROM ATS_NIVELES_PROFESIONALES WHERE name = ? AND tenant_id = ?", (name, tid))
        if not ex:
            await database.execute(
                "INSERT INTO ATS_NIVELES_PROFESIONALES (id, tenant_id, name, [order]) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), tid, name, order)
            )
    areas = ["Finanzas", "Marketing", "IT", "Ventas", "Operaciones", "Recursos Humanos", "Legal", "Administración"]
    for area in areas:
        ex = await database.fetch_one("SELECT id FROM ATS_AREAS_PROFESIONALES WHERE name = ? AND tenant_id = ?", (area, tid))
        if not ex:
            await database.execute(
                "INSERT INTO ATS_AREAS_PROFESIONALES (id, tenant_id, name) VALUES (?, ?, ?)",
                (str(uuid.uuid4()), tid, area)
            )
    langs = [("Inglés","Básico"),("Inglés","Intermedio"),("Inglés","Avanzado"),("Francés","Básico"),
             ("Francés","Intermedio"),("Francés","Avanzado"),("Portugués","Básico"),("Portugués","Intermedio"),("Alemán","Básico")]
    for name, level in langs:
        ex = await database.fetch_one("SELECT id FROM ATS_IDIOMAS WHERE name = ? AND level = ? AND tenant_id = ?", (name, level, tid))
        if not ex:
            await database.execute(
                "INSERT INTO ATS_IDIOMAS (id, tenant_id, name, level) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), tid, name, level)
            )
    return {"message": "Catálogos inicializados correctamente"}

# ============ CURRENCIES ============
@api_router.get("/currencies")
async def get_currencies():
    return [
        {"code": "GTQ", "name": "Quetzal Guatemalteco", "symbol": "Q"},
        {"code": "USD", "name": "Dólar Estadounidense", "symbol": "$"},
        {"code": "MXN", "name": "Peso Mexicano", "symbol": "$"},
    ]

# ============ PIPELINE (Kanban) ============
@api_router.get("/pipeline")
async def get_pipeline(vacancy_id: Optional[str] = None, empresa_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    pipeline_data = {}
    for stage in PipelineStage:
        where = "WHERE a.tenant_id = ? AND a.is_active = 1 AND a.current_stage = ?"
        params = [user['tenant_id'], stage.value]
        if vacancy_id:
            where += " AND a.vacancy_id = ?"; params.append(vacancy_id)
        if empresa_id:
            vac_ids = await database.fetch_all(
                "SELECT id FROM ATS_VACANTES WHERE empresa_id = ? AND tenant_id = ?",
                (empresa_id, user['tenant_id'])
            )
            if not vac_ids:
                pipeline_data[stage.value] = []
                continue
            vid_list = [v['id'] for v in vac_ids]
            where += f" AND a.vacancy_id IN ({','.join(['?']*len(vid_list))})"
            params.extend(vid_list)

        apps = await database.fetch_all(
            f"SELECT a.* FROM ATS_APLICACIONES a {where}", tuple(params)
        )
        enriched = []
        for app in apps:
            d = serialize_doc(app)
            cand = await database.fetch_one("SELECT * FROM ATS_CANDIDATOS WHERE id = ?", (app['candidate_id'],))
            vac = await database.fetch_one("SELECT title, empresa_id FROM ATS_VACANTES WHERE id = ?", (app['vacancy_id'],))
            empresa_name = None
            if vac and vac.get('empresa_id'):
                emp = await database.fetch_one("SELECT name FROM ATS_EMPRESAS WHERE id = ?", (vac['empresa_id'],))
                empresa_name = emp['name'] if emp else None
            d['candidate'] = serialize_doc(cand)
            d['vacancy_title'] = vac['title'] if vac else None
            d['empresa_name'] = empresa_name
            enriched.append(d)
        pipeline_data[stage.value] = enriched
    return pipeline_data

# ============ REPORTS & METRICS ============
@api_router.get("/reports/dashboard")
async def get_dashboard(empresa_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = user['tenant_id']
    empresa_filter = ""
    empresa_params_req = [tid]
    if empresa_id:
        empresa_filter = " AND empresa_id = ?"
        empresa_params_req = [tid, empresa_id]

    open_req   = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_REQUISICIONES WHERE tenant_id = ? {empresa_filter} AND status IN ('draft','pending_approval','approved')", tuple(empresa_params_req))
    open_vac   = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_VACANTES WHERE tenant_id = ? {empresa_filter} AND status = 'published'", tuple(empresa_params_req))
    total_cand = await database.fetch_val("SELECT COUNT(*) FROM ATS_CANDIDATOS WHERE tenant_id = ?", (tid,))

    # Inicializar vid_list y ph para uso posterior (pipeline_stages, recent)
    vid_list: list = []
    ph: str = "''"
    if empresa_id:
        vac_ids = await database.fetch_all("SELECT id FROM ATS_VACANTES WHERE tenant_id = ? AND empresa_id = ?", (tid, empresa_id))
        vid_list = [v['id'] for v in vac_ids]
        if vid_list:
            ph = ','.join(['?']*len(vid_list))
            active_apps = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_APLICACIONES WHERE tenant_id = ? AND is_active = 1 AND vacancy_id IN ({ph})", tuple([tid] + vid_list))
            pending_int = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_ENTREVISTAS e JOIN ATS_APLICACIONES a ON a.id = e.application_id WHERE e.tenant_id = ? AND e.status = 'scheduled' AND a.vacancy_id IN ({ph})", tuple([tid] + vid_list))
        else:
            active_apps = pending_int = 0
    else:
        active_apps = await database.fetch_val("SELECT COUNT(*) FROM ATS_APLICACIONES WHERE tenant_id = ? AND is_active = 1", (tid,))
        pending_int = await database.fetch_val("SELECT COUNT(*) FROM ATS_ENTREVISTAS WHERE tenant_id = ? AND status = 'scheduled'", (tid,))

    pending_offers = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_OFERTAS WHERE tenant_id = ? {empresa_filter} AND status = 'sent'", tuple(empresa_params_req))
    total_hires    = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_CONTRATACIONES WHERE tenant_id = ? {empresa_filter}", tuple(empresa_params_req))

    # Pipeline by stage
    pipeline_stages = []
    for stage in PipelineStage:
        if empresa_id and vid_list:
            count = await database.fetch_val(f"SELECT COUNT(*) FROM ATS_APLICACIONES WHERE tenant_id = ? AND current_stage = ? AND is_active = 1 AND vacancy_id IN ({ph})", tuple([tid, stage.value] + vid_list))
        else:
            count = await database.fetch_val("SELECT COUNT(*) FROM ATS_APLICACIONES WHERE tenant_id = ? AND current_stage = ? AND is_active = 1", (tid, stage.value))
        pipeline_stages.append({"stage": stage.value, "count": count or 0})

    # Source breakdown (GROUP BY)
    source_rows = await database.fetch_all(
        "SELECT source, COUNT(*) as count FROM ATS_CANDIDATOS WHERE tenant_id = ? GROUP BY source",
        (tid,)
    )
    sources = [{"_id": r['source'], "count": r['count']} for r in source_rows]

    # Recent applications
    if empresa_id and vid_list:
        recent = await database.fetch_all(f"SELECT TOP 5 * FROM ATS_APLICACIONES WHERE tenant_id = ? AND vacancy_id IN ({ph}) ORDER BY created_at DESC", tuple([tid] + vid_list))
    else:
        recent = await database.fetch_all("SELECT TOP 5 * FROM ATS_APLICACIONES WHERE tenant_id = ? ORDER BY created_at DESC", (tid,))

    recent_enriched = []
    for app in recent:
        d = serialize_doc(app)
        cand = await database.fetch_one("SELECT first_name, last_name FROM ATS_CANDIDATOS WHERE id = ?", (app['candidate_id'],))
        vac  = await database.fetch_one("SELECT title FROM ATS_VACANTES WHERE id = ?", (app['vacancy_id'],))
        d['candidate_name'] = f"{cand['first_name']} {cand['last_name']}" if cand else None
        d['vacancy_title']  = vac['title'] if vac else None
        recent_enriched.append(d)

    return {
        "open_requisitions": open_req or 0,
        "open_vacancies": open_vac or 0,
        "total_candidates": total_cand or 0,
        "active_applications": active_apps or 0,
        "pending_interviews": pending_int or 0,
        "pending_offers": pending_offers or 0,
        "total_hires": total_hires or 0,
        "pipeline_stages": pipeline_stages,
        "sources": sources,
        "recent_applications": recent_enriched,
    }

@api_router.get("/reports/hiring-metrics")
async def get_hiring_metrics(empresa_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = user['tenant_id']

    if empresa_id:
        vac_ids = await database.fetch_all("SELECT id FROM ATS_VACANTES WHERE tenant_id = ? AND empresa_id = ?", (tid, empresa_id))
        vid_list = [v['id'] for v in vac_ids] if vac_ids else []
        if vid_list:
            ph = ','.join(['?'] * len(vid_list))
            total_apps = await database.fetch_val(
                f"SELECT COUNT(*) FROM ATS_APLICACIONES WHERE tenant_id = ? AND vacancy_id IN ({ph})",
                tuple([tid] + vid_list)
            )
            stage_data = []
            for stage in PipelineStage:
                count = await database.fetch_val(
                    f"SELECT COUNT(*) FROM ATS_APLICACIONES WHERE tenant_id = ? AND current_stage = ? AND vacancy_id IN ({ph})",
                    tuple([tid, stage.value] + vid_list)
                )
                stage_data.append({"stage": stage.value, "count": count or 0})
        else:
            # La empresa existe pero no tiene vacantes aún
            total_apps = 0
            stage_data = [{"stage": s.value, "count": 0} for s in PipelineStage]
    else:
        total_apps = await database.fetch_val("SELECT COUNT(*) FROM ATS_APLICACIONES WHERE tenant_id = ?", (tid,))
        stage_data = []
        for stage in PipelineStage:
            count = await database.fetch_val(
                "SELECT COUNT(*) FROM ATS_APLICACIONES WHERE tenant_id = ? AND current_stage = ?",
                (tid, stage.value)
            )
            stage_data.append({"stage": stage.value, "count": count or 0})

    open_vac   = await database.fetch_val("SELECT COUNT(*) FROM ATS_VACANTES WHERE tenant_id = ? AND status = 'published'", (tid,))
    closed_vac = await database.fetch_val("SELECT COUNT(*) FROM ATS_VACANTES WHERE tenant_id = ? AND status = 'closed'", (tid,))

    return {
        "total_applications": total_apps or 0,
        "pipeline_stages": stage_data,
        "open_vacancies": open_vac or 0,
        "closed_vacancies": closed_vac or 0,
    }

@api_router.get("/metrics/time-to-hire")
async def get_time_to_hire(empresa_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = user['tenant_id']
    where = "WHERE h.tenant_id = ?"
    params = [tid]
    if empresa_id:
        where += " AND h.empresa_id = ?"; params.append(empresa_id)

    hirings = await database.fetch_all(f"SELECT h.*, h.created_at as hired_at FROM ATS_CONTRATACIONES h {where} ORDER BY h.created_at DESC", tuple(params))

    metrics_data = []
    for hiring in hirings:
        app = await database.fetch_one("SELECT * FROM ATS_APLICACIONES WHERE id = ?", (hiring['application_id'],))
        if app and app.get('created_at') and hiring.get('created_at'):
            try:
                app_date    = app['created_at'] if isinstance(app['created_at'], datetime) else datetime.fromisoformat(str(app['created_at']))
                hire_date   = hiring['created_at'] if isinstance(hiring['created_at'], datetime) else datetime.fromisoformat(str(hiring['created_at']))
                days_to_hire = (hire_date - app_date).days
                metrics_data.append({
                    "hiring_id":    hiring['id'],
                    "empresa_id":   hiring.get('empresa_id'),
                    "days_to_hire": days_to_hire,
                })
            except Exception:
                pass

    hire_count = len(metrics_data)
    avg_time_to_hire = round(sum(m['days_to_hire'] for m in metrics_data) / hire_count, 1) if hire_count > 0 else 0

    by_empresa: dict = {}
    for m in metrics_data:
        eid = m.get('empresa_id') or 'Sin empresa'
        if eid not in by_empresa:
            by_empresa[eid] = {'total_days': 0, 'count': 0}
        by_empresa[eid]['total_days'] += m['days_to_hire']
        by_empresa[eid]['count'] += 1

    return {
        "avg_time_to_hire_days": avg_time_to_hire,
        "total_hires_analyzed": hire_count,
        "by_empresa": [{"empresa_id": eid, "avg_days": round(d['total_days']/d['count'], 1), "total_hires": d['count']} for eid, d in by_empresa.items()],
        "details": metrics_data[:50],
    }

# ============ LINK CANDIDATE TO VACANCY ============
@api_router.post("/candidates/{candidate_id}/link-vacancy/{vacancy_id}")
async def link_candidate_to_vacancy(candidate_id: str, vacancy_id: str, user: dict = Depends(check_role([UserRole.ADMIN, UserRole.RECRUITER]))):
    cand = await database.fetch_one("SELECT id FROM ATS_CANDIDATOS WHERE id = ? AND tenant_id = ?", (candidate_id, user['tenant_id']))
    if not cand:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
    vac = await database.fetch_one("SELECT id, title FROM ATS_VACANTES WHERE id = ? AND tenant_id = ?", (vacancy_id, user['tenant_id']))
    if not vac:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    existing = await database.fetch_one("SELECT id FROM ATS_APLICACIONES WHERE vacancy_id = ? AND candidate_id = ?", (vacancy_id, candidate_id))
    if existing:
        raise HTTPException(status_code=400, detail="El candidato ya está vinculado a esta vacante")

    app_id = str(uuid.uuid4())
    await database.execute(
        "INSERT INTO ATS_APLICACIONES (id, tenant_id, vacancy_id, candidate_id, created_by) VALUES (?, ?, ?, ?, ?)",
        (app_id, user['tenant_id'], vacancy_id, candidate_id, user['id'])
    )
    await database.execute("UPDATE ATS_VACANTES SET applications_count = applications_count + 1 WHERE id = ?", (vacancy_id,))
    await database.execute(
        "INSERT INTO ATS_PIPELINE_HISTORIAL (id, application_id, to_stage, moved_by, notes) VALUES (?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), app_id, PipelineStage.APPLIED.value, user['id'], 'Vinculación manual desde perfil de candidato')
    )
    cand_full = await database.fetch_one("SELECT first_name, last_name FROM ATS_CANDIDATOS WHERE id = ?", (candidate_id,))
    return {
        "message": "Candidato vinculado exitosamente",
        "application_id": app_id,
        "vacancy_title": vac['title'],
        "candidate_name": f"{cand_full['first_name']} {cand_full['last_name']}" if cand_full else "",
    }

# ============ PUBLIC APPLY ============
@api_router.post("/public/apply/{vacancy_id}")
async def public_apply(vacancy_id: str, data: ApplicationCreate, tenant_id: str = Query("default")):
    vac = await database.fetch_one(
        "SELECT * FROM ATS_VACANTES WHERE id = ? AND tenant_id = ? AND status = 'published'",
        (vacancy_id, tenant_id)
    )
    if not vac:
        raise HTTPException(status_code=404, detail="Vacante no encontrada o no disponible")
    if not data.candidate_data:
        raise HTTPException(status_code=400, detail="Datos del candidato requeridos")

    existing = await database.fetch_one("SELECT id FROM ATS_CANDIDATOS WHERE email = ? AND tenant_id = ?", (data.candidate_data.email, tenant_id))
    if existing:
        candidate_id = existing['id']
    else:
        cid = str(uuid.uuid4())
        cd = data.candidate_data
        await database.execute(
            """INSERT INTO ATS_CANDIDATOS (id, tenant_id, first_name, last_name, email, phone, source, notes, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (cid, tenant_id, cd.first_name, cd.last_name, cd.email, cd.phone, cd.source or 'portal', cd.notes, 'self')
        )
        candidate_id = cid

    existing_app = await database.fetch_one("SELECT id FROM ATS_APLICACIONES WHERE vacancy_id = ? AND candidate_id = ?", (vacancy_id, candidate_id))
    if existing_app:
        raise HTTPException(status_code=400, detail="Ya aplicaste a esta posición")

    app_id = str(uuid.uuid4())
    await database.execute(
        "INSERT INTO ATS_APLICACIONES (id, tenant_id, vacancy_id, candidate_id, created_by) VALUES (?, ?, ?, ?, ?)",
        (app_id, tenant_id, vacancy_id, candidate_id, 'self')
    )
    await database.execute("UPDATE ATS_VACANTES SET applications_count = applications_count + 1 WHERE id = ?", (vacancy_id,))
    return {"message": "Aplicación enviada exitosamente", "application_id": app_id, "candidate_id": candidate_id}

@api_router.post("/public/apply-with-cv/{vacancy_id}")
async def public_apply_with_cv(
    vacancy_id: str,
    tenant_id: str = Query("default"),
    application_data: str = Form(...),
    cv_file: Optional[UploadFile] = File(None)
):
    import json as _json
    try:
        raw = _json.loads(application_data)
        cd_raw = raw.get('candidate_data') or raw
        candidate_data_model = CandidateCreate(**cd_raw)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Datos inválidos: {str(e)}")

    vac = await database.fetch_one(
        "SELECT * FROM ATS_VACANTES WHERE id = ? AND tenant_id = ? AND status = 'published'",
        (vacancy_id, tenant_id)
    )
    if not vac:
        raise HTTPException(status_code=404, detail="Vacante no disponible")

    cv_content = None
    cv_filename = None
    if cv_file and cv_file.filename:
        if cv_file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Solo se permiten PDFs")
        cv_content = await cv_file.read()
        if len(cv_content) > 2 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Archivo máximo 2MB")
        cv_filename = cv_file.filename

    existing = await database.fetch_one("SELECT id FROM ATS_CANDIDATOS WHERE email = ? AND tenant_id = ?", (candidate_data_model.email, tenant_id))
    if existing:
        candidate_id = existing['id']
    else:
        cid = str(uuid.uuid4())
        cd = candidate_data_model
        await database.execute(
            """INSERT INTO ATS_CANDIDATOS (id, tenant_id, first_name, last_name, email, phone, source, notes, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (cid, tenant_id, cd.first_name, cd.last_name, cd.email, cd.phone, cd.source or 'portal', cd.notes, 'self')
        )
        candidate_id = cid

    if cv_content:
        upload_dir = ROOT_DIR / "uploads" / "candidates"
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_id = str(uuid.uuid4())
        stored  = f"{file_id}.pdf"
        (upload_dir / stored).write_bytes(cv_content)
        file_url = f"/api/candidates/{candidate_id}/files/{file_id}"
        await database.execute("UPDATE ATS_CANDIDATOS SET cv_url=? WHERE id = ?", (file_url, candidate_id))
        await database.execute(
            "INSERT INTO ATS_CANDIDATOS_DOCUMENTOS (id, candidate_id, document_type, document_name, file_url, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)",
            (file_id, candidate_id, 'cv', cv_filename or 'curriculum.pdf', file_url, 'self')
        )

    existing_app = await database.fetch_one("SELECT id FROM ATS_APLICACIONES WHERE vacancy_id = ? AND candidate_id = ?", (vacancy_id, candidate_id))
    if existing_app:
        raise HTTPException(status_code=400, detail="Ya aplicaste a esta posición")

    app_id = str(uuid.uuid4())
    await database.execute(
        "INSERT INTO ATS_APLICACIONES (id, tenant_id, vacancy_id, candidate_id, created_by) VALUES (?, ?, ?, ?, ?)",
        (app_id, tenant_id, vacancy_id, candidate_id, 'self')
    )
    await database.execute("UPDATE ATS_VACANTES SET applications_count = applications_count + 1 WHERE id = ?", (vacancy_id,))
    return {"message": "Aplicación enviada exitosamente", "application_id": app_id, "candidate_id": candidate_id}

# ============ ROOT ============
@api_router.get("/")
async def root():
    return {"message": "Human Point ATS API", "version": "2.0.0", "database": "SQL Server", "status": "running"}

# ============ STARTUP / SHUTDOWN ============
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await database.init_pool()
    logger.info("Human Point ATS v2.0 — SQL Server ready")

@app.on_event("shutdown")
async def shutdown():
    await database.close_pool()

# fix: vacancy_title en get_candidate - Wed Apr  8 22:07:12 UTC 2026
