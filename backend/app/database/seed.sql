-- ===========================================
-- Seed Data
-- ===========================================

-- Departments

INSERT INTO departments (name, code)
VALUES
('Engineering', 'ENG'),
('Human Resources', 'HR'),
('Finance', 'FIN'),
('Operations', 'OPS');

-- Users

INSERT INTO users (name, email, password_hash, role, department_id)
VALUES
('Amina Shah', 'admin@assetflow.local', 'hash-admin-001', 'Admin', NULL),
('Ethan Cole', 'ethan.cole@assetflow.local', 'hash-eng-head-001', 'Department Head', (SELECT department_id FROM departments WHERE code = 'ENG')),
('Nora Patel', 'nora.patel@assetflow.local', 'hash-hr-head-001', 'Department Head', (SELECT department_id FROM departments WHERE code = 'HR')),
('Victor Lee', 'victor.lee@assetflow.local', 'hash-fin-head-001', 'Department Head', (SELECT department_id FROM departments WHERE code = 'FIN')),
('Priya Nair', 'priya.nair@assetflow.local', 'hash-ops-head-001', 'Department Head', (SELECT department_id FROM departments WHERE code = 'OPS')),
('Sam Reed', 'sam.reed@assetflow.local', 'hash-employee-001', 'Employee', (SELECT department_id FROM departments WHERE code = 'ENG')),
('Mia Grant', 'mia.grant@assetflow.local', 'hash-manager-001', 'Asset Manager', NULL);

UPDATE departments
SET head_user_id = (SELECT user_id FROM users WHERE email = 'ethan.cole@assetflow.local')
WHERE code = 'ENG';

UPDATE departments
SET head_user_id = (SELECT user_id FROM users WHERE email = 'nora.patel@assetflow.local')
WHERE code = 'HR';

UPDATE departments
SET head_user_id = (SELECT user_id FROM users WHERE email = 'victor.lee@assetflow.local')
WHERE code = 'FIN';

UPDATE departments
SET head_user_id = (SELECT user_id FROM users WHERE email = 'priya.nair@assetflow.local')
WHERE code = 'OPS';

-- Asset Categories

INSERT INTO asset_categories (name)
VALUES
('Electronics'),
('Furniture'),
('Vehicles'),
('Meeting Rooms');

-- Assets

INSERT INTO assets (
	asset_tag,
	name,
	category_id,
	serial_number,
	qr_code,
	acquisition_date,
	acquisition_cost,
	condition,
	location,
	department_id,
	status,
	is_bookable,
	photo_url,
	document_urls,
	current_holder_user_id
)
VALUES
(
	'AF-0001',
	'MacBook Pro 14',
	(SELECT category_id FROM asset_categories WHERE name = 'Electronics'),
	'MBP14-2026-001',
	'QR-AF-0001',
	'2026-01-10',
	189900.00,
	'Good',
	'HQ - IT Store',
	(SELECT department_id FROM departments WHERE code = 'ENG'),
	'Available',
	TRUE,
	'https://assets.example.com/photos/af-0001.jpg',
	'["https://assets.example.com/docs/af-0001-invoice.pdf"]'::json,
	(SELECT user_id FROM users WHERE email = 'sam.reed@assetflow.local')
),
(
	'AF-0002',
	'Conference Table',
	(SELECT category_id FROM asset_categories WHERE name = 'Furniture'),
	'FURN-2026-014',
	'QR-AF-0002',
	'2025-11-18',
	45000.00,
	'Fair',
	'HQ - Meeting Room B',
	(SELECT department_id FROM departments WHERE code = 'OPS'),
	'Allocated',
	TRUE,
	'https://assets.example.com/photos/af-0002.jpg',
	'["https://assets.example.com/docs/af-0002-warranty.pdf"]'::json,
	(SELECT user_id FROM users WHERE email = 'priya.nair@assetflow.local')
),
(
	'AF-0003',
	'Delivery Van',
	(SELECT category_id FROM asset_categories WHERE name = 'Vehicles'),
	'VIN-DEL-2026-7788',
	'QR-AF-0003',
	'2024-08-05',
	1450000.00,
	'Good',
	'Yard - Fleet Parking',
	(SELECT department_id FROM departments WHERE code = 'FIN'),
	'Reserved',
	FALSE,
	'https://assets.example.com/photos/af-0003.jpg',
	'["https://assets.example.com/docs/af-0003-registration.pdf"]'::json,
	(SELECT user_id FROM users WHERE email = 'victor.lee@assetflow.local')
),
(
	'AF-0004',
	'Projector - Room 1',
	(SELECT category_id FROM asset_categories WHERE name = 'Electronics'),
	'PRJ-2025-089',
	'QR-AF-0004',
	'2025-03-22',
	78000.00,
	'Poor',
	'HQ - Meeting Room A',
	(SELECT department_id FROM departments WHERE code = 'HR'),
	'Under Maintenance',
	TRUE,
	'https://assets.example.com/photos/af-0004.jpg',
	'["https://assets.example.com/docs/af-0004-service-report.pdf"]'::json,
	(SELECT user_id FROM users WHERE email = 'nora.patel@assetflow.local')
);

