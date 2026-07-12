from app.database.connection import get_connection


USER_FIELDS = """
    user_id, name, email, password_hash, role, department_id, status, created_at
"""


def _to_user(row):
    if row is None:
        return None
    return {
        "user_id": row[0],
        "name": row[1],
        "email": row[2],
        "password_hash": row[3],
        "role": row[4],
        "department_id": row[5],
        "status": row[6],
        "created_at": row[7],
    }


def get_user_by_email(email: str):
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            f"SELECT {USER_FIELDS} FROM users WHERE email = %s;", (email,)
        )
        return _to_user(cursor.fetchone())
    finally:
        cursor.close()
        connection.close()


def get_user_by_id(user_id: int):
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            f"SELECT {USER_FIELDS} FROM users WHERE user_id = %s;", (user_id,)
        )
        return _to_user(cursor.fetchone())
    finally:
        cursor.close()
        connection.close()


def create_employee(name: str, email: str, password_hash: str, department_id: int | None):
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO users (name, email, password_hash, role, department_id)
            VALUES (%s, %s, %s, 'Employee', %s)
            RETURNING user_id;
            """,
            (name.strip(), email, password_hash, department_id),
        )
        user_id = cursor.fetchone()[0]
        connection.commit()
        return get_user_by_id(user_id)
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


def is_active_department(department_id: int) -> bool:
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "SELECT EXISTS(SELECT 1 FROM departments WHERE department_id = %s AND status = 'Active');",
            (department_id,),
        )
        return cursor.fetchone()[0]
    finally:
        cursor.close()
        connection.close()
