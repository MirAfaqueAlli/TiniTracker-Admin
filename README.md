# TiniTracker — Admin Dashboard (`tinitracker-admin`)

> The provider-facing Next.js admin panel for managing the TiniTracker SaaS platform.

---

## Overview

`tinitracker-admin` is the internal admin dashboard used by TiniTracker staff to manage hospitals, subscriptions, providers, reports, and platform-wide settings. It is a **pure frontend** — it contains no server-side secrets, no database connection, and no backend logic. All data is fetched from the `tinitracker-next` backend via its `/api/provider/*` REST API.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| HTTP Client | Axios (with auth interceptor) |
| Auth | Provider JWT via localStorage (`provider_admin_token`) |
| Styling | Vanilla CSS (design system in `app/globals.css`) |
| Icons | Inline SVG + emoji |

---

## Project Structure

```
tinitracker-admin/
├── app/
│   ├── layout.js               # Root layout (AppProviders, fonts)
│   ├── globals.css             # Full design system (tokens, components, utilities)
│   ├── page.js                 # Root redirect → /dashboard
│   ├── login/                  # Provider admin login page
│   ├── dashboard/              # Platform overview (KPIs, revenue, activity)
│   ├── hospitals/              # Hospital list + [id] detail/edit page
│   │   └── [id]/               # Hospital detail with subscription management
│   ├── subscriptions/          # Subscription plans + upgrade request approvals
│   ├── admins/                 # Provider admin account management
│   ├── users/                  # Cross-hospital user view
│   ├── payments/               # Payment records + revenue charts
│   ├── reports/                # Export reports (CSV)
│   ├── announcements/          # Platform-wide broadcast announcements
│   ├── logs/                   # Audit activity logs
│   └── settings/               # Platform settings (branding, features, limits)
├── components/
│   ├── AdminLayout.jsx         # Sidebar + Topbar shell for authenticated pages
│   ├── AppProviders.jsx        # Client-side providers wrapper
│   ├── Sidebar.jsx             # Navigation sidebar with active state
│   ├── Topbar.jsx              # Header with search, notifications, profile
│   ├── GlobalSearchModal.jsx   # ⌘K global search across hospitals/users
│   └── CreateHospitalModal.jsx # Modal form for creating a new hospital
├── lib/
│   ├── api.js                  # Axios instance with base URL + auth interceptor
│   └── auth.js                 # Provider auth helpers (login, logout, token validation)
├── public/                     # Static assets
├── .env.local                  # ⛔ Local config (gitignored)
├── .env.example                # ✅ Safe template (committed)
└── .gitignore
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- `tinitracker-next` running on `http://localhost:3000`

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to point at your tinitracker-next backend
```

### 3. Start the dev server

```bash
npm run dev        # Starts on http://localhost:3001
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL of the `tinitracker-next` backend (e.g. `http://localhost:3000`) |
| `PORT` | Dev server port (default: `3001`) |

> Provider admin credentials are **not** defined here. They are managed server-side in `tinitracker-next` via `PROVIDER_ADMIN_EMAIL / PASSWORD` env vars.

---

## Authentication Flow

1. Admin enters credentials on `/login`
2. Request goes to `tinitracker-next` → `POST /api/provider/auth/login`
3. JWT returned and stored in `localStorage` as `provider_admin_token`
4. All subsequent API calls include `Authorization: Bearer <token>` header
5. On 401, the interceptor in `lib/api.js` clears the token and redirects to `/login`

---

## Pages

| Route | Description |
|---|---|
| `/login` | Provider admin authentication |
| `/dashboard` | Platform KPIs, revenue chart, recent activity |
| `/hospitals` | All registered hospitals (search, filter, create) |
| `/hospitals/[id]` | Hospital detail — subscription, settings, staff |
| `/subscriptions` | Active subscriptions + pending upgrade requests |
| `/admins` | Provider admin account management (create, edit, block) |
| `/users` | All users across all hospitals |
| `/payments` | Payment history and revenue breakdown |
| `/reports` | Export data as CSV (patients, users, payments) |
| `/announcements` | Broadcast messages to hospital feeds |
| `/logs` | Audit log viewer with filters |
| `/settings` | Platform-wide settings (branding, trial period, limits) |

---

## Security Notes

- **No secrets in this repo** — credentials and API keys live only in `tinitracker-next`
- All `console.error` calls log only `.message` strings — never raw Axios error objects (which expose auth headers)
- `.env.local` is gitignored; `.env.example` contains no sensitive values
- CORS is handled server-side in `tinitracker-next`
