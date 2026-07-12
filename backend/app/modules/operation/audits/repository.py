from app.database.connection import get_connection


def list_cycles():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ac.audit_id, ac.scope_department_id, ac.scope_location,
               ac.start_date, ac.end_date, ac.status,
               d.name as dept_name
        FROM audit_cycles ac
        LEFT JOIN departments d ON d.department_id = ac.scope_department_id
        ORDER BY ac.audit_id DESC
    """)
    rows = cursor.fetchall()

    result = []
    for row in rows:
        cycle_id = row[0]
        cursor2 = conn.cursor()
        cursor2.execute("""
            SELECT ai.asset_id, a.asset_tag, a.name, ai.result, ai.notes, ai.marked_by_user_id
            FROM audit_items ai
            LEFT JOIN assets a ON a.asset_id = ai.asset_id
            WHERE ai.audit_id = %s
        """, (cycle_id,))
        items = cursor2.fetchall()
        cursor2.close()

        auditor_cursor = conn.cursor()
        auditor_cursor.execute("""
            SELECT u.user_id, u.name FROM audit_auditors aa
            JOIN users u ON u.user_id = aa.user_id
            WHERE aa.audit_id = %s
        """, (cycle_id,))
        auditors = [{"id": str(a[0]), "name": a[1]} for a in auditor_cursor.fetchall()]
        auditor_cursor.close()

        missing = sum(1 for i in items if i[3] == "Missing")
        damaged = sum(1 for i in items if i[3] == "Damaged")
        verified = sum(1 for i in items if i[3] == "Verified")

        result.append({
            "id": str(cycle_id),
            "scope_department_id": str(row[1]) if row[1] else None,
            "scope_location": row[2],
            "start_date": str(row[3]),
            "end_date": str(row[4]),
            "status": row[5].lower(),
            "department_name": row[6],
            "auditors": auditors,
            "total_items": len(items),
            "verified": verified,
            "missing": missing,
            "damaged": damaged,
            "items": [
                {
                    "id": str(i[0]),
                    "asset_id": str(i[0]),
                    "asset_tag": i[1],
                    "asset_name": i[2],
                    "result": i[3].lower() if i[3] else "pending",
                    "notes": i[4],
                    "marked_by_user_id": str(i[5]) if i[5] else None,
                }
                for i in items
            ],
        })
    cursor.close()
    conn.close()
    return result


def create_cycle(scope_department_id, scope_location, start_date, end_date, auditor_user_ids):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO audit_cycles (scope_department_id, scope_location, start_date, end_date, status)
        VALUES (%s, %s, %s, %s, 'Draft')
        RETURNING audit_id
    """, (scope_department_id, scope_location or None, start_date, end_date))
    audit_id = cursor.fetchone()[0]

    for uid in auditor_user_ids:
        cursor.execute(
            "INSERT INTO audit_auditors (audit_id, user_id) VALUES (%s, %s)",
            (audit_id, int(uid)),
        )

    where = "1=1"
    params = []
    if scope_department_id:
        where = "a.department_id = %s"
        params.append(int(scope_department_id))
    elif scope_location:
        where = "a.location ILIKE %s"
        params.append(f"%{scope_location}%")

    cursor.execute(f"""
        INSERT INTO audit_items (audit_id, asset_id, marked_by_user_id, result)
        SELECT %s, a.asset_id, NULL, 'Pending'
        FROM assets a WHERE {where}
    """, [audit_id] + params)

    cursor.execute("UPDATE audit_cycles SET status = 'In Progress' WHERE audit_id = %s", (audit_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return audit_id


def mark_item(audit_id, asset_id, user_id, result, notes):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE audit_items SET result = %s, notes = %s, marked_by_user_id = %s
        WHERE audit_id = %s AND asset_id = %s
    """, (result.title(), notes, user_id, audit_id, asset_id))
    conn.commit()
    cursor.close()
    conn.close()


def close_cycle(audit_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT status FROM audit_cycles WHERE audit_id = %s", (audit_id,))
    row = cursor.fetchone()
    if not row or row[0] != "In Progress":
        cursor.close()
        conn.close()
        return None

    cursor.execute("""
        UPDATE assets SET status = 'Lost'
        WHERE asset_id IN (
            SELECT asset_id FROM audit_items WHERE audit_id = %s AND result = 'Missing'
        )
    """, (audit_id,))

    cursor.execute("""
        UPDATE audit_items SET notes = COALESCE(notes || ' | ', '') || 'Damaged during audit'
        WHERE audit_id = %s AND result = 'Damaged'
    """, (audit_id,))

    cursor.execute("UPDATE audit_cycles SET status = 'Closed' WHERE audit_id = %s", (audit_id,))
    conn.commit()

    cursor.execute("""
        SELECT ai.result, a.asset_tag, a.name, ai.notes
        FROM audit_items ai
        LEFT JOIN assets a ON a.asset_id = ai.asset_id
        WHERE ai.audit_id = %s AND ai.result IN ('Missing', 'Damaged')
    """, (audit_id,))
    discrepancies = [
        {"result": r[0], "asset_tag": r[1], "asset_name": r[2], "notes": r[3]}
        for r in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"discrepancies": discrepancies, "count": len(discrepancies)}
