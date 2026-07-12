
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','asset_manager','department_head','employee');
CREATE TYPE public.entity_status AS ENUM ('active','inactive');
CREATE TYPE public.asset_condition AS ENUM ('new','good','fair','poor');
CREATE TYPE public.asset_status AS ENUM ('available','allocated','reserved','under_maintenance','lost','retired','disposed');
CREATE TYPE public.allocation_status AS ENUM ('active','returned','overdue');
CREATE TYPE public.transfer_status AS ENUM ('requested','approved','rejected','completed');
CREATE TYPE public.booking_status AS ENUM ('upcoming','ongoing','completed','cancelled');
CREATE TYPE public.priority_level AS ENUM ('low','medium','high','critical');
CREATE TYPE public.maintenance_status AS ENUM ('pending','approved','rejected','technician_assigned','in_progress','resolved');
CREATE TYPE public.audit_cycle_status AS ENUM ('draft','in_progress','closed');
CREATE TYPE public.audit_result AS ENUM ('pending','verified','missing','damaged');
CREATE TYPE public.notification_type AS ENUM (
  'asset_assigned','maintenance_approved','maintenance_rejected',
  'booking_confirmed','booking_cancelled','booking_reminder',
  'transfer_requested','transfer_approved','transfer_rejected',
  'overdue_return','audit_discrepancy'
);

-- ============ DEPARTMENTS ============
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  head_user_id uuid,
  parent_department_id uuid REFERENCES public.departments(id),
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  department_id uuid REFERENCES public.departments(id),
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add FK for department head after profiles exists
ALTER TABLE public.departments
  ADD CONSTRAINT departments_head_fk FOREIGN KEY (head_user_id) REFERENCES public.profiles(id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'asset_manager' THEN 2 WHEN 'department_head' THEN 3 ELSE 4 END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_department()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT department_id FROM public.profiles WHERE id = auth.uid() $$;

-- ============ ASSET CATEGORIES ============
CREATE TABLE public.asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{name,type}]
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_categories TO authenticated;
GRANT ALL ON public.asset_categories TO service_role;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;

-- ============ ASSETS ============
CREATE SEQUENCE public.asset_tag_seq START 1;
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_tag text NOT NULL UNIQUE,
  name text NOT NULL,
  category_id uuid REFERENCES public.asset_categories(id),
  serial_number text,
  qr_code text,
  acquisition_date date,
  acquisition_cost numeric(12,2),
  condition public.asset_condition NOT NULL DEFAULT 'new',
  location text,
  department_id uuid REFERENCES public.departments(id),
  status public.asset_status NOT NULL DEFAULT 'available',
  is_bookable boolean NOT NULL DEFAULT false,
  photo_url text,
  document_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  custom_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_holder_user_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.assets(status);
CREATE INDEX ON public.assets(department_id);
CREATE INDEX ON public.assets(category_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_asset_tag()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.asset_tag IS NULL OR NEW.asset_tag = '' THEN
    NEW.asset_tag := 'AF-' || LPAD(nextval('public.asset_tag_seq')::text, 4, '0');
  END IF;
  IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
    NEW.qr_code := NEW.asset_tag;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_set_asset_tag BEFORE INSERT ON public.assets FOR EACH ROW EXECUTE FUNCTION public.set_asset_tag();

-- ============ ALLOCATIONS ============
CREATE TABLE public.allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  allocated_to_user_id uuid REFERENCES public.profiles(id),
  allocated_to_department_id uuid REFERENCES public.departments(id),
  allocated_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date date,
  actual_return_date date,
  return_condition_notes text,
  status public.allocation_status NOT NULL DEFAULT 'active',
  allocated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((allocated_to_user_id IS NOT NULL) <> (allocated_to_department_id IS NOT NULL))
);
CREATE INDEX ON public.allocations(asset_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allocations TO authenticated;
GRANT ALL ON public.allocations TO service_role;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;

-- ============ TRANSFERS ============
CREATE TABLE public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id),
  from_user_id uuid REFERENCES public.profiles(id),
  to_user_id uuid NOT NULL REFERENCES public.profiles(id),
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  status public.transfer_status NOT NULL DEFAULT 'requested',
  approved_by uuid REFERENCES public.profiles(id),
  reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfers TO authenticated;
GRANT ALL ON public.transfers TO service_role;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- ============ BOOKINGS ============
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id),
  booked_by_user_id uuid NOT NULL REFERENCES public.profiles(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'upcoming',
  purpose text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX ON public.bookings(asset_id, start_time, end_time);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- ============ MAINTENANCE ============
CREATE TABLE public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id),
  raised_by_user_id uuid NOT NULL REFERENCES public.profiles(id),
  issue_description text NOT NULL,
  priority public.priority_level NOT NULL DEFAULT 'medium',
  photo_url text,
  status public.maintenance_status NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES public.profiles(id),
  technician_name text,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_requests TO authenticated;
