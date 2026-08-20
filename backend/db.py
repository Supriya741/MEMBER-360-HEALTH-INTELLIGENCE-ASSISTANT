"""
Normalized PostgreSQL persistence for Member360.

The application's original demo records are seeded from seed_data.py into relational
PostgreSQL tables. The DataStore compatibility layer exposes the same shapes
expected by the existing FastAPI and RAG code, but every read comes from
normalized PostgreSQL tables rather than JSONB blobs.
"""
import os
from datetime import date, datetime
from typing import Any, Optional

from dotenv import load_dotenv
from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text,
    create_engine, select, delete
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/member360",
)
if not DATABASE_URL.startswith(("postgresql://", "postgresql+psycopg://", "postgresql+psycopg2://")):
    raise RuntimeError("DATABASE_URL must point to PostgreSQL.")

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)

class Base(DeclarativeBase):
    pass

class Member(Base):
    __tablename__ = "members"
    member_id: Mapped[str] = mapped_column(String(30), primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    dob: Mapped[Optional[date]] = mapped_column(Date)
    age: Mapped[Optional[int]] = mapped_column(Integer)
    gender: Mapped[Optional[str]] = mapped_column(String(30))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    address: Mapped[Optional[str]] = mapped_column(Text)
    plan: Mapped[Optional[str]] = mapped_column(String(100))
    plan_id: Mapped[Optional[str]] = mapped_column(String(50))
    status: Mapped[Optional[str]] = mapped_column(String(80))
    group_number: Mapped[Optional[str]] = mapped_column(String(80))
    pcp: Mapped[Optional[str]] = mapped_column(String(150))
    member_since: Mapped[Optional[date]] = mapped_column(Date)
    policy_effective: Mapped[Optional[date]] = mapped_column(Date)
    policy_expires: Mapped[Optional[date]] = mapped_column(Date)

class Eligibility(Base):
    __tablename__ = "eligibility"
    member_id: Mapped[str] = mapped_column(ForeignKey("members.member_id", ondelete="CASCADE"), primary_key=True)
    coverage_status: Mapped[Optional[str]] = mapped_column(String(50))
    plan_effective_date: Mapped[Optional[date]] = mapped_column(Date)
    plan_expiration_date: Mapped[Optional[date]] = mapped_column(Date)
    member_since: Mapped[Optional[date]] = mapped_column(Date)
    pcp: Mapped[Optional[str]] = mapped_column(String(150))
    deductible: Mapped[Optional[float]] = mapped_column(Float)
    out_of_pocket_max: Mapped[Optional[float]] = mapped_column(Float)
    copay_pcp: Mapped[Optional[float]] = mapped_column(Float)
    copay_specialist: Mapped[Optional[float]] = mapped_column(Float)
    er_copay: Mapped[Optional[float]] = mapped_column(Float)

class Claim(Base):
    __tablename__ = "claims"
    claim_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.member_id", ondelete="CASCADE"), index=True)
    date_of_service: Mapped[Optional[date]] = mapped_column(Date)
    provider: Mapped[Optional[str]] = mapped_column(String(200))
    status: Mapped[Optional[str]] = mapped_column(String(50))
    amount: Mapped[Optional[float]] = mapped_column(Float)
    patient_responsibility: Mapped[Optional[float]] = mapped_column(Float)

class Medication(Base):
    __tablename__ = "medications"
    medication_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.member_id", ondelete="CASCADE"), index=True)
    medication: Mapped[Optional[str]] = mapped_column(String(200))
    dosage: Mapped[Optional[str]] = mapped_column(String(100))
    frequency: Mapped[Optional[str]] = mapped_column(String(100))
    prescribed_by: Mapped[Optional[str]] = mapped_column(String(150))
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[Optional[str]] = mapped_column(String(50))

class Authorization(Base):
    __tablename__ = "authorizations"
    authorization_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.member_id", ondelete="CASCADE"), index=True)
    service: Mapped[Optional[str]] = mapped_column(String(200))
    provider: Mapped[Optional[str]] = mapped_column(String(200))
    status: Mapped[Optional[str]] = mapped_column(String(50))
    request_date: Mapped[Optional[date]] = mapped_column(Date)
    valid_until: Mapped[Optional[date]] = mapped_column(Date)

class Interaction(Base):
    __tablename__ = "interactions"
    interaction_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.member_id", ondelete="CASCADE"), index=True)
    type: Mapped[Optional[str]] = mapped_column(String(80))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    by: Mapped[Optional[str]] = mapped_column(String(120))
    interaction_date: Mapped[Optional[str]] = mapped_column(String(80))
    outcome: Mapped[Optional[str]] = mapped_column(String(80))

class TimelineEvent(Base):
    __tablename__ = "timeline_events"
    timeline_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.member_id", ondelete="CASCADE"), index=True)
    event_date: Mapped[Optional[date]] = mapped_column(Date)
    event: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(String(80))

class AISummary(Base):
    __tablename__ = "ai_summaries"
    member_id: Mapped[str] = mapped_column(ForeignKey("members.member_id", ondelete="CASCADE"), primary_key=True)
    summary: Mapped[Optional[str]] = mapped_column(Text)

class AIInsight(Base):
    __tablename__ = "ai_insights"
    insight_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.member_id", ondelete="CASCADE"), index=True)
    title: Mapped[Optional[str]] = mapped_column(String(200))
    detail: Mapped[Optional[str]] = mapped_column(Text)
    confidence: Mapped[Optional[str]] = mapped_column(String(50))
    source: Mapped[Optional[str]] = mapped_column(String(200))

class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"
    recommendation_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.member_id", ondelete="CASCADE"), index=True)
    recommendation: Mapped[str] = mapped_column(Text)

class Alert(Base):
    __tablename__ = "alerts"
    alert_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.member_id", ondelete="CASCADE"), index=True)
    alert_type: Mapped[Optional[str]] = mapped_column(String(100))
    member: Mapped[Optional[str]] = mapped_column(String(150))
    description: Mapped[Optional[str]] = mapped_column(Text)
    priority: Mapped[Optional[str]] = mapped_column(String(30))
    due_date: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[Optional[str]] = mapped_column(String(50))

class DashboardStat(Base):
    __tablename__ = "dashboard_stats"
    stat_name: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[Optional[float]] = mapped_column(Float)
    change: Mapped[Optional[str]] = mapped_column(String(100))

class UserAccount(Base):
    __tablename__ = "users"
    username: Mapped[str] = mapped_column(String(100), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(80))
    display_name: Mapped[str] = mapped_column(String(150))
    member_id: Mapped[Optional[str]] = mapped_column(ForeignKey("members.member_id", ondelete="SET NULL"))

class AdminCredential(Base):
    __tablename__ = "admin_credentials"
    admin_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)

