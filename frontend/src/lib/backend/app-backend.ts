import {
  apiRequest,
  AUTH_STATE_EVENT,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./api-client";

export type AppRole = "admin" | "asset_manager" | "department_head" | "employee";
type EntityStatus = "active" | "inactive";

export interface BackendCurrentUser {
  userId: string;
  email: string;
  profile: {
    id: string;
    name: string;
    email: string;
    department_id: string | null;
    status: EntityStatus;
  } | null;
  roles: AppRole[];
}

interface LocalAuthUser {
  id: number;
  name: string;
  email: string;
  department_id: number | null;
  status: EntityStatus;
  role: AppRole;
}

interface LocalAuthResult {
  access_token: string;
  user: LocalAuthUser;
}

function toBackendCurrentUser(user: LocalAuthUser): BackendCurrentUser {
  return {
    userId: String(user.id),
    email: user.email,
    profile: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      department_id: user.department_id === null ? null : String(user.department_id),
      status: user.status,
    },
    roles: [user.role],
  };
}

function jsonRequest(method: "POST" | "PATCH" | "PUT", body: unknown) {
  return { method, body: JSON.stringify(body) } as RequestInit;
}

export async function getAuthSession() {
  const accessToken = getAccessToken();
  return accessToken ? { access_token: accessToken } : null;
}

export async function getAuthUser() {
  if (!getAccessToken()) return null;
  try {
    return await apiRequest<LocalAuthUser>("/auth/me");
  } catch (error) {
    if (error instanceof Error && /session|authentication/i.test(error.message)) return null;
    throw error;
  }
}

export function onAuthStateChange(callback: (event: string, session: unknown) => void | Promise<void>) {
  const listener = (event: Event) => {
    const state = (event as CustomEvent<string>).detail;
    void callback(state, state === "SIGNED_IN" ? getAuthSession() : null);
  };
  if (typeof window !== "undefined") window.addEventListener(AUTH_STATE_EVENT, listener);
  return { data: { subscription: { unsubscribe: () => window.removeEventListener(AUTH_STATE_EVENT, listener) } } };
}

export async function signInWithPassword(email: string, password: string) {
  const result = await apiRequest<LocalAuthResult>("/auth/login", jsonRequest("POST", { email, password }));
  setAccessToken(result.access_token);
  return result;
}

export async function signUpWithPassword(params: {
  email: string; password: string; name: string; department_id?: string | null; emailRedirectTo?: string;
}) {
  const result = await apiRequest<LocalAuthResult>("/auth/signup", jsonRequest("POST", {
    name: params.name,
    email: params.email,
    password: params.password,
    department_id: params.department_id ? Number(params.department_id) : null,
  }));
  setAccessToken(result.access_token);
  return result;
}

export async function signOut() { clearAccessToken(); }
export async function listActiveDepartments() { return apiRequest<{ id: string; name: string }[]>("/departments/active"); }

export interface DepartmentRecord {
  id: string; name: string; code: string; head_user_id: string | null;
  parent_department_id: string | null; status: EntityStatus;
}
export interface DepartmentUpsertInput {
  name: string; code: string; head_user_id: string | null;
  parent_department_id: string | null; status: EntityStatus;
}
export async function listDepartmentsForSetup() { return apiRequest<DepartmentRecord[]>("/departments"); }
export async function createDepartment(input: DepartmentUpsertInput) {
  return apiRequest<{ id: string }>("/departments", jsonRequest("POST", input));
}
export async function updateDepartment(id: string, input: Partial<DepartmentUpsertInput>) {
  return apiRequest<void>(`/departments/${id}`, jsonRequest("PATCH", input));
}

export type AssetCustomFieldDefinition = { name: string; type: "text" | "number" | "date" };
export interface AssetCategoryRecord { id: string; name: string; custom_fields: AssetCustomFieldDefinition[]; status: EntityStatus; }
export interface AssetCategoryUpsertInput { name: string; custom_fields: AssetCustomFieldDefinition[]; status: EntityStatus; }
export async function listAssetCategories() { return apiRequest<AssetCategoryRecord[]>("/categories"); }
export async function createAssetCategory(input: AssetCategoryUpsertInput) {
  return apiRequest<{ id: string }>("/categories", jsonRequest("POST", input));
}
export async function updateAssetCategory(id: string, input: Partial<AssetCategoryUpsertInput>) {
  return apiRequest<void>(`/categories/${id}`, jsonRequest("PATCH", input));
}

