# AssetFlow — Build Plan

- This is a very large enterprise spec (12 tables, 4 roles, 10 screen modules, dashboards, reports, audit cycles, notifications, activity logs). Building all of it end-to-end in one shot would produce thousands of lines and be error-prone. I'll build it in phases, each phase shippable and testable.

## Stack

- Lovable Cloud (Supabase) — Postgres + Auth + RLS
- TanStack Start + React + Tailwind + shadcn (existing template)
- Roles stored in separate `user_roles` table (security best practice)
- Every table gets RLS + role-scoped policies

## Phase 1 — Foundation (this turn)

1. Enable Lovable Cloud
2. Design system (dark professional ERP look — deep slate + accent, Inter/Geist)
3. DB migration for **all 12 tables** with enums, FKs, indexes, RLS, GRANTs, `has_role` function, auto-employee-on-signup trigger, asset-tag sequence
4. Auth screens (signup → Employee only, login, session)
5. App shell: sidebar nav (role-aware), topbar with notification bell, protected `_authenticated` layout
6. Dashboard scaffold (real KPIs where data exists)

## Phase 2 — Org Setup + Assets

- Departments (tree), Categories (custom fields), Employee Directory (role promotion — only place)
- Asset Registration + Directory + Detail page

## Phase 3 — Operations

- Allocation + Transfer (conflict check, transactional)
- Bookings (overlap check, back-to-back allowed)
- Maintenance (approval flips asset status)

## Phase 4 — Audit + Reports

- Audit cycles + items + close-cycle logic
- Reports/analytics with charts
- Activity logs viewer

## Cross-cutting (wired throughout)

- Notifications inserted on every state change
- Activity log rows on every write (via Postgres triggers where possible)
- All 10 master business rules enforced in SQL/RLS, not just UI

## What I'm doing NOW

Phase 2 has started, but in small safe slices.

Current execution order:
1. Keep the backend adapter as the only transport layer.
2. Finish the Organization Setup screen contract.
3. Build the Assets directory first as a read-only master-data view.
4. Add asset registration and detail views after the directory is stable.
5. Keep all future backend changes behind `src/lib/backend/app-backend.ts` so Supabase can be swapped later without UI churn.

Sound good? If yes I'll start Phase 1 immediately.