def _date(v):
    if not v:
        return None
    if isinstance(v, date):
        return v
    try:
        return date.fromisoformat(str(v)[:10])
    except Exception:
        return None

def _obj(row):
    return {k: v for k, v in row.items() if v is not None}

def initialize_database(seed_if_empty: bool = True):
    Base.metadata.create_all(engine)
    if seed_if_empty:
        with Session(engine) as s:
            if s.scalar(select(Member.member_id).limit(1)) is None:
                seed_from_legacy(s)

def _unique_seed_id(raw_id: str, member_id: str, seen: set[str]) -> str:
    """Return a deterministic unique ID when legacy synthetic seed data contains duplicates."""
    candidate = str(raw_id)
    if candidate not in seen:
        seen.add(candidate)
        return candidate
    base = f"{candidate}-{member_id}"
    candidate = base
    suffix = 2
    while candidate in seen:
        candidate = f"{base}-{suffix}"
        suffix += 1
    seen.add(candidate)
    return candidate

def seed_from_legacy(session: Session):
    """One-time migration from the project's original synthetic seed_data.py."""
    import seed_data as legacy

    seen_claim_ids: set[str] = set()
    seen_authorization_ids: set[str] = set()

    # Members
    for x in legacy.MEMBERS:
        session.add(Member(
            member_id=x["member_id"], name=x["name"], dob=_date(x.get("dob")),
            age=x.get("age"), gender=x.get("gender"), email=x.get("email"),
            phone=x.get("phone"), address=x.get("address"), plan=x.get("plan"),
            plan_id=x.get("plan_id"), status=x.get("status"),
            group_number=x.get("group_number"), pcp=x.get("pcp"),
            member_since=_date(x.get("member_since")),
            policy_effective=_date(x.get("policy_effective")),
            policy_expires=_date(x.get("policy_expires")),
        ))
    session.flush()

    for mid, x in legacy.ELIGIBILITY.items():
        b=x.get("benefits",{})
        session.add(Eligibility(member_id=mid, coverage_status=x.get("coverage_status"),
            plan_effective_date=_date(x.get("plan_effective_date")),
            plan_expiration_date=_date(x.get("plan_expiration_date")),
            member_since=_date(x.get("member_since")), pcp=x.get("pcp"),
            deductible=b.get("deductible"), out_of_pocket_max=b.get("out_of_pocket_max"),
            copay_pcp=b.get("copay_pcp"), copay_specialist=b.get("copay_specialist"),
            er_copay=b.get("er_copay")))

    for mid, rows in legacy.CLAIMS.items():
        for x in rows:
            session.add(Claim(claim_id=_unique_seed_id(x["claim_id"], mid, seen_claim_ids), member_id=mid,
                date_of_service=_date(x.get("date_of_service")), provider=x.get("provider"),
                status=x.get("status"), amount=x.get("amount"),
                patient_responsibility=x.get("patient_responsibility")))

    for mid, rows in legacy.MEDICATIONS.items():
        for x in rows:
            session.add(Medication(member_id=mid, medication=x.get("medication"),
                dosage=x.get("dosage"), frequency=x.get("frequency"),
                prescribed_by=x.get("prescribed_by"), start_date=_date(x.get("start_date")),
                status=x.get("status")))

    for mid, rows in legacy.AUTHORIZATIONS.items():
        for x in rows:
            session.add(Authorization(authorization_id=_unique_seed_id(x["authorization_id"], mid, seen_authorization_ids), member_id=mid,
                service=x.get("service"), provider=x.get("provider"), status=x.get("status"),
                request_date=_date(x.get("request_date")), valid_until=_date(x.get("valid_until"))))

    for mid, rows in legacy.INTERACTIONS.items():
        for x in rows:
            session.add(Interaction(member_id=mid, type=x.get("type"), notes=x.get("notes"),
                by=x.get("by"), interaction_date=x.get("date"), outcome=x.get("outcome")))

    for mid, rows in legacy.TIMELINE.items():
        for x in rows:
            session.add(TimelineEvent(member_id=mid, event_date=_date(x.get("date")),
                event=x.get("event"), status=x.get("status")))

    for mid, x in legacy.AI_SUMMARY.items():
        session.add(AISummary(member_id=mid, summary=x.get("summary")))
        for insight in x.get("insights_detail", []):
            session.add(AIInsight(member_id=mid, title=insight.get("title"),
                detail=insight.get("detail"), confidence=insight.get("confidence"),
                source=insight.get("source")))
        for rec in x.get("recommendations", []):
            session.add(AIRecommendation(member_id=mid, recommendation=rec))

    for x in legacy.ALERTS:
        session.add(Alert(member_id=x.get("member_id"), alert_type=x.get("alert_type"),
            member=x.get("member"), description=x.get("description"),
            priority=x.get("priority"), due_date=_date(x.get("due_date")), status=x.get("status")))

    for name, x in legacy.DASHBOARD_STATS.items():
        session.add(DashboardStat(stat_name=name, value=x.get("value"), change=x.get("change")))

    for x in legacy.USERS:
        session.add(UserAccount(username=x["username"], email=x["email"], password=x["password"],
            role=x["role"], display_name=x["display_name"], member_id=x.get("member_id")))

    for x in legacy.ADMIN_CREDENTIALS:
        session.add(AdminCredential(admin_id=x["admin_id"], name=x["name"]))

    session.commit()

