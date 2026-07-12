from app.database.connection import get_connection


def list_bookings():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            b.booking_id, b.asset_id, b.booked_by_user_id,
            b.start_time, b.end_time, b.purpose, b.status, b.created_at,
            a.asset_tag, a.name as asset_name,
            u.name as user_name, u.email as user_email
        FROM bookings b
        LEFT JOIN assets a ON a.asset_id = b.asset_id
        LEFT JOIN users u ON u.user_id = b.booked_by_user_id
        ORDER BY b.start_time DESC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    result = []
    for row in rows:
        result.append({
            "id": str(row[0]),
            "asset_id": str(row[1]),
            "booked_by_user_id": str(row[2]),
            "start_time": str(row[3]) if row[3] else None,
            "end_time": str(row[4]) if row[4] else None,
            "purpose": row[5],
            "status": row[6].lower(),
            "created_at": str(row[7]) if row[7] else None,
            "asset": {
                "id": str(row[1]),
                "asset_tag": row[8],
                "name": row[9],
            } if row[8] else None,
            "bookedBy": {
                "id": str(row[2]),
                "name": row[10],
                "email": row[11],
            } if row[10] else None,
        })
    return result


def check_overlap(asset_id, start_time, end_time):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT booking_id FROM bookings
        WHERE asset_id = %s
          AND status IN ('Upcoming', 'Ongoing')
          AND start_time < %s
          AND end_time > %s
    """, (asset_id, end_time, start_time))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row is not None


def create_booking(asset_id, user_id, start_time, end_time, purpose):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO bookings (asset_id, booked_by_user_id, start_time, end_time, purpose, status)
        VALUES (%s, %s, %s, %s, %s, 'Upcoming')
        RETURNING booking_id, created_at
    """, (asset_id, user_id, start_time, end_time, purpose))
    bid, created_at = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()

    return {
        "id": str(bid),
        "asset_id": str(asset_id),
        "booked_by_user_id": str(user_id),
        "start_time": str(start_time),
        "end_time": str(end_time),
        "purpose": purpose,
        "status": "upcoming",
        "created_at": str(created_at),
    }


def cancel_booking(booking_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE bookings SET status = 'Cancelled' WHERE booking_id = %s AND status IN ('Upcoming','Ongoing')",
        (booking_id,),
    )
    affected = cursor.rowcount
    conn.commit()
    cursor.close()
    conn.close()
    return affected > 0
