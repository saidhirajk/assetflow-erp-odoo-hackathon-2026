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

type RpcResult = { data: unknown; error: { message: string } | null };
type RpcInvoker = (fn: string, args?: Record<string, unknown>) => Promise<RpcResult>;

async function callOperationRpc(fn: string, args?: Record<string, unknown>) {
  const rpc = supabase.rpc as unknown as RpcInvoker;
  const { data, error } = await rpc(fn, args);
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

export interface PersonOption {
  id: string;
  name: string;
  email: string;
  department_id: string | null;
}

export async function listActivePeople(): Promise<PersonOption[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,email,department_id")
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return (data ?? []) as PersonOption[];
}

type NamedRecord = { id: string; name: string };
type ProfileRecord = { id: string; name: string; email?: string | null };

async function mapAssets(ids: string[]) {
  if (!ids.length) return new Map<string, AssetDirectoryRecord>();
  const { data, error } = await supabase
    .from("assets")
    .select("id,asset_tag,name,serial_number,qr_code,status,is_bookable,location,condition,category:asset_categories(id,name),department:departments(id,name)")
    .in("id", ids);
  if (error) throw error;
  return new Map(
    ((data ?? []) as AssetDirectoryRecord[]).map((asset) => [
      asset.id,
      {
        ...asset,
        category: Array.isArray(asset.category) ? asset.category[0] ?? null : asset.category,
        department: Array.isArray(asset.department) ? asset.department[0] ?? null : asset.department,
      },
    ]),
  );
}

async function mapProfiles(ids: string[]) {
  if (!ids.length) return new Map<string, ProfileRecord>();
  const { data, error } = await supabase.from("profiles").select("id,name,email").in("id", ids);
  if (error) throw error;
  return new Map(((data ?? []) as ProfileRecord[]).map((profile) => [profile.id, profile]));
}

async function mapDepartments(ids: string[]) {
  if (!ids.length) return new Map<string, NamedRecord>();
  const { data, error } = await supabase.from("departments").select("id,name").in("id", ids);
  if (error) throw error;
  return new Map(((data ?? []) as NamedRecord[]).map((department) => [department.id, department]));
}

function uniqueIds(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

export interface AllocationRecord {
  id: string;
  asset_id: string;
  allocated_to_user_id: string | null;
  allocated_to_department_id: string | null;
  allocated_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  return_condition_notes: string | null;
  status: "active" | "returned" | "overdue";
  asset: AssetDirectoryRecord | null;
  allocatedToUser: ProfileRecord | null;
  allocatedToDepartment: NamedRecord | null;
}

export async function listActiveAllocations(): Promise<AllocationRecord[]> {
  await callOperationRpc("refresh_overdue_allocations");

  const { data, error } = await supabase
    .from("allocations")
    .select("id,asset_id,allocated_to_user_id,allocated_to_department_id,allocated_date,expected_return_date,actual_return_date,return_condition_notes,status")
    .in("status", ["active", "overdue"])
    .order("allocated_date", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Omit<AllocationRecord, "asset" | "allocatedToUser" | "allocatedToDepartment">[];
  const [assets, profiles, departments] = await Promise.all([
    mapAssets(uniqueIds(rows.map((row) => row.asset_id))),
    mapProfiles(uniqueIds(rows.map((row) => row.allocated_to_user_id))),
    mapDepartments(uniqueIds(rows.map((row) => row.allocated_to_department_id))),
  ]);

  return rows.map((row) => ({
    ...row,
    status: row.status as AllocationRecord["status"],
    asset: assets.get(row.asset_id) ?? null,
    allocatedToUser: row.allocated_to_user_id ? profiles.get(row.allocated_to_user_id) ?? null : null,
    allocatedToDepartment: row.allocated_to_department_id ? departments.get(row.allocated_to_department_id) ?? null : null,
  }));
}

export interface AllocationInput {
  asset_id: string;
  allocated_to_user_id: string | null;
  allocated_to_department_id: string | null;
  expected_return_date: string | null;
}

export async function allocateAsset(input: AllocationInput) {
  return callOperationRpc("allocate_asset", {
    _asset_id: input.asset_id,
    _allocated_to_user_id: input.allocated_to_user_id,
    _allocated_to_department_id: input.allocated_to_department_id,
    _expected_return_date: input.expected_return_date,
  });
}

export async function returnAllocation(allocationId: string, notes: string) {
  return callOperationRpc("return_allocation", {
    _allocation_id: allocationId,
    _return_condition_notes: notes,
  });
}

export interface TransferRecord {
  id: string;
  asset_id: string;
  from_user_id: string | null;
  to_user_id: string;
  requested_by: string;
  status: "requested" | "approved" | "rejected" | "completed";
  approved_by: string | null;
  reason: string | null;
  requested_at: string;
  resolved_at: string | null;
  asset: AssetDirectoryRecord | null;
  fromUser: ProfileRecord | null;
  toUser: ProfileRecord | null;
  requestedBy: ProfileRecord | null;
}

export async function listTransfers(): Promise<TransferRecord[]> {
  const { data, error } = await supabase
    .from("transfers")
    .select("id,asset_id,from_user_id,to_user_id,requested_by,status,approved_by,reason,requested_at,resolved_at")
    .order("requested_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Omit<TransferRecord, "asset" | "fromUser" | "toUser" | "requestedBy">[];
  const [assets, profiles] = await Promise.all([
    mapAssets(uniqueIds(rows.map((row) => row.asset_id))),
    mapProfiles(uniqueIds(rows.flatMap((row) => [row.from_user_id, row.to_user_id, row.requested_by]))),
  ]);

  return rows.map((row) => ({
    ...row,
    status: row.status as TransferRecord["status"],
    asset: assets.get(row.asset_id) ?? null,
    fromUser: row.from_user_id ? profiles.get(row.from_user_id) ?? null : null,
    toUser: profiles.get(row.to_user_id) ?? null,
    requestedBy: profiles.get(row.requested_by) ?? null,
  }));
}

export async function requestAssetTransfer(assetId: string, toUserId: string, reason: string) {
  return callOperationRpc("request_asset_transfer", {
    _asset_id: assetId,
    _to_user_id: toUserId,
    _reason: reason,
  });
}

export async function resolveAssetTransfer(transferId: string, approve: boolean) {
  return callOperationRpc("resolve_asset_transfer", {
    _transfer_id: transferId,
    _approve: approve,
  });
}

export interface BookingRecord {
  id: string;
  asset_id: string;
  booked_by_user_id: string;
  start_time: string;
  end_time: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  purpose: string | null;
  created_at: string;
  asset: AssetDirectoryRecord | null;
  bookedBy: ProfileRecord | null;
}

export async function listBookableAssets(): Promise<AssetDirectoryRecord[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("id,asset_tag,name,serial_number,qr_code,status,is_bookable,location,condition,category:asset_categories(id,name),department:departments(id,name)")
    .eq("is_bookable", true)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((asset) => ({
    ...asset,
    status: asset.status as AssetDirectoryRecord["status"],
    category: Array.isArray(asset.category) ? asset.category[0] ?? null : (asset.category as AssetDirectoryRecord["category"]),
    department: Array.isArray(asset.department) ? asset.department[0] ?? null : (asset.department as AssetDirectoryRecord["department"]),
  })) as AssetDirectoryRecord[];
}

export async function listBookings(): Promise<BookingRecord[]> {
  await callOperationRpc("refresh_booking_statuses");

  const { data, error } = await supabase
    .from("bookings")
    .select("id,asset_id,booked_by_user_id,start_time,end_time,status,purpose,created_at")
    .order("start_time", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Omit<BookingRecord, "asset" | "bookedBy">[];
  const [assets, profiles] = await Promise.all([
    mapAssets(uniqueIds(rows.map((row) => row.asset_id))),
    mapProfiles(uniqueIds(rows.map((row) => row.booked_by_user_id))),
  ]);

  return rows.map((row) => ({
    ...row,
    status: row.status as BookingRecord["status"],
    asset: assets.get(row.asset_id) ?? null,
    bookedBy: profiles.get(row.booked_by_user_id) ?? null,
  }));
}

export async function createBooking(input: {
  asset_id: string;
  start_time: string;
  end_time: string;
  purpose: string;
}) {
  return callOperationRpc("create_booking_checked", {
    _asset_id: input.asset_id,
    _start_time: input.start_time,
    _end_time: input.end_time,
    _purpose: input.purpose,
  });
}

export async function cancelBooking(bookingId: string) {
  return callOperationRpc("cancel_booking_checked", { _booking_id: bookingId });
}

export interface MaintenanceRequestRecord {
  id: string;
  asset_id: string;
  raised_by_user_id: string;
  issue_description: string;
  priority: "low" | "medium" | "high" | "critical";
  photo_url: string | null;
  status: "pending" | "approved" | "rejected" | "technician_assigned" | "in_progress" | "resolved";
  approved_by: string | null;
  technician_name: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  asset: AssetDirectoryRecord | null;
  raisedBy: ProfileRecord | null;
}

export async function listMaintenanceRequests(): Promise<MaintenanceRequestRecord[]> {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .select("id,asset_id,raised_by_user_id,issue_description,priority,photo_url,status,approved_by,technician_name,resolution_notes,created_at,resolved_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Omit<MaintenanceRequestRecord, "asset" | "raisedBy">[];
  const [assets, profiles] = await Promise.all([
    mapAssets(uniqueIds(rows.map((row) => row.asset_id))),
    mapProfiles(uniqueIds(rows.map((row) => row.raised_by_user_id))),
  ]);

  return rows.map((row) => ({
    ...row,
    priority: row.priority as MaintenanceRequestRecord["priority"],
    status: row.status as MaintenanceRequestRecord["status"],
    asset: assets.get(row.asset_id) ?? null,
    raisedBy: profiles.get(row.raised_by_user_id) ?? null,
  }));
}

export async function raiseMaintenanceRequest(input: {
  asset_id: string;
  issue_description: string;
  priority: MaintenanceRequestRecord["priority"];
  photo_url: string;
}) {
  return callOperationRpc("raise_maintenance_request", {
    _asset_id: input.asset_id,
    _issue_description: input.issue_description,
    _priority: input.priority,
    _photo_url: input.photo_url,
  });
}

export async function updateMaintenanceStatus(input: {
  request_id: string;
  status: MaintenanceRequestRecord["status"];
  technician_name?: string;
  resolution_notes?: string;
}) {
  return callOperationRpc("update_maintenance_status", {
    _request_id: input.request_id,
    _status: input.status,
    _technician_name: input.technician_name ?? "",
    _resolution_notes: input.resolution_notes ?? "",
  });
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
  await Promise.all([
    callOperationRpc("refresh_overdue_allocations"),
    callOperationRpc("refresh_booking_statuses"),
  ]);

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

// ── Phase 4: Audit Cycles ──────────────────────────────────────

export interface AuditCycleRecord {
  id: string;
  name: string;
  scope_department_id: string | null;
  scope_location: string | null;
  start_date: string;
  end_date: string;
  status: "draft" | "in_progress" | "closed";
  created_by: string | null;
  created_at: string;
  closed_at: string | null;
  department: { id: string; name: string } | null;
  auditorCount: number;
  itemCount: number;
}

export async function listAuditCycles(): Promise<AuditCycleRecord[]> {
  const { data, error } = await supabase
    .from("audit_cycles")
    .select("id,name,scope_department_id,scope_location,start_date,end_date,status,created_by,created_at,closed_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Omit<AuditCycleRecord, "department" | "auditorCount" | "itemCount">[];
  const deptIds = uniqueIds(rows.map((r) => r.scope_department_id));
  const deptMap = await mapDepartments(deptIds);

  // Fetch auditor and item counts
  const cycleIds = rows.map((r) => r.id);
  const [auditorsRes, itemsRes] = await Promise.all([
    cycleIds.length
      ? supabase.from("audit_auditors").select("audit_id").in("audit_id", cycleIds)
      : { data: [], error: null },
    cycleIds.length
      ? supabase.from("audit_items").select("audit_id").in("audit_id", cycleIds)
      : { data: [], error: null },
  ]);

  const auditorCounts = new Map<string, number>();
  for (const row of (auditorsRes.data ?? []) as { audit_id: string }[]) {
    auditorCounts.set(row.audit_id, (auditorCounts.get(row.audit_id) ?? 0) + 1);
  }
  const itemCounts = new Map<string, number>();
  for (const row of (itemsRes.data ?? []) as { audit_id: string }[]) {
    itemCounts.set(row.audit_id, (itemCounts.get(row.audit_id) ?? 0) + 1);
  }

  return rows.map((r) => ({
    ...r,
    status: r.status as AuditCycleRecord["status"],
    department: r.scope_department_id ? deptMap.get(r.scope_department_id) ?? null : null,
    auditorCount: auditorCounts.get(r.id) ?? 0,
    itemCount: itemCounts.get(r.id) ?? 0,
  }));
}

export interface AuditCycleCreateInput {
  name: string;
  scope_department_id: string | null;
  scope_location: string | null;
  start_date: string;
  end_date: string;
  auditor_ids: string[];
}

export async function createAuditCycle(input: AuditCycleCreateInput) {
  return callOperationRpc("create_audit_cycle", {
    _name: input.name,
    _scope_department_id: input.scope_department_id,
    _scope_location: input.scope_location,
    _start_date: input.start_date,
    _end_date: input.end_date,
    _auditor_ids: input.auditor_ids,
  });
}

export async function startAuditCycle(auditId: string) {
  return callOperationRpc("start_audit_cycle", { _audit_id: auditId });
}

export async function closeAuditCycle(auditId: string) {
  return callOperationRpc("close_audit_cycle", { _audit_id: auditId });
}

export interface AuditItemRecord {
  id: string;
  audit_id: string;
  asset_id: string;
  marked_by_user_id: string | null;
  result: "pending" | "verified" | "missing" | "damaged";
  notes: string | null;
  updated_at: string;
  asset: AssetDirectoryRecord | null;
}

export async function listAuditItems(auditId: string): Promise<AuditItemRecord[]> {
  const { data, error } = await supabase
    .from("audit_items")
    .select("id,audit_id,asset_id,marked_by_user_id,result,notes,updated_at")
    .eq("audit_id", auditId)
    .order("updated_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Omit<AuditItemRecord, "asset">[];
  const assetMap = await mapAssets(uniqueIds(rows.map((r) => r.asset_id)));

  return rows.map((r) => ({
    ...r,
    result: r.result as AuditItemRecord["result"],
    asset: assetMap.get(r.asset_id) ?? null,
  }));
}

export async function markAuditItem(itemId: string, result: AuditItemRecord["result"], notes: string) {
  return callOperationRpc("mark_audit_item", {
    _item_id: itemId,
    _result: result,
    _notes: notes,
  });
}

export async function getAuditDiscrepancyReport(auditId: string) {
  const { data, error } = await supabase
    .from("audit_items")
    .select("id,asset_id,result,notes,marked_by_user_id,updated_at")
    .eq("audit_id", auditId)
    .in("result", ["missing", "damaged"])
    .order("result");
  if (error) throw error;

  const rows = data ?? [];
  const assetMap = await mapAssets(uniqueIds(rows.map((r) => r.asset_id)));

  return rows.map((r) => ({
    ...r,
    asset: assetMap.get(r.asset_id) ?? null,
  }));
}

// ── Phase 4: Reports ──────────────────────────────────────

export async function getReportUtilization() {
  return callOperationRpc("get_report_utilization") as Promise<unknown>;
}

export async function getReportMaintenanceFrequency() {
  return callOperationRpc("get_report_maintenance_frequency") as Promise<unknown>;
}

export async function getReportDepartmentAllocation() {
  return callOperationRpc("get_report_department_allocation") as Promise<unknown>;
}

export async function getReportBookingHeatmap() {
  return callOperationRpc("get_report_booking_heatmap") as Promise<unknown>;
}

export async function getReportNearingRetirement(ageThresholdYears = 5) {
  return callOperationRpc("get_report_nearing_retirement", {
    _age_threshold_years: ageThresholdYears,
  }) as Promise<unknown>;
}

// ── Phase 4: Activity Logs ──────────────────────────────────────

export interface ActivityLogRecord {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: unknown;
  created_at: string;
  userName: string | null;
}

export async function listActivityLogs(filters?: {
  entity_type?: string;
  limit?: number;
}): Promise<ActivityLogRecord[]> {
  let query = supabase
    .from("activity_logs")
    .select("id,user_id,action,entity_type,entity_id,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 200);

  if (filters?.entity_type) {
    query = query.eq("entity_type", filters.entity_type);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Omit<ActivityLogRecord, "userName">[];
  const profileMap = await mapProfiles(uniqueIds(rows.map((r) => r.user_id)));

  return rows.map((r) => ({
    ...r,
    userName: r.user_id ? profileMap.get(r.user_id)?.name ?? null : null,
  }));
}
