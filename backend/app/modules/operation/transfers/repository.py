from datetime import date, datetime
from app.database.connection import get_connection


def list_transfers():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            t.transfer_id, t.asset_id, t.from_user_id, t.to_user_id,
            t.requested_by, t.reason, t.status, t.approved_by,
            t.requested_at, t.resolved_at,
            a.asset_tag, a.name as asset_name, a.status as asset_status,
            fu.name as from_name, fu.email as from_email,
            tu.name as to_name, tu.email as to_email,
            ru.name as req_name, ru.email as req_email
        FROM transfers t
        LEFT JOIN assets a ON a.asset_id = t.asset_id
        LEFT JOIN users fu ON fu.user_id = t.from_user_id
        LEFT JOIN users tu ON tu.user_id = t.to_user_id
        LEFT JOIN users ru ON ru.user_id = t.requested_by
        ORDER BY t.transfer_id DESC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    result = []
    for row in rows:
        result.append({
            "id": str(row[0]),
            "asset_id": str(row[1]),
            "from_user_id": str(row[2]) if row[2] else None,
            "to_user_id": str(row[3]),
            "requested_by": str(row[4]),
            "reason": row[5],
            "status": row[6].lower(),
            "approved_by": str(row[7]) if row[7] else None,
            "requested_at": str(row[8]) if row[8] else None,
            "resolved_at": str(row[9]) if row[9] else None,
            "asset": {
                "id": str(row[1]),
                "asset_tag": row[10],
                "name": row[11],
                "status": row[12].lower().replace(" ", "_") if row[12] else None,
            } if row[10] else None,
            "fromUser": {"id": str(row[2]), "name": row[13], "email": row[14]} if row[13] else None,
            "toUser": {"id": str(row[3]), "name": row[15], "email": row[16]} if row[15] else None,
            "requestedBy": {"id": str(row[4]), "name": row[17], "email": row[18]} if row[17] else None,
        })
    return result


def create_transfer(asset_id, to_user_id, requested_by, reason):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT current_holder_user_id FROM assets WHERE asset_id = %s", (asset_id,)
    )
    row = cursor.fetchone()
    from_user_id = row[0] if row else None

    cursor.execute("""
        INSERT INTO transfers (asset_id, from_user_id, to_user_id, requested_by, reason, status)
        VALUES (%s, %s, %s, %s, %s, 'Requested')
        RETURNING transfer_id, requested_at
    """, (asset_id, from_user_id, to_user_id, requested_by, reason))
    tid, requested_at = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()

    return {
        "id": str(tid),
        "asset_id": str(asset_id),
        "from_user_id": str(from_user_id) if from_user_id else None,
        "to_user_id": str(to_user_id),
        "requested_by": str(requested_by),
        "reason": reason,
        "status": "requested",
        "requested_at": str(requested_at),
    }


def resolve_transfer(transfer_id, approve, approved_by):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transfers WHERE transfer_id = %s", (transfer_id,))
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        return None

    asset_id = row[1]
    to_user_id = row[3]

    if approve:
        cursor.execute("""
            UPDATE transfers SET status = 'Completed', approved_by = %s, resolved_at = NOW()
            WHERE transfer_id = %s
        """, (approved_by, transfer_id))

        cursor.execute("""
            UPDATE allocations SET status = 'Returned', actual_return_date = CURRENT_DATE
            WHERE asset_id = %s AND status = 'Active'
        """, (asset_id,))

        cursor.execute("""
            INSERT INTO allocations (asset_id, allocated_to_user_id, allocated_date, status)
            VALUES (%s, %s, CURRENT_DATE, 'Active')
        """, (asset_id, to_user_id))

        cursor.execute(
            "UPDATE assets SET current_holder_user_id = %s WHERE asset_id = %s",
            (to_user_id, asset_id),
        )
    else:
        cursor.execute("""
            UPDATE transfers SET status = 'Rejected', approved_by = %s, resolved_at = NOW()
            WHERE transfer_id = %s
        """, (approved_by, transfer_id))

    conn.commit()
    cursor.close()
    conn.close()
    return True
