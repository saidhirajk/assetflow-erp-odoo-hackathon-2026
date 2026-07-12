from app.database.connection import get_connection


def get_all_users():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.user_id, u.name, u.email, u.role, u.department_id, u.status,
               d.name as dept_name
        FROM users u
        LEFT JOIN departments d ON d.department_id = u.department_id
        ORDER BY u.user_id
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    result = []
    for row in rows:
        result.append({
            "id": str(row[0]),
            "name": row[1],
            "email": row[2],
            "department_id": str(row[4]) if row[4] else None,
            "status": row[5].lower(),
            "roles": [row[3].lower().replace(" ", "_")],
        })
    return result


def get_active_users():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT user_id, name, email, department_id
        FROM users
        WHERE status = 'Active'
        ORDER BY name
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [
        {
            "id": str(row[0]),
            "name": row[1],
            "email": row[2],
            "department_id": str(row[3]) if row[3] else None,
        }
        for row in rows
    ]


def update_user_role(user_id, role):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET role = %s WHERE user_id = %s",
        (role, user_id),
    )
    conn.commit()
    cursor.close()
    conn.close()
