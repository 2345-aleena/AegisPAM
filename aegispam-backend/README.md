# AegisPAM -- Backend

A Privileged Access Management (PAM) simulator built with **FastAPI + PostgreSQL/SQLAlchemy**,
modeling the same core workflow as enterprise PAM products (e.g. CyberArk, Trend Micro's
identity/PAM tooling): **just-in-time access, an encrypted secret vault, credential
rotation, rule-based risk scoring, and an immutable audit trail.**

This backend is a merge of two parallel workstreams (auth/rotation/dashboard vs.
resources/requests/sessions/secrets) into a single, consistent codebase, with the
gaps between them closed and one real security bug fixed along the way (see below).

## Architecture

```
app/
  core/        config, JWT + password hashing, TOTP/MFA, Fernet encryption, RBAC deps
  models/      SQLAlchemy ORM models (7 tables)
  schemas/     Pydantic request/response models with field-level validation
  routes/      FastAPI routers, one per resource
  services/    business logic: audit logging, rotation, risk scoring, session expiry
  main.py      app assembly, CORS, global error handlers
```

## Data model

| Table              | Purpose                                                      |
|---------------------|---------------------------------------------------------------|
| `users`             | accounts, role (admin/approver/requester), MFA state          |
| `resources`         | privileged targets (databases, servers, cloud accounts...)    |
| `access_requests`   | requester -> resource, justification, approve/deny workflow   |
| `sessions`          | time-boxed JIT access grants created on approval               |
| `secrets`           | Fernet-encrypted credentials tied to a resource                |
| `rotation_history`  | audit trail of every credential rotation                       |
| `audit_logs`        | append-only log of every security-relevant action               |

## Request lifecycle

```
requester submits AccessRequest (resource_id, justification, duration)
        -> pending
approver/admin approves           -> Session created, expires_at = now + duration
        or denies                -> status = denied, no session
requester calls GET /secrets/{id}/reveal
        -> only succeeds if they hold an ACTIVE session for THAT resource
        -> session auto-expires the moment `expires_at` is reached (lazy check,
           no scheduler needed for correctness)
```

## What changed while merging the two teammates' work

1. **Resolved schema conflicts.** Both branches had diverged `AccessRequest`,
   `Session`, and `Secret` models (different columns, different FK targets, one
   set using `Integer` PKs and the other `BigInteger`). Merged into one schema
   with every field either branch needed, and matched primary key types across
   the board (SQLite requires exactly `INTEGER PRIMARY KEY` to auto-increment,
   which `BigInteger` does not satisfy -- this was caught and fixed during testing).
2. **Fixed a real access-control bug.** The original `reveal_secret` endpoint
   granted plaintext access if *any* active session existed anywhere in the
   system -- meaning any authenticated user with any approved access could read
   *every* secret. It's now scoped to (a) the caller's own session and (b) the
   resource the secret is attached to.
3. **Closed a privilege-escalation gap.** Registration used to accept a `role`
   field directly from the client, so anyone could self-register as `admin`.
   Self-registration is now hard-locked to `requester`; only an existing admin
   can promote a user via `PATCH /auth/users/{id}/role`.
4. **Wired audit logging into every route**, not just auth -- resource/secret
   creation, request decisions, reveals, rotations, and session revocations
   all write an immutable row, which the risk-scoring and dashboard layers
   depend on.
5. **Added a manual session kill-switch** (`POST /sessions/{id}/revoke`) so an
   admin/approver can terminate a suspicious session immediately instead of
   waiting for natural expiry -- pairs with the risk score dashboard.
6. **Added consistent validation** everywhere (password strength, duration
   bounds, resource/secret type enums, justification length) and global
   FastAPI exception handlers so every error -- validation, HTTP, or
   unexpected -- returns the same predictable JSON shape.

## Running locally

```bash
cd aegispam-backend
python -m venv venv
source venv/bin/activate          # venv\Scripts\activate on Windows
pip install -r requirements.txt

cp .env.example .env              # defaults work out of the box (SQLite)
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs
Health check: http://localhost:8000/health

To use Postgres instead of the bundled SQLite default, set in `.env`:
```
DATABASE_URL=postgresql://aegispam_user:password@localhost:5432/aegispam_db
```
and `pip install psycopg2-binary` (already in requirements.txt).

### First-time setup

There's no seed script by design -- register your first user via
`POST /auth/register`, then promote it to admin directly in the database
once, since the API deliberately won't let self-registration create admins:

```python
# one-off, from a Python shell with the venv active
from app.database import SessionLocal
from app.models.user import User, RoleEnum
db = SessionLocal()
u = db.query(User).filter(User.username == "YOUR_USERNAME").first()
u.role = RoleEnum.admin
db.commit()
```

## Known trade-offs (intentional, for a project of this scope)

- Tables are created via `Base.metadata.create_all()` on startup rather than
  Alembic migrations -- fine for a demo/portfolio project, but a real
  production deployment would want versioned migrations.
- Scheduled secret rotation (`POST /secrets/rotate-due`) expects an external
  cron/scheduler to call it; there's no in-process scheduler bundled.
