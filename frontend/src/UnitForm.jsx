import { useState } from "react";
import { createUnit, updateUnit, uploadPhoto, getUnit } from "./api";

// Create or edit a unit. `unit` null => create mode.
export default function UnitForm({ unit, onSaved, onCancel }) {
  const editing = Boolean(unit);
  const [form, setForm] = useState({
    title: unit?.title ?? "",
    city: unit?.city ?? "",
    base_price: unit?.base_price ?? "",
    deposit_percent: unit?.deposit_percent ?? "0",
    capacity: unit?.capacity ?? 1,
    amenities: (unit?.amenities ?? []).join(", "),
    description: unit?.description ?? "",
    status: unit?.status ?? "draft",
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const body = {
      title: form.title,
      city: form.city,
      base_price: form.base_price,
      deposit_percent: form.deposit_percent || "0",
      capacity: Number(form.capacity),
      description: form.description || null,
      amenities: form.amenities
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      status: form.status,
    };
    try {
      const saved = editing
        ? await updateUnit(unit.id, body)
        : await createUnit(body);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setError(null);
    try {
      await uploadPhoto(unit.id, file);
      onSaved(await getUnit(unit.id));
    } catch (err) {
      setError(err.message);
    }
  }

  const field = { display: "block", width: "100%", margin: "0.35rem 0" };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 460 }}>
      <h3>{editing ? "Edit unit" : "New unit"}</h3>
      <input style={field} placeholder="Title" required value={form.title}
        onChange={(e) => set("title", e.target.value)} />
      <input style={field} placeholder="City" required value={form.city}
        onChange={(e) => set("city", e.target.value)} />
      <input style={field} placeholder="Base price / night" required type="number"
        min="1" step="0.01" value={form.base_price}
        onChange={(e) => set("base_price", e.target.value)} />
      <input style={field} placeholder="Deposit %" type="number" min="0" max="100"
        step="0.01" value={form.deposit_percent}
        onChange={(e) => set("deposit_percent", e.target.value)} />
      <input style={field} placeholder="Capacity" type="number" min="1"
        value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
      <input style={field} placeholder="Amenities (comma separated)"
        value={form.amenities} onChange={(e) => set("amenities", e.target.value)} />
      <textarea style={field} placeholder="Description" value={form.description}
        onChange={(e) => set("description", e.target.value)} />
      <select style={field} value={form.status}
        onChange={(e) => set("status", e.target.value)}>
        <option value="draft">draft</option>
        <option value="published">published</option>
        <option value="unlisted">unlisted</option>
      </select>

      {editing && (
        <div style={{ margin: "0.5rem 0" }}>
          <label>
            Add photo:{" "}
            <input type="file" accept="image/*" onChange={handlePhoto} />
          </label>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {(unit.photos ?? []).map((p) => (
              <img key={p.id} src={p.url} alt="" width="64" height="64"
                style={{ objectFit: "cover", borderRadius: 4 }} />
            ))}
          </div>
        </div>
      )}

      <button type="submit" disabled={busy}>
        {busy ? "Saving…" : editing ? "Save" : "Create"}
      </button>{" "}
      <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </form>
  );
}
