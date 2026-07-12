from app.database.connection import get_connection


def get_all_reports(user):
    conn = get_connection()
    cursor = conn.cursor()

    role = user["role"]
    user_id = user["user_id"]
    dept_id = user.get("department_id")

    # Build scope filter based on role
    asset_filter = ""
    asset_params = []
    booking_filter = ""
    booking_params = []
    maintenance_filter = ""
    maintenance_params = []
    retirement_filter = ""
    retirement_params = []

    if role == "Employee":
        # Employee: only their own allocated assets
        asset_filter = "AND a.current_holder_user_id = %s"
        asset_params = [user_id]
        booking_filter = "AND b.booked_by_user_id = %s"
        booking_params = [user_id]
        maintenance_filter = "AND m.raised_by_user_id = %s"
        maintenance_params = [user_id]
        retirement_filter = "AND a.current_holder_user_id = %s"
        retirement_params = [user_id]
    elif role == "Department Head" and dept_id:
        # Dept Head: all assets in their department
        asset_filter = "AND a.department_id = %s"
        asset_params = [dept_id]
        booking_filter = ""  # bookings don't have dept column, show all
        booking_params = []
        maintenance_filter = ""  # maintenance shows org-wide for dept heads
        maintenance_params = []
        retirement_filter = "AND a.department_id = %s"
        retirement_params = [dept_id]
    # Admin and Asset Manager: no filter (see everything)

    # 1. Department-wise allocation summary
    if role == "Employee":
        # Employee sees their own allocations grouped by department
        cursor.execute(f"""
            SELECT COALESCE(d.name, 'Unassigned'), COUNT(a.asset_id),
                   SUM(CASE WHEN a.status = 'Allocated' THEN 1 ELSE 0 END),
                   SUM(CASE WHEN a.status = 'Available' THEN 1 ELSE 0 END)
            FROM assets a
            LEFT JOIN departments d ON d.department_id = a.department_id
            WHERE a.current_holder_user_id = %s
            GROUP BY d.name ORDER BY COUNT(a.asset_id) DESC
        """, [user_id])
    else:
        cursor.execute(f"""
            SELECT COALESCE(d.name, 'Unassigned'), COUNT(a.asset_id),
                   SUM(CASE WHEN a.status = 'Allocated' THEN 1 ELSE 0 END),
                   SUM(CASE WHEN a.status = 'Available' THEN 1 ELSE 0 END)
            FROM assets a
            LEFT JOIN departments d ON d.department_id = a.department_id
            WHERE 1=1 {asset_filter}
            GROUP BY d.name ORDER BY COUNT(a.asset_id) DESC
        """, asset_params)
    dept_summary = [{"department": r[0], "total": r[1], "allocated": r[2], "available": r[3]} for r in cursor.fetchall()]

    # 2. Category distribution
    cursor.execute(f"""
        SELECT COALESCE(c.name, 'Uncategorized'), COUNT(a.asset_id)
        FROM assets a
        LEFT JOIN asset_categories c ON c.category_id = a.category_id
        WHERE 1=1 {asset_filter}
        GROUP BY c.name ORDER BY COUNT(a.asset_id) DESC
    """, asset_params)
    category_dist = [{"category": r[0], "count": r[1]} for r in cursor.fetchall()]

    # 3. Asset status breakdown
    if role == "Employee":
        cursor.execute("""
            SELECT status, COUNT(*) FROM assets
            WHERE current_holder_user_id = %s
            GROUP BY status ORDER BY COUNT(*) DESC
        """, [user_id])
    else:
        cursor.execute(f"""
            SELECT status, COUNT(*) FROM assets
            WHERE 1=1 {asset_filter}
            GROUP BY status ORDER BY COUNT(*) DESC
        """, asset_params)
    status_breakdown = [{"status": r[0], "count": r[1]} for r in cursor.fetchall()]

    # 4. Maintenance frequency by category
    cursor.execute(f"""
        SELECT COALESCE(c.name, 'Uncategorized'), COUNT(m.request_id),
               SUM(CASE WHEN m.status = 'Resolved' THEN 1 ELSE 0 END),
               SUM(CASE WHEN m.status IN ('Pending','Approved') THEN 1 ELSE 0 END)
        FROM maintenance_requests m
        LEFT JOIN assets a ON a.asset_id = m.asset_id
        LEFT JOIN asset_categories c ON c.category_id = a.category_id
        WHERE 1=1 {maintenance_filter}
        GROUP BY c.name ORDER BY COUNT(m.request_id) DESC
    """, maintenance_params)
    maintenance_freq = [{"category": r[0], "total": r[1], "resolved": r[2], "pending": r[3]} for r in cursor.fetchall()]

    # 5. Nearing retirement
    cursor.execute(f"""
        SELECT a.asset_tag, a.name, a.acquisition_date, a.condition, COALESCE(c.name, 'Uncategorized')
        FROM assets a
        LEFT JOIN asset_categories c ON c.category_id = a.category_id
        WHERE a.acquisition_date IS NOT NULL
          AND a.acquisition_date < CURRENT_DATE - INTERVAL '5 years'
          AND a.status NOT IN ('Retired', 'Disposed', 'Lost')
          {retirement_filter}
        ORDER BY a.acquisition_date ASC
    """, retirement_params)
    nearing_retirement = [
        {"asset_tag": r[0], "name": r[1], "acquisition_date": str(r[2]), "condition": r[3], "category": r[4]}
        for r in cursor.fetchall()
    ]

    # 6. Booking heatmap
    cursor.execute(f"""
        SELECT EXTRACT(DOW FROM b.start_time), EXTRACT(HOUR FROM b.start_time), COUNT(*)
        FROM bookings b
        WHERE b.status != 'Cancelled' {booking_filter}
        GROUP BY EXTRACT(DOW FROM b.start_time), EXTRACT(HOUR FROM b.start_time)
        ORDER BY EXTRACT(DOW FROM b.start_time), EXTRACT(HOUR FROM b.start_time)
    """, booking_params)
    heatmap = [{"day": int(r[0]), "hour": int(r[1]), "count": r[2]} for r in cursor.fetchall()]

    # 7. Overall stats (role-scoped)
    if role == "Employee":
        cursor.execute("SELECT COUNT(*) FROM assets WHERE current_holder_user_id = %s", [user_id])
        total_assets = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'Allocated' AND current_holder_user_id = %s", [user_id])
        total_allocated = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM maintenance_requests WHERE raised_by_user_id = %s AND status NOT IN ('Resolved','Rejected')", [user_id])
        open_maintenance = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM bookings WHERE booked_by_user_id = %s AND status IN ('Upcoming','Ongoing')", [user_id])
        active_bookings = cursor.fetchone()[0]
    elif role == "Department Head" and dept_id:
        cursor.execute("SELECT COUNT(*) FROM assets WHERE department_id = %s", [dept_id])
        total_assets = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'Allocated' AND department_id = %s", [dept_id])
        total_allocated = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM maintenance_requests WHERE status NOT IN ('Resolved','Rejected')")
        open_maintenance = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM bookings WHERE status IN ('Upcoming','Ongoing')")
        active_bookings = cursor.fetchone()[0]
    else:
        cursor.execute("SELECT COUNT(*) FROM assets")
        total_assets = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'Allocated'")
        total_allocated = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM maintenance_requests WHERE status NOT IN ('Resolved','Rejected')")
        open_maintenance = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM bookings WHERE status IN ('Upcoming','Ongoing')")
        active_bookings = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    return {
        "departmentSummary": dept_summary,
        "categoryDistribution": category_dist,
        "statusBreakdown": status_breakdown,
        "maintenanceFrequency": maintenance_freq,
        "nearingRetirement": nearing_retirement,
        "bookingHeatmap": heatmap,
        "overallStats": {
            "totalAssets": total_assets,
            "totalAllocated": total_allocated,
            "openMaintenance": open_maintenance,
            "activeBookings": active_bookings,
        },
        "scope": role,
    }
