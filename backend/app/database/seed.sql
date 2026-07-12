-- ===========================================
-- AssetFlow — Comprehensive Seed Data
-- Run AFTER schema.sql
-- All passwords: password123
-- ===========================================

-- Departments
INSERT INTO departments (name, code) VALUES
('Engineering', 'ENG'),
('Human Resources', 'HR'),
('Finance', 'FIN'),
('Operations', 'OPS'),
('Marketing', 'MKT'),
('IT Infrastructure', 'IT');

-- Users (password for ALL users: password123)
INSERT INTO users (name, email, password_hash, role, department_id, status) VALUES
('Rajesh Kumar', 'rajesh@assetflow.com', 'pbkdf2_sha256$310000$Y2FSHO7iG1gvhhIlOq1Wzw==$vlVvDPuYr0SD9OHBEnM69WWahRwqYdTsJBc2_oxbrK8=', 'Admin', NULL, 'Active'),
('Priya Sharma', 'priya@assetflow.com', 'pbkdf2_sha256$310000$Y2FSHO7iG1gvhhIlOq1Wzw==$vlVvDPuYr0SD9OHBEnM69WWahRwqYdTsJBc2_oxbrK8=', 'Asset Manager', 1, 'Active'),
('Amit Patel', 'amit@assetflow.com', 'pbkdf2_sha256$310000$Y2FSHO7iG1gvhhIlOq1Wzw==$vlVvDPuYr0SD9OHBEnM69WWahRwqYdTsJBc2_oxbrK8=', 'Department Head', 1, 'Active'),
('Sneha Reddy', 'sneha@assetflow.com', 'pbkdf2_sha256$310000$Y2FSHO7iG1gvhhIlOq1Wzw==$vlVvDPuYr0SD9OHBEnM69WWahRwqYdTsJBc2_oxbrK8=', 'Department Head', 4, 'Active'),
('Vikram Singh', 'vikram@assetflow.com', 'pbkdf2_sha256$310000$Y2FSHO7iG1gvhhIlOq1Wzw==$vlVvDPuYr0SD9OHBEnM69WWahRwqYdTsJBc2_oxbrK8=', 'Employee', 1, 'Active'),
('Ananya Iyer', 'ananya@assetflow.com', 'pbkdf2_sha256$310000$Y2FSHO7iG1gvhhIlOq1Wzw==$vlVvDPuYr0SD9OHBEnM69WWahRwqYdTsJBc2_oxbrK8=', 'Employee', 2, 'Active'),
('Karthik Nair', 'karthik@assetflow.com', 'pbkdf2_sha256$310000$Y2FSHO7iG1gvhhIlOq1Wzw==$vlVvDPuYr0SD9OHBEnM69WWahRwqYdTsJBc2_oxbrK8=', 'Employee', 3, 'Active'),
('Deepa Menon', 'deepa@assetflow.com', 'pbkdf2_sha256$310000$Y2FSHO7iG1gvhhIlOq1Wzw==$vlVvDPuYr0SD9OHBEnM69WWahRwqYdTsJBc2_oxbrK8=', 'Employee', 4, 'Active'),
('Ravi Teja', 'ravi@assetflow.com', 'pbkdf2_sha256$310000$Y2FSHO7iG1gvhhIlOq1Wzw==$vlVvDPuYr0SD9OHBEnM69WWahRwqYdTsJBc2_oxbrK8=', 'Employee', 5, 'Active'),
('Meera Joshi', 'meera@assetflow.com', 'pbkdf2_sha256$310000$Y2FSHO7iG1gvhhIlOq1Wzw==$vlVvDPuYr0SD9OHBEnM69WWahRwqYdTsJBc2_oxbrK8=', 'Employee', 6, 'Active'),
('Dhiraj', 'dhiraj@assetflow.com', 'pbkdf2_sha256$310000$vAX9wwn7ec0lIknMDziUYQ==$w6bAhavmSWp1u9-Paom0PWekM8CYKJXjKi45ljF0ugw=', 'Admin', NULL, 'Active');

-- Set department heads
UPDATE departments SET head_user_id = 3 WHERE department_id = 1;
UPDATE departments SET head_user_id = 6 WHERE department_id = 2;
UPDATE departments SET head_user_id = 7 WHERE department_id = 3;
UPDATE departments SET head_user_id = 4 WHERE department_id = 4;