export interface AssetDirectoryRecord {
  id: string; asset_tag: string; name: string; serial_number: string | null; qr_code: string | null;
  status: "available" | "allocated" | "reserved" | "under_maintenance" | "lost" | "retired" | "disposed";
  is_bookable: boolean; location: string | null; condition: string;
  category: { id: string; name: string; custom_fields?: AssetCustomFieldDefinition[] } | null;
  department: { id: string; name: string } | null;
}
export interface AssetRegistrationInput {
  name: string; category_id: string | null; department_id: string | null; serial_number: string;
  acquisition_date: string | null; acquisition_cost: number | null; condition: "new" | "good" | "fair" | "poor";
  location: string; is_bookable: boolean; photo_url: string; customValues: Record<string, string>;
}
export interface AssetUpdateInput extends AssetRegistrationInput { status: AssetDirectoryRecord["status"]; }
export async function listAssetsForDirectory() { return apiRequest<AssetDirectoryRecord[]>("/assets"); }
export async function createAsset(input: AssetRegistrationInput) {
  return apiRequest<{ id: string; asset_tag: string }>("/assets", jsonRequest("POST", input));
}
export async function updateAsset(assetId: string, input: AssetUpdateInput) {
  return apiRequest<void>(`/assets/${assetId}`, jsonRequest("PUT", input));
}
export async function getAssetById(assetId: string) { return apiRequest<AssetDirectoryRecord & {
  custom_values: Record<string, string>; acquisition_date: string | null; acquisition_cost: number | null;
  photo_url: string | null; current_holder_user_id: string | null;
} | null>(`/assets/${assetId}`); }
export async function listAssetAllocationHistory(assetId: string) { return apiRequest<AllocationHistoryRecord[]>(`/assets/${assetId}/allocations`); }
export async function listAssetMaintenanceHistory(assetId: string) { return apiRequest<MaintenanceHistoryRecord[]>(`/assets/${assetId}/maintenance`); }

export interface PersonOption { id: string; name: string; email: string; department_id: string | null; }
export async function listActivePeople() { return apiRequest<PersonOption[]>("/users/active"); }
type NamedRecord = { id: string; name: string };
type ProfileRecord = { id: string; name: string; email?: string | null };
export interface AllocationHistoryRecord {
  id: string; allocated_date: string; expected_return_date: string | null; actual_return_date: string | null;
  return_condition_notes: string | null; status: "active" | "returned" | "overdue";
}
export interface AllocationRecord extends AllocationHistoryRecord {
  asset_id: string; allocated_to_user_id: string | null; allocated_to_department_id: string | null;
  asset: AssetDirectoryRecord | null; allocatedToUser: ProfileRecord | null; allocatedToDepartment: NamedRecord | null;
}
export interface AllocationInput { asset_id: string; allocated_to_user_id: string | null; allocated_to_department_id: string | null; expected_return_date: string | null; }
export async function listActiveAllocations() { return apiRequest<AllocationRecord[]>("/allocations?status=active,overdue"); }
export async function allocateAsset(input: AllocationInput) { return apiRequest<AllocationRecord>("/allocations", jsonRequest("POST", input)); }
export async function returnAllocation(allocationId: string, notes: string) {
  return apiRequest<void>(`/allocations/${allocationId}/return`, jsonRequest("POST", { return_condition_notes: notes }));
}

export interface TransferRecord {
  id: string; asset_id: string; from_user_id: string | null; to_user_id: string; requested_by: string;
  status: "requested" | "approved" | "rejected" | "completed"; approved_by: string | null; reason: string | null;
  requested_at: string; resolved_at: string | null; asset: AssetDirectoryRecord | null;
  fromUser: ProfileRecord | null; toUser: ProfileRecord | null; requestedBy: ProfileRecord | null;
}
export async function listTransfers() { return apiRequest<TransferRecord[]>("/transfers"); }
export async function requestAssetTransfer(assetId: string, toUserId: string, reason: string) {
  return apiRequest<TransferRecord>("/transfers", jsonRequest("POST", { asset_id: assetId, to_user_id: toUserId, reason }));
}
export async function resolveAssetTransfer(transferId: string, approve: boolean) {
  return apiRequest<TransferRecord>(`/transfers/${transferId}/resolve`, jsonRequest("POST", { approve }));
}

export interface BookingRecord {
  id: string; asset_id: string; booked_by_user_id: string; start_time: string; end_time: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled"; purpose: string | null; created_at: string;
  asset: AssetDirectoryRecord | null; bookedBy: ProfileRecord | null;
}
export async function listBookableAssets() { return apiRequest<AssetDirectoryRecord[]>("/assets?bookable=true"); }
export async function listBookings() { return apiRequest<BookingRecord[]>("/bookings"); }
export async function createBooking(input: { asset_id: string; start_time: string; end_time: string; purpose: string; }) {
  return apiRequest<BookingRecord>("/bookings", jsonRequest("POST", input));
}
export async function cancelBooking(bookingId: string) { return apiRequest<void>(`/bookings/${bookingId}/cancel`, jsonRequest("POST", {})); }

