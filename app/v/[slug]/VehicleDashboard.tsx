"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Fuel, Plus, Trash2, Gauge, Droplet, Wallet, TrendingUp } from "lucide-react";

type Fillup = {
  id: string;
  date: string;
  liters: number;
  cost: number;
  odometer: number | null;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function fmtMoney(n: number) {
  return isFinite(n) ? "€" + n.toFixed(2) : "—";
}
function fmtNum(n: number, digits = 1) {
  return isFinite(n) ? n.toFixed(digits) : "—";
}

export default function VehicleDashboard({
  slug,
  vehicleName,
  initialFillups,
}: {
  slug: string;
  vehicleName: string;
  initialFillups: Fillup[];
}) {
  const [fillups, setFillups] = useState<Fillup[]>(initialFillups);
  const [form, setForm] = useState({ date: todayStr(), liters: "", cost: "", odometer: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const apiBase = `/api/v/${slug}/fillups`;

  const entries = useMemo(
    () => [...fillups].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [fillups]
  );
  const ascEntries = useMemo(
    () => [...entries].sort((a, b) => (a.date < b.date ? -1 : 1)),
    [entries]
  );

  const stats = useMemo(() => {
    const year = new Date().getFullYear();
    const ytd = entries.filter(
      (e) => new Date(e.date + "T00:00:00").getFullYear() === year
    );
    const totalSpent = ytd.reduce((s, e) => s + e.cost, 0);
    const totalLiters = ytd.reduce((s, e) => s + e.liters, 0);
    const avgPrice = totalLiters > 0 ? totalSpent / totalLiters : NaN;

    let totalDistance = 0;
    let totalFuelForDistance = 0;
    for (let i = 1; i < ascEntries.length; i++) {
      const prev = ascEntries[i - 1];
      const cur = ascEntries[i];
      if (prev.odometer != null && cur.odometer != null && cur.odometer > prev.odometer) {
        totalDistance += cur.odometer - prev.odometer;
        totalFuelForDistance += cur.liters;
      }
    }
    const efficiency = totalDistance > 0 ? (totalFuelForDistance / totalDistance) * 100 : NaN;

    return { totalSpent, totalLiters, avgPrice, efficiency };
  }, [entries, ascEntries]);

  const monthlyData = useMemo(() => {
    const year = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => ({
      label: new Date(year, i, 1).toLocaleDateString(undefined, { month: "short" }),
      spend: 0,
    }));
    entries.forEach((e) => {
      const d = new Date(e.date + "T00:00:00");
      if (d.getFullYear() === year) months[d.getMonth()].spend += e.cost;
    });
    return months;
  }, [entries]);

  const priceTrend = useMemo(
    () =>
      ascEntries.map((e) => ({
        label: new Date(e.date + "T00:00:00").toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        price: e.cost / e.liters,
      })),
    [ascEntries]
  );

  async function addFillup() {
    const liters = parseFloat(form.liters);
    const cost = parseFloat(form.cost);
    if (!form.date || !isFinite(liters) || liters <= 0 || !isFinite(cost) || cost <= 0) {
      setError("Enter a date, liters, and cost.");
      return;
    }
    const odometer = form.odometer.trim() === "" ? null : parseFloat(form.odometer);
    setSaving(true);
    setError("");
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: form.date, liters, cost, odometer }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setFillups((prev) => [...prev, data.fillup]);
      setForm({ date: todayStr(), liters: "", cost: "", odometer: "" });
    } else {
      setError("Couldn't save that fill-up. Try again.");
    }
  }

  async function removeFillup(id: string) {
    setFillups((prev) => prev.filter((e) => e.id !== id));
    await fetch(`${apiBase}/${id}`, { method: "DELETE" });
  }

  return (
    <div style={{ padding: "20px 16px 40px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: "var(--amber-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Fuel size={18} color="var(--amber)" />
        </div>
        <div>
          <div className="display" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1 }}>
            {vehicleName}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Fuel log</div>
        </div>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, var(--surface), var(--surface-alt))",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "18px 18px 14px",
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>
          {new Date().getFullYear()} so far
        </div>
        <div className="display" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, marginBottom: 14 }}>
          {fmtMoney(stats.totalSpent)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <StatChip icon={<Droplet size={13} />} label="Liters" value={fmtNum(stats.totalLiters)} />
          <StatChip
            icon={<Wallet size={13} />}
            label="Avg €/L"
            value={stats.avgPrice ? fmtMoney(stats.avgPrice) : "—"}
          />
          <StatChip
            icon={<Gauge size={13} />}
            label="L/100km"
            value={stats.efficiency ? fmtNum(stats.efficiency, 2) : "—"}
          />
        </div>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 14,
          marginBottom: 18,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Log a fill-up</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div className="field-label" style={{ margin: "0 0 4px" }}>Date</div>
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div>
            <div className="field-label" style={{ margin: "0 0 4px" }}>Odometer (optional)</div>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              placeholder="km"
              value={form.odometer}
              onChange={(e) => setForm({ ...form, odometer: e.target.value })}
            />
          </div>
          <div>
            <div className="field-label" style={{ margin: "0 0 4px" }}>Liters</div>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              placeholder="0.0"
              value={form.liters}
              onChange={(e) => setForm({ ...form, liters: e.target.value })}
            />
          </div>
          <div>
            <div className="field-label" style={{ margin: "0 0 4px" }}>Total cost (€)</div>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </div>
        </div>
        {error && <div className="auth-error" style={{ marginTop: 10 }}>{error}</div>}
        <button className="btn-primary" onClick={addFillup} disabled={saving}>
          <Plus size={15} style={{ marginRight: 4, verticalAlign: -3 }} />
          {saving ? "Saving…" : "Add fill-up"}
        </button>
      </div>

      {entries.length > 0 && (
        <>
          <ChartCard title="Monthly spend" icon={<TrendingUp size={14} color="var(--amber)" />}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [fmtMoney(v), "Spend"]}
                />
                <Bar dataKey="spend" fill="var(--amber)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {priceTrend.length > 1 && (
            <ChartCard title="Price per liter over time" icon={<Gauge size={14} color="var(--green)" />}>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={priceTrend} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={36} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [fmtMoney(v), "€/L"]}
                  />
                  <Line type="monotone" dataKey="price" stroke="var(--green)" strokeWidth={2} dot={{ r: 3, fill: "var(--green)" }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>History</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {entries.map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.date}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {fmtNum(e.liters)} L · {fmtMoney(e.cost)}
                    {e.odometer != null ? ` · ${fmtNum(e.odometer, 0)} km` : ""}
                  </div>
                </div>
                <button
                  onClick={() => removeFillup(e.id)}
                  style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {entries.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: "28px 10px", fontSize: 13.5 }}>
          No fill-ups logged yet.
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 26 }}>
        <a href="/" style={{ fontSize: 12.5, color: "var(--muted)" }}>← All vehicles</a>
      </div>
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--muted)", fontSize: 11, marginBottom: 3 }}>
        {icon} {label}
      </div>
      <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}
