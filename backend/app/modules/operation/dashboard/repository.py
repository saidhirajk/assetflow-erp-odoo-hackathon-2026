from app.database.connection import get_connection


def get_overview_counts(user):
    conn = get_connection()
    cursor = conn.cursor()
    role = user["role"]
    dept_id = user.get("department_id")

    if role in ("Admin", "Asset Manager"):
        cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'Available'")
        available = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'Allocated'")
        allocated = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'Under Maintenance'")
        maintenance = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM bookings WHERE status IN ('Upcoming','Ongoing')")
        active_bookings = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM transfers WHERE status = 'Requested'")
        pending_transfers = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM allocations WHERE status = 'Active' AND expected_return_date < CURRENT_DATE")
        overdue = cursor.fetchone()[0]
    elif role == "Department Head" and dept_id:
        cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'Available' AND department_id = %s", (dept_id,))
        available = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'Allocated' AND department_id = %s", (dept_id,))
        allocated = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'Under Maintenance' AND department_id = %s", (dept_id,))
        maintenance = cursor.fetchone()[0]
        cursor.execute("""
            SELECT COUNT(*) FROM bookings b
            JOIN assets a ON a.asset_id = b.asset_id
            WHERE b.status IN ('Upcoming','Ongoing') AND a.department_id = %s
        """, (dept_id,))
        active_bookings = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM transfers WHERE status = 'Requested' AND from_user_id IN (SELECT user_id FROM users WHERE department_id = %s)", (dept_id,))
        pending_transfers = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM allocations WHERE status = 'Active' AND allocated_to_department_id = %s AND expected_return_date < CURRENT_DATE", (dept_id,))
        overdue = cursor.fetchone()[0]
    else:
        uid = user["user_id"]
        cursor.execute("SELECT COUNT(*) FROM allocations WHERE allocated_to_user_id = %s AND status = 'Active'", (uid,))
        available = 0
        allocated = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM maintenance_requests WHERE raised_by_user_id = %s AND status NOT IN ('Resolved','Rejected')", (uid,))
        maintenance = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM bookings WHERE booked_by_user_id = %s AND status IN ('Upcoming','Ongoing')", (uid,))
        active_bookings = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM transfers WHERE requested_by = %s AND status = 'Requested'", (uid,))
        pending_transfers = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM allocations WHERE allocated_to_user_id = %s AND status = 'Active' AND expected_return_date < CURRENT_DATE", (uid,))
        overdue = cursor.fetchone()[0]

    cursor.close()
    conn.close()
    return {
        "available": available,
        "allocated": allocated,
        "maintenance": maintenance,
        "activeBookings": active_bookings,
        "pendingTransfers": pending_transfers,
        "overdue": overdue,
    }
