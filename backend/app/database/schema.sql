-- ===========================================
-- AssetFlow Database Schema
-- All 12 Tables
-- ===========================================

DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_items CASCADE;
DROP TABLE IF EXISTS audit_auditors CASCADE;
DROP TABLE IF EXISTS audit_cycles CASCADE;
DROP TABLE IF EXISTS maintenance_requests CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS allocations CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS asset_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

------------------------------------------------------------
-- 1. DEPARTMENTS (head_user_id added after users table)
------------------------------------------------------------

CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    parent_department_id INTEGER,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active','Inactive'))
);

ALTER TABLE departments
ADD CONSTRAINT fk_parent_department
FOREIGN KEY(parent_department_id) REFERENCES departments(department_id);

------------------------------------------------------------
-- 2. USERS
------------------------------------------------------------

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('Admin','Asset Manager','Department Head','Employee')),
    department_id INTEGER,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
ADD CONSTRAINT fk_user_department
FOREIGN KEY(department_id) REFERENCES departments(department_id);

-- Now add head_user_id (circular ref resolved)
ALTER TABLE departments ADD COLUMN head_user_id INTEGER;
ALTER TABLE departments
ADD CONSTRAINT fk_department_head
FOREIGN KEY(head_user_id) REFERENCES users(user_id);

------------------------------------------------------------
-- 3. ASSET CATEGORIES
------------------------------------------------------------

CREATE TABLE asset_categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    custom_fields JSON,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active','Inactive'))
);

------------------------------------------------------------
-- 4. ASSETS
------------------------------------------------------------

CREATE TABLE assets (
    asset_id SERIAL PRIMARY KEY,
    asset_tag VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER REFERENCES asset_categories(category_id),
    serial_number VARCHAR(100),
    qr_code VARCHAR(255),
    acquisition_date DATE,
    acquisition_cost DECIMAL(12,2),
    condition VARCHAR(20) DEFAULT 'New' CHECK (condition IN ('New','Good','Fair','Poor')),
    location VARCHAR(200),
    department_id INTEGER REFERENCES departments(department_id),
    status VARCHAR(30) DEFAULT 'Available' CHECK (status IN ('Available','Allocated','Reserved','Under Maintenance','Lost','Retired','Disposed')),
    is_bookable BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    document_urls JSON,
    current_holder_user_id INTEGER REFERENCES users(user_id),
    custom_values JSON
);

------------------------------------------------------------
-- 5. ALLOCATIONS
------------------------------------------------------------

CREATE TABLE allocations (
    allocation_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(asset_id),
    allocated_to_user_id INTEGER REFERENCES users(user_id),
    allocated_to_department_id INTEGER REFERENCES departments(department_id),
    allocated_date DATE DEFAULT CURRENT_DATE,
    expected_return_date DATE,
    actual_return_date DATE,
    return_condition_notes TEXT,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active','Returned','Overdue'))
);

------------------------------------------------------------
-- 6. TRANSFERS
------------------------------------------------------------

CREATE TABLE transfers (
    transfer_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(asset_id),
    from_user_id INTEGER REFERENCES users(user_id),
    to_user_id INTEGER REFERENCES users(user_id),
    requested_by INTEGER REFERENCES users(user_id),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'Requested' CHECK (status IN ('Requested','Approved','Rejected','Completed')),
    approved_by INTEGER REFERENCES users(user_id),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

------------------------------------------------------------
-- 7. BOOKINGS
------------------------------------------------------------

CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(asset_id),
    booked_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    purpose TEXT,
    status VARCHAR(20) DEFAULT 'Upcoming' CHECK (status IN ('Upcoming','Ongoing','Completed','Cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

------------------------------------------------------------
-- 8. MAINTENANCE REQUESTS
------------------------------------------------------------

CREATE TABLE maintenance_requests (
    request_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(asset_id),
    raised_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
    issue_description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Critical')),
    photo_url TEXT,
    status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected','Technician Assigned','In Progress','Resolved')),
    approved_by INTEGER REFERENCES users(user_id),
    technician_name VARCHAR(100),
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

------------------------------------------------------------
-- 9. AUDIT CYCLES
------------------------------------------------------------

CREATE TABLE audit_cycles (
    audit_id SERIAL PRIMARY KEY,
    scope_department_id INTEGER REFERENCES departments(department_id),
    scope_location VARCHAR(200),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft','In Progress','Closed'))
);

------------------------------------------------------------
-- 10. AUDIT AUDITORS (junction table)
------------------------------------------------------------

CREATE TABLE audit_auditors (
    audit_id INTEGER NOT NULL REFERENCES audit_cycles(audit_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    PRIMARY KEY (audit_id, user_id)
);

------------------------------------------------------------
-- 11. AUDIT ITEMS
------------------------------------------------------------

CREATE TABLE audit_items (
    audit_item_id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES audit_cycles(audit_id),
    asset_id INTEGER NOT NULL REFERENCES assets(asset_id),
    marked_by_user_id INTEGER REFERENCES users(user_id),
    result VARCHAR(20) DEFAULT 'Pending' CHECK (result IN ('Pending','Verified','Missing','Damaged')),
    notes TEXT
);

------------------------------------------------------------
-- 12. NOTIFICATIONS
------------------------------------------------------------

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'AssetAssigned','MaintenanceApproved','MaintenanceRejected',
        'BookingConfirmed','BookingCancelled','BookingReminder',
        'TransferApproved','OverdueReturn','AuditDiscrepancy'
    )),
    message TEXT NOT NULL,
    reference_id VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

------------------------------------------------------------
-- 13. ACTIVITY LOGS
------------------------------------------------------------

CREATE TABLE activity_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    action TEXT NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

------------------------------------------------------------
-- INDEXES for performance
------------------------------------------------------------

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_department ON assets(department_id);
CREATE INDEX idx_assets_tag ON assets(asset_tag);
CREATE INDEX idx_allocations_asset ON allocations(asset_id);
CREATE INDEX idx_allocations_status ON allocations(status);
CREATE INDEX idx_allocations_user ON allocations(allocated_to_user_id);
CREATE INDEX idx_transfers_asset ON transfers(asset_id);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_bookings_asset ON bookings(asset_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_time ON bookings(start_time, end_time);
CREATE INDEX idx_maintenance_asset ON maintenance_requests(asset_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
