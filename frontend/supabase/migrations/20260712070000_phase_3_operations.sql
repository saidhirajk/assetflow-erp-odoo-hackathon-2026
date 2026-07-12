-- Phase 3 operations: transactional business rules for allocations, transfers,
-- bookings, and maintenance. UI calls these through the backend adapter only.

CREATE OR REPLACE FUNCTION public.write_activity(
  _action text,
  _entity_type text,
  _entity_id text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid,
  _type public.notification_type,
  _message text,
  _reference_id text,
  _reference_type text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, message, reference_id, reference_type)
    VALUES (_user_id, _type, _message, _reference_id, _reference_type);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_overdue_allocations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.allocations
  SET status = 'overdue'
  WHERE status = 'active'
    AND expected_return_date IS NOT NULL
    AND expected_return_date < CURRENT_DATE;
END $$;

CREATE OR REPLACE FUNCTION public.allocate_asset(
  _asset_id uuid,
  _allocated_to_user_id uuid,
  _allocated_to_department_id uuid,
  _expected_return_date date DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  active_allocation public.allocations%ROWTYPE;
  asset_row public.assets%ROWTYPE;
  holder_name text;
  allocation_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager')) THEN
    RAISE EXCEPTION 'Only Admin or Asset Manager can allocate assets';
  END IF;

  IF (_allocated_to_user_id IS NULL) = (_allocated_to_department_id IS NULL) THEN
    RAISE EXCEPTION 'Allocate to exactly one employee or department';
  END IF;

  SELECT * INTO asset_row FROM public.assets WHERE id = _asset_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;

  SELECT * INTO active_allocation
  FROM public.allocations
  WHERE asset_id = _asset_id AND status IN ('active','overdue')
  LIMIT 1;

  IF FOUND THEN
    SELECT COALESCE(p.name, d.name, 'Current holder') INTO holder_name
    FROM public.allocations a
    LEFT JOIN public.profiles p ON p.id = a.allocated_to_user_id
    LEFT JOIN public.departments d ON d.id = a.allocated_to_department_id
    WHERE a.id = active_allocation.id;

    RETURN jsonb_build_object(
      'ok', false,
      'code', 'allocation_conflict',
      'active_allocation_id', active_allocation.id,
      'current_holder_user_id', active_allocation.allocated_to_user_id,
      'current_holder_department_id', active_allocation.allocated_to_department_id,
      'current_holder_name', holder_name
    );
  END IF;

  INSERT INTO public.allocations (
    asset_id,
    allocated_to_user_id,
    allocated_to_department_id,
    expected_return_date,
    allocated_by,
    status
  )
  VALUES (
    _asset_id,
    _allocated_to_user_id,
    _allocated_to_department_id,
    _expected_return_date,
    auth.uid(),
    'active'
  )
  RETURNING id INTO allocation_id;

  UPDATE public.assets
  SET status = 'allocated', current_holder_user_id = _allocated_to_user_id
  WHERE id = _asset_id;

  PERFORM public.write_activity(
    'Allocated asset ' || asset_row.asset_tag,
    'Allocation',
    allocation_id::text,
    jsonb_build_object('asset_id', _asset_id)
  );

  PERFORM public.notify_user(
    _allocated_to_user_id,
    'asset_assigned',
    'Asset ' || asset_row.asset_tag || ' has been assigned to you.',
    _asset_id::text,
    'asset'
  );

  RETURN jsonb_build_object('ok', true, 'allocation_id', allocation_id);
END $$;

CREATE OR REPLACE FUNCTION public.return_allocation(
  _allocation_id uuid,
  _return_condition_notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  allocation_row public.allocations%ROWTYPE;
  v_asset_tag text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager')) THEN
    RAISE EXCEPTION 'Only Admin or Asset Manager can return allocations';
  END IF;

  SELECT * INTO allocation_row
  FROM public.allocations
  WHERE id = _allocation_id AND status IN ('active','overdue')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active allocation not found';
  END IF;

  UPDATE public.allocations
  SET status = 'returned',
      actual_return_date = CURRENT_DATE,
      return_condition_notes = _return_condition_notes
  WHERE id = _allocation_id;

  UPDATE public.assets
  SET status = 'available', current_holder_user_id = NULL
  WHERE id = allocation_row.asset_id
  RETURNING asset_tag INTO v_asset_tag;

  PERFORM public.write_activity(
    'Returned asset ' || COALESCE(v_asset_tag, allocation_row.asset_id::text),
    'Allocation',
    _allocation_id::text,
    jsonb_build_object('asset_id', allocation_row.asset_id)
  );

  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.request_asset_transfer(
  _asset_id uuid,
  _to_user_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  asset_row public.assets%ROWTYPE;
  transfer_id uuid;
BEGIN
  SELECT * INTO asset_row FROM public.assets WHERE id = _asset_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;

  INSERT INTO public.transfers (asset_id, from_user_id, to_user_id, requested_by, reason, status)
  VALUES (_asset_id, asset_row.current_holder_user_id, _to_user_id, auth.uid(), _reason, 'requested')
  RETURNING id INTO transfer_id;

  PERFORM public.write_activity(
    'Requested transfer for asset ' || asset_row.asset_tag,
    'Transfer',
    transfer_id::text,
    jsonb_build_object('asset_id', _asset_id)
  );

  RETURN jsonb_build_object('ok', true, 'transfer_id', transfer_id);
END $$;

CREATE OR REPLACE FUNCTION public.resolve_asset_transfer(
  _transfer_id uuid,
  _approve boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  transfer_row public.transfers%ROWTYPE;
  asset_row public.assets%ROWTYPE;
  new_allocation_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager') OR public.has_role(auth.uid(),'department_head')) THEN
    RAISE EXCEPTION 'Only approvers can resolve transfers';
  END IF;

  SELECT * INTO transfer_row FROM public.transfers WHERE id = _transfer_id FOR UPDATE;
  IF NOT FOUND OR transfer_row.status <> 'requested' THEN
    RAISE EXCEPTION 'Pending transfer not found';
  END IF;

  SELECT * INTO asset_row FROM public.assets WHERE id = transfer_row.asset_id FOR UPDATE;

  IF public.has_role(auth.uid(),'department_head')
    AND NOT public.has_role(auth.uid(),'admin')
    AND NOT public.has_role(auth.uid(),'asset_manager')
    AND asset_row.department_id IS DISTINCT FROM public.current_user_department() THEN
    RAISE EXCEPTION 'Department Head can only resolve transfers for their department';
  END IF;

  IF NOT _approve THEN
    UPDATE public.transfers
    SET status = 'rejected', approved_by = auth.uid(), resolved_at = now()
    WHERE id = _transfer_id;

    PERFORM public.notify_user(transfer_row.requested_by, 'transfer_rejected', 'Your transfer request was rejected.', _transfer_id::text, 'transfer');
    PERFORM public.write_activity('Rejected transfer for asset ' || asset_row.asset_tag, 'Transfer', _transfer_id::text, jsonb_build_object('asset_id', asset_row.id));
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;

  UPDATE public.allocations
  SET status = 'returned', actual_return_date = CURRENT_DATE
  WHERE asset_id = transfer_row.asset_id AND status IN ('active','overdue');

  INSERT INTO public.allocations (asset_id, allocated_to_user_id, allocated_by, status)
  VALUES (transfer_row.asset_id, transfer_row.to_user_id, auth.uid(), 'active')
  RETURNING id INTO new_allocation_id;

  UPDATE public.assets
  SET status = 'allocated', current_holder_user_id = transfer_row.to_user_id
  WHERE id = transfer_row.asset_id;

  UPDATE public.transfers
  SET status = 'completed', approved_by = auth.uid(), resolved_at = now()
  WHERE id = _transfer_id;

  PERFORM public.notify_user(transfer_row.to_user_id, 'transfer_approved', 'Transfer approved for asset ' || asset_row.asset_tag || '.', _transfer_id::text, 'transfer');
  PERFORM public.write_activity('Approved transfer for asset ' || asset_row.asset_tag, 'Transfer', _transfer_id::text, jsonb_build_object('asset_id', asset_row.id, 'allocation_id', new_allocation_id));

  RETURN jsonb_build_object('ok', true, 'status', 'completed', 'allocation_id', new_allocation_id);
END $$;

CREATE OR REPLACE FUNCTION public.create_booking_checked(
  _asset_id uuid,
  _start_time timestamptz,
  _end_time timestamptz,
  _purpose text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  asset_row public.assets%ROWTYPE;
  conflict_row public.bookings%ROWTYPE;
  booking_id uuid;
BEGIN
  IF _end_time <= _start_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;

  SELECT * INTO asset_row FROM public.assets WHERE id = _asset_id;
  IF NOT FOUND OR NOT asset_row.is_bookable THEN
    RAISE EXCEPTION 'Asset is not bookable';
  END IF;

  SELECT * INTO conflict_row
  FROM public.bookings
  WHERE asset_id = _asset_id
    AND status IN ('upcoming','ongoing')
    AND _start_time < end_time
    AND _end_time > start_time
  ORDER BY start_time
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'booking_overlap',
      'conflict_start_time', conflict_row.start_time,
      'conflict_end_time', conflict_row.end_time
    );
  END IF;

  INSERT INTO public.bookings (asset_id, booked_by_user_id, start_time, end_time, purpose, status)
  VALUES (_asset_id, auth.uid(), _start_time, _end_time, _purpose, 'upcoming')
  RETURNING id INTO booking_id;

  PERFORM public.notify_user(auth.uid(), 'booking_confirmed', 'Booking confirmed for ' || asset_row.asset_tag || '.', booking_id::text, 'booking');
  PERFORM public.write_activity('Created booking for asset ' || asset_row.asset_tag, 'Booking', booking_id::text, jsonb_build_object('asset_id', _asset_id));

  RETURN jsonb_build_object('ok', true, 'booking_id', booking_id);
END $$;

CREATE OR REPLACE FUNCTION public.cancel_booking_checked(_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  booking_row public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO booking_row FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF booking_row.booked_by_user_id <> auth.uid()
    AND NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager')) THEN
    RAISE EXCEPTION 'You cannot cancel this booking';
  END IF;

  UPDATE public.bookings SET status = 'cancelled' WHERE id = _booking_id;
  PERFORM public.notify_user(booking_row.booked_by_user_id, 'booking_cancelled', 'Booking cancelled.', _booking_id::text, 'booking');
  PERFORM public.write_activity('Cancelled booking', 'Booking', _booking_id::text, jsonb_build_object('asset_id', booking_row.asset_id));

  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.refresh_booking_statuses()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET status = 'ongoing'
  WHERE status = 'upcoming'
    AND now() >= start_time
    AND now() < end_time;

  UPDATE public.bookings
  SET status = 'completed'
  WHERE status IN ('upcoming','ongoing')
    AND now() >= end_time;
END $$;

CREATE OR REPLACE FUNCTION public.raise_maintenance_request(
  _asset_id uuid,
  _issue_description text,
  _priority public.priority_level,
  _photo_url text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  request_id uuid;
  v_asset_tag text;
BEGIN
  INSERT INTO public.maintenance_requests (
    asset_id,
    raised_by_user_id,
    issue_description,
    priority,
    photo_url,
    status
  )
  VALUES (_asset_id, auth.uid(), _issue_description, _priority, NULLIF(_photo_url, ''), 'pending')
  RETURNING id INTO request_id;

  SELECT a.asset_tag INTO v_asset_tag FROM public.assets a WHERE a.id = _asset_id;
  PERFORM public.write_activity('Raised maintenance request for asset ' || COALESCE(v_asset_tag, _asset_id::text), 'Maintenance', request_id::text, jsonb_build_object('asset_id', _asset_id));

  RETURN jsonb_build_object('ok', true, 'request_id', request_id);
END $$;

CREATE OR REPLACE FUNCTION public.update_maintenance_status(
  _request_id uuid,
  _status public.maintenance_status,
  _technician_name text DEFAULT NULL,
  _resolution_notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  request_row public.maintenance_requests%ROWTYPE;
  asset_row public.assets%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager')) THEN
    RAISE EXCEPTION 'Only Admin or Asset Manager can update maintenance';
  END IF;

  SELECT * INTO request_row FROM public.maintenance_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Maintenance request not found';
  END IF;

  SELECT * INTO asset_row FROM public.assets WHERE id = request_row.asset_id FOR UPDATE;

  UPDATE public.maintenance_requests
  SET status = _status,
      approved_by = CASE WHEN _status IN ('approved','rejected') THEN auth.uid() ELSE approved_by END,
      technician_name = COALESCE(NULLIF(_technician_name, ''), technician_name),
      resolution_notes = COALESCE(NULLIF(_resolution_notes, ''), resolution_notes),
      resolved_at = CASE WHEN _status = 'resolved' THEN now() ELSE resolved_at END
  WHERE id = _request_id;

  IF _status = 'approved' THEN
    UPDATE public.assets SET status = 'under_maintenance' WHERE id = request_row.asset_id;
    PERFORM public.notify_user(request_row.raised_by_user_id, 'maintenance_approved', 'Maintenance approved for asset ' || asset_row.asset_tag || '.', _request_id::text, 'maintenance');
  ELSIF _status = 'rejected' THEN
    PERFORM public.notify_user(request_row.raised_by_user_id, 'maintenance_rejected', 'Maintenance rejected for asset ' || asset_row.asset_tag || '.', _request_id::text, 'maintenance');
  ELSIF _status = 'resolved' THEN
    UPDATE public.assets SET status = 'available' WHERE id = request_row.asset_id;
  END IF;

  PERFORM public.write_activity('Updated maintenance status to ' || _status::text, 'Maintenance', _request_id::text, jsonb_build_object('asset_id', request_row.asset_id));

  RETURN jsonb_build_object('ok', true);
END $$;
