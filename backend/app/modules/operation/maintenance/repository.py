from app.database.connection import get_connection


def list_maintenance():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            m.request_id, m.asset_id, m.raised_by_user_id,
            m.issue_description, m.priority, m.photo_url, m.status,
            m.approved_by, m.technician_name, m.resolution_notes,
            m.created_at, m.resolved_at,
            a.asset_tag, a.name as asset_name,
            u.name as raised_by_name, u.email as raised_by_email
        FROM maintenance_requests m
        LEFT JOIN assets a ON a.asset_id = m.asset_id
        LEFT JOIN users u ON u.user_id = m.raised_by_user_id
        ORDER BY m.created_at DESC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    result = []
    for row in rows:
        result.append({
            "id": str(row[0]),
            "asset_id": str(row[1]),
            "raised_by_user_id": str(row[2]),
            "issue_description": row[3],
            "priority": row[4].lower(),
            "photo_url": row[5],
            "status": row[6].lower().replace(" ", "_"),
            "approved_by": str(row[7]) if row[7] else None,
            "technician_name": row[8],
            "resolution_notes": row[9],
            "created_at": str(row[10]) if row[10] else None,
            "resolved_at": str(row[11]) if row[11] else None,
            "asset": {
                "id": str(row[1]),
                "asset_tag": row[12],
                "name": row[13],
            } if row[12] else None,
            "raisedBy": {
                "id": str(row[2]),
                "name": row[14],
                "email": row[15],
            } if row[14] else None,
        })
    return result


def create_maintenance(asset_id, user_id, issue_description, priority, photo_url):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO maintenance_requests (asset_id, raised_by_user_id, issue_description, priority, photo_url)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING request_id, created_at
    """, (asset_id, user_id, issue_description, priority.title() if priority else "Medium", photo_url or None))
    rid, created_at = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return {
        "id": str(rid),
        "asset_id": str(asset_id),
        "raised_by_user_id": str(user_id),
        "issue_description": issue_description,
        "priority": priority.lower(),
        "status": "pending",
        "created_at": str(created_at),
    }


def update_maintenance_status(request_id, new_status, technician_name=None, resolution_notes=None, approved_by=None):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT asset_id, status FROM maintenance_requests WHERE request_id = %s", (request_id,))
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        return None

    asset_id = row[0]
    status_db = new_status.replace("_", " ").title()

    cursor.execute("""
        UPDATE maintenance_requests SET status = %s, technician_name = COALESCE(%s, technician_name),
               resolution_notes = COALESCE(%s, resolution_notes), approved_by = COALESCE(%s, approved_by)
        WHERE request_id = %s
    """, (status_db, technician_name, resolution_notes, approved_by, request_id))

    if status_db == "Approved":
        cursor.execute("UPDATE assets SET status = 'Under Maintenance' WHERE asset_id = %s", (asset_id,))
    elif status_db == "Resolved":
        cursor.execute("UPDATE assets SET status = 'Available' WHERE asset_id = %s", (asset_id,))
        cursor.execute("UPDATE maintenance_requests SET resolved_at = NOW() WHERE request_id = %s", (request_id,))

    conn.commit()
    cursor.close()
    conn.close()
    return True
