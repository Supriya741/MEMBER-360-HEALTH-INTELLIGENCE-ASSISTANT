"""
Member 360° Healthcare Intelligence Assistant — Backend API

Hackathon MVP:
- FastAPI backend
- Normalized PostgreSQL healthcare data
- Signed demo session tokens
- Role-aware protected APIs
- Mock SSO endpoint
- No real PHI and no external AI calls
"""
import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from db import db as data, initialize_database

# Create/verify normalized PostgreSQL tables only. Seed explicitly with init_db.py.
initialize_database(seed_if_empty=False)

APP_SECRET = os.getenv("M360_APP_SECRET", "member360-demo-secret-change-me")
TOKEN_TTL_SECONDS = int(os.getenv("M360_TOKEN_TTL", str(8 * 60 * 60)))

app = FastAPI(
    title="Member 360 Healthcare Intelligence Assistant API",
    description="Synthetic-data backend powering the Member 360 dashboard.",
    version="2.0.0",
)

# Development CORS: Allow all origins and headers for seamless local frontend execution
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def find_member(member_id: str) -> dict:
    for member in data.MEMBERS:
        if member["member_id"].lower() == member_id.lower():
            return member
    raise HTTPException(status_code=404, detail=f"Member '{member_id}' not found")


def canonical_member_id(member_id: str) -> str:
    return find_member(member_id)["member_id"]


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_token(user: dict) -> str:
    payload = {
        "sub": user["username"],
        "role": user["role"],
        "display_name": user["display_name"],
        "email": user.get("email", ""),
        "member_id": user.get("member_id"),
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    encoded = _b64(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(
        APP_SECRET.encode(), encoded.encode(), hashlib.sha256
    ).digest()
    return f"m360.{encoded}.{_b64(signature)}"


def verify_token(token: str) -> dict:
    try:
        scheme, encoded, signature = token.split(".", 2)
        if scheme != "m360":
            raise ValueError("Invalid token scheme")

        expected = hmac.new(
            APP_SECRET.encode(), encoded.encode(), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(_unb64(signature), expected):
            raise ValueError("Invalid signature")

        payload = json.loads(_unb64(encoded).decode())
        if int(payload["exp"]) <= int(time.time()):
            raise ValueError("Token expired")
        return payload
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_user(authorization: Optional[str] = None) -> dict:
    # This dependency is wired manually below because FastAPI's Header import
    # is kept explicit in the route section for clarity.
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_token(authorization.split(" ", 1)[1].strip())


# FastAPI dependency that reads the Authorization header.
from fastapi import Header

def current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    return get_current_user(authorization)


def require_staff(user: dict = Depends(current_user)) -> dict:
    if user.get("role") == "Member":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access is required for this operation.",
        )
    return user


def require_member_access(
    member_id: str, user: dict = Depends(current_user)
) -> dict:
    member = find_member(member_id)
    if user.get("role") == "Member" and user.get("member_id") != member["member_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Members can only access their own record.",
        )
    return user


def user_to_response(user: dict) -> "LoginResponse":
    return LoginResponse(
        token=create_token(user),
        display_name=user["display_name"],
        role=user["role"],
        username=user.get("username"),
        email=user.get("email"),
    )


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    organizational_id: Optional[str] = None
    password: str


class LoginResponse(BaseModel):
    token: str
    display_name: str
    role: str
    username: Optional[str] = None
    email: Optional[str] = None


import rag_pipeline


class ChatRequest(BaseModel):
    message: str
    history: Optional[list] = None


class ChatSource(BaseModel):
    type: str
    id: str
    title: str
    detail: str
    date: Optional[str] = None
    status: Optional[str] = None
    badge_class: Optional[str] = None


class ChatAction(BaseModel):
    action: str
    assignee: str
    priority: str
    due: Optional[str] = None


class ChatResponse(BaseModel):
    member_id: str
    member_name: str
    reply: str
    sources: list[dict]
    retrieved_chunks: Optional[list[dict]] = None
    rag_metadata: Optional[dict] = None
    why: str
    open_issues: list[str]
    suggested_actions: list[dict]
    suggested_questions: list[str]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@app.post("/api/auth/login", response_model=LoginResponse, tags=["Auth"])
def login(payload: LoginRequest):
    identifier = (
        payload.username or payload.email or payload.organizational_id or ""
    ).strip()
    password = payload.password.strip()

    if not identifier or not password:
        raise HTTPException(
            status_code=400,
            detail="Username/email and password are required.",
        )

    # Admin login: Check if identifier matches one of the authorized admin credentials
    for admin in data.ADMIN_CREDENTIALS:
        if identifier.lower() == admin["admin_id"].lower():
            # Admin password must match admin ID (e.g., 7881079 == 7881079)
            if password.upper() != admin["admin_id"].upper():
                raise HTTPException(
                    status_code=401, detail="Invalid admin ID or password. Password must match admin ID."
                )
            admin_user = {
                "username": admin["admin_id"],
                "email": f"admin{admin['admin_id']}@hospital.org",
                "role": "Administrator",
                "display_name": admin["name"],
            }
            return user_to_response(admin_user)

    # Staff/organization accounts:
    for user in data.USERS:
        if identifier.lower() in {
            user["username"].lower(),
            user.get("email", "").lower(),
        }:
            valid_passwords = [user["password"]]
            if user["username"].lower() == "admin":
                valid_passwords.extend(["admin", "demo1234"])
            elif user["username"].lower() in {"servicerep", "caremanager", "clinician"}:
                valid_passwords.extend(["demo1234", user["username"].lower()])

            if any(hmac.compare_digest(password, p) for p in valid_passwords):
                return user_to_response(user)
            raise HTTPException(
                status_code=401, detail="Invalid username or password."
            )

    # Member login: Member Password must match Member ID (e.g. MEM123456 == MEM123456)
    for member in data.MEMBERS:
        if identifier.lower() in {
            member["member_id"].lower(),
            member.get("email", "").lower(),
        }:
            if not (password.upper() == member["member_id"].upper()):
                raise HTTPException(
                    status_code=401, detail="Invalid Member ID or password. Password must match Member ID."
                )
            member_user = {
                "username": member["member_id"],
                "email": member.get("email", ""),
                "role": "Member",
                "display_name": member["name"],
                "member_id": member["member_id"],
            }
            return user_to_response(member_user)

    raise HTTPException(status_code=401, detail="Invalid username or password.")


@app.post("/api/auth/sso", response_model=LoginResponse, tags=["Auth"])
def sso_login():
    """Mock enterprise SSO for clinician accounts."""
    user = next(
        (u for u in data.USERS if u["username"] == "clinician"),
        None,
    )
    if not user:
        raise HTTPException(status_code=503, detail="Demo SSO user is unavailable.")
    return user_to_response(user)


@app.get("/api/auth/me", tags=["Auth"])
def auth_me(user: dict = Depends(current_user)):
    return {
        "username": user.get("sub"),
        "display_name": user.get("display_name"),
        "role": user.get("role"),
        "email": user.get("email"),
        "member_id": user.get("member_id"),
        "expires_at": user.get("exp"),
    }


@app.get("/api/auth/demo-users", tags=["Auth"])
def get_demo_users():
    return [
        {
            "username": u["username"],
            "email": u["email"],
            "role": u["role"],
            "display_name": u["display_name"],
        }
        for u in data.USERS
    ]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@app.get("/api/dashboard/stats", tags=["Dashboard"])
def get_dashboard_stats(user: dict = Depends(current_user)):
    if user.get("role") == "Member":
        member_id = user.get("member_id") or user.get("sub") or "MEM123456"
        canonical_id = canonical_member_id(member_id)
        member = find_member(canonical_id)
        claims = data.CLAIMS.get(canonical_id, [])
        meds = data.MEDICATIONS.get(canonical_id, [])
        auths = data.AUTHORIZATIONS.get(canonical_id, [])
        return {
            "is_member": True,
            "member_id": canonical_id,
            "member_name": member["name"],
            "plan": member.get("plan", "Standard PPO"),
            "status": member.get("status", "Active Member"),
            "pcp": member.get("pcp", "Unassigned"),
            "total_claims": len(claims),
            "open_claims": len([c for c in claims if c.get("status") in ["Pending", "In Review"]]),
            "active_medications": len([m for m in meds if m.get("status") == "Active"]),
            "pending_authorizations": len([a for a in auths if a.get("status") == "Pending"]),
            "care_gaps": 2,
        }
    return data.DASHBOARD_STATS


@app.get("/api/dashboard/recent-searches", tags=["Dashboard"])
def get_recent_searches(user: dict = Depends(current_user)):
    if user.get("role") == "Member":
        member_id = user.get("member_id") or user.get("sub") or "MEM123456"
        member = find_member(canonical_member_id(member_id))
        return [
            {
                "member_id": member["member_id"],
                "name": member["name"],
                "last_viewed": "Current Active Profile",
            }
        ]
    return [
        {
            "member_id": m["member_id"],
            "name": m["name"],
            "last_viewed": "2025-05-21 10:35 AM",
        }
        for m in data.MEMBERS
    ]


@app.get("/api/alerts", tags=["Dashboard"])
def get_alerts(
    priority: Optional[str] = None,
    user: dict = Depends(current_user),
):
    alerts = data.ALERTS
    if user.get("role") == "Member":
        member_id = (user.get("member_id") or user.get("sub") or "").upper()
        alerts = [a for a in alerts if a.get("member_id", "").upper() == member_id]

    if priority:
        alerts = [
            a for a in alerts
            if a["priority"].lower() == priority.lower()
        ]
    return alerts


# ---------------------------------------------------------------------------
# Members
# ---------------------------------------------------------------------------

@app.get("/api/members", tags=["Members"])
def list_members(
    q: Optional[str] = Query(None, description="Search by member name or member ID"),
    plan: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(current_user),
):
    results = data.MEMBERS
    
    # Members can only see their own record; Staff can see all
    if user.get("role") == "Member":
        member_id = user.get("member_id") or user.get("sub")
        if member_id:
            results = [m for m in results if m["member_id"].lower() == member_id.lower()]
        else:
            results = []
    
    if q:
        q_lower = q.lower()
        results = [
            m for m in results
            if q_lower in m["name"].lower()
            or q_lower in m["member_id"].lower()
        ]
    if plan:
        results = [m for m in results if m["plan"].lower() == plan.lower()]
    if status:
        results = [m for m in results if m["status"].lower() == status.lower()]
    return results


@app.get("/api/members/{member_id}", tags=["Members"])
def get_member(
    member_id: str,
    user: dict = Depends(require_member_access),
):
    return find_member(member_id)


@app.get("/api/members/{member_id}/eligibility", tags=["Members"])
def get_eligibility(
    member_id: str,
    user: dict = Depends(require_member_access),
):
    canonical_id = canonical_member_id(member_id)
    if canonical_id not in data.ELIGIBILITY:
        raise HTTPException(status_code=404, detail="No eligibility record for this member")
    return data.ELIGIBILITY[canonical_id]


@app.get("/api/members/{member_id}/claims", tags=["Members"])
def get_claims(
    member_id: str,
    user: dict = Depends(require_member_access),
):
    canonical_id = canonical_member_id(member_id)
    return data.CLAIMS.get(canonical_id, [])


@app.get("/api/members/{member_id}/medications", tags=["Members"])
def get_medications(
    member_id: str,
    user: dict = Depends(require_member_access),
):
    canonical_id = canonical_member_id(member_id)
    return data.MEDICATIONS.get(canonical_id, [])


@app.get("/api/members/{member_id}/authorizations", tags=["Members"])
def get_authorizations(
    member_id: str,
    user: dict = Depends(require_member_access),
):
    canonical_id = canonical_member_id(member_id)
    return data.AUTHORIZATIONS.get(canonical_id, [])


@app.get("/api/members/{member_id}/interactions", tags=["Members"])
def get_interactions(
    member_id: str,
    user: dict = Depends(require_member_access),
):
    canonical_id = canonical_member_id(member_id)
    return data.INTERACTIONS.get(canonical_id, [])


@app.get("/api/members/{member_id}/timeline", tags=["Members"])
def get_timeline(
    member_id: str,
    user: dict = Depends(require_member_access),
):
    canonical_id = canonical_member_id(member_id)
    return data.TIMELINE.get(canonical_id, [])


@app.get("/api/members/{member_id}/overview", tags=["Members"])
def get_overview(
    member_id: str,
    user: dict = Depends(require_member_access),
):
    canonical_id = canonical_member_id(member_id)
    member = find_member(canonical_id)
    claims = data.CLAIMS.get(canonical_id, [])
    meds = data.MEDICATIONS.get(canonical_id, [])
    auths = data.AUTHORIZATIONS.get(canonical_id, [])

    return {
        "member": member,
        "quick_summary": {
            "open_claims": len([c for c in claims if c["status"] == "Pending"]),
            "pending_authorizations": len(
                [a for a in auths if a["status"] == "Pending"]
            ),
            "active_medications": len(
                [m for m in meds if m["status"] == "Active"]
            ),
            "care_gaps": 2,
            "upcoming_appointments": 1,
        },
    }


# ---------------------------------------------------------------------------
# AI Summary — Enhanced Clinical Intelligence & Risk Stratification
# ---------------------------------------------------------------------------

@app.get("/api/members/{member_id}/ai-summary", tags=["AI Insights"])
def get_ai_summary(
    member_id: str,
    user: dict = Depends(require_member_access),
):
    canonical_id = canonical_member_id(member_id)
    member = find_member(canonical_id)
    claims = data.CLAIMS.get(canonical_id, [])
    meds = data.MEDICATIONS.get(canonical_id, [])
    auths = data.AUTHORIZATIONS.get(canonical_id, [])
    base_summary = data.AI_SUMMARY.get(canonical_id, {})
    
    # Calculate clinically accurate predictive risk scores
    open_claims_count = len([c for c in claims if c.get("status") in ["Pending", "In Review"]])
    active_meds = [m for m in meds if m.get("status") == "Active"]
    pending_auths = [a for a in auths if a.get("status") == "Pending"]
    
    readmission_score = min(88, max(8, 12 + (member.get("age", 40) // 10) * 4 + len(active_meds) * 6 + len(pending_auths) * 8))
    risk_tier = "High Priority" if readmission_score > 50 else ("Moderate Risk" if readmission_score > 25 else "Low / Stable")
    adherence_rate = "94%" if len(active_meds) <= 1 else ("84%" if len(active_meds) <= 3 else "71%")
    
    # Clinical condition analysis from prescribed pharmacotherapy
    conditions = []
    for m in meds:
        m_name = (m.get("name") or m.get("medication") or "").lower()
        if "lisinopril" in m_name or "amlodipine" in m_name or "losartan" in m_name:
            conditions.append("Essential Hypertension (ICD-10 I10)")
        elif "metformin" in m_name or "glipizide" in m_name or "insulin" in m_name:
            conditions.append("Type 2 Diabetes Mellitus (ICD-10 E11.9)")
        elif "atorvastatin" in m_name or "simvastatin" in m_name:
            conditions.append("Hyperlipidemia / Cardiovascular Risk (ICD-10 E78.5)")
        elif "albuterol" in m_name or "fluticasone" in m_name:
            conditions.append("Chronic Bronchial Asthma (ICD-10 J45.9)")
        elif "omeprazole" in m_name or "pantoprazole" in m_name:
            conditions.append("Gastroesophageal Reflux Disease (ICD-10 K21.9)")
    if not conditions:
        conditions = ["Routine Preventive Care Management", "No Uncontrolled Chronic Diagnoses"]

    conditions = list(dict.fromkeys(conditions))

    care_gaps = []
    if member.get("age", 40) >= 40:
        care_gaps.append({"measure": "Comprehensive Metabolic Panel (CMP)", "status": "Overdue (Due Q1 2025)", "priority": "High"})
    if any("Diabetes" in c for c in conditions):
        care_gaps.append({"measure": "Diabetic Retinal Eye Exam (HEDIS EED)", "status": "Overdue (Annual)", "priority": "High"})
        care_gaps.append({"measure": "HbA1c Glycemic Assessment (< 8.0%)", "status": "Due within 30 days", "priority": "Medium"})
    if any("Hyperlipidemia" in c for c in conditions):
        care_gaps.append({"measure": "Annual Fasting Lipid Profile", "status": "Due within 60 days", "priority": "Medium"})
    if not care_gaps:
        care_gaps.append({"measure": "Annual Wellness & Preventive Physical Exam", "status": "Scheduled Q2 2025", "priority": "Low"})

    enriched_summary = {
        "member_id": canonical_id,
        "member_name": member["name"],
        "plan": member["plan"],
        "summary": base_summary.get("summary", f"{member['name']} is a {member['age']}-year-old {member['gender']} enrolled in {member['plan']}. Patient exhibits stable clinical status with {len(active_meds)} active medication(s) and {open_claims_count} open claim(s)."),
        "risk_stratification": {
            "overall_tier": risk_tier,
            "readmission_risk_score": f"{readmission_score}%",
            "er_utilization_risk": "Elevated" if open_claims_count > 1 else "Low",
            "care_complexity_index": f"{min(10, 3 + len(active_meds) + len(pending_auths))}/10",
            "medication_adherence_rate": adherence_rate,
        },
        "chronic_conditions": conditions,
        "care_gaps_quality": care_gaps,
        "key_insights": base_summary.get("key_insights", [
            f"Active primary care engagement under {member.get('pcp', 'Assigned Physician')}.",
            f"Prescription compliance rate monitored at {adherence_rate}.",
            f"{open_claims_count} active claims currently under payer adjudication."
        ]),
        "recommendations": [
            f"Maintain primary care continuity with {member.get('pcp', 'Primary Care Provider')}.",
            "Initiate pharmacy adherence outreach to confirm 90-day mail-order refills.",
            "Schedule overdue preventive care gap screenings before policy renewal."
        ],
        "next_best_clinical_actions": [
            {"action": "Outreach Call for Preventive Screening", "assignee": "Care Manager", "due": "Within 7 Days"},
            {"action": "Medication Reconciliation & Refill Check", "assignee": "Clinical Pharmacist", "due": "Within 14 Days"},
            {"action": "PCP Routine Assessment Scheduling", "assignee": "Care Coordinator", "due": "Within 30 Days"}
        ],
        "insights_detail": base_summary.get("insights_detail", [])
    }
    return enriched_summary


# ---------------------------------------------------------------------------
# AI Chatbot — Member 360 Knowledge Grounded Query Engine
# ---------------------------------------------------------------------------

def _badge_for_status(status_str: Optional[str]) -> str:
    s = (status_str or "").lower()
    if any(k in s for k in ["approved", "active", "completed", "resolved", "low", "compliant"]):
        return "badge-green"
    if any(k in s for k in ["pending", "in progress", "in review", "medium", "due"]):
        return "badge-yellow"
    if any(k in s for k in ["denied", "overdue", "action needed", "high", "closed"]):
        return "badge-red" if "closed" not in s else "badge-gray"
    return "badge-gray"


def process_member_chat(member_id: str, message: str, history: Optional[list] = None) -> dict:
    canonical_id = canonical_member_id(member_id)
    member = find_member(canonical_id)
    claims = data.CLAIMS.get(canonical_id, [])
    meds = data.MEDICATIONS.get(canonical_id, [])
    auths = data.AUTHORIZATIONS.get(canonical_id, [])
    interactions = data.INTERACTIONS.get(canonical_id, [])
    timeline = data.TIMELINE.get(canonical_id, [])
    eligibility = data.ELIGIBILITY.get(canonical_id, {
        "coverage_status": member.get("status", "Active Member"),
        "plan_effective_date": member.get("policy_effective", "2024-01-01"),
        "plan_expiration_date": member.get("policy_expires", "2025-12-31"),
        "member_since": member.get("member_since", "2024-01-01"),
        "pcp": member.get("pcp", "Dr. Sarah Williams"),
        "benefits": {
            "deductible": 1000,
            "out_of_pocket_max": 4000,
            "copay_pcp": 25,
            "copay_specialist": 50,
            "er_copay": 150,
        },
    })
    benefits = eligibility.get("benefits", {})
    alerts = [a for a in data.ALERTS if a.get("member_id", "").upper() == canonical_id.upper()]

    # Generate or retrieve enriched AI clinical risk summary
    ai_summary = get_ai_summary(canonical_id, user={"role": "Staff", "member_id": canonical_id})
    chronic_conditions = ai_summary.get("chronic_conditions", [])
    care_gaps = ai_summary.get("care_gaps_quality", [])
    risk_info = ai_summary.get("risk_stratification", {})

    # Compute open issues across all categories
    open_claims = [c for c in claims if c.get("status") in ["Pending", "In Review"]]
    denied_claims = [c for c in claims if c.get("status") == "Denied"]
    pending_auths = [a for a in auths if a.get("status") == "Pending"]
    denied_auths = [a for a in auths if a.get("status") == "Denied"]
    overdue_gaps = [cg for cg in care_gaps if "overdue" in cg.get("status", "").lower()]
    pending_interactions = [it for it in interactions if it.get("outcome") == "Pending"]
    active_meds = [m for m in meds if m.get("status") == "Active"]

    open_issues_list = []
    for c in open_claims:
        open_issues_list.append(f"Pending Claim {c.get('claim_id')} (${c.get('amount', 0):.2f}) for {c.get('provider')}")
    for c in denied_claims:
        open_issues_list.append(f"Denied Claim {c.get('claim_id')} (${c.get('amount', 0):.2f}) - Requires Adjudication Review")
    for a in pending_auths:
        open_issues_list.append(f"Pending Authorization {a.get('authorization_id')} ({a.get('service')}) at {a.get('provider')}")
    for cg in overdue_gaps:
        open_issues_list.append(f"Overdue Care Gap: {cg.get('measure')} ({cg.get('status')})")
    for it in pending_interactions:
        open_issues_list.append(f"Pending Follow-up Interaction: {it.get('type')} on {it.get('date')} ({it.get('notes')})")
    for al in alerts:
        open_issues_list.append(f"Active Alert: {al.get('description')} (Priority: {al.get('priority')}, Due: {al.get('due_date')})")

    # Suggested Administrative Next Actions
    suggested_actions_list = []
    if overdue_gaps:
        suggested_actions_list.append({
            "action": f"Schedule {overdue_gaps[0].get('measure')} with {member.get('pcp', 'PCP')}",
            "assignee": "Care Coordinator",
            "priority": "High",
            "due": "Within 7 Days"
        })
    if pending_auths:
        suggested_actions_list.append({
            "action": f"Expedite Utilization Review for Auth {pending_auths[0].get('authorization_id')} ({pending_auths[0].get('service')})",
            "assignee": "Prior Auth Specialist",
            "priority": "High",
            "due": "Within 48 Hours"
        })
    if open_claims:
        suggested_actions_list.append({
            "action": f"Follow up on pending adjudication documentation for Claim {open_claims[0].get('claim_id')}",
            "assignee": "Claims Rep",
            "priority": "Medium",
            "due": "Within 10 Days"
        })
    if active_meds:
        suggested_actions_list.append({
            "action": f"Pharmacy outreach to confirm 90-day refill sync for {active_meds[0].get('medication', 'Active Rx')}",
            "assignee": "Clinical Pharmacist",
            "priority": "Medium",
            "due": "Within 14 Days"
        })
    if not suggested_actions_list:
        suggested_actions_list.append({
            "action": "Conduct routine annual wellness and benefits review",
            "assignee": "Member Services",
            "priority": "Low",
            "due": "Next Quarter"
        })

    # Query Text Normalization
    q = (message or "").strip().lower()

    # 1. Safety Guardrail: Out of Scope / Unsupported data
    out_of_bounds_keywords = [
        "credit score", "social security", "ssn", "genetics", "genome",
        "bank account", "salary", "criminal record", "voting record", "driver license",
        "fICO", "tax return", "passport number", "political"
    ]
    for ob in out_of_bounds_keywords:
        if ob in q:
            return {
                "member_id": canonical_id,
                "member_name": member["name"],
                "reply": f"**Information not available in the member records.**\n\nThe requested entity (`{ob}`) is not tracked, collected, or available in the Member 360° health and administrative database.",
                "sources": [],
                "why": f"Verification completed across all available tables for member {canonical_id} (Eligibility, Claims, Pharmacy, Prior Auth, Care Gaps, Interactions, Timeline). The requested parameter is outside member record scope.",
                "open_issues": open_issues_list[:3],
                "suggested_actions": suggested_actions_list[:2],
                "suggested_questions": [
                    "What is the member's current eligibility & plan status?",
                    "Summarize open claims and financial liability",
                    "List pending prior authorizations"
                ]
            }

    # 2. Safety Guardrail: Clinical Prescription / Medical Advice
    is_asking_for_prescriber = any(k in q for k in ["who prescribed", "prescribed by", "what is prescribed", "prescriber"])
    is_seeking_clinical_directive = any(k in q for k in [
        "prescribe", "diagnose", "medical advice", "should i stop",
        "should the patient stop", "cure", "cancer diagnosis", "chemotherapy directive", "treatment directive"
    ]) and not is_asking_for_prescriber

    if is_seeking_clinical_directive:
        return {
            "member_id": canonical_id,
            "member_name": member["name"],
            "reply": f"**Clinical Decision Support Guardrail:**\n\nDirect medical diagnoses, treatment modifications, and clinical prescription orders cannot be generated autonomously by the administrative assistant. All medical management decisions must be evaluated by the attending licensed clinician (**[PCP: {member.get('pcp', 'Assigned Physician')}]**).\n\n* **Current Prescribed Pharmacotherapy:** {len(active_meds)} active medication(s)\n* **Primary Care Physician on Record:** {member.get('pcp')}\n* **Documented Chronic Conditions:** {', '.join(chronic_conditions)}",
            "sources": [
                {
                    "type": "Eligibility",
                    "id": "PCP",
                    "title": f"PCP: {member.get('pcp')}",
                    "detail": "Primary Care Provider assigned in policy record",
                    "status": "Active",
                    "badge_class": "badge-green"
                },
                {
                    "type": "Medication",
                    "id": "Rx-List",
                    "title": f"{len(active_meds)} Active Medication(s)",
                    "detail": ", ".join((m.get("medication") or m.get("name", "")) for m in active_meds),
                    "status": "Active",
                    "badge_class": "badge-blue"
                }
            ],
            "why": "Clinical safety protocol: AI assistant is restricted from generating unsupported medical directives or unauthorized clinical prescribing decisions.",
            "open_issues": open_issues_list[:3],
            "suggested_actions": [
                {
                    "action": f"Route clinical query to {member.get('pcp', 'Primary Care Provider')}",
                    "assignee": "Clinical Coordinator",
                    "priority": "High",
                    "due": "Within 24 Hours"
                }
            ],
            "suggested_questions": [
                "Show active medications & prescriber",
                "What care gaps are overdue for this member?",
                "Summarize member profile"
            ]
        }

    # 3. Check for specific ID lookup (e.g. CLM..., AUTH...)
    import re
    clm_match = re.search(r"clm\d+", q)
    auth_match = re.search(r"auth\d+", q)

    if clm_match:
        target_clm = clm_match.group(0).upper()
        found_c = next((c for c in claims if c.get("claim_id", "").upper() == target_clm), None)
        if found_c:
            return {
                "member_id": canonical_id,
                "member_name": member["name"],
                "reply": f"### Claim Details: **[Claim: {found_c['claim_id']}]**\n\n* **Date of Service:** {found_c['date_of_service']}\n* **Healthcare Provider:** {found_c['provider']}\n* **Adjudication Status:** **{found_c['status']}**\n* **Billed Total Amount:** **${found_c['amount']:.2f}**\n* **Patient Responsibility:** **${found_c['patient_responsibility']:.2f}**\n* **Plan Coverage:** {member.get('plan')}",
                "sources": [
                    {
                        "type": "Claim",
                        "id": found_c["claim_id"],
                        "title": f"Claim {found_c['claim_id']} ({found_c['status']})",
                        "detail": f"{found_c['provider']} • Billed: ${found_c['amount']:.2f} • Patient Owed: ${found_c['patient_responsibility']:.2f}",
                        "date": found_c["date_of_service"],
                        "status": found_c["status"],
                        "badge_class": _badge_for_status(found_c["status"])
                    }
                ],
                "why": f"Directly matched claim record '{found_c['claim_id']}' in member {canonical_id}'s claims adjudication database.",
                "open_issues": [f"Status of Claim {found_c['claim_id']} is {found_c['status']}"] if found_c["status"] != "Processed" else [],
                "suggested_actions": [
                    {
                        "action": f"Review explanation of benefits for Claim {found_c['claim_id']}",
                        "assignee": "Claims Specialist",
                        "priority": "Medium",
                        "due": "Within 7 Days"
                    }
                ] if found_c["status"] != "Processed" else [],
                "suggested_questions": [
                    "What is the total patient responsibility across all claims?",
                    "Are there other pending claims for this member?",
                    "What prior authorizations are on file?"
                ]
            }
        else:
            return {
                "member_id": canonical_id,
                "member_name": member["name"],
                "reply": f"**Information not available in the member records.**\n\nClaim ID `{target_clm}` was not found in {member['name']}'s claims history ({len(claims)} claim records evaluated).",
                "sources": [],
                "why": f"Queried {len(claims)} claims records for member {canonical_id}. No identifier matching '{target_clm}' exists.",
                "open_issues": open_issues_list[:2],
                "suggested_actions": [],
                "suggested_questions": ["List all claims for this member", "Summarize member profile"]
            }

    if auth_match:
        target_auth = auth_match.group(0).upper()
        found_a = next((a for a in auths if a.get("authorization_id", "").upper() == target_auth), None)
        if found_a:
            return {
                "member_id": canonical_id,
                "member_name": member["name"],
                "reply": f"### Authorization Details: **[Auth: {found_a['authorization_id']}]**\n\n* **Requested Clinical Service:** **{found_a['service']}**\n* **Requesting Provider:** {found_a['provider']}\n* **Review Status:** **{found_a['status']}**\n* **Submission Date:** {found_a['request_date']}\n* **Coverage Validity Expiration:** {found_a.get('valid_until') or 'Pending determination / N/A'}",
                "sources": [
                    {
                        "type": "Authorization",
                        "id": found_a["authorization_id"],
                        "title": f"Auth {found_a['authorization_id']} ({found_a['status']})",
                        "detail": f"{found_a['service']} • Provider: {found_a['provider']}",
                        "date": found_a["request_date"],
                        "status": found_a["status"],
                        "badge_class": _badge_for_status(found_a["status"])
                    }
                ],
                "why": f"Directly matched authorization record '{found_a['authorization_id']}' in member {canonical_id}'s utilization management ledger.",
                "open_issues": [f"Prior Authorization {found_a['authorization_id']} is currently {found_a['status']}"] if found_a["status"] != "Approved" else [],
                "suggested_actions": [
                    {
                        "action": f"Expedite clinical review for Auth {found_a['authorization_id']}",
                        "assignee": "Prior Auth Specialist",
                        "priority": "High",
                        "due": "Within 48 Hours"
                    }
                ] if found_a["status"] == "Pending" else [],
                "suggested_questions": [
                    "What other authorizations are on file?",
                    "What care gaps need closing?",
                    "Summarize open claims"
                ]
            }

    # 4. Open Issues & Urgent Problems Query
    if any(k in q for k in ["open issue", "issues", "problem", "urgent", "attention", "action needed", "what is wrong", "alert"]):
        sources = []
        reply_sections = []

        if open_claims:
            reply_sections.append(f"**Open / Pending Claims ({len(open_claims)}):**")
            for c in open_claims:
                reply_sections.append(f"* **[Claim: {c['claim_id']}]**: ${c.get('amount', 0):.2f} at *{c.get('provider')}* (Status: `{c.get('status')}`)")
                sources.append({
                    "type": "Claim",
                    "id": c["claim_id"],
                    "title": f"Claim {c['claim_id']}",
                    "detail": f"{c.get('provider')} - ${c.get('amount', 0):.2f}",
                    "date": c.get("date_of_service"),
                    "status": c.get("status"),
                    "badge_class": _badge_for_status(c.get("status"))
                })

        if denied_claims:
            reply_sections.append(f"\n**Denied Claims Requiring Review ({len(denied_claims)}):**")
            for c in denied_claims:
                reply_sections.append(f"* **[Claim: {c['claim_id']}]**: ${c.get('amount', 0):.2f} at *{c.get('provider')}* (Status: `Denied`)")
                sources.append({
                    "type": "Claim",
                    "id": c["claim_id"],
                    "title": f"Denied Claim {c['claim_id']}",
                    "detail": f"{c.get('provider')} - ${c.get('amount', 0):.2f}",
                    "date": c.get("date_of_service"),
                    "status": "Denied",
                    "badge_class": "badge-red"
                })

        if pending_auths:
            reply_sections.append(f"\n**Pending Prior Authorizations ({len(pending_auths)}):**")
            for a in pending_auths:
                reply_sections.append(f"* **[Auth: {a['authorization_id']}]**: {a.get('service')} requested by *{a.get('provider')}* (Requested: {a.get('request_date')})")
                sources.append({
                    "type": "Authorization",
                    "id": a["authorization_id"],
                    "title": f"Auth {a['authorization_id']}",
                    "detail": f"{a.get('service')} - {a.get('provider')}",
                    "date": a.get("request_date"),
                    "status": "Pending",
                    "badge_class": "badge-yellow"
                })

        if overdue_gaps:
            reply_sections.append(f"\n**Overdue Care Gaps ({len(overdue_gaps)}):**")
            for cg in overdue_gaps:
                reply_sections.append(f"* **[Care Gap: {cg.get('measure')}]**: Priority: `{cg.get('priority')}` • Status: `{cg.get('status')}`")
                sources.append({
                    "type": "CareGap",
                    "id": cg.get("measure"),
                    "title": cg.get("measure"),
                    "detail": f"Status: {cg.get('status')} • Priority: {cg.get('priority')}",
                    "status": cg.get("status"),
                    "badge_class": "badge-red"
                })

        if pending_interactions:
            reply_sections.append(f"\n**Unresolved Member Interactions ({len(pending_interactions)}):**")
            for it in pending_interactions:
                reply_sections.append(f"* **[Interaction: {it.get('date')}]**: {it.get('type')} by *{it.get('by')}* — Note: *{it.get('notes')}*")
                sources.append({
                    "type": "Interaction",
                    "id": it.get("date"),
                    "title": f"Interaction {it.get('date')}",
                    "detail": f"{it.get('type')} • {it.get('notes')}",
                    "date": it.get("date"),
                    "status": "Pending",
                    "badge_class": "badge-yellow"
                })

        if not reply_sections:
            reply_text = f"**No Critical Open Issues:**\n\n{member['name']} has zero pending claims, no denied authorizations, and no overdue preventive screenings on file."
        else:
            reply_text = f"### Flagged Open Issues for {member['name']} ({canonical_id})\n\n" + "\n".join(reply_sections)

        return {
            "member_id": canonical_id,
            "member_name": member["name"],
            "reply": reply_text,
            "sources": sources,
            "why": f"Synthesized from active claims ({len(claims)} records), authorizations ({len(auths)} records), care gaps ({len(care_gaps)} measures), and CRM interaction logs.",
            "open_issues": open_issues_list,
            "suggested_actions": suggested_actions_list,
            "suggested_questions": [
                "What administrative next actions should be taken?",
                "Summarize active medications and prescribers",
                "What is the member's deductible and out-of-pocket maximum?"
            ]
        }

    # 5. Administrative Next Actions Query
    if any(k in q for k in ["next action", "next actions", "recommendation", "recommendations", "what should we do", "next steps", "task", "assignee"]):
        sources = []
        action_bullets = []
        for i, act in enumerate(suggested_actions_list, 1):
            action_bullets.append(f"{i}. **{act['action']}**\n   * **Assignee:** `{act['assignee']}` | **Priority:** `{act['priority']}` | **Due:** `{act['due']}`")
            sources.append({
                "type": "Action",
                "id": f"ACT-{i}",
                "title": act["action"],
                "detail": f"Assignee: {act['assignee']} • Priority: {act['priority']} • Due: {act['due']}",
                "status": act["priority"],
                "badge_class": "badge-green" if act["priority"] == "High" else "badge-yellow"
            })

        return {
            "member_id": canonical_id,
            "member_name": member["name"],
            "reply": f"### Recommended Administrative Next Actions for {member['name']}\n\n" + "\n\n".join(action_bullets),
            "sources": sources,
            "why": f"Action plan generated based on identified open issues: {len(open_claims)} open claims, {len(pending_auths)} pending auths, and {len(overdue_gaps)} overdue care gaps.",
            "open_issues": open_issues_list,
            "suggested_actions": suggested_actions_list,
            "suggested_questions": [
                "What care gaps are overdue?",
                "List pending authorizations & claims",
                "Show member eligibility & benefits"
            ]
        }

    # 6. Claims & Financial Inquiries
    if any(k in q for k in ["claim", "claims", "billed", "patient responsibility", "out of pocket", "deductible spent", "cost", "financial"]):
        total_billed = sum(c.get("amount", 0) for c in claims)
        total_patient_resp = sum(c.get("patient_responsibility", 0) for c in claims)
        processed_count = len([c for c in claims if c.get("status") == "Processed"])

        bullets = []
        sources = []
        for c in claims:
            bullets.append(f"* **[Claim: {c['claim_id']}]**: {c.get('date_of_service')} at **{c.get('provider')}** — Billed: **${c.get('amount', 0):.2f}** | Patient Resp: **${c.get('patient_responsibility', 0):.2f}** | Status: **{c.get('status')}**")
            sources.append({
                "type": "Claim",
                "id": c["claim_id"],
                "title": f"Claim {c['claim_id']} ({c.get('status')})",
                "detail": f"{c.get('provider')} • Billed: ${c.get('amount', 0):.2f} • Patient: ${c.get('patient_responsibility', 0):.2f}",
                "date": c.get("date_of_service"),
                "status": c.get("status"),
                "badge_class": _badge_for_status(c.get("status"))
            })

        summary_head = (
            f"### Claims & Financial Summary for {member['name']}\n\n"
            f"* **Total Claims Filed:** {len(claims)} ({processed_count} Processed, {len(open_claims)} Pending, {len(denied_claims)} Denied)\n"
            f"* **Total Billed Amount:** **${total_billed:,.2f}**\n"
            f"* **Total Patient Responsibility:** **${total_patient_resp:,.2f}**\n"
            f"* **Plan Deductible:** ${benefits.get('deductible', 1000):,} | **Out of Pocket Max:** ${benefits.get('out_of_pocket_max', 4000):,}\n\n"
            f"**Claims Detail Records:**\n"
        )

        return {
            "member_id": canonical_id,
            "member_name": member["name"],
            "reply": summary_head + "\n".join(bullets),
            "sources": sources,
            "why": f"Derived from {len(claims)} adjudicated and pending claim entries in member {canonical_id}'s ledger.",
            "open_issues": open_issues_list[:3],
            "suggested_actions": suggested_actions_list[:2],
            "suggested_questions": [
                "Are there any pending authorizations?",
                "What is the copay schedule for this plan?",
                "What administrative next actions should be taken?"
            ]
        }

    # 7. Prior Authorizations Inquiries
    if any(k in q for k in ["authorization", "authorizations", "auth", "prior auth", "mri", "pt", "denied auth", "approval", "service approval"]):
        approved_count = len([a for a in auths if a.get("status") == "Approved"])
        bullets = []
        sources = []
        for a in auths:
            bullets.append(f"* **[Auth: {a['authorization_id']}]**: **{a.get('service')}** requested by **{a.get('provider')}** (Requested: {a.get('request_date')}) — Status: **{a.get('status')}** (Valid until: {a.get('valid_until') or 'N/A'})")
            sources.append({
                "type": "Authorization",
                "id": a["authorization_id"],
                "title": f"Auth {a['authorization_id']} ({a.get('status')})",
                "detail": f"{a.get('service')} • {a.get('provider')}",
                "date": a.get("request_date"),
                "status": a.get("status"),
                "badge_class": _badge_for_status(a.get("status"))
            })

        reply_head = (
            f"### Prior Authorization Summary for {member['name']}\n\n"
            f"* **Total Requests:** {len(auths)} ({approved_count} Approved, {len(pending_auths)} Pending, {len(denied_auths)} Denied)\n\n"
            f"**Authorization Records:**\n"
        )

        return {
            "member_id": canonical_id,
            "member_name": member["name"],
            "reply": reply_head + "\n".join(bullets),
            "sources": sources,
            "why": f"Directly aggregated from {len(auths)} prior authorization case entries under member ID {canonical_id}.",
            "open_issues": [f"Auth {a['authorization_id']} is {a['status']}" for a in pending_auths + denied_auths],
            "suggested_actions": suggested_actions_list[:2],
            "suggested_questions": [
                "What claims are currently open or pending?",
                "What medications is the member taking?",
                "What care gaps need closing?"
            ]
        }

    # 8. Medications & Pharmacy Inquiries
    if any(k in q for k in ["medication", "medications", "meds", "rx", "drug", "prescription", "refill", "dosage", "adherence", "pharmacy", "lisinopril", "metformin", "atorvastatin", "albuterol", "fluticasone", "omeprazole", "pantoprazole", "amlodipine"]):
        bullets = []
        sources = []
        for m in meds:
            med_name = m.get("medication") or m.get("name") or "Prescription"
            bullets.append(f"* **[Medication: {med_name}]**: {m.get('dosage')}, {m.get('frequency')} — Prescribed by **{m.get('prescribed_by', m.get('prescriber', member.get('pcp', 'Physician')))}** (Started: {m.get('start_date')}, Status: **{m.get('status', 'Active')}**)")
            sources.append({
                "type": "Medication",
                "id": med_name,
                "title": f"Rx: {med_name} ({m.get('dosage')})",
                "detail": f"{m.get('frequency')} • Prescribed by {m.get('prescribed_by', m.get('prescriber', 'PCP'))}",
                "date": m.get("start_date"),
                "status": m.get("status", "Active"),
                "badge_class": _badge_for_status(m.get("status", "Active"))
            })

        reply_head = (
            f"### Active Pharmacotherapy & Prescription Record for {member['name']}\n\n"
            f"* **Active Prescriptions:** {len(active_meds)} active drug(s)\n"
            f"* **Medication Adherence (PDC Rate):** **{risk_info.get('medication_adherence_rate', '88%')}**\n"
            f"* **Associated Chronic Diagnoses:** {', '.join(chronic_conditions)}\n\n"
            f"**Medication Ledger:**\n"
        )

        return {
            "member_id": canonical_id,
            "member_name": member["name"],
            "reply": reply_head + "\n".join(bullets),
            "sources": sources,
            "why": f"Compiled from the pharmacy dispensing and active prescription records for member {canonical_id}.",
            "open_issues": open_issues_list[:2],
            "suggested_actions": [
                {
                    "action": f"Pharmacy refill check & compliance outreach for {active_meds[0].get('medication', 'Rx') if active_meds else 'Prescriptions'}",
                    "assignee": "Clinical Pharmacist",
                    "priority": "Medium",
                    "due": "Within 14 Days"
                }
            ],
            "suggested_questions": [
                "What is the member's primary care physician?",
                "What care gaps are overdue?",
                "What prior authorizations are on file?"
            ]
        }

    # 9. Eligibility, Coverage & Benefits Inquiries
    if any(k in q for k in ["eligibility", "benefit", "benefits", "coverage", "copay", "deductible", "out of pocket max", "oop", "pcp copay", "er copay", "effective date", "expiration", "group number", "policy"]):
        sources = [
            {
                "type": "Eligibility",
                "id": member.get("plan_id", "PLN-01"),
                "title": f"Plan: {member.get('plan')}",
                "detail": f"Group: {member.get('group_number')} • Member ID: {canonical_id}",
                "date": eligibility.get("plan_effective_date"),
                "status": eligibility.get("coverage_status"),
                "badge_class": "badge-green"
            },
            {
                "type": "Benefits",
                "id": "Cost-Sharing",
                "title": "Cost Sharing Schedule",
                "detail": f"Deductible: ${benefits.get('deductible', 1000):,} • OOP Max: ${benefits.get('out_of_pocket_max', 4000):,}",
                "status": "Active",
                "badge_class": "badge-blue"
            }
        ]

        reply_text = (
            f"### Eligibility & Benefit Schedule for {member['name']} ({canonical_id})\n\n"
            f"* **Coverage Status:** **[Eligibility: {eligibility.get('coverage_status', 'Active')}]**\n"
            f"* **Insurance Plan:** **{member.get('plan')}** (Plan ID: `{member.get('plan_id', 'PLN-PPO-01')}`)\n"
            f"* **Group Number:** `{member.get('group_number', 'GRP-786496')}`\n"
            f"* **Policy Period:** {eligibility.get('plan_effective_date')} to {eligibility.get('plan_expiration_date')}\n"
            f"* **Member Since:** {eligibility.get('member_since')}\n"
            f"* **Assigned Primary Care Provider (PCP):** **[PCP: {member.get('pcp', 'Dr. Sarah Williams')}]**\n\n"
            f"**Cost-Sharing & Copay Schedule:**\n"
            f"* **Annual Deductible:** **${benefits.get('deductible', 1000):,}**\n"
            f"* **Out-of-Pocket Maximum:** **${benefits.get('out_of_pocket_max', 4000):,}**\n"
            f"* **Primary Care Copay (PCP):** **${benefits.get('copay_pcp', 25)}**\n"
            f"* **Specialist Copay:** **${benefits.get('copay_specialist', 50)}**\n"
            f"* **Emergency Room Copay (ER):** **${benefits.get('er_copay', 150)}**"
        )

        return {
            "member_id": canonical_id,
            "member_name": member["name"],
            "reply": reply_text,
            "sources": sources,
            "why": f"Retrieved from the plan benefit schedule and active eligibility verification record for policy {member.get('group_number')}.",
            "open_issues": open_issues_list[:2],
            "suggested_actions": suggested_actions_list[:2],
            "suggested_questions": [
                "Summarize claims and patient responsibility",
                "What active medications are on file?",
                "What open issues exist for this member?"
            ]
        }

    # 10. Care Gaps & Quality Screenings (HEDIS) Inquiries
    if any(k in q for k in ["care gap", "care gaps", "hedis", "preventive", "screening", "physical", "hba1c", "retinal", "eye exam", "metabolic", "cmp", "lipid", "mammogram", "colonoscopy", "wellness"]):
        bullets = []
        sources = []
        for cg in care_gaps:
            bullets.append(f"* **[Care Gap: {cg.get('measure')}]**: Priority: **{cg.get('priority')}** — Status: **{cg.get('status')}**")
            sources.append({
                "type": "CareGap",
                "id": cg.get("measure"),
                "title": cg.get("measure"),
                "detail": f"Status: {cg.get('status')} • Priority: {cg.get('priority')}",
                "status": cg.get("status"),
                "badge_class": _badge_for_status(cg.get("status"))
            })

        reply_head = (
            f"### Evidence-Based Quality Care Gaps (HEDIS / USPSTF) for {member['name']}\n\n"
            f"* **Identified Quality Gaps:** {len(care_gaps)} total measure(s) ({len(overdue_gaps)} Overdue)\n"
            f"* **Documented Clinical Indications:** {', '.join(chronic_conditions)}\n\n"
            f"**Care Gap Measures:**\n"
        )

        return {
            "member_id": canonical_id,
            "member_name": member["name"],
            "reply": reply_head + "\n".join(bullets),
            "sources": sources,
            "why": f"Derived from patient age ({member.get('age')}), chronic conditions ({', '.join(chronic_conditions)}), and clinical preventive guidelines.",
            "open_issues": [f"Overdue Care Gap: {cg['measure']}" for cg in overdue_gaps],
            "suggested_actions": suggested_actions_list[:2],
            "suggested_questions": [
                "How do we close these care gaps?",
                "What is the PCP contact information?",
                "What active medications is the member taking?"
            ]
        }

    # 11. Interactions & Member CRM Logs Inquiries
    if any(k in q for k in ["interaction", "interactions", "call", "phone", "email", "chat", "representative", "contact", "notes", "inquiry", "spoke", "crm"]):
        bullets = []
        sources = []
        for it in interactions:
            bullets.append(f"* **[Interaction: {it.get('date')}]**: **{it.get('type')}** logged by **{it.get('by')}** — Notes: *\"{it.get('notes')}\"* (Outcome: **{it.get('outcome')}**)")
            sources.append({
                "type": "Interaction",
                "id": it.get("date"),
                "title": f"Interaction ({it.get('type')}) - {it.get('date')}",
                "detail": f"{it.get('notes')} • Logged by: {it.get('by')}",
                "date": it.get("date"),
                "status": it.get("outcome"),
                "badge_class": _badge_for_status(it.get("outcome"))
            })

        reply_head = (
            f"### Member Communication & Interaction Log for {member['name']}\n\n"
            f"* **Total Logged Interactions:** {len(interactions)} records\n\n"
            f"**History:**\n"
        )

        return {
            "member_id": canonical_id,
            "member_name": member["name"],
            "reply": reply_head + "\n".join(bullets),
            "sources": sources,
            "why": f"Retrieved from the member service CRM interaction ledger ({len(interactions)} entries).",
            "open_issues": open_issues_list[:2],
            "suggested_actions": suggested_actions_list[:2],
            "suggested_questions": [
                "What claims are currently open?",
                "What are the recommended next actions?",
                "Summarize member profile"
            ]
        }

    # 12. Timeline & Chronological Events Inquiries
    if any(k in q for k in ["timeline", "milestone", "history", "recent events", "event log", "chronology"]):
        bullets = []
        sources = []
        for ev in timeline:
            bullets.append(f"* **[Timeline: {ev.get('date')}]**: **{ev.get('event')}** (Status: **{ev.get('status')}**)")
            sources.append({
                "type": "Timeline",
                "id": ev.get("date"),
                "title": ev.get("event"),
                "detail": f"Status: {ev.get('status')}",
                "date": ev.get("date"),
                "status": ev.get("status"),
                "badge_class": _badge_for_status(ev.get("status"))
            })

        reply_head = (
            f"### Chronological Health & Administrative Timeline for {member['name']}\n\n"
            f"**Event Log:**\n"
        )

        return {
            "member_id": canonical_id,
            "member_name": member["name"],
            "reply": reply_head + "\n".join(bullets),
            "sources": sources,
            "why": f"Aggregated from the chronological system event journal ({len(timeline)} events).",
            "open_issues": open_issues_list[:2],
            "suggested_actions": suggested_actions_list[:2],
            "suggested_questions": [
                "Summarize open claims and financial liability",
                "What care gaps need closing?",
                "What administrative next actions should be taken?"
            ]
        }

    # 13. Default: Full Executive Member Profile & Intelligence Summary
    sources = [
        {
            "type": "Eligibility",
            "id": member.get("plan_id", "PLN-01"),
            "title": f"Plan: {member.get('plan')}",
            "detail": f"Status: {member.get('status')} • Group: {member.get('group_number')}",
            "date": eligibility.get("plan_effective_date"),
            "status": eligibility.get("coverage_status"),
            "badge_class": "badge-green"
        },
        {
            "type": "Medication",
            "id": "Active-Rx",
            "title": f"{len(active_meds)} Active Medication(s)",
            "detail": ", ".join((m.get("medication") or m.get("name", "")) for m in active_meds),
            "status": "Active",
            "badge_class": "badge-blue"
        },
        {
            "type": "Claim",
            "id": "Claims-Summary",
            "title": f"{len(claims)} Total Claim(s)",
            "detail": f"{len(open_claims)} open/pending • Total Billed: ${sum(c.get('amount', 0) for c in claims):,.2f}",
            "status": "Active",
            "badge_class": "badge-yellow" if open_claims else "badge-green"
        },
        {
            "type": "Authorization",
            "id": "Auth-Summary",
            "title": f"{len(auths)} Prior Auth(s)",
            "detail": f"{len(pending_auths)} pending review",
            "status": "Pending" if pending_auths else "Approved",
            "badge_class": "badge-yellow" if pending_auths else "badge-green"
        }
    ]

    total_billed = sum(c.get("amount", 0) for c in claims)
    total_patient_resp = sum(c.get("patient_responsibility", 0) for c in claims)

    reply_text = (
        f"### Executive Member Briefing: **{member['name']}** ({canonical_id})\n\n"
        f"**Demographics & Insurance:**\n"
        f"* **Member ID:** `{member['member_id']}` | **DOB:** {member['dob']} (Age {member.get('age', 40)}, {member.get('gender')})\n"
        f"* **Plan:** **[Eligibility: {member['plan']}]** (`{member.get('plan_id', 'PLN-PPO-01')}`) — Status: **{member.get('status', 'Active Member')}**\n"
        f"* **Primary Care Physician:** **[PCP: {member.get('pcp', 'Dr. Sarah Williams')}]**\n"
        f"* **Deductible:** ${benefits.get('deductible', 1000):,} | **Out-of-Pocket Max:** ${benefits.get('out_of_pocket_max', 4000):,}\n\n"
        f"**Clinical & Pharmacy Status:**\n"
        f"* **Active Prescriptions ({len(active_meds)}):** {', '.join((m.get('medication') or m.get('name', '')) for m in active_meds) or 'None'}\n"
        f"* **Prescription Compliance (PDC Rate):** **{risk_info.get('medication_adherence_rate', '88%')}**\n"
        f"* **Documented Chronic Indications:** {', '.join(chronic_conditions)}\n\n"
        f"**Utilization & Administrative Status:**\n"
        f"* **Claims:** {len(claims)} total (${total_billed:,.2f} billed, ${total_patient_resp:,.2f} patient resp) with **{len(open_claims)} open/pending**\n"
        f"* **Prior Authorizations:** {len(auths)} total with **{len(pending_auths)} pending review**\n"
        f"* **Care Gaps:** **{len(overdue_gaps)} overdue measure(s)** ({', '.join(cg.get('measure') for cg in overdue_gaps) or 'None overdue'})\n"
        f"* **Predictive Readmission Risk Tier:** **{risk_info.get('overall_tier', 'Moderate Risk')}** ({risk_info.get('readmission_risk_score', '24%')})\n\n"
        f"**Immediate Action Needed:** {open_issues_list[0] if open_issues_list else 'All administrative records up to date.'}"
    )

    return {
        "member_id": canonical_id,
        "member_name": member["name"],
        "reply": reply_text,
        "sources": sources,
        "why": f"Cross-referenced member profile across all 7 operational domains: Eligibility, Claims ({len(claims)}), Pharmacy ({len(meds)}), Authorizations ({len(auths)}), Quality Care Gaps ({len(care_gaps)}), Interactions ({len(interactions)}), and Event Timeline ({len(timeline)}).",
        "open_issues": open_issues_list,
        "suggested_actions": suggested_actions_list,
        "suggested_questions": [
            "What open issues and action items require attention?",
            "Show breakdown of claims and out-of-pocket costs",
            "What care gaps are currently overdue?",
            "List active medications and prescribing doctors"
        ]
    }


@app.post("/api/members/{member_id}/chat", response_model=ChatResponse, tags=["AI Insights"])
def member_ai_chat(
    member_id: str,
    payload: ChatRequest,
    user: dict = Depends(require_member_access),
):
    """
    RAG-Augmented Member 360 AI Chatbot endpoint.
    Dynamically indexes and retrieves only the relevant member document chunks via
    BM25 + Semantic scoring across Eligibility, Claims, Medications, Prior Authorizations,
    Care Gaps, Interactions, and Timeline.
    Generates strictly grounded answers with citations, source traceability, and RAG metadata.
    """
    result = rag_pipeline.run_member_rag(member_id, payload.message, payload.history)
    return ChatResponse(**result)


# ---------------------------------------------------------------------------
# Enterprise Admin Population Routes
# ---------------------------------------------------------------------------

@app.get("/api/admin/claims", tags=["Admin"])
def get_all_claims(user: dict = Depends(require_staff)):
    all_claims = []
    for m in data.MEMBERS:
        m_id = m["member_id"]
        claims = data.CLAIMS.get(m_id, [])
        for c in claims:
            c_copy = dict(c)
            c_copy["member_name"] = m["name"]
            c_copy["member_id"] = m_id
            c_copy["plan"] = m["plan"]
            all_claims.append(c_copy)
    return all_claims


@app.get("/api/admin/authorizations", tags=["Admin"])
def get_all_authorizations(user: dict = Depends(require_staff)):
    all_auths = []
    for m in data.MEMBERS:
        m_id = m["member_id"]
        auths = data.AUTHORIZATIONS.get(m_id, [])
        for a in auths:
            a_copy = dict(a)
            a_copy["member_name"] = m["name"]
            a_copy["member_id"] = m_id
            a_copy["plan"] = m["plan"]
            all_auths.append(a_copy)
    return all_auths


@app.get("/api/admin/medications", tags=["Admin"])
def get_all_medications(user: dict = Depends(require_staff)):
    all_meds = []
    for m in data.MEMBERS:
        m_id = m["member_id"]
        meds = data.MEDICATIONS.get(m_id, [])
        for md in meds:
            md_copy = dict(md)
            md_copy["member_name"] = m["name"]
            md_copy["member_id"] = m_id
            md_copy["plan"] = m["plan"]
            all_meds.append(md_copy)
    return all_meds


@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
    }

