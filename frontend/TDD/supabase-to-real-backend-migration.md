# Supabase To Real Backend Migration Guide

## Purpose
This guide is for future AI agents and developers who will replace Supabase with a real backend later.

The goal is simple:
- keep the UI stable,
- keep business rules unchanged,
- keep backend access in one place,
- and make the swap as close to a drop-in replacement as possible.

## Core Rule
Do not let React components, routes, or UI hooks talk directly to the backend.

All backend access should go through one small UI-facing layer only:
- `src/lib/backend/app-backend.ts`

If the real backend arrives later, update that layer first. Avoid changing screens unless the API contract itself changes.

## Simplicity Rule
Keep the migration flat and boring.

- use one backend entry file, not many
- keep helper names stable if possible
- keep return shapes plain and small
- do not add new abstractions unless they remove real duplication
- do not move business rules into the UI

## Target Shape
The app should behave as if it talks to a backend-agnostic service layer, not Supabase.

Recommended flow:
1. UI calls app backend helpers.
2. App backend helpers call the actual transport.
3. Transport can be Supabase today, REST/GraphQL tomorrow.

Do not add extra abstraction layers unless they remove duplication.

## What Must Stay Stable
These should keep the same meaning across backend swaps:
- login and signup flow
- current user lookup
- role resolution
- dashboard counts
- notifications list and mark-read actions
- department list for signup
- auth session lifecycle

If possible, keep these response shapes stable too:
- `getAuthSession()` returns `session | null`
- `getAuthUser()` returns `user | null`
- `listActiveDepartments()` returns `Array<{ id: string; name: string }>`
- `countUnreadNotifications()` returns `number`
- `listNotifications()` returns `Array<NotificationRow>`
- `getDashboardOverviewCounts()` returns a plain object with count fields

## Migration Strategy
Use this order:

1. Keep the UI untouched.
2. Keep `app-backend.ts` as the only place that knows the transport.
3. Replace Supabase calls inside `app-backend.ts` with calls to the real backend.
4. Preserve the same helper names if possible.
5. Preserve the same return shapes if possible.
6. Only change UI code if the real backend cannot match a stable contract.

## Minimal Contract To Implement
The real backend should support the same app-level operations:

- `getAuthSession`
- `getAuthUser`
- `onAuthStateChange`
- `signInWithPassword`
- `signUpWithPassword`
- `signOut`
- `listActiveDepartments`
- `countUnreadNotifications`
- `listNotifications`
- `markAllNotificationsRead`
- `markNotificationRead`
- `getDashboardOverviewCounts`
- `getCurrentUserSnapshot`

If the real backend has different endpoint names, map them inside `app-backend.ts` instead of changing consumers.

## Real Backend Expectations
When the backend is replaced, it should provide:

- auth endpoints or session handling
- a user profile endpoint
- a role resolution source
- a departments list endpoint
- a notifications endpoint
- a dashboard summary endpoint

Keep auth, data reads, and mutations separate if possible.

## What AI Agents Should Change First
When integrating the real backend, do this first:

1. Replace the internals of `src/lib/backend/app-backend.ts`.
2. Verify auth and route guards still work.
3. Verify dashboard and notifications still load.
4. Verify signup still creates an Employee by default.
5. Verify role handling still follows the TDD rules.

## What AI Agents Should Not Do
Avoid these unless absolutely necessary:

- do not scatter backend calls back into components
- do not create a new backend layer for every screen
- do not duplicate business logic in the UI
- do not rename stable helper functions just for style
- do not make the contract more complicated than needed

## Acceptance Checklist
The migration is acceptable only if:

- the app still runs with no UI changes required
- the auth route still works
- authenticated routes still gate access correctly
- dashboard counts still render
- notifications still render and can be marked read
- signup still creates Employee accounts by default
- role elevation remains restricted to the Admin flow defined in the TDD

## If The Backend Cannot Match Supabase Exactly
If the new backend cannot match a Supabase behavior 1:1, prefer this order:

1. keep the app-level contract stable
2. adapt inside `app-backend.ts`
3. change the UI only as a last resort

That keeps future maintenance low and reduces accidental regressions.
