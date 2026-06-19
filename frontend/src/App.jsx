import { useEffect, useState } from "react";
import { getHealth, API_URL } from "./api";

export default function App() {
  const [status, setStatus] = useState("checking…");
  const [error, setError] = useState(null);

  useEffect(() => {
    getHealth()
      .then((data) => setStatus(`${data.status} (env: ${data.env})`))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Padharo Homes</h1>
      <p>Direct-booking platform — Phase 0 skeleton.</p>
      <section>
        <h2>Backend health</h2>
        <p>
          API: <code>{API_URL}</code>
        </p>
        {error ? (
          <p style={{ color: "crimson" }}>Error: {error}</p>
        ) : (
          <p>
            Status: <strong>{status}</strong>
          </p>
        )}
      </section>
    </main>
  );
}
