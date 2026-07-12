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
	NULL
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
	NULL
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
	NULL
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
	NULL
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
('Meeting Rooms');