class DataStore:
    """Compatibility-shaped access backed by relational PostgreSQL queries."""

    @property
    def MEMBERS(self):
        with Session(engine) as s:
            rows=s.scalars(select(Member)).all()
            return [_obj({
                "member_id":r.member_id,"name":r.name,"dob":str(r.dob) if r.dob else None,
                "age":r.age,"gender":r.gender,"email":r.email,"phone":r.phone,
                "address":r.address,"plan":r.plan,"plan_id":r.plan_id,"status":r.status,
                "group_number":r.group_number,"pcp":r.pcp,
                "member_since":str(r.member_since) if r.member_since else None,
                "policy_effective":str(r.policy_effective) if r.policy_effective else None,
                "policy_expires":str(r.policy_expires) if r.policy_expires else None}) for r in rows]

    def _ids(self):
        return [x["member_id"] for x in self.MEMBERS]

    @property
    def ELIGIBILITY(self):
        with Session(engine) as s:
            rows=s.scalars(select(Eligibility)).all()
            return {r.member_id:_obj({"coverage_status":r.coverage_status,
                "plan_effective_date":str(r.plan_effective_date) if r.plan_effective_date else None,
                "plan_expiration_date":str(r.plan_expiration_date) if r.plan_expiration_date else None,
                "member_since":str(r.member_since) if r.member_since else None,"pcp":r.pcp,
                "benefits":_obj({"deductible":r.deductible,"out_of_pocket_max":r.out_of_pocket_max,
                    "copay_pcp":r.copay_pcp,"copay_specialist":r.copay_specialist,"er_copay":r.er_copay})}) for r in rows}

    @property
    def CLAIMS(self):
        with Session(engine) as s:
            rows=s.scalars(select(Claim)).all()
            d={}
            for r in rows:d.setdefault(r.member_id,[]).append(_obj({"claim_id":r.claim_id,
                "date_of_service":str(r.date_of_service) if r.date_of_service else None,
                "provider":r.provider,"status":r.status,"amount":r.amount,
                "patient_responsibility":r.patient_responsibility}))
            return d

    @property
    def MEDICATIONS(self):
        with Session(engine) as s:
            rows=s.scalars(select(Medication)).all()
            d={}
            for r in rows:d.setdefault(r.member_id,[]).append(_obj({"medication":r.medication,
                "dosage":r.dosage,"frequency":r.frequency,"prescribed_by":r.prescribed_by,
                "start_date":str(r.start_date) if r.start_date else None,"status":r.status}))
            return d

    @property
    def AUTHORIZATIONS(self):
        with Session(engine) as s:
            rows=s.scalars(select(Authorization)).all()
            d={}
            for r in rows:d.setdefault(r.member_id,[]).append(_obj({"authorization_id":r.authorization_id,
                "service":r.service,"provider":r.provider,"status":r.status,
                "request_date":str(r.request_date) if r.request_date else None,
                "valid_until":str(r.valid_until) if r.valid_until else None}))
            return d

    @property
    def INTERACTIONS(self):
        with Session(engine) as s:
            rows=s.scalars(select(Interaction)).all()
            d={}
            for r in rows:d.setdefault(r.member_id,[]).append(_obj({"type":r.type,"notes":r.notes,
                "by":r.by,"date":r.interaction_date,"outcome":r.outcome}))
            return d

    @property
    def TIMELINE(self):
        with Session(engine) as s:
            rows=s.scalars(select(TimelineEvent)).all()
            d={}
            for r in rows:d.setdefault(r.member_id,[]).append(_obj({"date":str(r.event_date) if r.event_date else None,
                "event":r.event,"status":r.status}))
            return d

    @property
    def AI_SUMMARY(self):
        with Session(engine) as s:
            sums=s.scalars(select(AISummary)).all()
            insights=s.scalars(select(AIInsight)).all()
            recs=s.scalars(select(AIRecommendation)).all()
            out={}
            for r in sums: out[r.member_id]={"summary":r.summary,"key_insights":[],"recommendations":[],
                "insights_detail":[]}
            for r in insights: out.setdefault(r.member_id,{"summary":"","key_insights":[],"recommendations":[],"insights_detail":[]})["insights_detail"].append(
                {"title":r.title,"detail":r.detail,"confidence":r.confidence,"source":r.source})
            for r in recs: out.setdefault(r.member_id,{"summary":"","key_insights":[],"recommendations":[],"insights_detail":[]})["recommendations"].append(r.recommendation)
            for mid,x in out.items(): x["key_insights"]=[i["detail"] for i in x["insights_detail"] if i.get("detail")]
            return out

    @property
    def ALERTS(self):
        with Session(engine) as s:
            rows=s.scalars(select(Alert)).all()
            return [_obj({"alert_type":r.alert_type,"member":r.member,"member_id":r.member_id,
                "description":r.description,"priority":r.priority,
                "due_date":str(r.due_date) if r.due_date else None,"status":r.status}) for r in rows]

    @property
    def DASHBOARD_STATS(self):
        with Session(engine) as s:
            return {r.stat_name:{"value":r.value,"change":r.change} for r in s.scalars(select(DashboardStat)).all()}

    @property
    def USERS(self):
        with Session(engine) as s:
            return [_obj({"username":r.username,"email":r.email,"password":r.password,
                "role":r.role,"display_name":r.display_name,"member_id":r.member_id}) for r in s.scalars(select(UserAccount)).all()]

    @property
    def ADMIN_CREDENTIALS(self):
        with Session(engine) as s:
            return [{"admin_id":r.admin_id,"name":r.name} for r in s.scalars(select(AdminCredential)).all()]

db = DataStore()