-- Allocations

INSERT INTO allocations (
	asset_id,
	allocated_to_user_id,
	allocated_to_department_id,
	allocated_date,
	expected_return_date,
	actual_return_date,
	return_condition_notes,
	status
)
VALUES
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0001'),
	NULL,
	(SELECT department_id FROM departments WHERE code = 'ENG'),
	'2026-01-12',
	'2026-07-31',
	NULL,
	NULL,
	'Active'
),
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0002'),
	NULL,
	(SELECT department_id FROM departments WHERE code = 'OPS'),
	'2026-02-01',
	'2026-08-01',
	NULL,
	NULL,
	'Active'
),
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0003'),
	NULL,
	(SELECT department_id FROM departments WHERE code = 'FIN'),
	'2026-03-15',
	'2026-06-30',
	NULL,
	NULL,
	'Overdue'
),
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0004'),
	NULL,
	(SELECT department_id FROM departments WHERE code = 'HR'),
	'2026-04-01',
	'2026-04-10',
	'2026-04-09',
	'Returned with worn power cable; logged for replacement.',
	'Returned'
);

-- Transfers

INSERT INTO transfers (
	asset_id,
	from_user_id,
	to_user_id,
	requested_by,
	status,
	approved_by,
	requested_at,
	resolved_at
)
VALUES
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0001'),
	(SELECT user_id FROM users WHERE email = 'sam.reed@assetflow.local'),
	(SELECT user_id FROM users WHERE email = 'priya.nair@assetflow.local'),
	(SELECT user_id FROM users WHERE email = 'sam.reed@assetflow.local'),
	'Requested',
	NULL,
	'2026-07-01 09:30:00',
	NULL
),
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0001'),
	(SELECT user_id FROM users WHERE email = 'sam.reed@assetflow.local'),
	(SELECT user_id FROM users WHERE email = 'ethan.cole@assetflow.local'),
	(SELECT user_id FROM users WHERE email = 'ethan.cole@assetflow.local'),
	'Approved',
	(SELECT user_id FROM users WHERE email = 'admin@assetflow.local'),
	'2026-06-21 11:00:00',
	NULL
),
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0003'),
	(SELECT user_id FROM users WHERE email = 'victor.lee@assetflow.local'),
	(SELECT user_id FROM users WHERE email = 'sam.reed@assetflow.local'),
	(SELECT user_id FROM users WHERE email = 'victor.lee@assetflow.local'),
	'Rejected',
	(SELECT user_id FROM users WHERE email = 'admin@assetflow.local'),
	'2026-05-10 14:15:00',
	'2026-05-10 15:00:00'
),
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0004'),
	(SELECT user_id FROM users WHERE email = 'nora.patel@assetflow.local'),
	(SELECT user_id FROM users WHERE email = 'ethan.cole@assetflow.local'),
	(SELECT user_id FROM users WHERE email = 'nora.patel@assetflow.local'),
	'Completed',
	(SELECT user_id FROM users WHERE email = 'admin@assetflow.local'),
	'2026-04-09 10:00:00',
	'2026-04-10 16:30:00'
);

-- Bookings

INSERT INTO bookings (
	asset_id,
	booked_by_user_id,
	start_time,
	end_time,
	status,
	created_at
)
VALUES
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0001'),
	(SELECT user_id FROM users WHERE email = 'sam.reed@assetflow.local'),
	'2026-07-15 09:00:00',
	'2026-07-15 18:00:00',
	'Upcoming',
	'2026-07-01 08:00:00'
),
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0002'),
	(SELECT user_id FROM users WHERE email = 'priya.nair@assetflow.local'),
	'2026-07-12 10:00:00',
	'2026-07-12 12:00:00',
	'Ongoing',
	'2026-07-12 09:30:00'
),
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0004'),
	(SELECT user_id FROM users WHERE email = 'nora.patel@assetflow.local'),
	'2026-06-20 14:00:00',
	'2026-06-20 16:00:00',
	'Completed',
	'2026-06-18 12:00:00'
),
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0001'),
	(SELECT user_id FROM users WHERE email = 'admin@assetflow.local'),
	'2026-07-20 13:00:00',
	'2026-07-20 15:00:00',
	'Cancelled',
	'2026-07-10 15:45:00'
);

-- Maintenance Requests

