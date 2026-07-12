# AssetFlow — Complete Technical Specification
### Enterprise Asset & Resource Management System

This document covers: user roles, complete data model (entities/rows/columns), and for every screen — expected **frontend behavior** and expected **backend working/logic** — so that nothing is ambiguous during build or demo.

---

## PART 1 — USER ROLES (4 Roles)

| Role | Responsibilities |
|---|---|
| **Admin** | Sets up departments, categories, employee directory. Promotes employees to Department Head / Asset Manager. Views org-wide analytics and full activity logs. |
| **Asset Manager** | Registers and allocates assets. Approves transfers, maintenance requests, and audit discrepancies. Approves returns and condition check-ins. |
| **Department Head** | Views assets allocated to their department. Approves allocation/transfer requests within their department. Books shared resources on behalf of the department. |
| **Employee** | Views assets allocated to them. Books shared resources. Raises maintenance requests. Initiates return/transfer requests. |

**Critical rule:** Signup creates an Employee account only — there is no role selector at signup. Roles are elevated in exactly one place: Admin → Organization Setup → Employee Directory tab. No other screen, form, or API endpoint should be able to change a user's role. This is one of the most heavily tested rules in this kind of build, so both frontend (no role field anywhere else) and backend (role-update logic only reachable from that one flow, and only by an Admin session) must enforce it.

---

## PART 2 — COMPLETE DATA MODEL

### 2.1 `users`
| Column | Type | Notes |
|---|---|---|
| user_id | PK | |
| name | string | |
| email | string, unique | login identifier |
| password_hash | string | never store plain text |
| role | enum | Admin / Asset Manager / Department Head / Employee |
| department_id | FK → departments | nullable for Admin |
| status | enum | Active / Inactive |
| created_at | datetime | |

**Backend working:** Signup handler always inserts `role = 'Employee'` regardless of any client-sent value — role must be hardcoded server-side, not trusted from the request body. Login handler checks email + password hash match AND `status = 'Active'`; inactive accounts get a specific "account deactivated, contact admin" response rather than a generic login failure.

**Frontend working:** Signup form fields = Name, Email, Password, Confirm Password, Department dropdown. No role field exists on this form at all. Login form = Email + Password + "Forgot Password" link. Session token/cookie stored after successful login; every subsequent screen reads role from the session to decide what to render (nav items, buttons, data scope) — role should never be re-read from local/editable client state alone, always re-validated against the server session.

---

### 2.2 `departments`
| Column | Type | Notes |
|---|---|---|
| department_id | PK | |
| name | string | |
| code | string | short code, e.g. "ENG" |
| head_user_id | FK → users | nullable until assigned |
| parent_department_id | FK → departments (self-reference) | enables hierarchy |
| status | enum | Active / Inactive |

**Backend working:** `parent_department_id` is self-referencing, forming a tree. Deactivating a department is a soft update (`status = 'Inactive'`) — it must never hard-delete, because historical allocations/bookings/assets still reference it. Any dropdown elsewhere in the app that lists departments must filter `WHERE status = 'Active'`.

**Frontend working:** Rendered as an expandable tree/nested list (parent departments show child departments nested underneath). Add/Edit form: Name, Code, Head (dropdown of existing users), Parent Department (dropdown, optional), Status toggle.

---

### 2.3 `asset_categories`
| Column | Type | Notes |
|---|---|---|
| category_id | PK | |
| name | string | e.g. Electronics, Furniture, Vehicles |
| custom_fields | JSON | e.g. `{"warranty_months": "number"}` |
| status | enum | |

**Backend working:** `custom_fields` is a schema definition (field name + type), not actual data — actual values for a specific asset are stored on that asset record (or a linked `asset_custom_values` table if you want strict normalization). When the Asset Registration form loads a category, the backend returns this schema so the frontend knows which extra inputs to render.

**Frontend working:** Category list/table with an "Add Category" modal — Name field, then a repeatable "Add Custom Field" row (field name + type picker: text/number/date). When registering an asset later, selecting a category dynamically renders these extra fields on the form.

---

### 2.4 `assets`
| Column | Type | Notes |
|---|---|---|
| asset_id | PK | |
| asset_tag | string, unique, system-generated | e.g. AF-0001 |
| name | string | |
| category_id | FK | |
| serial_number | string | |
| qr_code | string | generated at registration |
| acquisition_date | date | |
| acquisition_cost | decimal | for reports/ranking only, never linked to accounting |
| condition | enum | New / Good / Fair / Poor |
| location | string | |
| department_id | FK | current owning department |
| status | enum | Available / Allocated / Reserved / Under Maintenance / Lost / Retired / Disposed |
| is_bookable | boolean | shared-resource flag |
| photo_url | string | |
| document_urls | JSON array | |
| current_holder_user_id | FK → users | nullable |