-- Asset Categories (office-appropriate)
INSERT INTO asset_categories (name, custom_fields, status) VALUES
('Computing Equipment', '[{"name":"warranty_months","type":"number"},{"name":"manufacturer","type":"text"}]', 'Active'),
('Office Furniture', '[{"name":"material","type":"text"},{"name":"assembly_required","type":"text"}]', 'Active'),
('Audio/Visual Equipment', '[{"name":"warranty_months","type":"number"},{"name":"manufacturer","type":"text"}]', 'Active'),
('Meeting & Conference Rooms', '[{"name":"capacity","type":"number"},{"name":"has_projector","type":"text"}]', 'Active'),
('IT & Networking', '[{"name":"warranty_months","type":"number"},{"name":"manufacturer","type":"text"}]', 'Active');

-- Assets (all dates in 2025-2026, no unnecessary overdues)
INSERT INTO assets (asset_tag, name, category_id, serial_number, qr_code, acquisition_date, acquisition_cost, condition, location, department_id, status, is_bookable, photo_url, custom_values, current_holder_user_id) VALUES
('AF-0001', 'Dell Latitude 5540 Laptop', 1, 'DL-5540-001', 'qr-af0001', '2025-06-15', 85000.00, 'Good', 'Building A - Floor 2', 1, 'Allocated', false, NULL, '{"warranty_months":"36","manufacturer":"Dell"}', 5),
('AF-0002', 'Dell Latitude 5540 Laptop', 1, 'DL-5540-002', 'qr-af0002', '2025-06-15', 85000.00, 'New', 'Building A - Floor 2', 1, 'Available', false, NULL, '{"warranty_months":"36","manufacturer":"Dell"}', NULL),
('AF-0003', 'HP EliteBook 860 G10', 1, 'HP-860-003', 'qr-af0003', '2025-09-01', 92000.00, 'Good', 'Building A - Floor 3', 1, 'Allocated', false, NULL, '{"warranty_months":"24","manufacturer":"HP"}', 3),
('AF-0004', 'MacBook Pro 14 M3', 1, 'MBP-14-004', 'qr-af0004', '2026-01-10', 195000.00, 'New', 'Building B - Floor 1', 5, 'Available', false, NULL, '{"warranty_months":"12","manufacturer":"Apple"}', NULL),
('AF-0005', 'Samsung 55" Smart TV', 3, 'SAM-TV-005', 'qr-af0005', '2025-11-20', 45000.00, 'Good', 'Building A - Conference Room 1', NULL, 'Available', false, NULL, '{"warranty_months":"24","manufacturer":"Samsung"}', NULL),
('AF-0006', 'Ergonomic Office Chair', 2, 'OC-ERG-006', 'qr-af0006', '2025-08-01', 15000.00, 'Good', 'Building A - Floor 2', 1, 'Allocated', false, NULL, '{"material":"Mesh","assembly_required":"Yes"}', 5),
('AF-0007', 'Standing Desk - Adjustable', 2, 'SD-ADJ-007', 'qr-af0007', '2025-10-10', 22000.00, 'Good', 'Building A - Floor 3', 1, 'Allocated', false, NULL, '{"material":"Steel + Wood","assembly_required":"Yes"}', 3),
('AF-0008', 'Conference Table (12-person)', 2, 'CT-12P-008', 'qr-af0008', '2025-06-15', 85000.00, 'Good', 'Building A - Conference Room 1', NULL, 'Available', false, NULL, '{"material":"Oak Wood","assembly_required":"No"}', NULL),
('AF-0009', 'Epson EB-X51 Projector', 3, 'EP-X51-009', 'qr-af0009', '2025-08-15', 52000.00, 'Good', 'Building A - Conference Room 1', NULL, 'Available', false, NULL, '{"warranty_months":"12","manufacturer":"Epson"}', NULL),
('AF-0010', 'Cisco Catalyst Switch', 5, 'CC-9200-010', 'qr-af0010', '2026-02-01', 68000.00, 'New', 'Server Room - Building A', 6, 'Allocated', false, NULL, '{"warranty_months":"60","manufacturer":"Cisco"}', 10),
('AF-0011', 'Conference Room Alpha', 4, 'CR-ALP-011', 'qr-af0011', '2025-01-01', 500000.00, 'New', 'Building A - Floor 1', NULL, 'Available', true, NULL, '{"capacity":"12","has_projector":"Yes"}', NULL),
('AF-0012', 'Conference Room Beta', 4, 'CR-BET-012', 'qr-af0012', '2025-01-01', 300000.00, 'Good', 'Building A - Floor 2', NULL, 'Available', true, NULL, '{"capacity":"8","has_projector":"Yes"}', NULL),
('AF-0013', 'Huddle Room 1', 4, 'HR-001-013', 'qr-af0013', '2025-05-01', 150000.00, 'New', 'Building B - Floor 1', NULL, 'Available', true, NULL, '{"capacity":"4","has_projector":"No"}', NULL),
('AF-0014', 'Lenovo ThinkPad X1 Carbon', 1, 'LB-X1C-014', 'qr-af0014', '2026-03-01', 110000.00, 'Good', 'Building A - Floor 3', 1, 'Allocated', false, NULL, '{"warranty_months":"36","manufacturer":"Lenovo"}', 8),
('AF-0015', 'Logitech Rally Bar (Video Conf)', 3, 'LR-RB-015', 'qr-af0015', '2026-04-01', 125000.00, 'New', 'Building A - Conference Room 1', NULL, 'Under Maintenance', false, NULL, '{"warranty_months":"24","manufacturer":"Logitech"}', NULL);

