import { useCallback, useEffect, useState } from "react";
import { listUnits, deleteUnit } from "./api";
import UnitForm from "./UnitForm";
import UnitCalendar from "./UnitCalendar";

export default function Dashboard() {
  const [units, setUnits] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ q: "", city: "", status: "" });
  const [editing, setEditing] = useState(undefined); // undefined=none, null=new, obj=edit
  const [calendarUnit, setCalendarUnit] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listUnits(filters);
      setUnits(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id) {
    if (!confirm("Delete this unit?")) return;
    await deleteUnit(id);
    load();
  }

  if (calendarUnit) {
    return <UnitCalendar unit={calendarUnit} onBack={() => setCalendarUnit(null)} />;
  }

  if (editing !== undefined) {
    return (
      <UnitForm
        unit={editing}
        onSaved={() => {
          setEditing(undefined);
          load();
        }}
        onCancel={() => setEditing(undefined)}
      />
    );
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Your units ({total})</h2>
        <button onClick={() => setEditing(null)}>+ New unit</button>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "0.5rem 0" }}>
        <input placeholder="Search title/city" value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        <input placeholder="City" value={filters.city}
          onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} />
        <select value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">any status</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="unlisted">unlisted</option>
        </select>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : units.length === 0 ? (
        <p>No units yet.</p>
      ) : (
        <table cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
              <th>Title</th><th>City</th><th>Price</th><th>Status</th><th>Photos</th><th></th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                <td>{u.title}</td>
                <td>{u.city}</td>
                <td>{u.currency} {u.base_price}</td>
                <td>{u.status}</td>
                <td>{u.photos?.length ?? 0}</td>
                <td>
                  <button onClick={() => setEditing(u)}>Edit</button>{" "}
                  <button onClick={() => setCalendarUnit(u)}>Calendar</button>{" "}
                  <button onClick={() => handleDelete(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
