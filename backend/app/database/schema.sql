-- ===========================================
-- AssetFlow Database Schema
-- Foundation Tables
-- ===========================================

DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS asset_categories CASCADE;
<<<<<<< HEAD
DROP TABLE IF EXISTS allocations CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
=======
>>>>>>> origin/main

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
);
