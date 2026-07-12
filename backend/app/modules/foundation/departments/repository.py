from app.database.connection import get_connection


def get_departments():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT department_id, name, code, head_user_id, parent_department_id, status
        FROM departments ORDER BY department_id
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def create_department(department):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO departments (name, code) VALUES (%s, %s) RETURNING department_id",
        (department.name, department.code),
    )
    department_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    conn.close()
    return department_id


def update_department(department_id, name=None, code=None, head_user_id=None, parent_department_id=None, status=None):
    conn = get_connection()
    cursor = conn.cursor()
    sets, vals = [], []
    if name is not None:
        sets.append("name = %s"); vals.append(name)
    if code is not None:
        sets.append("code = %s"); vals.append(code)
    if head_user_id is not None:
        sets.append("head_user_id = %s"); vals.append(head_user_id)
    if parent_department_id is not None:
        sets.append("parent_department_id = %s"); vals.append(parent_department_id)
    if status is not None:
        sets.append("status = %s"); vals.append(status.title())
    if sets:
        vals.append(department_id)
        cursor.execute(f"UPDATE departments SET {', '.join(sets)} WHERE department_id = %s", vals)
        conn.commit()
    cursor.close()
    conn.close()
