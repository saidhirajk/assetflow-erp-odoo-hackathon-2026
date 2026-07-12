-- ===========================================
-- AssetFlow Database Schema
-- Foundation Tables
-- ===========================================

DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS asset_categories CASCADE;
DROP TABLE IF EXISTS allocations CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS audit_items CASCADE;
DROP TABLE IF EXISTS audit_auditors CASCADE;
DROP TABLE IF EXISTS audit_cycles CASCADE;
DROP TABLE IF EXISTS maintenance_requests CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;

------------------------------------------------------------
-- DEPARTMENTS
------------------------------------------------------------

CREATE TABLE departments (

    department_id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,

    code VARCHAR(20) NOT NULL UNIQUE,

    parent_department_id INTEGER,

    status VARCHAR(20)
        DEFAULT 'Active'
        CHECK (status IN ('Active','Inactive'))

);

ALTER TABLE departments
ADD CONSTRAINT fk_parent_department
FOREIGN KEY(parent_department_id)
REFERENCES departments(department_id);

------------------------------------------------------------
-- USERS
------------------------------------------------------------

CREATE TABLE users (

    user_id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    role VARCHAR(30)
        NOT NULL
        CHECK (
            role IN
            (
                'Admin',
                'Asset Manager',
                'Department Head',
                'Employee'
            )
        ),

    department_id INTEGER,

    status VARCHAR(20)
        DEFAULT 'Active'
        CHECK(status IN ('Active','Inactive')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

ALTER TABLE users
ADD CONSTRAINT fk_user_department
FOREIGN KEY(department_id)
REFERENCES departments(department_id);

ALTER TABLE departments
ADD COLUMN head_user_id INTEGER;

ALTER TABLE departments
ADD CONSTRAINT fk_department_head
FOREIGN KEY(head_user_id)
REFERENCES users(user_id);

------------------------------------------------------------
-- ASSET CATEGORIES
------------------------------------------------------------

CREATE TABLE asset_categories (

    category_id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,

    custom_fields JSON,

    status VARCHAR(20)
        DEFAULT 'Active'
        CHECK(status IN ('Active','Inactive'))

);

------------------------------------------------------------
-- ASSETS
------------------------------------------------------------

CREATE TABLE assets (

    asset_id SERIAL PRIMARY KEY,

    asset_tag VARCHAR(50) NOT NULL UNIQUE,

    name VARCHAR(150) NOT NULL,

    category_id INTEGER,

    serial_number VARCHAR(100),

    qr_code TEXT,

    acquisition_date DATE,

    acquisition_cost DECIMAL(14,2),

    condition VARCHAR(20)
        CHECK (condition IN ('New','Good','Fair','Poor')),

    location VARCHAR(255),

    department_id INTEGER,

    status VARCHAR(30)
        DEFAULT 'Available'
        CHECK (
            status IN (
                'Available',
                'Allocated',
                'Reserved',
                'Under Maintenance',
                'Lost',
                'Retired',
                'Disposed'
            )
        ),

    is_bookable BOOLEAN DEFAULT FALSE,

    photo_url TEXT,

    document_urls JSON,

    current_holder_user_id INTEGER

);

ALTER TABLE assets
ADD CONSTRAINT fk_asset_category
FOREIGN KEY(category_id)
REFERENCES asset_categories(category_id);

ALTER TABLE assets
ADD CONSTRAINT fk_asset_department
FOREIGN KEY(department_id)
REFERENCES departments(department_id);

ALTER TABLE assets
ADD CONSTRAINT fk_asset_current_holder
FOREIGN KEY(current_holder_user_id)
REFERENCES users(user_id);

------------------------------------------------------------
-- ALLOCATIONS
------------------------------------------------------------

CREATE TABLE allocations (

    allocation_id SERIAL PRIMARY KEY,

    asset_id INTEGER NOT NULL,

    allocated_to_user_id INTEGER,

    allocated_to_department_id INTEGER,

    allocated_date DATE NOT NULL,

    expected_return_date DATE,

    actual_return_date DATE,

    return_condition_notes TEXT,

    status VARCHAR(20)
        DEFAULT 'Active'
        CHECK (status IN ('Active','Returned','Overdue')),

    CONSTRAINT chk_allocation_target
        CHECK (
            (
                CASE WHEN allocated_to_user_id IS NOT NULL THEN 1 ELSE 0 END
                + CASE WHEN allocated_to_department_id IS NOT NULL THEN 1 ELSE 0 END
            ) = 1
        )

);

ALTER TABLE allocations
ADD CONSTRAINT fk_allocation_asset
FOREIGN KEY(asset_id)
REFERENCES assets(asset_id);

ALTER TABLE allocations
ADD CONSTRAINT fk_allocation_user
FOREIGN KEY(allocated_to_user_id)
REFERENCES users(user_id);

ALTER TABLE allocations
ADD CONSTRAINT fk_allocation_department
FOREIGN KEY(allocated_to_department_id)
REFERENCES departments(department_id);

------------------------------------------------------------
-- TRANSFERS
------------------------------------------------------------

CREATE TABLE transfers (

    transfer_id SERIAL PRIMARY KEY,

    asset_id INTEGER NOT NULL,

    from_user_id INTEGER NOT NULL,

    to_user_id INTEGER NOT NULL,

    requested_by INTEGER NOT NULL,

    status VARCHAR(20)
        DEFAULT 'Requested'
        CHECK (status IN ('Requested','Approved','Rejected','Completed')),

    approved_by INTEGER,

    requested_at TIMESTAMP NOT NULL,

    resolved_at TIMESTAMP

);

ALTER TABLE transfers
ADD CONSTRAINT fk_transfer_asset
FOREIGN KEY(asset_id)
REFERENCES assets(asset_id);

ALTER TABLE transfers
ADD CONSTRAINT fk_transfer_from_user
FOREIGN KEY(from_user_id)
REFERENCES users(user_id);

ALTER TABLE transfers
ADD CONSTRAINT fk_transfer_to_user
FOREIGN KEY(to_user_id)
REFERENCES users(user_id);

ALTER TABLE transfers
ADD CONSTRAINT fk_transfer_requested_by
FOREIGN KEY(requested_by)
REFERENCES users(user_id);

ALTER TABLE transfers
ADD CONSTRAINT fk_transfer_approved_by
FOREIGN KEY(approved_by)
REFERENCES users(user_id);

------------------------------------------------------------
-- BOOKINGS
------------------------------------------------------------

CREATE TABLE bookings (

    booking_id SERIAL PRIMARY KEY,

    asset_id INTEGER NOT NULL,

    booked_by_user_id INTEGER NOT NULL,

    start_time TIMESTAMP NOT NULL,

    end_time TIMESTAMP NOT NULL,

    status VARCHAR(20)
        DEFAULT 'Upcoming'
        CHECK (status IN ('Upcoming','Ongoing','Completed','Cancelled')),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);

ALTER TABLE bookings
ADD CONSTRAINT fk_booking_asset
FOREIGN KEY(asset_id)
REFERENCES assets(asset_id);

ALTER TABLE bookings
ADD CONSTRAINT fk_booking_user
FOREIGN KEY(booked_by_user_id)
REFERENCES users(user_id);

------------------------------------------------------------
-- MAINTENANCE REQUESTS
------------------------------------------------------------

CREATE TABLE maintenance_requests (

    request_id SERIAL PRIMARY KEY,

    asset_id INTEGER NOT NULL,

    raised_by_user_id INTEGER NOT NULL,

    issue_description TEXT NOT NULL,

    priority VARCHAR(20)
        NOT NULL
        CHECK (priority IN ('Low','Medium','High','Critical')),

    photo_url TEXT,

    status VARCHAR(30)
        DEFAULT 'Pending'
        CHECK (
            status IN (
                'Pending',
                'Approved',
                'Rejected',
                'Technician Assigned',
                'In Progress',
                'Resolved'
            )
        ),

    approved_by INTEGER,

    technician_name VARCHAR(150),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    resolved_at TIMESTAMP

);

ALTER TABLE maintenance_requests
ADD CONSTRAINT fk_maintenance_asset
FOREIGN KEY(asset_id)
REFERENCES assets(asset_id);

ALTER TABLE maintenance_requests
ADD CONSTRAINT fk_maintenance_raised_by
FOREIGN KEY(raised_by_user_id)
REFERENCES users(user_id);

ALTER TABLE maintenance_requests
ADD CONSTRAINT fk_maintenance_approved_by
FOREIGN KEY(approved_by)
REFERENCES users(user_id);

------------------------------------------------------------
-- AUDIT CYCLES
------------------------------------------------------------

CREATE TABLE audit_cycles (

    audit_id SERIAL PRIMARY KEY,

    scope_department_id INTEGER,

    scope_location VARCHAR(255),

    start_date DATE NOT NULL,

    end_date DATE,

    status VARCHAR(20)
        DEFAULT 'Draft'
        CHECK (status IN ('Draft','In Progress','Closed'))

);

ALTER TABLE audit_cycles
ADD CONSTRAINT fk_audit_scope_department
FOREIGN KEY(scope_department_id)
REFERENCES departments(department_id);

------------------------------------------------------------
-- AUDIT AUDITORS
------------------------------------------------------------

CREATE TABLE audit_auditors (

    audit_id INTEGER NOT NULL,

    user_id INTEGER NOT NULL,

    PRIMARY KEY (audit_id, user_id)

);

ALTER TABLE audit_auditors
ADD CONSTRAINT fk_audit_auditors_audit
FOREIGN KEY(audit_id)
REFERENCES audit_cycles(audit_id)
ON DELETE CASCADE;

ALTER TABLE audit_auditors
ADD CONSTRAINT fk_audit_auditors_user
FOREIGN KEY(user_id)
REFERENCES users(user_id);

------------------------------------------------------------
-- AUDIT ITEMS
------------------------------------------------------------

CREATE TABLE audit_items (

    audit_item_id SERIAL PRIMARY KEY,

    audit_id INTEGER NOT NULL,

    asset_id INTEGER NOT NULL,

    marked_by_user_id INTEGER NOT NULL,

    result VARCHAR(20)
        DEFAULT 'Pending'
        CHECK (result IN ('Pending','Verified','Missing','Damaged')),

    notes TEXT

);

ALTER TABLE audit_items
ADD CONSTRAINT fk_audit_item_audit
FOREIGN KEY(audit_id)
REFERENCES audit_cycles(audit_id)
ON DELETE CASCADE;

ALTER TABLE audit_items
ADD CONSTRAINT fk_audit_item_asset
FOREIGN KEY(asset_id)
REFERENCES assets(asset_id);

ALTER TABLE audit_items
ADD CONSTRAINT fk_audit_item_marked_by
FOREIGN KEY(marked_by_user_id)
REFERENCES users(user_id);

------------------------------------------------------------
-- NOTIFICATIONS
------------------------------------------------------------

CREATE TABLE notifications (

    notification_id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    type VARCHAR(30)
        NOT NULL
        CHECK (
            type IN (
                'AssetAssigned',
                'MaintenanceApproved',
                'MaintenanceRejected',
                'BookingConfirmed',
                'BookingCancelled',
                'BookingReminder',
                'TransferApproved',
                'OverdueReturn',
                'AuditDiscrepancy'
            )
        ),

    message TEXT NOT NULL,

    reference_id VARCHAR(100),

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);

ALTER TABLE notifications
ADD CONSTRAINT fk_notification_user
FOREIGN KEY(user_id)
REFERENCES users(user_id);

------------------------------------------------------------
-- ACTIVITY LOGS
------------------------------------------------------------

CREATE TABLE activity_logs (

    log_id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    action VARCHAR(255) NOT NULL,

    entity_type VARCHAR(50) NOT NULL,

    entity_id VARCHAR(100) NOT NULL,

    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);

ALTER TABLE activity_logs
ADD CONSTRAINT fk_activity_log_user
FOREIGN KEY(user_id)
REFERENCES users(user_id);
