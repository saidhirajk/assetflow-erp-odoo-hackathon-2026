# Sampada

**Enterprise Asset & Resource Management System** — Built for Odoo Hackathon 2026.

## Overview

Sampada is a full-stack ERP platform that helps organizations track, allocate, and maintain physical assets and shared resources. It replaces manual tracking (spreadsheets, paper logs) with structured asset lifecycles, centralized resource booking, role-based workflows, and real-time dashboards.

### Key Features

| Module | What it does |
|--------|-------------|
| **Dashboard** | Role-scoped KPI cards — assets available/allocated, open maintenance, active bookings, overdue returns |
| **Asset Registration** | Register assets with auto-generated tags (AF-0001), categories, serial numbers, condition tracking, QR codes |
| **Asset Allocation** | Allocate assets to employees/departments with conflict detection — blocked if already held; suggests transfer instead |
| **Transfers** | Request → Approve/Reject workflow with transactional allocation swap |
| **Resource Booking** | Time-slot booking for shared rooms/resources with server-side overlap validation |
| **Maintenance** | Raise → Approve → Assign Technician → In Progress → Resolved workflow; asset status auto-updates |
| **Audits** | Create audit cycles, assign auditors, mark assets Verified/Missing/Damaged, auto-generate discrepancy reports |
| **Reports** | Department allocation charts, category distribution, maintenance frequency, booking heatmap, nearing retirement — all role-scoped |
| **Notifications** | Real-time alerts for assignments, bookings, maintenance status, transfers, overdue returns, audit discrepancies |
| **Organization Setup** | Admin-only: manage departments, asset categories (with custom fields), employee directory with role promotion |

### Role-Based Access Control

| Role | Permissions |
|------|------------|
| **Admin** | Full access to everything — departments, categories, employee promotion, all operations |
| **Asset Manager** | Register/allocate assets, approve transfers & maintenance, manage audits |
| **Department Head** | View department assets, approve intra-department transfers, book resources |
| **Employee** | View own assets, book shared resources, raise maintenance requests, initiate returns/transfers |

> Signup always creates an Employee account. Only Admin can promote users to other roles via Organization → Employee Directory.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS, shadcn/ui, Recharts, TanStack Router + Query |
| Backend | FastAPI (Python 3.12+), Raw SQL, psycopg2 |
| Database | PostgreSQL 14+ |
| Auth | JWT (PBKDF2-SHA256 password hashing, no external auth libraries) |

## Project Structure

```
assetflow-erp-odoo-hackathon-2026/
├── backend/
│   ├── app/
│   │   ├── core/           # Auth, deps, security (JWT, password hashing)
│   │   ├── database/       # schema.sql, seed.sql, connection.py
│   │   └── modules/
│   │       ├── foundation/ # auth, departments, categories, users
│   │       └── operation/  # assets, allocations, transfers, bookings,
│   │                       # maintenance, audits, reports, notifications, dashboard
│   ├── .env
│   └── main.py
└── frontend/
    └── src/
        ├── components/     # UI components (shadcn/ui + app-sidebar, app-header)
        ├── hooks/          # useCurrentUser
        ├── lib/backend/    # API client + adapter layer
        └── routes/         # Page components (dashboard, assets, allocations, etc.)
```

## Prerequisites

- **Python 3.12+**
- **Node.js 22+** (Vite 8 requires Node 22)
- **PostgreSQL 14+**
- **npm** (recommended over bun for compatibility)

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/saidhirajk/assetflow-erp-odoo-hackathon-2026.git
cd assetflow-erp-odoo-hackathon-2026
```

### 2. Database setup

Create the database and run the schema + seed scripts. You can use pgAdmin, psql, or any PostgreSQL client.

```sql
-- Create database
CREATE DATABASE assetflow;

-- Run schema (creates all 13 tables)
\i backend/app/database/schema.sql