GRANT ALL ON public.maintenance_requests TO service_role;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- ============ AUDITS ============
CREATE TABLE public.audit_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scope_department_id uuid REFERENCES public.departments(id),
  scope_location text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status public.audit_cycle_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_cycles TO authenticated;
GRANT ALL ON public.audit_cycles TO service_role;
ALTER TABLE public.audit_cycles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_auditors (
  audit_id uuid NOT NULL REFERENCES public.audit_cycles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  PRIMARY KEY (audit_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_auditors TO authenticated;
GRANT ALL ON public.audit_auditors TO service_role;
ALTER TABLE public.audit_auditors ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.audit_cycles(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets(id),
  marked_by_user_id uuid REFERENCES public.profiles(id),
  result public.audit_result NOT NULL DEFAULT 'pending',
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(audit_id, asset_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_items TO authenticated;
GRANT ALL ON public.audit_items TO service_role;
ALTER TABLE public.audit_items ENABLE ROW LEVEL SECURITY;

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  message text NOT NULL,
  reference_id text,
  reference_type text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notifications(user_id, is_read);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============ ACTIVITY LOGS ============
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.activity_logs(created_at DESC);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles: everyone authenticated can read (need names in dropdowns/listings); user can update own; admin can update all
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles: users can read own; only admin can modify (enforced by policy). No INSERT/UPDATE policy for non-admins.
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_write" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- departments: all read; admin write
CREATE POLICY "dept_select_all" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "dept_admin_write" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- categories: all read; admin write
CREATE POLICY "cat_select_all" ON public.asset_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "cat_admin_write" ON public.asset_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- assets: all authenticated can read; asset_manager or admin can write
CREATE POLICY "assets_select_all" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "assets_mgr_write" ON public.assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager'));

-- allocations: readable to admin/mgr, dept head for their dept, or the user holding the asset
CREATE POLICY "alloc_select_scoped" ON public.allocations FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'asset_manager')
  OR allocated_to_user_id = auth.uid()
  OR (public.has_role(auth.uid(),'department_head') AND allocated_to_department_id = public.current_user_department())
);
CREATE POLICY "alloc_mgr_write" ON public.allocations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager'));

-- transfers: readable if involved or manager
CREATE POLICY "transfers_select" ON public.transfers FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager')
  OR from_user_id = auth.uid() OR to_user_id = auth.uid() OR requested_by = auth.uid()
);
CREATE POLICY "transfers_insert_self" ON public.transfers FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());
CREATE POLICY "transfers_mgr_update" ON public.transfers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager') OR public.has_role(auth.uid(),'department_head'))
  WITH CHECK (true);

-- bookings: read all, users create own, users update own (cancel), mgr all
CREATE POLICY "bookings_select_all" ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "bookings_insert_self" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (booked_by_user_id = auth.uid());
CREATE POLICY "bookings_update_own_or_mgr" ON public.bookings FOR UPDATE TO authenticated
  USING (booked_by_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager'))
  WITH CHECK (true);
CREATE POLICY "bookings_delete_own_or_mgr" ON public.bookings FOR DELETE TO authenticated
  USING (booked_by_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- maintenance: all read; user can insert; asset_manager/admin update
CREATE POLICY "maint_select_all" ON public.maintenance_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "maint_insert_self" ON public.maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (raised_by_user_id = auth.uid());
CREATE POLICY "maint_mgr_update" ON public.maintenance_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager'))
  WITH CHECK (true);

-- audits
CREATE POLICY "audit_cycles_select" ON public.audit_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_cycles_mgr_write" ON public.audit_cycles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager'));

CREATE POLICY "audit_auditors_select" ON public.audit_auditors FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_auditors_mgr_write" ON public.audit_auditors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager'));

CREATE POLICY "audit_items_select" ON public.audit_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_items_update_auditor" ON public.audit_items FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager')
    OR EXISTS (SELECT 1 FROM public.audit_auditors aa WHERE aa.audit_id = audit_items.audit_id AND aa.user_id = auth.uid())
  ) WITH CHECK (true);
CREATE POLICY "audit_items_mgr_ins_del" ON public.audit_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'asset_manager'));

-- notifications: own only
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- activity_logs: admin all, dept head dept-scoped, user own
CREATE POLICY "logs_select" ON public.activity_logs FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR user_id = auth.uid()
  OR public.has_role(auth.uid(),'asset_manager')
);
CREATE POLICY "logs_insert_self" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ============ AUTO CREATE PROFILE + EMPLOYEE ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE dept uuid;
BEGIN
  BEGIN
    dept := NULLIF(NEW.raw_user_meta_data->>'department_id','')::uuid;
  EXCEPTION WHEN others THEN dept := NULL;
  END;

  INSERT INTO public.profiles (id, name, email, department_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    dept
  );
  -- ALWAYS employee on signup — role elevation only via admin flow
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee');
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