INSERT INTO maintenance_requests (
	asset_id,
	raised_by_user_id,
	issue_description,
	priority,
	photo_url,
	status,
	approved_by,
	technician_name,
	created_at,
	resolved_at
)
VALUES
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0004'),
	(SELECT user_id FROM users WHERE email = 'nora.patel@assetflow.local'),
	'Projector power supply intermittently cuts out during presentations.',
	'High',
	'https://assets.example.com/maintenance/af-0004-1.jpg',
	'Pending',
	NULL,
	NULL,
	'2026-07-02 09:15:00',
	NULL
),
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0003'),
	(SELECT user_id FROM users WHERE email = 'victor.lee@assetflow.local'),
	'Van requires brake inspection before next fleet assignment.',
	'Critical',
	'https://assets.example.com/maintenance/af-0003-1.jpg',
	'Approved',
	(SELECT user_id FROM users WHERE email = 'admin@assetflow.local'),
	NULL,
	'2026-07-03 10:00:00',
	NULL
),
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0002'),
	(SELECT user_id FROM users WHERE email = 'sam.reed@assetflow.local'),
	'Surface scratches need refinishing before customer demo.',
	'Medium',
	'https://assets.example.com/maintenance/af-0002-1.jpg',
	'Rejected',
	(SELECT user_id FROM users WHERE email = 'admin@assetflow.local'),
	NULL,
	'2026-07-04 11:30:00',
	NULL
),
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0001'),
	(SELECT user_id FROM users WHERE email = 'sam.reed@assetflow.local'),
	'Charger port is loose and needs replacement.',
	'Low',
	'https://assets.example.com/maintenance/af-0001-1.jpg',
	'Technician Assigned',
	(SELECT user_id FROM users WHERE email = 'admin@assetflow.local'),
	'Max Turner',
	'2026-07-05 08:45:00',
	NULL
),
(
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0004'),
	(SELECT user_id FROM users WHERE email = 'nora.patel@assetflow.local'),
	'Lamp replacement completed after cable inspection.',
	'Low',
	'https://assets.example.com/maintenance/af-0004-2.jpg',
	'Resolved',
	(SELECT user_id FROM users WHERE email = 'admin@assetflow.local'),
	'Max Turner',
	'2026-06-28 14:00:00',
	'2026-06-30 17:15:00'
);

-- Audit Cycles

INSERT INTO audit_cycles (
	scope_department_id,
	scope_location,
	start_date,
	end_date,
	status
)
VALUES
(
	(SELECT department_id FROM departments WHERE code = 'ENG'),
	'HQ - Engineering Wing',
	'2026-07-01',
	'2026-07-05',
	'In Progress'
),
(
	NULL,
	'HQ - Main Building',
	'2026-06-10',
	'2026-06-20',
	'Closed'
);

-- Audit Auditors

INSERT INTO audit_auditors (audit_id, user_id)
VALUES
(
	(SELECT audit_id FROM audit_cycles WHERE scope_location = 'HQ - Engineering Wing'),
	(SELECT user_id FROM users WHERE email = 'admin@assetflow.local')
),
(
	(SELECT audit_id FROM audit_cycles WHERE scope_location = 'HQ - Engineering Wing'),
	(SELECT user_id FROM users WHERE email = 'ethan.cole@assetflow.local')
),
(
	(SELECT audit_id FROM audit_cycles WHERE scope_location = 'HQ - Main Building'),
	(SELECT user_id FROM users WHERE email = 'admin@assetflow.local')
),
(
	(SELECT audit_id FROM audit_cycles WHERE scope_location = 'HQ - Main Building'),
	(SELECT user_id FROM users WHERE email = 'priya.nair@assetflow.local')
);

-- Audit Items

INSERT INTO audit_items (
	audit_id,
	asset_id,
	marked_by_user_id,
	result,
	notes
)
VALUES
(
	(SELECT audit_id FROM audit_cycles WHERE scope_location = 'HQ - Engineering Wing'),
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0001'),
	(SELECT user_id FROM users WHERE email = 'ethan.cole@assetflow.local'),
	'Verified',
	'Asset present and barcode matched the register.'
),
(
	(SELECT audit_id FROM audit_cycles WHERE scope_location = 'HQ - Engineering Wing'),
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0002'),
	(SELECT user_id FROM users WHERE email = 'ethan.cole@assetflow.local'),
	'Damaged',
	'Visible surface damage noted on the edge of the table.'
),
(
	(SELECT audit_id FROM audit_cycles WHERE scope_location = 'HQ - Main Building'),
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0003'),
	(SELECT user_id FROM users WHERE email = 'admin@assetflow.local'),
	'Missing',
	'Asset not located in the designated parking area during audit.'
),
(
	(SELECT audit_id FROM audit_cycles WHERE scope_location = 'HQ - Main Building'),
	(SELECT asset_id FROM assets WHERE asset_tag = 'AF-0004'),
	(SELECT user_id FROM users WHERE email = 'priya.nair@assetflow.local'),
	'Pending',
	'Awaiting recheck after maintenance closure.'
);
