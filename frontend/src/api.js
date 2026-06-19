// Central API client. Base URL comes from VITE_API_URL (see .env.example),
// defaulting to the local dev backend. Nothing host-specific is hardcoded
// beyond the documented local default.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function getHealth() {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export { API_URL };
