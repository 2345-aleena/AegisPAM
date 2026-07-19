# AegisPAM

**A Privileged Access Management (PAM) simulator** — just-in-time access, an encrypted secret vault, credential rotation, rule-based risk scoring, MFA, and an immutable audit trail — modeling the same core workflow as enterprise PAM/identity products (CyberArk, Trend Micro's identity tooling, etc).

Built as a full-stack security engineering project to explore how privileged access is actually controlled in production environments: nothing is ever "just given" — every credential is time-boxed, every reveal is logged, and every decision is explainable.

![Python](https://img.shields.io/badge/Python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![React](https://img.shields.io/badge/React-19-61DAFB)
![License](https://img.shields.io/badge/license-MIT-lightgrey)


🔗 **Live demo:** [ADD_YOUR_DEPLOYED_LINK_HERE](#)
👤 **LinkedIn:** [ADD_YOUR_LINKEDIN_URL_HERE](#)
---

## Why this project

Privileged Access Management sits at the center of most real-world security incidents — stolen credentials, standing admin access, and unaudited secret sharing are behind a huge share of breaches. Rather than reading about PAM concepts, this project implements them:

- **Just-in-time (JIT) access** instead of standing privileges — access is requested, approved, time-boxed, and expires on its own
- **Encrypted secret vault** — credentials are never stored or transmitted in plaintext
- **Scoped secret reveal** — a user can only decrypt a credential if they hold an active, approved session *for that specific resource* (not just "any session anywhere")
- **Rule-based, explainable risk scoring** — no black-box ML; every flag traces back to a specific signal (failed logins, rapid requests, off-hours activity, break-glass usage)
- **Immutable audit trail** — every security-relevant action is logged and never mutated, the same principle compliance frameworks like SOC 2 and PCI-DSS are built on

## Screenshots

*(Add 3–4 screenshots here once you're happy with the UI — Dashboard, Access Requests, Secret Vault reveal, Audit Log make the strongest set. Drag them into this section on GitHub and they'll render inline.)*

## Architecture

```
aegispam-backend/    FastAPI + SQLAlchemy + SQLite/PostgreSQL
aegispam-frontend/   React + Vite + Tailwind CSS v4
```

```
Requester submits AccessRequest (resource, justification, duration)
        │
        ▼
   status = pending
        │
Approver/Admin decides
        │
   ┌────┴────┐
 approved   denied
   │
   ▼
Session created (expires_at = now + duration)
   │
   ▼
Requester calls GET /secrets/{id}/reveal
   │
   ├─ has active session for THIS resource? → decrypt & return, log "secret_revealed"
   └─ no active session? → 403, nothing decrypted
   │
   ▼
Session auto-expires the moment expires_at passes (checked lazily, no scheduler needed)
```

## Core features

| Area | What it does |
|---|---|
| **Auth & RBAC** | JWT auth, bcrypt password hashing, three roles (`admin` / `approver` / `requester`), TOTP-based MFA with QR enrollment |
| **Resources** | Register privileged targets — databases, servers, cloud accounts, applications |
| **Access requests** | Requester justifies a request with a duration cap; approver/admin approves or denies |
| **JIT sessions** | Time-boxed access grants created on approval; expire automatically; can be manually revoked (kill-switch) by an admin/approver |
| **Secret vault** | Fernet (AES-128 + HMAC) encryption at rest; plaintext only ever returned to the resource-scoped, session-holding caller; auto-hides in the UI after 20s |
| **Rotation** | Manual on-demand rotation and a scheduled-sweep endpoint for credentials past their rotation interval, with full history |
| **Risk scoring** | Transparent scoring across 4 signals — failed logins, rapid-fire requests, off-hours logins, break-glass usage — with a Low/Medium/High badge |
| **Break-glass** | Emergency access override that bypasses the approval flow but is always logged and always visible in the risk score |
| **Audit log** | Append-only, filterable by action/user, drives both the risk scoring and dashboard |

## Security decisions worth knowing about

This project went through a real merge-and-harden pass, and a few things came up that are worth being able to speak to:

1. **Fixed a real access-control bug.** The secret-reveal endpoint originally granted plaintext access if *any* active session existed anywhere in the system — meaning any authenticated user with any approved access could read every secret in the vault. It's now scoped to (a) the caller's own session and (b) the resource the secret is attached to, verified via a join back through the originating access request.
2. **Closed a privilege-escalation gap.** Registration originally accepted a `role` field straight from the client, so anyone could self-register as `admin`. Self-registration is now hard-locked to the lowest-privilege role (`requester`); only an existing admin can promote a user, via a dedicated audited endpoint.
3. **Consistent, predictable error handling.** Global exception handlers normalize validation errors, HTTP errors, and unexpected exceptions into one JSON shape, so the frontend never has to guess what an error response looks like.
4. **Everything writes to the audit log** — not just login/logout, but every resource/secret creation, every access decision, every reveal, rotation, and session revocation. The risk-scoring engine and dashboard are both built entirely on top of this log, so it had to be complete and consistent from day one.

## Tech stack

**Backend:** FastAPI · SQLAlchemy 2.0 · Pydantic v2 · PostgreSQL (SQLite for local dev) · python-jose (JWT) · passlib + bcrypt · pyotp (TOTP/MFA) · `cryptography` (Fernet)

**Frontend:** React 19 · Vite · Tailwind CSS v4 · React Router · Recharts · Axios · react-qr-code

## Running it locally

**Backend**
```bash
cd aegispam-backend
python -m venv venv
source venv/bin/activate        # venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```
API docs at `http://localhost:8000/docs`.

**Frontend**
```bash
cd aegispam-frontend
npm install
cp .env.example .env
npm run dev
```
App at `http://localhost:5173`.

Self-registration always creates a `requester`. To explore the full app, promote your first account to `admin` directly in the database once:
```python
from app.database import SessionLocal
from app.models.user import User, RoleEnum
db = SessionLocal()
u = db.query(User).filter(User.username == "YOUR_USERNAME").first()
u.role = RoleEnum.admin
db.commit()
```

## Known trade-offs

Built as a portfolio/learning project, so a few things are intentionally simplified rather than production-hardened:
- Schema managed via `Base.metadata.create_all()` rather than versioned Alembic migrations
- Scheduled rotation expects an external cron to call `POST /secrets/rotate-due` rather than bundling an in-process scheduler
- No rate limiting on login attempts yet (a natural next feature, and one the risk-scoring engine already tracks failed logins toward)

## What I'd build next

- Rate-limit login attempts and feed lockouts into the risk score
- Slack/email notifications on break-glass usage and high-risk flags
- Alembic migrations for real schema versioning
- Per-resource approval policies (e.g. require two approvers for production databases)

---

*Built while completing a cybersecurity internship at ZTBL Islamabad, as part of a broader push to move from general full-stack development into security engineering and red teaming.*
