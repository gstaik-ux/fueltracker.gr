"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, Car, Bike } from "lucide-react";

export default function AddVehicleForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    slug: "",
    name: "",
    themeAccent: "#e7a33e",
    themeBg: "#0e0f12",
    vehicleIcon: "car" as "car" | "bike",
    tankCapacity: "",
  });

  async function submit() {
    if (saving) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ slug: "", name: "", themeAccent: "#e7a33e", themeBg: "#0e0f12", vehicleIcon: "car", tankCapacity: "" });
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Κάτι πήγε στραβά.");
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "none",
          border: "1px dashed var(--hairline)",
          borderRadius: 16,
          color: "var(--muted)",
          fontSize: 13.5,
          fontWeight: 600,
          padding: "12px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {open ? <ChevronDown size={15} /> : <Plus size={15} />}
        {open ? "Απόκρυψη" : "Προσθήκη οχήματος"}
      </button>

      {open && (
        <div className="card animate-in" style={{ padding: "18px 18px 20px", marginTop: 10 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΟΝΟΜΑ</div>
            <input
              className="pill-input"
              placeholder="π.χ. Peugeot 307 '02"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
              SLUG (για το NFC link, π.χ. peugeot307)
            </div>
            <input
              className="pill-input"
              placeholder="π.χ. peugeot307"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </div>

          <div className="fillup-row" style={{ marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΧΡΩΜΑ</div>
              <input
                type="color"
                value={form.themeAccent}
                onChange={(e) => setForm({ ...form, themeAccent: e.target.value })}
                style={{ width: "100%", height: 44, border: "none", borderRadius: 14, background: "rgba(255,255,255,0.06)", padding: 4 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΦΟΝΤΟ</div>
              <input
                type="color"
                value={form.themeBg}
                onChange={(e) => setForm({ ...form, themeBg: e.target.value })}
                style={{ width: "100%", height: 44, border: "none", borderRadius: 14, background: "rgba(255,255,255,0.06)", padding: 4 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΕΙΚΟΝΙΔΙΟ</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["car", "bike"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setForm({ ...form, vehicleIcon: opt })}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    background: form.vehicleIcon === opt ? `${form.themeAccent}33` : "rgba(255,255,255,0.06)",
                    border: "none",
                    borderRadius: 12,
                    padding: "10px 0",
                    color: form.vehicleIcon === opt ? form.themeAccent : "var(--muted)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {opt === "car" ? <Car size={15} /> : <Bike size={15} />}
                  {opt === "car" ? "Αυτοκίνητο" : "Μηχανή"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΧΩΡΗΤΙΚΟΤΗΤΑ ΡΕΖΕΡΒΟΥΑΡ (προαιρετικό, σε L)</div>
            <input
              className="pill-input"
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="π.χ. 45"
              value={form.tankCapacity}
              onChange={(e) => setForm({ ...form, tankCapacity: e.target.value })}
            />
          </div>

          {error && <div style={{ fontSize: 12.5, color: "#e2323a", textAlign: "center", marginBottom: 10 }}>{error}</div>}

          <button
            className="tap"
            onClick={submit}
            disabled={saving}
            style={{
              width: "100%",
              background: form.themeAccent,
              color: "#08090a",
              border: "none",
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 700,
              padding: "14px 0",
            }}
          >
            {saving ? "..." : "Δημιουργία οχήματος"}
          </button>
        </div>
      )}
    </div>
  );
}