**Backend working:** `asset_tag` is generated server-side on insert (sequential counter with `AF-` prefix, zero-padded) — never accepted as user input, to guarantee uniqueness. The `status` column is the single source of truth for asset state; every other module (allocation, booking, maintenance, audit) only updates this same column rather than keeping a parallel status field, otherwise screens will show conflicting information. State transitions to enforce at the backend level (reject anything not on this list):
```
Available → Allocated
Available → Reserved
Available → Under Maintenance
Allocated → Available (on return)
Under Maintenance → Available (on resolution)
Available/Allocated → Lost (via audit closure)
Available → Retired
Retired → Disposed
```

**Frontend working:** Registration form (Asset Manager/Admin only) — Name, Category (dropdown, triggers custom fields), Serial Number, Acquisition Date, Acquisition Cost, Condition, Location, Photo upload, "Bookable" checkbox. On submit, the returned Asset Tag is shown immediately (read-only, system-generated). Directory screen is a searchable/filterable data grid — filter chips for Category, Status, Department, Location; a search box that matches Asset Tag, Serial Number, or scanned QR code. Clicking a row opens an Asset Detail page with two tabs: Allocation History and Maintenance History, each a simple reverse-chronological list.

---

### 2.5 `allocations`
| Column | Type | Notes |
|---|---|---|
| allocation_id | PK | |
| asset_id | FK | |
| allocated_to_user_id | FK | nullable |
| allocated_to_department_id | FK | nullable — exactly one of the two user/department fields is set per row |
| allocated_date | date | |
| expected_return_date | date | nullable |
| actual_return_date | date | nullable |
| return_condition_notes | text | filled at return time |
| status | enum | Active / Returned / Overdue |

**Backend working — conflict check (runs on every allocation attempt):**
```
SELECT * FROM allocations
WHERE asset_id = :asset_id AND status = 'Active'
```
- If a row is found → reject the allocation, return the current holder's name/department in the error response, and expose a "Transfer Request" action instead of a hard failure.
- If no row is found → insert new row (`status='Active'`), and in the same transaction update `assets.status = 'Allocated'` and `assets.current_holder_user_id`.

**Backend working — overdue detection:** a scheduled job (or a check computed on every dashboard/list read) flags rows where `expected_return_date < today AND status = 'Active'` by setting `status = 'Overdue'`. This feeds both the Dashboard's separate "Overdue" section and a row into `notifications`.

**Backend working — return flow:** sets `actual_return_date = today`, `status = 'Returned'`, saves `return_condition_notes`, and in the same transaction sets `assets.status = 'Available'` and clears `current_holder_user_id`.

**Frontend working:** "Allocate" action on an asset opens a form (select Employee or Department, optional Expected Return Date). On conflict, the form doesn't just show a red error — it shows an inline callout: "Currently held by Priya Sharma" with a "Request Transfer" button that pre-fills the transfer request form. Returns are handled from an "Active Allocations" list with a "Mark Returned" action that opens a small modal for condition notes.

---

### 2.6 `transfers`
| Column | Type | Notes |
|---|---|---|
| transfer_id | PK | |
| asset_id | FK | |
| from_user_id | FK | current holder |
| to_user_id | FK | requester |
| requested_by | FK | |
| status | enum | Requested / Approved / Rejected / Completed |
| approved_by | FK → users | |
| requested_at | datetime | |
| resolved_at | datetime | |

**Backend working:** Creating a transfer request only inserts a row with `status = 'Requested'` — it does not touch the asset or allocation tables yet. On Approve: the old `allocations` row is closed (`status='Returned'`, `actual_return_date=today`), a new `allocations` row is created for `to_user_id`, `assets.current_holder_user_id` updates, and `transfers.status = 'Completed'` — all inside one transaction so the asset is never left in an inconsistent state. On Reject: only `transfers.status = 'Rejected'` changes; nothing else moves.

**Frontend working:** Asset Manager / Department Head see a "Pending Transfers" queue (table with Asset, From, To, Requested Date, Approve/Reject buttons). Requesters see their own transfer requests with live status.

---

