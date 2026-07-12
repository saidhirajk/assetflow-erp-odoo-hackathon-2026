import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

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
  if (error) {
    if (error.message.includes("Auth session missing")) return null;
    throw error;
  }
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

export interface DepartmentRecord {
  id: string;
  name: string;
  code: string;
  head_user_id: string | null;
  parent_department_id: string | null;
  status: "active" | "inactive";
}

export interface DepartmentUpsertInput {
  name: string;
  code: string;
  head_user_id: string | null;
  parent_department_id: string | null;
  status: "active" | "inactive";
}

export async function listDepartmentsForSetup(): Promise<DepartmentRecord[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("id,name,code,head_user_id,parent_department_id,status")
    .order("name");
  if (error) throw error;
  return (data ?? []) as DepartmentRecord[];
}

export async function createDepartment(input: DepartmentUpsertInput) {
  const { data, error } = await supabase
    .from("departments")
    .insert({
      name: input.name,
      code: input.code,
      head_user_id: input.head_user_id,
      parent_department_id: input.parent_department_id,
      status: input.status,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function updateDepartment(id: string, input: Partial<DepartmentUpsertInput>) {
  const { error } = await supabase
    .from("departments")
    .update(input)
    .eq("id", id);

  if (error) throw error;
}

export interface AssetCategoryRecord {
  id: string;
  name: string;
  custom_fields: unknown;
  status: "active" | "inactive";
}

export interface AssetCategoryUpsertInput {
  name: string;
  custom_fields: Json;
  status: "active" | "inactive";
}

export async function listAssetCategories(): Promise<AssetCategoryRecord[]> {
  const { data, error } = await supabase
    .from("asset_categories")
    .select("id,name,custom_fields,status")
    .order("name");
  if (error) throw error;
  return (data ?? []) as AssetCategoryRecord[];
}

export async function createAssetCategory(input: AssetCategoryUpsertInput) {
  const { data, error } = await supabase
    .from("asset_categories")
    .insert({
      name: input.name,
      custom_fields: input.custom_fields,
      status: input.status,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function updateAssetCategory(id: string, input: Partial<AssetCategoryUpsertInput>) {
  const { error } = await supabase
    .from("asset_categories")
    .update(input)
    .eq("id", id);

  if (error) throw error;
}

export interface AssetDirectoryRecord {
  id: string;
  asset_tag: string;
  name: string;
  serial_number: string | null;
  qr_code: string | null;
  status: "available" | "allocated" | "reserved" | "under_maintenance" | "lost" | "retired" | "disposed";
  is_bookable: boolean;
  location: string | null;
  condition: string;
  category: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
}

export type AssetCustomFieldDefinition = {
  name: string;
  type: "text" | "number" | "date";
};

export interface AssetRegistrationInput {
  name: string;
  category_id: string | null;
  department_id: string | null;
  serial_number: string;
  acquisition_date: string | null;
  acquisition_cost: number | null;
  condition: "new" | "good" | "fair" | "poor";
  location: string;
  is_bookable: boolean;
  photo_url: string;
  customValues: Record<string, string>;
}

export interface AssetUpdateInput {
  name: string;
  category_id: string | null;
  department_id: string | null;
  serial_number: string;
  acquisition_date: string | null;
  acquisition_cost: number | null;
  condition: "new" | "good" | "fair" | "poor";
  location: string;
  is_bookable: boolean;
  photo_url: string;
  customValues: Record<string, string>;
  status: AssetDirectoryRecord["status"];
}

export async function listAssetsForDirectory(): Promise<AssetDirectoryRecord[]> {
  const { data, error } = await supabase
    .from("assets")
    .select(
      "id,asset_tag,name,serial_number,qr_code,status,is_bookable,location,condition,category:asset_categories(id,name),department:departments(id,name)",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((asset) => ({
    ...asset,
    status: asset.status as AssetDirectoryRecord["status"],
    category: Array.isArray(asset.category) ? asset.category[0] ?? null : (asset.category as AssetDirectoryRecord["category"]),
    department: Array.isArray(asset.department) ? asset.department[0] ?? null : (asset.department as AssetDirectoryRecord["department"]),
  })) as AssetDirectoryRecord[];
}

export async function createAsset(input: AssetRegistrationInput) {
  const { data, error } = await supabase
    .from("assets")
    .insert({
      asset_tag: "",
      name: input.name,
      category_id: input.category_id,
      department_id: input.department_id,
      serial_number: input.serial_number || null,
      acquisition_date: input.acquisition_date || null,
      acquisition_cost: input.acquisition_cost,
      condition: input.condition,
      location: input.location || null,
      is_bookable: input.is_bookable,
      photo_url: input.photo_url || null,
      custom_values: input.customValues,
      document_urls: [],
      status: "available",
      qr_code: "",
    })
    .select("id,asset_tag")
    .single();

  if (error) throw error;
  return data;
}

export async function updateAsset(assetId: string, input: AssetUpdateInput) {
  const { error } = await supabase
    .from("assets")
    .update({
      name: input.name,
      category_id: input.category_id,
      department_id: input.department_id,
      serial_number: input.serial_number || null,
      acquisition_date: input.acquisition_date || null,
      acquisition_cost: input.acquisition_cost,
      condition: input.condition,
      location: input.location || null,
      is_bookable: input.is_bookable,
      photo_url: input.photo_url || null,
      custom_values: input.customValues,
      status: input.status,
    })
    .eq("id", assetId);

  if (error) throw error;
}

export async function getAssetById(assetId: string) {
  const { data, error } = await supabase
    .from("assets")
    .select(
      "id,asset_tag,name,serial_number,qr_code,status,is_bookable,location,condition,category:asset_categories(id,name,custom_fields),department:departments(id,name),custom_values,acquisition_date,acquisition_cost,photo_url,current_holder_user_id",
    )
    .eq("id", assetId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listAssetAllocationHistory(assetId: string) {
  const { data, error } = await supabase
    .from("allocations")
    .select("id,allocated_date,expected_return_date,actual_return_date,return_condition_notes,status,allocated_to_user_id,allocated_to_department_id")
    .eq("asset_id", assetId)
    .order("allocated_date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listAssetMaintenanceHistory(assetId: string) {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .select("id,issue_description,priority,status,created_at,resolved_at,technician_name")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export interface EmployeeDirectoryRecord {
  id: string;
  name: string;
  email: string;
  department_id: string | null;
  status: "active" | "inactive";
  roles: AppRole[];
}

export async function listEmployeeDirectory(): Promise<EmployeeDirectoryRecord[]> {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("id,name,email,department_id,status").order("name"),
    supabase.from("user_roles").select("user_id,role").order("created_at"),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (rolesRes.error) throw rolesRes.error;

  const rolesByUser = new Map<string, AppRole[]>();
  for (const row of rolesRes.data ?? []) {
    const role = row.role as AppRole;
    const userId = row.user_id as string;
    const current = rolesByUser.get(userId) ?? [];
    if (!current.includes(role)) current.push(role);
    rolesByUser.set(userId, current);
  }

  return (profilesRes.data ?? []).map((profile) => ({
    ...profile,
    status: profile.status as "active" | "inactive",
    roles: rolesByUser.get(profile.id) ?? ["employee"],
  })) as EmployeeDirectoryRecord[];
}

export async function setUserRole(userId: string, role: AppRole) {
  const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("user_roles").insert({ user_id: userId, role });
  if (insertError) throw insertError;
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