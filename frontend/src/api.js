// Central API client. Base URL comes from VITE_API_URL (see .env.example),
// defaulting to the local dev backend.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TOKEN_KEY = "padharo_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Request failed: ${res.status}`);
  }
  return data;
}

export const getHealth = () => request("/health");
export const requestOtp = (email) =>
  request("/auth/request-otp", { method: "POST", body: { email } });
export const verifyOtp = (email, code) =>
  request("/auth/verify-otp", { method: "POST", body: { email, code } });
export const getMe = () => request("/auth/me", { auth: true });

// ---- Units ----
export function listUnits({ q, city, status, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (city) params.set("city", city);
  if (status) params.set("status", status);
  params.set("limit", limit);
  params.set("offset", offset);
  return request(`/units?${params.toString()}`, { auth: true });
}
export const createUnit = (body) =>
  request("/units", { method: "POST", body, auth: true });
export const getUnit = (id) => request(`/units/${id}`, { auth: true });
export const updateUnit = (id, body) =>
  request(`/units/${id}`, { method: "PATCH", body, auth: true });
export const deleteUnit = (id) =>
  request(`/units/${id}`, { method: "DELETE", auth: true });
export const bulkUpdateUnits = (body) =>
  request("/units/bulk", { method: "POST", body, auth: true });

export async function uploadPhoto(unitId, file) {
  const form = new FormData();
  form.append("file", file);
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/units/${unitId}/photos`, {
    method: "POST",
    headers,
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Upload failed: ${res.status}`);
  return data;
}

export { API_URL };
