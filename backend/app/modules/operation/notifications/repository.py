from app.database.connection import get_connection


def list_notifications(user_id, limit=100):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT notification_id, type, message, reference_id, is_read, created_at
        FROM notifications WHERE user_id = %s
        ORDER BY created_at DESC LIMIT %s
    """, (user_id, limit))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "id": str(r[0]),
            "type": r[1],
            "message": r[2],
            "reference_id": r[3],
            "is_read": r[4],
            "created_at": str(r[5]) if r[5] else None,
        }
        for r in rows
    ]


def count_unread(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) FROM notifications WHERE user_id = %s AND is_read = FALSE",
        (user_id,),
    )
    count = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return count


def mark_read(notification_id, user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE notifications SET is_read = TRUE WHERE notification_id = %s AND user_id = %s",
        (notification_id, user_id),
    )
    conn.commit()
    cursor.close()
    conn.close()


def mark_all_read(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE notifications SET is_read = TRUE WHERE user_id = %s AND is_read = FALSE",
        (user_id,),
    )
    conn.commit()
    cursor.close()
    conn.close()


def create_notification(user_id, notif_type, message, reference_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO notifications (user_id, type, message, reference_id)
        VALUES (%s, %s, %s, %s)
    """, (user_id, notif_type, message, str(reference_id) if reference_id else None))
    conn.commit()
    cursor.close()
    conn.close()
