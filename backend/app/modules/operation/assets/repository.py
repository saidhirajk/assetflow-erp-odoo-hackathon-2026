import json
import secrets
from app.database.connection import get_connection


def _next_asset_tag(cursor):
    cursor.execute("SELECT asset_tag FROM assets ORDER BY asset_id DESC LIMIT 1")
    row = cursor.fetchone()
    if row:
        last_num = int(row[0].replace("AF-", ""))
        return f"AF-{last_num + 1:04d}"
    return "AF-0001"


def _row_to_asset(row):
    return {
        "id": str(row[0]),
        "asset_tag": row[1],
        "name": row[2],
        "serial_number": row[4],
        "qr_code": row[5],
        "status": row[9].lower().replace(" ", "_"),
        "is_bookable": row[10],
        "location": row[8],
        "condition": row[7],
        "category": {"id": str(row[3][0]), "name": row[3][1]} if row[3] else None,
        "department": {"id": str(row[11][0]), "name": row[11][1]} if row[11] else None,
    }


def list_assets():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            a.asset_id, a.asset_tag, a.name, a.category_id,
            a.serial_number, a.qr_code, a.acquisition_date, a.condition,
            a.location, a.status, a.is_bookable, a.department_id,
            a.photo_url, a.custom_values, a.current_holder_user_id,
            a.acquisition_cost, a.document_urls,
            c.name as cat_name,
            d.name as dept_name
        FROM assets a
        LEFT JOIN asset_categories c ON c.category_id = a.category_id
        LEFT JOIN departments d ON d.department_id = a.department_id
        ORDER BY a.asset_id DESC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    result = []
    for row in rows:
        cf = row[13]
        if isinstance(cf, str):
            cf = json.loads(cf)
        result.append({
            "id": str(row[0]),
            "asset_tag": row[1],
            "name": row[2],
            "serial_number": row[4],
            "qr_code": row[5],
            "status": row[9].lower().replace(" ", "_"),
            "is_bookable": row[10],
            "location": row[8],
            "condition": row[7],
            "category": {"id": str(row[3]) if row[3] else None, "name": row[17]} if row[17] else None,
            "department": {"id": str(row[11]) if row[11] else None, "name": row[18]} if row[18] else None,
            "custom_values": cf or {},
            "acquisition_date": str(row[6]) if row[6] else None,
            "acquisition_cost": float(row[15]) if row[15] else None,
            "photo_url": row[12],
            "current_holder_user_id": str(row[14]) if row[14] else None,
        })
    return result


