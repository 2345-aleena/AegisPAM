# AegisPAM -- Frontend

React + Vite + Tailwind CSS v4 client for the AegisPAM backend. Cream / olive /
brown design system, mobile-responsive sidebar layout, role-aware navigation
(admin / approver / requester see different things), live session countdowns,
charts on the dashboard, and a Fernet-backed secret reveal flow that auto-hides
after 20 seconds.

## Pages

| Route | Purpose |
|---|---|
| `/login`, `/register` | Auth, including the MFA step-up flow |
| `/` | Dashboard: risk score, active sessions, requests-over-time and risk-breakdown charts (admin/approver) |
| `/resources` | View resources; admins can add/remove |
| `/access-requests` | Submit requests; admins/approvers approve or deny |
| `/sessions` | Live countdown on active JIT sessions; admins/approvers can revoke |
| `/secrets` | Encrypted vault -- reveal (auto-hides), rotate, add (admin/approver only) |
| `/audit-log` | Admin-only, filterable, append-only trail |
| `/account` | MFA enrollment (QR code) + admin role management |

## Running locally

```bash
cd aegispam-frontend
npm install
cp .env.example .env      # point VITE_API_URL at your backend if not localhost:8000
npm run dev
```

Opens on http://localhost:5173. Make sure the backend is running first (see
`../aegispam-backend/README.md`) and that its `FRONTEND_ORIGIN` matches this
URL for CORS.

## Design system

Defined as CSS variables in `src/index.css` under `@theme` (Tailwind v4's
CSS-first config -- no `tailwind.config.js` needed):

- **Cream** background, **olive** as the primary/interactive color, **brown**
  for secondary text and accents -- per the brief.
- **Fraunces** (serif) for headings, **Inter** for body text, **IBM Plex
  Mono** for secrets, hashes, and timestamps.
- A recurring **wax-seal motif** (`src/components/Seal.jsx`) stands in for
  "sealed" vs "revealed"/"active" states across secrets, sessions, and the
  login screen, instead of a generic padlock icon.

## Build for production

```bash
npm run build
```

Outputs static assets to `dist/` -- deployable to any static host (Netlify,
Vercel, S3+CloudFront, GitHub Pages, etc.) as long as `VITE_API_URL` at build
time points to your deployed backend.
