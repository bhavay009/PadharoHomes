import { useEffect, useState } from "react";
import { getMe, getToken, clearToken, API_URL } from "./api";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Storefront from "./Storefront";

export default function App() {
  const [mode, setMode] = useState("guest"); // "guest" | "host"
  const [host, setHost] = useState(null);
  const [loading, setLoading] = useState(true);

  // On load, if we have a token, resolve the current host.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    getMe()
      .then(setHost)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    clearToken();
    setHost(null);
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Padharo Homes</h1>
        <nav style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setMode("guest")}
            disabled={mode === "guest"}>Browse stays</button>
          <button onClick={() => setMode("host")}
            disabled={mode === "host"}>Host</button>
        </nav>
      </header>
      <p style={{ color: "#999", fontSize: 12 }}>API <code>{API_URL}</code></p>

      {mode === "guest" ? (
        <Storefront />
      ) : loading ? (
        <p>Loading…</p>
      ) : host ? (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p>Signed in as <strong>{host.email}</strong></p>
            <button onClick={handleLogout}>Sign out</button>
          </div>
          <Dashboard />
        </section>
      ) : (
        <Login onLoggedIn={setHost} />
      )}
    </main>
  );
}