### 2.7 `bookings`
| Column | Type | Notes |
|---|---|---|
| booking_id | PK | |
| asset_id | FK, must be `is_bookable = true` | |
| booked_by_user_id | FK | |
| start_time | datetime | |
| end_time | datetime | |
| status | enum | Upcoming / Ongoing / Completed / Cancelled |
| created_at | datetime | |

**Backend working — overlap validation (the core rule of this screen):**
```
A new booking conflicts with an existing one IF:
   new.start_time < existing.end_time
   AND new.end_time > existing.start_time
   AND existing.status IN ('Upcoming', 'Ongoing')
```
Any existing row satisfying this blocks the new booking. A booking that starts exactly when another ends (e.g., 10:00–11:00 right after 9:00–10:00) does **not** conflict and must be allowed — this boundary case should have an explicit backend test.

**Backend working — status transitions:** computed either by a scheduled job or on-read: `now() between start_time and end_time` → Ongoing; `now() > end_time` → Completed. Cancelling sets `status='Cancelled'` and immediately frees the slot for re-booking.

**Frontend working:** Calendar/timeline view per resource, existing bookings rendered as blocked-out blocks. Booking form (Resource, Start, End) — on submit, if the backend rejects due to overlap, show the specific conflicting slot so the user can adjust rather than a generic error. "My Bookings" list with Cancel/Reschedule actions. A reminder notification is scheduled for some interval before `start_time` (e.g., 30 minutes prior).

---

### 2.8 `maintenance_requests`
| Column | Type | Notes |
|---|---|---|
| request_id | PK | |
| asset_id | FK | |
| raised_by_user_id | FK | |
| issue_description | text | |
| priority | enum | Low / Medium / High / Critical |
| photo_url | string | |
| status | enum | Pending / Approved / Rejected / Technician Assigned / In Progress / Resolved |
| approved_by | FK → users | |
| technician_name | string | |
| created_at | datetime | |
| resolved_at | datetime | |

**Backend working:** Insert always starts at `status = 'Pending'`. The single most important ordering rule in this module: `assets.status` only flips to `'Under Maintenance'` at the moment `status` becomes `'Approved'` — both updates happen in the same transaction, triggered by the Asset Manager's approve action, never earlier. On `status = 'Resolved'`, `assets.status` reverts to `'Available'` in the same transaction. Every status change should also write an `activity_logs` row and remain queryable as that asset's maintenance history.

**Frontend working:** "Raise Request" form available to whoever currently holds/uses the asset (Employee/Dept Head) — Asset (pre-filled if raised from asset detail page), Issue description, Priority dropdown, Photo upload. Asset Manager sees an Approval queue filtered to `status='Pending'`, with Approve/Reject actions; once approved, the same row moves into an "In Progress" board where Technician Name can be assigned and status advanced step by step to Resolved. Asset detail page's Maintenance History tab reads directly from this table.

---

### 2.9 `audit_cycles`
| Column | Type | Notes |
|---|---|---|
| audit_id | PK | |
| scope_department_id | FK | nullable |
| scope_location | string | nullable |
| start_date | date | |
| end_date | date | |
| status | enum | Draft / In Progress / Closed |
| auditor_user_ids | junction table `audit_auditors(audit_id, user_id)` | allows multiple auditors |

### 2.10 `audit_items`
| Column | Type | Notes |
|---|---|---|
| audit_item_id | PK | |
| audit_id | FK | |
| asset_id | FK | |
| marked_by_user_id | FK | |
| result | enum | Pending / Verified / Missing / Damaged |
| notes | text | |

**Backend working:** Creating an audit cycle auto-populates `audit_items` with one row per asset matching the scope (`department_id` or `location`), all starting at `result = 'Pending'`. Each auditor marks assets against their assigned cycle. The "Close Audit Cycle" action is the key business-rule moment:
1. Bulk-update every asset whose corresponding `audit_items.result = 'Missing'` to `assets.status = 'Lost'`.
2. Set `audit_cycles.status = 'Closed'` — after this, `audit_items` rows for this cycle become read-only (backend must reject further edits, not just hide the button).
3. Auto-generate a discrepancy report by querying `audit_items WHERE result IN ('Missing','Damaged') AND audit_id = X`.

**Frontend working:** "Create Audit Cycle" form (scope selector: Department OR Location, date range, multi-select Auditors). Assigned auditors see a checklist screen (asset list with Verified/Missing/Damaged radio buttons + notes field per row). Admin/Asset Manager see a "Close Cycle" button which, before confirming, shows a summary count of Missing/Damaged items about to be actioned. After closing, the cycle appears in a read-only Audit History list with the generated discrepancy report attached.

---