-- Run seed data (populates demo data)
\i backend/app/database/seed.sql
```

**Or via command line:**

```bash
psql -U postgres -c "CREATE DATABASE assetflow;"
psql -U postgres -d assetflow -f backend/app/database/schema.sql
psql -U postgres -d assetflow -f backend/app/database/seed.sql
```

> Update `DATABASE_USER` and `DATABASE_PASSWORD` in `backend/.env` to match your PostgreSQL credentials.

### 3. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Linux/Mac
# venv\Scripts\activate    # Windows

# Install dependencies
pip install fastapi uvicorn psycopg2-binary pydantic python-dotenv

# Update .env with your DB credentials
# DATABASE_USER=postgres
# DATABASE_PASSWORD=your_password

# Start the server
uvicorn app.main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**  
API docs at **http://localhost:8000/docs**

### 4. Frontend setup

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start dev server
npm run dev
```

Frontend runs at **http://localhost:8000** (Vite default port for this project).

> If the frontend can't connect, check `frontend/src/lib/backend/api-client.ts` — the `API_BASE_URL` should point to `http://localhost:8000/api/v1`.

## Seed Data / Test Accounts

All accounts use password: **`password123`**

| Name | Email | Role |
|------|-------|------|
| Rajesh Kumar | rajesh@assetflow.com | Admin |
| Dhiraj | dhiraj@assetflow.com | Admin |
| Priya Sharma | priya@assetflow.com | Asset Manager |
| Amit Patel | amit@assetflow.com | Department Head (Engineering) |
| Sneha Reddy | sneha@assetflow.com | Department Head (Operations) |
| Vikram Singh | vikram@assetflow.com | Employee (Engineering) |
| Ananya Iyer | ananya@assetflow.com | Employee (HR) |
| Karthik Nair | karthik@assetflow.com | Employee (Finance) |
| Deepa Menon | deepa@assetflow.com | Employee (Operations) |
| Ravi Teja | ravi@assetflow.com | Employee (Marketing) |
| Meera Joshi | meera@assetflow.com | Employee (IT Infrastructure) |

**Seed data includes:** 15 assets across 5 categories, 6 active + 2 returned allocations, 7 bookings, 4 maintenance requests, 2 transfer requests, 2 audit cycles, 18 notifications, 10 activity log entries.

## Database Schema (13 tables)

1. `departments` — Organization structure with head assignment
2. `users` — All accounts with role and department
3. `asset_categories` — Categories with configurable custom fields (JSON)
4. `assets` — Full asset registry with lifecycle statuses
5. `allocations` — Active and historical asset assignments
6. `transfers` — Transfer request/approve workflow
7. `bookings` — Time-slot resource reservations
8. `maintenance_requests` — Raise/approve/resolve maintenance workflow
9. `audit_cycles` — Audit cycle management
10. `audit_auditors` — Auditor assignments (junction table)
11. `audit_items` — Per-asset audit results (Verified/Missing/Damaged)
12. `notifications` — Role-scoped alerts
13. `activity_logs` — Full audit trail of all actions

## API Endpoints (30+)

| Prefix | Endpoints |
|--------|-----------|
| `/api/v1/auth` | signup, login, me |
| `/api/v1/departments` | CRUD, update |
| `/api/v1/categories` | CRUD with custom fields |
| `/api/v1/users` | directory, active, role update |
| `/api/v1/assets` | CRUD, search, history |
| `/api/v1/allocations` | create, return, conflict check |
| `/api/v1/transfers` | request, approve/reject |
| `/api/v1/bookings` | create, cancel, overlap validation |
| `/api/v1/maintenance` | raise, approve/reject, resolve |
| `/api/v1/audits` | create cycles, mark items, close |
| `/api/v1/reports` | department, category, status, maintenance, retirement, heatmap |
| `/api/v1/notifications` | list, unread count, mark read |
| `/api/v1/dashboard` | role-scoped KPI counts |

## Team

- **Backend Lead & Integration** — Dhiraj
- **Backend Developer** — 
- **Frontend Developer** — 
- **Frontend Developer** — 

## License

Built for Odoo Hackathon 2026.