export interface MaintenanceHistoryRecord {
  id: string; issue_description: string; priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "approved" | "rejected" | "technician_assigned" | "in_progress" | "resolved";
  created_at: string; resolved_at: string | null; technician_name?: string | null;
}
export interface MaintenanceRequestRecord extends MaintenanceHistoryRecord {
  asset_id: string; raised_by_user_id: string; photo_url: string | null; approved_by: string | null;
  technician_name: string | null; resolution_notes: string | null; asset: AssetDirectoryRecord | null; raisedBy: ProfileRecord | null;
}
export async function listMaintenanceRequests() { return apiRequest<MaintenanceRequestRecord[]>("/maintenance"); }
export async function raiseMaintenanceRequest(input: { asset_id: string; issue_description: string; priority: MaintenanceRequestRecord["priority"]; photo_url: string; }) {
  return apiRequest<MaintenanceRequestRecord>("/maintenance", jsonRequest("POST", input));
}
export async function updateMaintenanceStatus(input: { request_id: string; status: MaintenanceRequestRecord["status"]; technician_name?: string; resolution_notes?: string; }) {
  return apiRequest<MaintenanceRequestRecord>(`/maintenance/${input.request_id}`, jsonRequest("PATCH", input));
}

export interface EmployeeDirectoryRecord { id: string; name: string; email: string; department_id: string | null; status: EntityStatus; roles: AppRole[]; }
export async function listEmployeeDirectory() { return apiRequest<EmployeeDirectoryRecord[]>("/users"); }
export async function setUserRole(userId: string, role: AppRole) { return apiRequest<void>(`/users/${userId}/role`, jsonRequest("PATCH", { role })); }

export interface NotificationRecord { id: string; message: string; is_read: boolean; created_at: string; type: string; reference_id?: string | null; }
export async function countUnreadNotifications() { return apiRequest<number>("/notifications/unread-count"); }
export async function listNotifications(limit = 100) { return apiRequest<NotificationRecord[]>(`/notifications?limit=${limit}`); }
export async function markAllNotificationsRead() { return apiRequest<void>("/notifications/mark-all-read", jsonRequest("POST", {})); }
export async function markNotificationRead(id: string) { return apiRequest<void>(`/notifications/${id}/read`, jsonRequest("POST", {})); }

export async function getDashboardOverviewCounts(): Promise<{
  available: number; allocated: number; maintenance: number; activeBookings: number; pendingTransfers: number; overdue: number;
}> { return apiRequest("/dashboard/overview"); }

export async function getCurrentUserSnapshot(): Promise<BackendCurrentUser | null> {
  const user = await getAuthUser();
  return user ? toBackendCurrentUser(user) : null;
}

// --- Audits ---
export interface AuditCycleRecord {
  id: string; scope_department_id: string | null; scope_location: string | null;
  start_date: string; end_date: string; status: string; department_name: string | null;
  auditors: { id: string; name: string }[]; total_items: number;
  verified: number; missing: number; damaged: number;
  items: { id: string; asset_id: string; asset_tag: string; asset_name: string;
    result: string; notes: string | null; marked_by_user_id: string | null }[];
}
export async function listAuditCycles() { return apiRequest<AuditCycleRecord[]>("/audits"); }
export async function createAuditCycle(input: {
  scope_department_id: string | null; scope_location: string;
  start_date: string; end_date: string; auditor_user_ids: string[];
}) { return apiRequest<{ id: string }>("/audits", jsonRequest("POST", input)); }
export async function markAuditItem(auditId: string, assetId: string, result: string, notes: string) {
  return apiRequest<void>(`/audits/${auditId}/items/${assetId}/mark`, jsonRequest("POST", { asset_id: assetId, result, notes }));
}
export async function closeAuditCycle(auditId: string) {
  return apiRequest<{ discrepancies: { result: string; asset_tag: string; asset_name: string; notes: string }[]; count: number }>(
    `/audits/${auditId}/close`, jsonRequest("POST", {}),
  );
}

// --- Reports ---
export interface ReportsData {
  departmentSummary: { department: string; total: number; allocated: number; available: number }[];
  categoryDistribution: { category: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  maintenanceFrequency: { category: string; total: number; resolved: number; pending: number }[];
  nearingRetirement: { asset_tag: string; name: string; acquisition_date: string; condition: string; category: string }[];
  bookingHeatmap: { day: number; hour: number; count: number }[];
  overallStats: { totalAssets: number; totalAllocated: number; openMaintenance: number; activeBookings: number };
  scope: "admin" | "asset_manager" | "department_head" | "employee";
}
export async function getReportsData() { return apiRequest<ReportsData>("/reports"); }