-- Active Allocations (recent dates, no unnecessary overdues)
INSERT INTO allocations (asset_id, allocated_to_user_id, allocated_to_department_id, allocated_date, expected_return_date, status) VALUES
(1, 5, 1, '2026-06-01', '2026-12-01', 'Active'),
(3, 3, 1, '2026-06-15', '2026-12-15', 'Active'),
(6, 5, 1, '2026-06-01', '2026-12-01', 'Active'),
(7, 3, 1, '2026-07-01', NULL, 'Active'),
(10, 10, 6, '2026-06-01', '2026-12-01', 'Active'),
(14, 8, 4, '2026-06-15', '2026-12-15', 'Active');

-- Historical (returned) Allocations
INSERT INTO allocations (asset_id, allocated_to_user_id, allocated_to_department_id, allocated_date, expected_return_date, actual_return_date, return_condition_notes, status) VALUES
(2, 6, 2, '2026-01-01', '2026-06-01', '2026-05-28', 'Good condition, minor scratches', 'Returned'),
(4, 9, 5, '2026-02-01', '2026-06-30', '2026-06-25', 'Excellent condition', 'Returned');

-- Bookings (all in July 2026)
INSERT INTO bookings (asset_id, booked_by_user_id, start_time, end_time, purpose, status) VALUES
(11, 5, '2026-07-14 10:00:00', '2026-07-14 12:00:00', 'Sprint planning meeting', 'Upcoming'),
(11, 3, '2026-07-14 14:00:00', '2026-07-14 15:30:00', 'Design review', 'Upcoming'),
(12, 6, '2026-07-15 09:00:00', '2026-07-15 10:00:00', 'HR interview panel', 'Upcoming'),
(13, 9, '2026-07-15 11:00:00', '2026-07-15 12:00:00', 'Quick sync with marketing', 'Upcoming'),
(11, 7, '2026-07-10 09:00:00', '2026-07-10 11:00:00', 'Finance quarterly review', 'Completed'),
(12, 4, '2026-07-11 14:00:00', '2026-07-11 16:00:00', 'Operations standup', 'Completed'),
(11, 5, '2026-07-16 10:00:00', '2026-07-16 11:00:00', 'Tech talk', 'Upcoming');

-- Maintenance Requests (recent dates)
INSERT INTO maintenance_requests (asset_id, raised_by_user_id, issue_description, priority, status, technician_name, created_at) VALUES
(15, 5, 'Logitech Rally Bar audio input not working properly', 'High', 'In Progress', 'Suresh Kumar', '2026-07-08 10:30:00'),
(5, 3, 'Smart TV remote not responding to power button', 'Medium', 'Approved', NULL, '2026-07-10 14:00:00'),
(1, 5, 'Laptop fan making unusual noise during heavy load', 'Low', 'Pending', NULL, '2026-07-11 09:00:00'),
(8, 4, 'Conference table has loose leg joint, needs tightening', 'Medium', 'Resolved', 'Facilities Team', '2026-07-01 08:00:00');

UPDATE maintenance_requests SET resolved_at = '2026-07-05 17:00:00', resolution_notes = 'Leg joint tightened and reinforced. Table stable now.' WHERE request_id = 4;

-- Transfers (recent requests)
INSERT INTO transfers (asset_id, from_user_id, to_user_id, requested_by, reason, status, requested_at) VALUES
(5, NULL, 8, 8, 'Need Smart TV for marketing presentation area', 'Requested', '2026-07-10 11:00:00'),
(4, NULL, 9, 9, 'MacBook needed for design work in marketing', 'Requested', '2026-07-11 16:00:00');

-- Audit Cycles
INSERT INTO audit_cycles (scope_department_id, scope_location, start_date, end_date, status) VALUES
(1, 'Building A - Floor 2', '2026-06-01', '2026-06-15', 'Closed'),
(NULL, 'Server Room - Building A', '2026-07-01', '2026-07-31', 'In Progress');

INSERT INTO audit_auditors (audit_id, user_id) VALUES
(1, 2),
(1, 4),
(2, 2),
(2, 4);