### 2.11 `notifications`
| Column | Type | Notes |
|---|---|---|
| notification_id | PK | |
| user_id | FK | recipient |
| type | enum | AssetAssigned / MaintenanceApproved / MaintenanceRejected / BookingConfirmed / BookingCancelled / BookingReminder / TransferApproved / OverdueReturn / AuditDiscrepancy |
| message | text | |
| reference_id | string | id of the related record, used for the click-through link |
| is_read | boolean | |
| created_at | datetime | |

**Backend working:** Every state-changing event described above (allocation success, transfer approval, booking confirmation/cancellation/reminder, overdue detection, audit discrepancy flag, maintenance approval/rejection) inserts one row here for the relevant user(s) — this should be a side effect fired from within the same transaction/handler that changes the underlying record, not a separate manual step.

**Frontend working:** Bell icon in the top nav with an unread-count badge (`COUNT WHERE is_read=false AND user_id=current_user`). Clicking a notification marks it read and navigates to the related record (asset detail, booking, transfer, etc.).

---

### 2.12 `activity_logs`
| Column | Type | Notes |
|---|---|---|
| log_id | PK | |
| user_id | FK | actor |
| action | string | human-readable, e.g. "Allocated Asset AF-0114 to Priya Sharma" |
| entity_type | string | Asset / Booking / Maintenance / Transfer / Audit / Department / etc. |
| entity_id | reference id | |
| timestamp | datetime | |

**Backend working:** Every write operation across every module appends exactly one row here. This is distinct from `audit_cycles`/`audit_items` (which represent physical verification of assets) — this table is the software's own compliance/action trail, and should never be user-editable or deletable.

**Frontend working:** A filterable table (by user, date range, entity type) — full visibility for Admin, department-scoped for Department Head. This is typically the last screen built but is one of the easiest ways to visibly demonstrate "proper ERP" behavior in a demo, since every other action in the system feeds it automatically.

---

## PART 3 — SCREEN-BY-SCREEN FRONTEND + BACKEND WORKING

### 3.1 Login / Signup
**Frontend:** Two tabs or two routes — Login and Signup. Signup: Name, Email, Password, Confirm Password, Department dropdown, Submit. No role field. Login: Email, Password, "Forgot Password" link, Submit. Session persisted (token/cookie); logged-in state drives which nav items render.
**Backend:** Signup endpoint hardcodes `role='Employee'` server-side. Login endpoint validates credentials + active status, issues session token. Forgot-password endpoint issues a time-limited reset token via email and accepts a new password against that token.

### 3.2 Dashboard
**Frontend:** KPI cards row (Assets Available, Allocated, Maintenance Today, Active Bookings, Pending Transfers, Upcoming Returns), a visually distinct "Overdue" panel (different color/border), and three quick-action buttons (Register Asset, Book Resource, Raise Maintenance Request) — buttons conditionally rendered based on role (e.g., "Register Asset" hidden for plain Employees).
**Backend:** Each KPI is a scoped count/aggregate query:
- Admin/Asset Manager: organization-wide scope.
- Department Head: `WHERE department_id = own_department`.
- Employee: personal scope (own allocations, own bookings, own raised requests) rather than org-wide counts.
Overdue panel queries `allocations.status='Overdue'` and `bookings` past due, scoped the same way.

### 3.3 Organization Setup (Admin only)
**Frontend:** Three tabs. Tab A (Departments): tree/list view + Add/Edit modal. Tab B (Categories): table + Add Category modal with dynamic custom-field builder. Tab C (Employee Directory): table with a per-row Actions dropdown containing "Promote to Department Head," "Promote to Asset Manager," "Revert to Employee," "Deactivate." This entire screen is hidden from the navigation for non-Admin roles, and its routes must also reject non-Admin sessions at the backend (not just hide the link).
**Backend:** Standard CRUD for departments/categories with soft-delete via `status`. The Employee Directory's role-change action is the only backend endpoint permitted to update `users.role`, and it should itself verify the calling session is Admin before executing.

### 3.4 Asset Registration & Directory
**Frontend:** "Register Asset" button (Asset Manager/Admin only) opens a form with dynamic custom fields based on selected category. Directory is a filterable/searchable grid. Asset Detail page has Allocation History and Maintenance History tabs.
**Backend:** Registration endpoint generates `asset_tag` and `qr_code` server-side, sets `status='Available'`. Search/filter endpoint supports combined filters (tag, serial, QR, category, status, department, location) via query parameters. History tabs are simple filtered reads on `allocations` and `maintenance_requests` by `asset_id`.

