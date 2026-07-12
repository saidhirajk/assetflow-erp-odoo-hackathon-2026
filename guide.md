# AssetFlow Guide

This document is a simple current-state guide for the app. It explains what is already working, who can do what, and what is still pending.

## 1. App Overview

AssetFlow is an ERP-style asset and resource management app.
It currently has:
- authentication and protected app shell
- dashboard summary
- organization setup
- asset directory, registration, detail view, and inline edit
- stable backend adapter layer

The app is being built in phases.

## 2. Current Build Phases

### Phase 1 - Foundation
Done:
- auth flow
- authenticated layout
- sidebar/header shell
- dashboard KPI counts
- notification shell

### Phase 2 - Org Setup + Assets
Mostly done:
- department setup
- asset categories with custom fields
- employee directory and role promotion
- asset directory
- asset registration
- asset detail in the assets page
- asset edit flow

Still polishing:
- nested department tree UI
- separate asset detail route
- cleaner asset custom-field edit UX
- stricter admin validation

### Phase 3 - Operations
Pending / next major work:
- allocations
- transfers
- bookings
- maintenance requests

### Phase 4 - Audit + Reports
Pending:
- audit cycles
- audit items
- discrepancy reports
- analytics and logs

## 3. Roles

There are 4 roles in the system:
- Admin
- Asset Manager
- Department Head
- Employee

## 4. Who Can Do What

### Admin
Admin is the main setup role.
Admin can:
- open Organization Setup
- create and manage departments
- define asset categories and custom fields
- promote employees to Asset Manager or Department Head
- revert roles back to Employee
- view dashboard overview
- access operational pages that are available in the app shell

### Asset Manager
Asset Manager is the main asset operations role.
Asset Manager can:
- register assets
- view the asset directory
- open asset details
- edit asset information
- work with future operations like allocations, transfers, and maintenance when those phases are finished

### Department Head
Department Head can:
- view dashboard counts
- review transfers once phase 3 is built out
- work with department-scoped operations as they are added
- view assets and operational data relevant to their department

### Employee
Employee is the default signup role.
Employee can:
- log in and use the app shell
- view dashboard summary
- request bookings and maintenance later in phase 3
- use normal operational screens as they are added

## 5. What Exists Right Now

### Dashboard
The dashboard currently shows:
- available assets
- allocated assets
- assets under maintenance
- active bookings
- pending transfers
- overdue allocations

It also has quick action buttons like:
- Register asset
- Book resource
- Raise maintenance
- Review transfers

### Organization Setup
This is an admin-only workspace.
It currently supports:
- department create and update
- department active/inactive toggle
- asset category create and update
- custom field schema for categories
- employee directory
- role promotion and revert flow

### Assets
The asset area currently supports:
- searchable directory
- filters by status and category
- registration form
- category-driven custom fields
- asset detail panel
- allocation history tab
- maintenance history tab
- inline edit form

## 6. What Is Still Missing

These are the main gaps:
- department tree should render as a true nested hierarchy
- asset detail should have its own dedicated route
- asset edit needs better custom-field prefilling and cleaner UX
- admin validation should be stricter on the backend side
- repo-wide formatting noise should be cleaned
- phase 3 modules are not implemented yet

## 7. Important Rules

Keep these rules stable:
- signup creates Employee only
- role changes happen only from Admin -> Organization Setup -> Employee Directory
- keep backend access behind the adapter layer
- avoid direct backend calls from random UI components
- keep response shapes simple and stable

## 8. Practical Summary

If you ask "what can the app do right now?", the short answer is:
- Admin can set up org data and promote employees
- Asset Manager can register and manage assets
- Dashboard already shows useful counts
- Asset directory and detail are working inside the assets page
- Phase 3 operational workflows are the next big missing piece

If you ask "what is left?", the short answer is:
- polish organization tree
- separate asset detail route
- build allocations, transfers, bookings, maintenance
- then audit and reports
