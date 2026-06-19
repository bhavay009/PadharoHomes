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

export { API_URL };
