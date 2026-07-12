import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "asset_manager" | "department_head" | "employee";

export interface BackendCurrentUser {
  userId: string;
  email: string;
  profile: {
    id: string;
    name: string;
    email: string;
    department_id: string | null;
    status: "active" | "inactive";
  } | null;
  roles: AppRole[];
}

export async function getAuthSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getAuthUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export function onAuthStateChange(
  callback: (event: string, session: unknown) => void | Promise<void>,
) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    await callback(event, session);
  });
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUpWithPassword(params: {
  email: string;
  password: string;
  name: string;
  department_id?: string | null;
  emailRedirectTo: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      emailRedirectTo: params.emailRedirectTo,
      data: {
        name: params.name,
        department_id: params.department_id ?? "",
      },
    },
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function listActiveDepartments(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("id,name")
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function countUnreadNotifications(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function listNotifications(limit = 100) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function markAllNotificationsRead() {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  if (error) throw error;
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw error;
}

export async function getDashboardOverviewCounts(): Promise<{
  available: number;
  allocated: number;
  maintenance: number;
  activeBookings: number;
  pendingTransfers: number;
  overdue: number;
}> {
  const now = new Date().toISOString();

  const [available, allocated, maintenance, activeBookings, pendingTransfers, overdueAlloc] = await Promise.all([
    supabase.from("assets").select("*", { count: "exact", head: true }).eq("status", "available"),
    supabase.from("assets").select("*", { count: "exact", head: true }).eq("status", "allocated"),
    supabase.from("assets").select("*", { count: "exact", head: true }).eq("status", "under_maintenance"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).in("status", ["upcoming", "ongoing"]).gte("end_time", now),
    supabase.from("transfers").select("*", { count: "exact", head: true }).eq("status", "requested"),
    supabase.from("allocations").select("*", { count: "exact", head: true }).eq("status", "active").lt("expected_return_date", new Date().toISOString().slice(0, 10)),
  ]);

  return {
    available: available.count ?? 0,
    allocated: allocated.count ?? 0,
    maintenance: maintenance.count ?? 0,
    activeBookings: activeBookings.count ?? 0,
    pendingTransfers: pendingTransfers.count ?? 0,
    overdue: overdueAlloc.count ?? 0,
  };
}

export async function getCurrentUserSnapshot(): Promise<BackendCurrentUser | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const [profileRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (rolesRes.error) throw rolesRes.error;

  return {
    userId: user.id,
    email: user.email ?? "",
    profile: profileRes.data ?? null,
    roles: (rolesRes.data ?? []).map((row) => row.role as AppRole),
  };
}