INSERT INTO audit_items (audit_id, asset_id, marked_by_user_id, result, notes) VALUES
(1, 1, 2, 'Verified', 'Laptop in good condition'),
(1, 2, 2, 'Verified', 'Spare laptop unused'),
(1, 6, 2, 'Verified', 'Chair in good condition'),
(1, 5, 4, 'Damaged', 'TV screen has minor scratches'),
(1, 8, 4, 'Verified', 'Conference table in good condition'),
(2, 10, NULL, 'Pending', NULL);

-- Notifications (spread across all users)
INSERT INTO notifications (user_id, type, message, reference_id, is_read, created_at) VALUES
(1, 'AssetAssigned', 'Dell Latitude 5540 Laptop (AF-0001) allocated to Vikram Singh', '1', true, '2026-06-01 10:00:00'),
(1, 'BookingConfirmed', 'Conference Room Alpha booking confirmed for Sprint planning', '1', false, '2026-07-12 09:00:00'),
(1, 'AuditDiscrepancy', 'Audit cycle for Building A - Floor 2 closed with 1 discrepancy', '1', false, '2026-06-15 17:00:00'),
(2, 'MaintenanceApproved', 'Maintenance request for Rally Bar (AF-0015) has been approved', '1', true, '2026-07-09 10:00:00'),
(2, 'TransferApproved', 'Transfer request for Smart TV (AF-0005) is pending review', '1', false, '2026-07-10 11:00:00'),
(3, 'AssetAssigned', 'HP EliteBook 860 G10 (AF-0003) has been allocated to you', '3', true, '2026-06-15 10:00:00'),
(3, 'BookingConfirmed', 'Conference Room Alpha booking confirmed for Design review', '2', false, '2026-07-12 09:30:00'),
(4, 'AssetAssigned', 'Lenovo ThinkPad X1 Carbon (AF-0014) allocated to Deepa Menon', '6', true, '2026-06-15 10:00:00'),
(4, 'MaintenanceApproved', 'Conference table maintenance (AF-0008) has been resolved', '4', true, '2026-07-05 17:00:00'),
(5, 'AssetAssigned', 'Dell Latitude 5540 Laptop (AF-0001) has been allocated to you', '1', false, '2026-06-01 10:00:00'),
(5, 'BookingConfirmed', 'Conference Room Alpha booking confirmed for Jul 14 10:00-12:00', '1', false, '2026-07-12 09:00:00'),
(5, 'MaintenanceApproved', 'Your Rally Bar maintenance request is now in progress', '1', false, '2026-07-08 11:00:00'),
(6, 'BookingConfirmed', 'Conference Room Beta booking confirmed for HR interview', '3', false, '2026-07-13 08:00:00'),
(7, 'BookingConfirmed', 'Conference Room Alpha booking confirmed for Finance review', '5', true, '2026-07-10 09:00:00'),
(8, 'AssetAssigned', 'Lenovo ThinkPad X1 Carbon (AF-0014) has been allocated to you', '6', true, '2026-06-15 10:00:00'),
(8, 'TransferApproved', 'Transfer request for Smart TV is pending your review', '1', false, '2026-07-10 11:00:00'),
(9, 'BookingConfirmed', 'Huddle Room 1 booking confirmed for Marketing sync', '4', false, '2026-07-15 08:00:00'),
(10, 'AssetAssigned', 'Cisco Catalyst Switch (AF-0010) has been allocated to you', '10', false, '2026-06-01 10:00:00'),
(11, 'BookingConfirmed', 'Welcome! Your account has been created as Admin.', NULL, false, '2026-07-12 08:00:00');

-- Activity Logs
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, timestamp) VALUES
(1, 'Created department Engineering', 'Department', '1', '2026-01-01 09:00:00'),
(2, 'Registered Dell Latitude 5540 Laptop (AF-0001)', 'Asset', '1', '2025-06-15 10:00:00'),
(2, 'Allocated AF-0001 to Vikram Singh', 'Allocation', '1', '2026-06-01 10:00:00'),
(2, 'Allocated AF-0003 to Amit Patel', 'Allocation', '2', '2026-06-15 10:00:00'),
(5, 'Raised maintenance request for Rally Bar (AF-0015)', 'Maintenance', '1', '2026-07-08 10:30:00'),
(2, 'Approved maintenance request for Rally Bar (AF-0015)', 'Maintenance', '1', '2026-07-09 10:00:00'),
(5, 'Booked Conference Room Alpha for Sprint planning', 'Booking', '1', '2026-07-12 09:00:00'),
(8, 'Requested transfer of Smart TV to Deepa Menon', 'Transfer', '1', '2026-07-10 11:00:00'),
(1, 'Promoted Priya Sharma to Asset Manager', 'User', '2', '2026-01-02 09:00:00'),
(1, 'Closed audit cycle for Building A - Floor 2', 'Audit', '1', '2026-06-15 17:00:00');
