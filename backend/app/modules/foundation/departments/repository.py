from app.database.connection import get_connection


def get_departments():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            department_id,
            name,
            code,
            status
        FROM departments
        ORDER BY department_id;
    """)

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    return rows


def create_department(department):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO departments
        (name,code)

        VALUES(%s,%s)

        RETURNING department_id;
    """,(department.name,department.code))

    department_id = cursor.fetchone()[0]

    conn.commit()

    cursor.close()
    conn.close()

    return department_id