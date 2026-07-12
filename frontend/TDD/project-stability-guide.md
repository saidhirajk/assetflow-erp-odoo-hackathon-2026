# Project Stability Guide

## Purpose
This file exists so future implementation work stays stable.

Use it when adding features, fixing bugs, or extending the local FastAPI backend.

The goal is to avoid breaking the current flow while still keeping the code easy to change later.

## Project Shape
This is a React + TanStack Router app with a backend adapter layer.

Important current files:
- `src/lib/backend/app-backend.ts` is the main FastAPI-facing adapter used by the UI.
- `src/routes/auth.tsx` handles login/signup.
- `src/routes/_authenticated/route.tsx` protects authenticated routes.
- `src/routes/_authenticated/dashboard.tsx` shows summary counts.
- `src/routes/_authenticated/notifications.tsx` shows notifications.
- `src/hooks/use-current-user.ts` resolves current user and role.

## Stability Rules
Keep these rules intact during implementation:

1. Keep the UI flow simple and consistent.
2. Do not move business logic into random components.
3. Do not add new abstraction layers unless they remove real duplication.
4. Do not change helper names unless absolutely necessary.
5. Do not change route behavior unless the feature truly requires it.
6. Keep backend access behind `src/lib/backend/app-backend.ts`.
7. Keep response shapes plain and predictable.
8. Keep all HTTP transport details inside the adapter layer.

## Current Non-Breakable Flows
These flows should remain stable unless explicitly changing the feature:

- auth session check on app load
- login and signup
- authenticated route guard
- current user lookup and role resolution
- dashboard summary counts
- notification list and mark-read actions
- department list for signup form

## Data And Logic Rules
The app already relies on these rules:

- signup creates Employee accounts by default
- role changes are admin-only through the organization setup flow
- allocations, bookings, maintenance, and audits follow server-side business rules
- dashboard and notifications should read from backend helpers, not direct component fetches
- backend changes should happen in the adapter, not in the UI

## Implementation Order
When making changes, follow this order:

1. Check whether the change touches UI, state, or backend behavior.
2. If backend behavior changes, update the adapter first.
3. Keep route and component code small.
4. Validate the affected file slice before moving wider.
5. If something can be kept as-is, keep it as-is.

## What To Avoid
Avoid these patterns because they make future backend integration harder:

- direct HTTP calls in new components
- duplicated API logic across routes
- deeply nested service layers
- custom wrappers around tiny one-line operations
- changing data shape per screen

## Backend Integration Safety Check
Before considering the project ready for a demo, confirm:

- auth still works
- authenticated routes still redirect correctly
- dashboard still renders counts
- notifications still render and update read state
- current user role still resolves correctly
- the adapter file is still the only place that needs transport changes

## Practical Rule For Future AI
If a future AI is unsure what to change, it should prefer this path:

1. update `src/lib/backend/app-backend.ts`
2. keep the UI contract stable
3. avoid adding new architecture unless the current one is failing

That keeps the project stable and makes the backend swap easier.