def list_assets_filtered(bookable_only=False):
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT
            a.asset_id, a.asset_tag, a.name, a.category_id,
            a.serial_number, a.qr_code, a.acquisition_date, a.condition,
            a.location, a.status, a.is_bookable, a.department_id,
            a.photo_url, a.custom_values, a.current_holder_user_id,
            a.acquisition_cost, a.document_urls,
            c.name as cat_name, d.name as dept_name
        FROM assets a
        LEFT JOIN asset_categories c ON c.category_id = a.category_id
        LEFT JOIN departments d ON d.department_id = a.department_id
    """
    params = []
    if bookable_only:
        query += " WHERE a.is_bookable = TRUE"
    query += " ORDER BY a.asset_id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    result = []
    for row in rows:
        result.append({
            "id": str(row[0]),
            "asset_tag": row[1],
            "name": row[2],
            "serial_number": row[4],
            "qr_code": row[5],
            "status": row[9].lower().replace(" ", "_"),
            "is_bookable": row[10],
            "location": row[8],
            "condition": row[7],
            "category": {"id": str(row[3]) if row[3] else None, "name": row[17]} if row[17] else None,
            "department": {"id": str(row[11]) if row[11] else None, "name": row[18]} if row[18] else None,
        })
    return result


def get_asset_by_id(asset_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            a.asset_id, a.asset_tag, a.name, a.category_id,
            a.serial_number, a.qr_code, a.acquisition_date, a.condition,
            a.location, a.status, a.is_bookable, a.department_id,
            a.photo_url, a.custom_values, a.current_holder_user_id,
            a.acquisition_cost, a.document_urls,
            c.name as cat_name, d.name as dept_name
        FROM assets a
        LEFT JOIN asset_categories c ON c.category_id = a.category_id
        LEFT JOIN departments d ON d.department_id = a.department_id
        WHERE a.asset_id = %s
    """, (asset_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if not row:
        return None

    cf = row[13]
    if isinstance(cf, str):
        cf = json.loads(cf)

    return {
        "id": str(row[0]),
        "asset_tag": row[1],
        "name": row[2],
        "serial_number": row[4],
        "qr_code": row[5],
        "status": row[9].lower().replace(" ", "_"),
        "is_bookable": row[10],
        "location": row[8],
        "condition": row[7],
        "category": {
            "id": str(row[3]) if row[3] else None,
            "name": row[17],
            "custom_fields": [],
        } if row[17] else None,
        "department": {"id": str(row[11]) if row[11] else None, "name": row[18]} if row[18] else None,
        "custom_values": cf or {},
        "acquisition_date": str(row[6]) if row[6] else None,
        "acquisition_cost": float(row[15]) if row[15] else None,
        "photo_url": row[12],
        "current_holder_user_id": str(row[14]) if row[14] else None,
    }


def create_asset(data):
    conn = get_connection()
    cursor = conn.cursor()

    asset_tag = _next_asset_tag(cursor)
    qr_code = secrets.token_hex(16)

    cat_id = int(data.category_id) if data.category_id else None
    dept_id = int(data.department_id) if data.department_id else None
    condition_db = data.condition.title()

    cursor.execute("""
        INSERT INTO assets (asset_tag, name, category_id, serial_number, qr_code,
            acquisition_date, acquisition_cost, condition, location, department_id,
            status, is_bookable, photo_url, custom_values)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'Available',%s,%s,%s)
        RETURNING asset_id
    """, (
        asset_tag, data.name, cat_id, data.serial_number, qr_code,
        data.acquisition_date or None, data.acquisition_cost,
        condition_db, data.location, dept_id,
        data.is_bookable, data.photo_url or None,
        json.dumps(data.customValues) if data.customValues else None,
    ))
    aid = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    conn.close()
    return aid, asset_tag


def update_asset(asset_id, data):
    conn = get_connection()
    cursor = conn.cursor()
    cat_id = int(data.category_id) if data.category_id else None
    dept_id = int(data.department_id) if data.department_id else None
    status_db = data.status.replace("_", " ").title() if data.status else "Available"
    condition_db = data.condition.title() if data.condition else "New"

    cursor.execute("""
        UPDATE assets SET
            name=%s, category_id=%s, serial_number=%s,
            acquisition_date=%s, acquisition_cost=%s, condition=%s,
            location=%s, department_id=%s, status=%s, is_bookable=%s,
            photo_url=%s, custom_values=%s
        WHERE asset_id=%s
    """, (
        data.name, cat_id, data.serial_number,
        data.acquisition_date or None, data.acquisition_cost,
        condition_db, data.location, dept_id, status_db,
        data.is_bookable, data.photo_url or None,
        json.dumps(data.customValues) if data.customValues else None,
        asset_id,
    ))
    conn.commit()
    cursor.close()
    conn.close()


def get_asset_allocation_history(asset_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT allocation_id, allocated_date, expected_return_date,
               actual_return_date, return_condition_notes, status
        FROM allocations WHERE asset_id = %s ORDER BY allocated_date DESC
    """, (asset_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "id": str(r[0]),
            "allocated_date": str(r[1]) if r[1] else None,
            "expected_return_date": str(r[2]) if r[2] else None,
            "actual_return_date": str(r[3]) if r[3] else None,
            "return_condition_notes": r[4],
            "status": r[5].lower(),
        }
        for r in rows
    ]


def get_asset_maintenance_history(asset_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT request_id, issue_description, priority, status,
               created_at, resolved_at, technician_name
        FROM maintenance_requests WHERE asset_id = %s ORDER BY created_at DESC
    """, (asset_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "id": str(r[0]),
            "issue_description": r[1],
            "priority": r[2].lower(),
            "status": r[3].lower().replace(" ", "_"),
            "created_at": str(r[4]) if r[4] else None,
            "resolved_at": str(r[5]) if r[5] else None,
            "technician_name": r[6],
        }
        for r in rows
    ]
