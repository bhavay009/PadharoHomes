import { useEffect, useState } from "react";
import { getMe, getToken, clearToken, API_URL } from "./api";
import Login from "./Login";
import Dashboard from "./Dashboard";

export default function App() {
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
      <h1>Padharo Homes</h1>
      <p style={{ color: "#666" }}>
        Direct-booking platform · API <code>{API_URL}</code>
      </p>

      {loading ? (
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
