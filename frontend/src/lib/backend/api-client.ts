const ACCESS_TOKEN_KEY = "assetflow.access-token";
export const AUTH_STATE_EVENT = "assetflow:auth-state";
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "");

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAccessToken() {
  return isBrowser() ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null;
}

export function setAccessToken(token: string) {
  if (isBrowser()) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT, { detail: "SIGNED_IN" }));
  }
}

export function clearAccessToken() {
  if (isBrowser()) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT, { detail: "SIGNED_OUT" }));
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error("Unable to reach the Sampada API. Check that the local backend is running.");
  }

  const payload = await response.json().catch(() => null) as ApiResponse<T> | null;
  if (!response.ok || !payload?.success) {
    if (response.status === 401) clearAccessToken();
    throw new Error(payload?.message || "The request could not be completed.");
  }
  return payload.data;
}
