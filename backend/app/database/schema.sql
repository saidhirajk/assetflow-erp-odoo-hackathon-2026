-- ===========================================
-- AssetFlow Database Schema
-- Foundation Tables
-- ===========================================

DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS asset_categories CASCADE;

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