### 3.5 Asset Allocation & Transfer
**Frontend:** Allocate action with conflict callout + Transfer Request button as described in 2.5. Pending Transfers queue for approvers. Return action with condition-notes modal.
**Backend:** Conflict-check query before every allocation insert; transactional allocate/return/transfer-approve logic as described in 2.5–2.6.

### 3.6 Resource Booking
**Frontend:** Calendar view per resource, booking form, My Bookings list with Cancel/Reschedule.
**Backend:** Overlap-validation query on every booking attempt (2.7); scheduled/on-read status transitions; reminder scheduling.

### 3.7 Maintenance Management
**Frontend:** Raise Request form; Approval queue; In-Progress board with technician assignment; Maintenance History views.
**Backend:** Transactional status + asset-status updates as described in 2.8, with the approval-before-status-flip ordering strictly enforced.

### 3.8 Asset Audit
**Frontend:** Create Audit Cycle form; Auditor checklist screen; Close Cycle confirmation with discrepancy summary; read-only Audit History after closure.
**Backend:** Auto-population of `audit_items` on cycle creation; bulk status updates and lock-on-close logic as described in 2.9–2.10.

### 3.9 Reports & Analytics
**Frontend:** A set of report views/charts (utilization trend, maintenance frequency, nearing-retirement list, department-wise allocation summary, booking heatmap), each with an Export button (CSV/PDF).
**Backend:** Each report is an aggregate query:
| Report | Query logic |
|---|---|
| Utilization trends | allocation count / booking hours per asset over a time window |
| Maintenance frequency | `COUNT(maintenance_requests) GROUP BY asset_id or category_id` |
| Nearing retirement | assets where `acquisition_date` exceeds a category-defined age threshold |
| Department-wise allocation summary | `GROUP BY department_id` over active allocations |
| Booking heatmap | `bookings GROUP BY hour_of_day, day_of_week` |

### 3.10 Activity Logs & Notifications
**Frontend:** Notification bell with unread badge and click-through; a separate Activity Logs table (Admin full view, Department Head scoped view) with filters.
**Backend:** Notification rows inserted as side effects of state changes (2.11); activity log rows inserted on every write operation (2.12).

---

## PART 4 — MASTER LIST OF BUSINESS RULES (must all be enforced server-side, not just hidden in the UI)

1. Signup always creates `role='Employee'`; no client input can set a different role.
2. Role changes happen only through Admin → Employee Directory, and only an Admin session can call that endpoint.
3. An asset already in an Active allocation cannot be allocated again — the attempt must be blocked and a Transfer Request offered instead.
4. Booking overlap check must correctly allow back-to-back bookings (end-time = start-time is not a conflict) while blocking any true overlap.
5. `assets.status` becomes `'Under Maintenance'` only at approval, never at the moment the request is raised.
6. Closing an audit cycle must (a) bulk-update only confirmed-Missing items to `Lost`, (b) lock the cycle from further edits, (c) generate the discrepancy report — all three, not just one.
7. Overdue allocations/bookings must be computed and surfaced as a visually separate section, not blended into normal "upcoming" lists.
8. Every write across every module produces exactly one `activity_logs` row.
9. Department/category/user deactivation is always a soft update (`status` field), never a hard delete, since historical records reference these rows.
10. All list/report data must be scoped by role (Admin/Asset Manager = org-wide, Department Head = own department, Employee = own records) at the query level, not filtered only in the frontend.
11. Current backend note: Supabase is only a temporary development backend. All data access must stay behind a thin repository/service/API layer so the app can later switch to a real backend without changing UI screens, routes, or business rules. Do not spread Supabase calls directly through components; keep the code backend-agnostic and preserve the same request/response shapes where possible.

For the practical migration playbook, see [supabase-to-real-backend-migration.md](supabase-to-real-backend-migration.md).
For the stable implementation companion, see [project-stability-guide.md](project-stability-guide.md).

---

## PART 5 — SUGGESTED BUILD ORDER

1. Auth (signup/login) + `users` + `departments` tables
2. Organization Setup screen (depends on 1)
3. Asset Categories + Asset Registration & Directory
4. Allocation & Transfer (depends on 3)
5. Resource Booking (depends on 3)
6. Maintenance Management (depends on 3)
7. Asset Audit (depends on 3, 4)
8. Notifications + Activity Logs (wired into all of the above as they're built)
9. Dashboard (aggregates from everything above — build last so real data exists to show)
10. Reports & Analytics (same reasoning — build last)

---

*End of specification.*
