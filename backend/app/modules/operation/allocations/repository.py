from datetime import date
from app.database.connection import get_connection


def _enrich_allocation(row):
    return {
        "id": str(row[0]),
        "asset_id": str(row[1]),
        "allocated_to_user_id": str(row[2]) if row[2] else None,
        "allocated_to_department_id": str(row[3]) if row[3] else None,
        "allocated_date": str(row[4]) if row[4] else None,
        "expected_return_date": str(row[5]) if row[5] else None,
        "actual_return_date": str(row[6]) if row[6] else None,
        "return_condition_notes": row[7],
        "status": row[8].lower(),
    }


def list_allocations(status_filter=None):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT
            al.allocation_id, al.asset_id, al.allocated_to_user_id,
            al.allocated_to_department_id, al.allocated_date,
            al.expected_return_date, al.actual_return_date,
            al.return_condition_notes, al.status,
            a.asset_tag, a.name as asset_name, a.status as asset_status,
            u.name as user_name, u.email as user_email,
            d.name as dept_name
        FROM allocations al
        LEFT JOIN assets a ON a.asset_id = al.asset_id
        LEFT JOIN users u ON u.user_id = al.allocated_to_user_id
        LEFT JOIN departments d ON d.department_id = al.allocated_to_department_id
    """
    params = []
    if status_filter:
        statuses = [s.strip().replace("_", " ").title() for s in status_filter.split(",")]
        placeholders = ",".join(["%s"] * len(statuses))
        query += f" WHERE al.status IN ({placeholders})"
        params.extend(statuses)
    query += " ORDER BY al.allocation_id DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    result = []
    for row in rows:
        alloc = _enrich_allocation(row)
        alloc["asset"] = {
            "id": str(row[1]),
            "asset_tag": row[9],
            "name": row[10],
            "status": row[11].lower().replace(" ", "_") if row[11] else None,
        } if row[9] else None
        alloc["allocatedToUser"] = {
            "id": str(row[2]) if row[2] else None,
            "name": row[12],
            "email": row[13],
        } if row[12] else None
        alloc["allocatedToDepartment"] = {
            "id": str(row[3]) if row[3] else None,
            "name": row[14],
        } if row[14] else None
        result.append(alloc)
    return result


def check_conflict(asset_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT al.allocation_id, u.name
        FROM allocations al
        LEFT JOIN users u ON u.user_id = al.allocated_to_user_id
        WHERE al.asset_id = %s AND al.status = 'Active'
    """, (asset_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row


def create_allocation(asset_id, user_id, dept_id, expected_return):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO allocations (asset_id, allocated_to_user_id, allocated_to_department_id,
            allocated_date, expected_return_date, status)
        VALUES (%s, %s, %s, CURRENT_DATE, %s, 'Active')
        RETURNING allocation_id
    """, (asset_id, user_id, dept_id, expected_return))
    alloc_id = cursor.fetchone()[0]

    cursor.execute(
        "UPDATE assets SET status = 'Allocated', current_holder_user_id = %s WHERE asset_id = %s",
        (user_id, asset_id),
    )
    conn.commit()

    cursor.execute("SELECT asset_tag, name FROM assets WHERE asset_id = %s", (asset_id,))
    asset_row = cursor.fetchone()
    cursor.close()
    conn.close()

    return {
        "id": str(alloc_id),
        "asset_id": str(asset_id),
        "allocated_to_user_id": str(user_id) if user_id else None,
        "allocated_to_department_id": str(dept_id) if dept_id else None,
        "allocated_date": str(date.today()),
        "expected_return_date": expected_return,
        "actual_return_date": None,
        "return_condition_notes": None,
        "status": "active",
    }


def return_allocation(allocation_id, notes):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT asset_id FROM allocations WHERE allocation_id = %s AND status = 'Active'
    """, (allocation_id,))
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        return None

    asset_id = row[0]
    cursor.execute("""
        UPDATE allocations SET
            status = 'Returned', actual_return_date = CURRENT_DATE,
            return_condition_notes = %s
        WHERE allocation_id = %s
    """, (notes, allocation_id))
    cursor.execute(
        "UPDATE assets SET status = 'Available', current_holder_user_id = NULL WHERE asset_id = %s",
        (asset_id,),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return True
