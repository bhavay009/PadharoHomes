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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  // The free-tier backend can be asleep (cold start ~30-60s). A single fetch
  // may hang and fail ("Load failed") before it wakes — so we retry network
  // errors a few times with patience, and use a long per-attempt timeout.
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // A real server response (4xx/5xx) — don't retry, surface the message.
        throw new ApiError(data.detail || `Request failed: ${res.status}`, res.status);
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err; // server responded — real error
      lastErr = err; // network/timeout — backend may be waking; retry
      if (attempt < 3) await sleep(3000 + attempt * 3000);
    }
  }
  throw new Error(
    "Couldn't reach the server. It may be waking up — please wait a moment and try again."
  );
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const getHealth = () => request("/health");
// `id` is { email } or { phone }.
export const requestOtp = (id) =>
  request("/auth/request-otp", { method: "POST", body: id });
export const verifyOtp = (id, code) =>
  request("/auth/verify-otp", { method: "POST", body: { ...id, code } });
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

// ---- Public storefront (no auth) ----
export function browseUnits(filters = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== "" && v !== null && v !== undefined) p.set(k, v);
  }
  return request(`/public/units?${p.toString()}`);
}
export const getPublicUnit = (id) => request(`/public/units/${id}`);
export function getPublicQuote(id, checkIn, checkOut) {
  const p = new URLSearchParams({ check_in: checkIn, check_out: checkOut });
  return request(`/public/units/${id}/quote?${p}`);
}
export const createBooking = (unitId, body) =>
  request(`/public/units/${unitId}/bookings`, { method: "POST", body });
export const getUnitReviews = (unitId) =>
  request(`/public/units/${unitId}/reviews`);
export const createReview = (body) =>
  request("/reviews", { method: "POST", body, auth: true });
export const payBooking = (bookingId) =>
  request(`/public/bookings/${bookingId}/pay`, { method: "POST" });
export const cancelBooking = (bookingId) =>
  request(`/public/bookings/${bookingId}/cancel`, { method: "POST" });
export const getBooking = (bookingId) =>
  request(`/public/bookings/${bookingId}`);

// ---- Availability & pricing ----
export const listBlocks = (unitId) =>
  request(`/units/${unitId}/blocks`, { auth: true });
export const createBlock = (unitId, body) =>
  request(`/units/${unitId}/blocks`, { method: "POST", body, auth: true });
export const deleteBlock = (unitId, blockId) =>
  request(`/units/${unitId}/blocks/${blockId}`, { method: "DELETE", auth: true });

export const listRates = (unitId) =>
  request(`/units/${unitId}/rates`, { auth: true });
export const createRate = (unitId, body) =>
  request(`/units/${unitId}/rates`, { method: "POST", body, auth: true });
export const deleteRate = (unitId, rateId) =>
  request(`/units/${unitId}/rates/${rateId}`, { method: "DELETE", auth: true });

export function getQuote(unitId, checkIn, checkOut) {
  const p = new URLSearchParams({ check_in: checkIn, check_out: checkOut });
  return request(`/units/${unitId}/quote?${p}`, { auth: true });
}
export function getCalendar(unitId, start, end) {
  const p = new URLSearchParams({ start, end });
  return request(`/units/${unitId}/calendar?${p}`, { auth: true });
}

// ---- Host bookings & metrics ----
export function listHostBookings({ status, unit_id, limit = 50, offset = 0 } = {}) {
  const p = new URLSearchParams();
  if (status) p.set("status", status);
  if (unit_id) p.set("unit_id", unit_id);
  p.set("limit", limit);
  p.set("offset", offset);
  return request(`/bookings?${p.toString()}`, { auth: true });
}
export const checkInBooking = (id) =>
  request(`/bookings/${id}/check-in`, { method: "POST", auth: true });
export const completeBooking = (id, balance_collected) =>
  request(`/bookings/${id}/complete`, { method: "POST", body: { balance_collected }, auth: true });
export const noShowBooking = (id) =>
  request(`/bookings/${id}/no-show`, { method: "POST", auth: true });
export const hostCancelBooking = (id) =>
  request(`/bookings/${id}/cancel`, { method: "POST", auth: true });
export const getMetrics = () => request("/dashboard/metrics", { auth: true });
export const getTrips = () => request("/trips", { auth: true });

// ---- Admin ----
export const adminStats = () => request("/admin/stats", { auth: true });
export const adminHosts = () => request("/admin/hosts", { auth: true });
export const adminUnits = (status) =>
  request(`/admin/units${status ? `?status=${status}` : ""}`, { auth: true });
export const adminBookings = () => request("/admin/bookings", { auth: true });
export const adminReviews = () => request("/admin/reviews", { auth: true });
export const adminSetUnitStatus = (id, status) =>
  request(`/admin/units/${id}/status?status=${status}`, { method: "PATCH", auth: true });
export const adminDeleteReview = (id) =>
  request(`/admin/reviews/${id}`, { method: "DELETE", auth: true });

// ---- Host profile ----
export const getProfile = () => request("/me/profile", { auth: true });
export const updateProfile = (body) =>
  request("/me/profile", { method: "PATCH", body, auth: true });
export const getUnitHost = (unitId) => request(`/public/units/${unitId}/host`);
export async function uploadAvatar(file) {
  const form = new FormData();
  form.append("file", file);
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/me/avatar`, { method: "POST", headers, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Upload failed: ${res.status}`);
  return data;
}

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
