import json
from app.database.connection import get_connection


def get_all_categories():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT category_id, name, custom_fields, status FROM asset_categories ORDER BY category_id"
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    result = []
    for row in rows:
        cf = row[2]
        if isinstance(cf, str):
            cf = json.loads(cf)
        result.append({
            "id": str(row[0]),
            "name": row[1],
            "custom_fields": cf or [],
            "status": row[3].lower(),
        })
    return result


def create_category(name, custom_fields, status):
    conn = get_connection()
    cursor = conn.cursor()
    status_db = status.title() if status else "Active"
    cursor.execute(
        "INSERT INTO asset_categories (name, custom_fields, status) VALUES (%s, %s, %s) RETURNING category_id",
        (name, json.dumps(custom_fields), status_db),
    )
    cid = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    conn.close()
    return cid


def update_category(category_id, name=None, custom_fields=None, status=None):
    conn = get_connection()
    cursor = conn.cursor()
    sets = []
    vals = []
    if name is not None:
        sets.append("name = %s")
        vals.append(name)
    if custom_fields is not None:
        sets.append("custom_fields = %s")
        vals.append(json.dumps(custom_fields))
    if status is not None:
        sets.append("status = %s")
        vals.append(status.title())
    if not sets:
        cursor.close()
        conn.close()
        return
    vals.append(category_id)
    cursor.execute(
        f"UPDATE asset_categories SET {', '.join(sets)} WHERE category_id = %s", vals
    )
    conn.commit()
    cursor.close()
    conn.close()
