-- Phase 4: Audit cycles, reports, and activity-log helpers.
-- All functions use write_activity() and notify_user() from Phase 3.
-- UI calls these through the backend adapter only.

-- ============ AUDIT CYCLE — CREATE ============
CREATE OR REPLACE FUNCTION public.create_audit_cycle(
  _name text,
  _scope_department_id uuid DEFAULT NULL,
  _scope_location text DEFAULT NULL,
  _start_date date DEFAULT CURRENT_DATE,
  _end_date date DEFAULT CURRENT_DATE + 30,
  _auditor_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cycle_id uuid;
  auditor_id uuid;
  inserted_count int;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager')) THEN
    RAISE EXCEPTION 'Only Admin or Asset Manager can create audit cycles';
  END IF;

  INSERT INTO public.audit_cycles (name, scope_department_id, scope_location, start_date, end_date, status, created_by)
  VALUES (_name, _scope_department_id, _scope_location, _start_date, _end_date, 'draft', auth.uid())
  RETURNING id INTO cycle_id;

  -- Add auditors
  FOREACH auditor_id IN ARRAY _auditor_ids LOOP
    INSERT INTO public.audit_auditors (audit_id, user_id)
    VALUES (cycle_id, auditor_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Auto-populate audit_items with one row per matching asset (TDD §2.9)
  INSERT INTO public.audit_items (audit_id, asset_id, result)
  SELECT cycle_id, a.id, 'pending'
  FROM public.assets a
  WHERE a.status NOT IN ('retired', 'disposed')
    AND (_scope_department_id IS NULL OR a.department_id = _scope_department_id)
    AND (_scope_location IS NULL OR a.location = _scope_location);

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  PERFORM public.write_activity(
    'Created audit cycle "' || _name || '" with ' || inserted_count || ' assets',
    'Audit',
    cycle_id::text,
    jsonb_build_object('asset_count', inserted_count)
  );

  RETURN jsonb_build_object('ok', true, 'audit_id', cycle_id, 'asset_count', inserted_count);
END $$;

-- ============ AUDIT CYCLE — START ============
CREATE OR REPLACE FUNCTION public.start_audit_cycle(_audit_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cycle_row public.audit_cycles%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager')) THEN
    RAISE EXCEPTION 'Only Admin or Asset Manager can start audit cycles';
  END IF;

  SELECT * INTO cycle_row FROM public.audit_cycles WHERE id = _audit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Audit cycle not found';
  END IF;

  IF cycle_row.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft cycles can be started';
  END IF;

  UPDATE public.audit_cycles SET status = 'in_progress' WHERE id = _audit_id;

  PERFORM public.write_activity('Started audit cycle "' || cycle_row.name || '"', 'Audit', _audit_id::text, '{}'::jsonb);

  RETURN jsonb_build_object('ok', true);
END $$;

-- ============ AUDIT ITEM — MARK ============
CREATE OR REPLACE FUNCTION public.mark_audit_item(
  _item_id uuid,
  _result public.audit_result,
  _notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  item_row public.audit_items%ROWTYPE;
  cycle_status public.audit_cycle_status;
BEGIN
  SELECT * INTO item_row FROM public.audit_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Audit item not found';
  END IF;

  -- Check cycle is not closed (TDD §2.10: backend must reject further edits)
  SELECT status INTO cycle_status FROM public.audit_cycles WHERE id = item_row.audit_id;
  IF cycle_status = 'closed' THEN
    RAISE EXCEPTION 'Cannot modify items in a closed audit cycle';
  END IF;

  -- Only assigned auditors, admin, or asset_manager can mark
  IF NOT (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'asset_manager')
    OR EXISTS (SELECT 1 FROM public.audit_auditors WHERE audit_id = item_row.audit_id AND user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Only assigned auditors can mark audit items';
  END IF;

  UPDATE public.audit_items
  SET result = _result,
      notes = COALESCE(NULLIF(_notes, ''), notes),
      marked_by_user_id = auth.uid(),
      updated_at = now()
  WHERE id = _item_id;

  PERFORM public.write_activity(
    'Marked audit item as ' || _result::text,
    'Audit',
    _item_id::text,
    jsonb_build_object('audit_id', item_row.audit_id, 'asset_id', item_row.asset_id)
  );

  RETURN jsonb_build_object('ok', true);
END $$;

-- ============ AUDIT CYCLE — CLOSE (CRITICAL BUSINESS RULE TDD §2.10 #6) ============
CREATE OR REPLACE FUNCTION public.close_audit_cycle(_audit_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cycle_row public.audit_cycles%ROWTYPE;
  missing_count int;
  damaged_count int;
  total_items int;
  verified_count int;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager')) THEN
    RAISE EXCEPTION 'Only Admin or Asset Manager can close audit cycles';
  END IF;

  SELECT * INTO cycle_row FROM public.audit_cycles WHERE id = _audit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Audit cycle not found';
  END IF;

  IF cycle_row.status = 'closed' THEN
    RAISE EXCEPTION 'Audit cycle is already closed';
  END IF;

  -- (a) Bulk-update every asset whose audit_items.result = 'missing' to assets.status = 'lost'
  UPDATE public.assets
  SET status = 'lost'
  WHERE id IN (
    SELECT asset_id FROM public.audit_items
    WHERE audit_id = _audit_id AND result = 'missing'
  );

  -- (b) Set audit_cycles.status = 'closed' — after this, items become read-only
  UPDATE public.audit_cycles
  SET status = 'closed', closed_at = now()
  WHERE id = _audit_id;

  -- (c) Generate discrepancy counts for the report
  SELECT
    COUNT(*) FILTER (WHERE result = 'missing'),
    COUNT(*) FILTER (WHERE result = 'damaged'),
    COUNT(*) FILTER (WHERE result = 'verified'),
    COUNT(*)
  INTO missing_count, damaged_count, verified_count, total_items
  FROM public.audit_items
  WHERE audit_id = _audit_id;

  -- Notify auditors about closure
  PERFORM public.notify_user(
    aa.user_id,
    'audit_discrepancy',
    'Audit cycle "' || cycle_row.name || '" has been closed. ' || missing_count || ' missing, ' || damaged_count || ' damaged.',
    _audit_id::text,
    'audit'
  )
  FROM public.audit_auditors aa
  WHERE aa.audit_id = _audit_id;

  PERFORM public.write_activity(
    'Closed audit cycle "' || cycle_row.name || '": ' || missing_count || ' missing, ' || damaged_count || ' damaged',
    'Audit',
    _audit_id::text,
    jsonb_build_object('missing', missing_count, 'damaged', damaged_count, 'verified', verified_count, 'total', total_items)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'missing_count', missing_count,
    'damaged_count', damaged_count,
    'verified_count', verified_count,
    'total_items', total_items
  );
END $$;

-- ============ REPORT — UTILIZATION (allocation count per asset) ============
CREATE OR REPLACE FUNCTION public.get_report_utilization()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT
      a.id AS asset_id,
      a.asset_tag,
      a.name AS asset_name,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      COUNT(al.id) AS allocation_count,
      COUNT(b.id) AS booking_count
    FROM public.assets a
    LEFT JOIN public.asset_categories c ON c.id = a.category_id
    LEFT JOIN public.allocations al ON al.asset_id = a.id
    LEFT JOIN public.bookings b ON b.asset_id = a.id AND b.status <> 'cancelled'
    GROUP BY a.id, a.asset_tag, a.name, c.name
    ORDER BY (COUNT(al.id) + COUNT(b.id)) DESC
    LIMIT 50
  ) t
$$;

-- ============ REPORT — MAINTENANCE FREQUENCY ============
CREATE OR REPLACE FUNCTION public.get_report_maintenance_frequency()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT
      COALESCE(c.name, 'Uncategorized') AS category_name,
      COUNT(mr.id) AS request_count,
      COUNT(mr.id) FILTER (WHERE mr.status = 'resolved') AS resolved_count,
      COUNT(mr.id) FILTER (WHERE mr.priority IN ('high','critical')) AS high_priority_count
    FROM public.maintenance_requests mr
    LEFT JOIN public.assets a ON a.id = mr.asset_id
    LEFT JOIN public.asset_categories c ON c.id = a.category_id
    GROUP BY c.name
    ORDER BY COUNT(mr.id) DESC
  ) t
$$;

-- ============ REPORT — DEPARTMENT ALLOCATION SUMMARY ============
CREATE OR REPLACE FUNCTION public.get_report_department_allocation()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT
      d.name AS department_name,
      COUNT(al.id) AS active_allocation_count,
      COUNT(DISTINCT al.asset_id) AS unique_assets
    FROM public.allocations al
    JOIN public.departments d ON d.id = al.allocated_to_department_id
    WHERE al.status IN ('active','overdue')
    GROUP BY d.name
    UNION ALL
    SELECT
      COALESCE(d.name, 'Individual') AS department_name,
      COUNT(al.id) AS active_allocation_count,
      COUNT(DISTINCT al.asset_id) AS unique_assets
    FROM public.allocations al
    LEFT JOIN public.profiles p ON p.id = al.allocated_to_user_id
    LEFT JOIN public.departments d ON d.id = p.department_id
    WHERE al.status IN ('active','overdue')
      AND al.allocated_to_user_id IS NOT NULL
    GROUP BY d.name
    ORDER BY active_allocation_count DESC
  ) t
$$;

-- ============ REPORT — BOOKING HEATMAP ============
CREATE OR REPLACE FUNCTION public.get_report_booking_heatmap()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT
      EXTRACT(DOW FROM start_time)::int AS day_of_week,
      EXTRACT(HOUR FROM start_time)::int AS hour_of_day,
      COUNT(*) AS booking_count
    FROM public.bookings
    WHERE status <> 'cancelled'
    GROUP BY day_of_week, hour_of_day
    ORDER BY day_of_week, hour_of_day
  ) t
$$;
