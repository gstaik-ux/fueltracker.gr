"use client";

import { useMemo, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  ChevronRight,
  ChevronDown,
  Trash2,
  Pencil,
  Fuel,
  Check,
  MapPin,
  Plane,
  Settings,
  Droplet,
  Droplets,
  Wrench,
  Filter,
  Car,
  Bike,
  AlertTriangle,
} from "lucide-react";

type Fillup = {
  id: string;
  date: string;
  liters: number;
  cost: number;
  odometer: number | null;
  odometerEstimated: boolean;
  isTrip: boolean;
  isFull: boolean;
};

type ServiceEntry = {
  id: string;
  type: string;
  date: string;
  odometer: number | null;
  note: string;
};

const SERVICE_TYPES = [
  { key: "oil", label: "Λάδια", Icon: Droplet },
  { key: "tires", label: "Λάστιχα", Icon: Settings },
  { key: "filter", label: "Φίλτρο", Icon: Filter },
  { key: "washer", label: "Υγρό Καθαρισμού", Icon: Droplets },
  { key: "other", label: "Άλλο", Icon: Wrench },
  { key: "general", label: "Σέρβις", Icon: Wrench },
];

function serviceIcon(type: string) {
  return (SERVICE_TYPES.find((t) => t.key === type) || SERVICE_TYPES[4]).Icon;
}
function serviceLabel(type: string) {
  return (SERVICE_TYPES.find((t) => t.key === type) || SERVICE_TYPES[4]).label;
}
// Vehicles with a small tank (scooters/mopeds) get everything done together
// in one visit, so they only see a single generic "Σέρβις" option.
function availableServiceTypes(vehicleIcon: string) {
  if (vehicleIcon === "bike") return SERVICE_TYPES.filter((t) => t.key === "general");
  return SERVICE_TYPES.filter((t) => t.key !== "general");
}

const OIL_CHANGE_INTERVAL_KM = 10000;

const SEND_OFF_GREETINGS = [
  "Καλό δρόμο!",
  "Καλό δρόμο και καλά χιλιόμετρα!",
  "Καλή συνέχεια!",
  "Οδήγα με ασφάλεια!",
  "Τα λέμε στο επόμενο γέμισμα!",
];

const TRIP_CHECKLIST_ITEMS = [
  { key: "tires", label: "Πίεση λάστιχων" },
  { key: "oil", label: "Στάθμη λαδιών" },
  { key: "washer", label: "Υγρό καθαρισμού" },
  { key: "lights", label: "Φώτα / φλας" },
  { key: "brakes", label: "Φρένα" },
  { key: "tools", label: "Εργαλεία / ρεζέρβα" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function fmtMoney(n: number) {
  return isFinite(n) ? "€" + n.toFixed(2) : "—";
}
function fmtNum(n: number, d = 1) {
  return isFinite(n) ? n.toFixed(d) : "—";
}
function fmtDateGR(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  function getCtx() {
    if (!ctxRef.current) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    const ctx = ctxRef.current;
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq: number, delay: number, duration: number, volume: number) {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  return {
    playTap: () => tone(720, 0, 0.045, 0.035),
    playSuccess: () => tone(760, 0, 0.06, 0.025),
  };
}

export default function VehicleDashboard({
  slug,
  vehicleName,
  themeAccent,
  themeBg,
  vehicleIcon,
  tankCapacity,
  initialFillups,
  initialServiceEntries,
}: {
  slug: string;
  vehicleName: string;
  themeAccent: string;
  themeBg: string;
  vehicleIcon: string;
  tankCapacity: number | null;
  initialFillups: Fillup[];
  initialServiceEntries: ServiceEntry[];
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { playTap, playSuccess } = useSound();

  const [fillups, setFillups] = useState<Fillup[]>(initialFillups);
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>(initialServiceEntries);

  const [form, setForm] = useState({ date: todayStr(), liters: "", cost: "", odometer: "", isTrip: false, isFull: false });
  const [logStep, setLogStep] = useState(1);
  const [loggedThisVisit, setLoggedThisVisit] = useState(false);
  const [showDateFields, setShowDateFields] = useState(false);
  const [manualPrice, setManualPrice] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [error, setError] = useState("");
  const [confirmGreeting, setConfirmGreeting] = useState(SEND_OFF_GREETINGS[0]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: "", liters: "", cost: "", odometer: "", isTrip: false, isFull: false });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [showTripChecklist, setShowTripChecklist] = useState(false);
  const [tripChecklist, setTripChecklist] = useState<Record<string, boolean>>({});
  const [tripToast, setTripToast] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"fuel" | "service">("fuel");
  const availableTypes = availableServiceTypes(vehicleIcon);
  const [serviceForm, setServiceForm] = useState({ type: availableTypes[0].key, date: todayStr(), odometer: "", note: "" });
  const [serviceError, setServiceError] = useState("");
  const [serviceConfirmDeleteId, setServiceConfirmDeleteId] = useState<string | null>(null);

  const [showOilBanner, setShowOilBanner] = useState(true);

  const entries = useMemo(
    () => [...fillups].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [fillups]
  );
  const ascEntries = useMemo(() => [...entries].sort((a, b) => (a.date < b.date ? -1 : 1)), [entries]);

  const lastOdometer = useMemo(() => {
    const withOdo = fillups.filter((e) => e.odometer != null);
    if (withOdo.length === 0) return null;
    return withOdo.reduce((max, e) => (e.odometer! > max ? e.odometer! : max), withOdo[0].odometer!);
  }, [fillups]);

  const lastPricePerLiter = useMemo(() => {
    const last = ascEntries[ascEntries.length - 1];
    return last && last.liters > 0 ? last.cost / last.liters : null;
  }, [ascEntries]);

  const stats = useMemo(() => {
    const year = new Date().getFullYear();
    const ytd = entries.filter((e) => new Date(e.date + "T00:00:00").getFullYear() === year);
    const totalSpent = ytd.reduce((s, e) => s + e.cost, 0);
    const totalLiters = ytd.reduce((s, e) => s + e.liters, 0);
    const avgPrice = totalLiters > 0 ? totalSpent / totalLiters : NaN;
    let totalDistance = 0, totalFuel = 0;
    for (let i = 1; i < ascEntries.length; i++) {
      const p = ascEntries[i - 1], c = ascEntries[i];
      if (p.odometer != null && c.odometer != null && c.odometer > p.odometer) {
        totalDistance += c.odometer - p.odometer;
        totalFuel += c.liters;
      }
    }
    const efficiency = totalDistance > 0 ? (totalFuel / totalDistance) * 100 : NaN;
    return { totalSpent, totalLiters, avgPrice, efficiency };
  }, [entries, ascEntries]);

  const knownEfficiency = useMemo(() => {
    let totalDistance = 0, totalFuel = 0;
    for (let i = 1; i < ascEntries.length; i++) {
      const p = ascEntries[i - 1], c = ascEntries[i];
      if (p.odometer != null && c.odometer != null && !p.odometerEstimated && !c.odometerEstimated && c.odometer > p.odometer) {
        totalDistance += c.odometer - p.odometer;
        totalFuel += c.liters;
      }
    }
    return totalDistance > 0 ? (totalFuel / totalDistance) * 100 : null;
  }, [ascEntries]);

  const lastFullOdometer = useMemo(() => {
    for (let i = ascEntries.length - 1; i >= 0; i--) {
      const e = ascEntries[i];
      if (e.isFull && e.odometer != null) return e.odometer;
    }
    return null;
  }, [ascEntries]);

  const oilReminder = useMemo(() => {
    const oilEntries = serviceEntries.filter((s) => (s.type === "oil" || s.type === "general") && s.odometer != null);
    if (oilEntries.length === 0 || lastOdometer == null) return null;
    const lastOil = oilEntries.reduce((max, s) => (s.odometer! > max.odometer! ? s : max), oilEntries[0]);
    const sinceOil = lastOdometer - lastOil.odometer!;
    if (sinceOil >= OIL_CHANGE_INTERVAL_KM) return { overdue: true, km: sinceOil };
    if (sinceOil >= OIL_CHANGE_INTERVAL_KM * 0.9) return { overdue: false, km: sinceOil, remaining: OIL_CHANGE_INTERVAL_KM - sinceOil };
    return null;
  }, [serviceEntries, lastOdometer]);

  const monthlyData = useMemo(() => {
    const year = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => ({
      label: new Date(year, i, 1).toLocaleDateString("el-GR", { month: "short" }).replace(".", ""),
      spend: 0,
    }));
    entries.forEach((e) => {
      const d = new Date(e.date + "T00:00:00");
      if (d.getFullYear() === year) months[d.getMonth()].spend += e.cost;
    });
    return months;
  }, [entries]);

  function goToStep2() {
    const cost = parseFloat(form.cost);
    if (!isFinite(cost) || cost <= 0) {
      setError("Γράψε πόσο κόστισε ο ανεφοδιασμός.");
      return;
    }
    setError("");
    playTap();
    setLogStep(2);
  }

  const costNum = parseFloat(form.cost) || 0;
  const manualPriceNum = parseFloat(manualPrice);
  const effectivePrice = isFinite(manualPriceNum) && manualPriceNum > 0 ? manualPriceNum : lastPricePerLiter;
  const priceLitersEstimate = effectivePrice != null && costNum > 0 ? costNum / effectivePrice : null;

  const odometerNum = parseFloat(form.odometer);
  const distanceSinceFull =
    form.isFull && isFinite(odometerNum) && lastFullOdometer != null ? odometerNum - lastFullOdometer : null;
  const fullTankLitersEstimate =
    distanceSinceFull != null && distanceSinceFull > 0 && knownEfficiency != null
      ? (distanceSinceFull * knownEfficiency) / 100
      : null;
  const litersEstimate = fullTankLitersEstimate != null ? fullTankLitersEstimate : priceLitersEstimate;

  async function addFillup() {
    const cost = parseFloat(form.cost);
    const liters = form.liters.trim() === "" ? litersEstimate : parseFloat(form.liters);
    if (!isFinite(cost) || cost <= 0 || !liters || !isFinite(liters) || liters <= 0) {
      setError("Συμπλήρωσε κόστος και λίτρα για την καταχώρηση.");
      return;
    }

    let odometer = form.odometer.trim() === "" ? null : parseFloat(form.odometer);
    let odometerEstimated = false;
    if (odometer == null) {
      if (lastOdometer != null && knownEfficiency != null && knownEfficiency > 0) {
        const impliedDistance = (liters * 100) / knownEfficiency;
        odometer = Math.round(lastOdometer + impliedDistance);
        odometerEstimated = true;
      }
    }

    const res = await fetch(`/api/v/${slug}/fillups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: form.date, liters, cost, odometer, odometerEstimated, isTrip: form.isTrip, isFull: form.isFull }),
    });

    if (res.ok) {
      const data = await res.json();
      setFillups((prev) => [...prev, data.fillup]);
      setForm({ date: todayStr(), liters: "", cost: "", odometer: "", isTrip: false, isFull: false });
      setLogStep(1);
      setShowDateFields(false);
      setManualPrice("");
      setError("");
      setLoggedThisVisit(true);
      setConfirmGreeting(SEND_OFF_GREETINGS[Math.floor(Math.random() * SEND_OFF_GREETINGS.length)]);
      playSuccess();
    } else {
      setError("Κάτι πήγε στραβά - δοκίμασε ξανά.");
    }
  }

  async function removeEntry(id: string) {
    setFillups((prev) => prev.filter((e) => e.id !== id));
    setConfirmDeleteId(null);
    await fetch(`/api/v/${slug}/fillups/${id}`, { method: "DELETE" });
  }

  function startEdit(e: Fillup) {
    setEditingId(e.id);
    setEditForm({
      date: e.date,
      liters: String(e.liters),
      cost: String(e.cost),
      odometer: e.odometer != null ? String(e.odometer) : "",
      isTrip: e.isTrip,
      isFull: e.isFull,
    });
    setConfirmDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    const liters = parseFloat(editForm.liters);
    const cost = parseFloat(editForm.cost);
    if (!editForm.date || !isFinite(liters) || liters <= 0 || !isFinite(cost) || cost <= 0) return;
    const odometer = editForm.odometer.trim() === "" ? null : parseFloat(editForm.odometer);

    const res = await fetch(`/api/v/${slug}/fillups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: editForm.date, liters, cost, odometer, isTrip: editForm.isTrip, isFull: editForm.isFull }),
    });
    if (res.ok) {
      const data = await res.json();
      setFillups((prev) => prev.map((e) => (e.id === id ? data.fillup : e)));
    }
    setEditingId(null);
  }

  async function addService() {
    if (!serviceForm.date) {
      setServiceError("Διάλεξε ημερομηνία.");
      return;
    }
    const odometer = serviceForm.odometer.trim() === "" ? null : parseFloat(serviceForm.odometer);
    const res = await fetch(`/api/v/${slug}/service`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: serviceForm.type, date: serviceForm.date, odometer, note: serviceForm.note.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setServiceEntries((prev) => [...prev, data.entry]);
      setServiceForm({ type: availableTypes[0].key, date: todayStr(), odometer: "", note: "" });
      setServiceError("");
      playSuccess();
    } else {
      setServiceError("Κάτι πήγε στραβά - δοκίμασε ξανά.");
    }
  }

  async function removeService(id: string) {
    setServiceEntries((prev) => prev.filter((s) => s.id !== id));
    setServiceConfirmDeleteId(null);
    await fetch(`/api/v/${slug}/service/${id}`, { method: "DELETE" });
  }

  const VehicleIcon = vehicleIcon === "bike" ? Bike : Car;

  return (
    <div style={{ background: themeBg, color: "var(--text)", minHeight: "100vh", position: "relative", transition: "background 0.3s" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 18px 60px", position: "relative", zIndex: 1, ["--accent" as any]: themeAccent }}>
        {oilReminder && showOilBanner && (
          <div
            className="card banner-fade"
            style={{
              background: oilReminder.overdue ? "rgba(226,50,58,0.14)" : "rgba(255,255,255,0.045)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={16} color={oilReminder.overdue ? "#e2323a" : themeAccent} />
            <div style={{ fontSize: 12.5 }}>
              {oilReminder.overdue
                ? `Καθυστερημένη αλλαγή λαδιών - ${fmtNum(oilReminder.km, 0)} km από την τελευταία`
                : `Πλησιάζει αλλαγή λαδιών - ακόμα ${fmtNum(oilReminder.remaining!, 0)} km`}
            </div>
          </div>
        )}

        <div className="animate-in" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, padding: "0 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="row-icon" style={{ background: `${themeAccent}22` }}>
              <VehicleIcon size={17} color={themeAccent} />
            </span>
            <div className="display" style={{ fontSize: 17, fontWeight: 700 }}>{vehicleName}</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!loggedThisVisit && (
              <button
                onClick={() => {
                  playTap();
                  setForm((f) => {
                    const next = !f.isTrip;
                    setTripToast(next ? "Λειτουργία ταξιδιού" : "Κανονική χρήση");
                    setTimeout(() => setTripToast(null), 1600);
                    return { ...f, isTrip: next };
                  });
                  if (!form.isTrip) setShowTripChecklist(true);
                }}
                title="Ταξίδι"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 99,
                  border: "none",
                  background: form.isTrip ? `${themeAccent}33` : "rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: form.isTrip ? `0 0 0 2px ${themeAccent}` : "none",
                }}
              >
                <Plane size={18} color={form.isTrip ? themeAccent : "var(--muted)"} />
              </button>
            )}

            <button
              onClick={() => { playTap(); setViewMode(viewMode === "service" ? "fuel" : "service"); }}
              title="Συντήρηση"
              style={{
                width: 44,
                height: 44,
                borderRadius: 99,
                border: "none",
                background: viewMode === "service" ? `${themeAccent}33` : "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: viewMode === "service" ? `0 0 0 2px ${themeAccent}` : "none",
              }}
            >
              <Settings size={18} color={viewMode === "service" ? themeAccent : "var(--muted)"} />
            </button>
          </div>
        </div>

        {form.isTrip && showTripChecklist && (
          <div className="card animate-in" style={{ padding: "16px 18px", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: themeAccent, fontWeight: 600 }}>
                Λίστα πριν το ταξίδι
              </div>
              <button onClick={() => setShowTripChecklist(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12 }}>
                Απόκρυψη
              </button>
            </div>
            {TRIP_CHECKLIST_ITEMS.map((item) => {
              const done = !!tripChecklist[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    playTap();
                    setTripChecklist((c) => {
                      const next = { ...c, [item.key]: !c[item.key] };
                      const allDone = TRIP_CHECKLIST_ITEMS.every((it) => next[it.key]);
                      if (allDone) setTimeout(() => setShowTripChecklist(false), 500);
                      return next;
                    });
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    background: "none",
                    border: "none",
                    padding: "8px 0",
                    color: done ? "var(--muted)" : "var(--text)",
                    fontSize: 13.5,
                    textDecoration: done ? "line-through" : "none",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      border: `1.5px solid ${done ? themeAccent : "var(--muted)"}`,
                      background: done ? themeAccent : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "background 0.15s ease, border-color 0.15s ease",
                    }}
                  >
                    {done && <Check key={item.key} className="animate-pop" size={12} color="#08090a" />}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {viewMode === "fuel" && (
          <>
            {!loggedThisVisit && logStep === 1 && (
              <div className="card animate-in" style={{ padding: "28px 20px 22px" }}>
                <div style={{ textAlign: "center", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted)", marginBottom: 2 }}>
                  Κόστος €
                </div>
                <input
                  className="big-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="0€"
                  autoFocus
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") goToStep2(); }}
                />
                {error && <div style={{ fontSize: 12.5, color: themeAccent, textAlign: "center", marginTop: 4 }}>{error}</div>}
                <button
                  className="tap"
                  onClick={goToStep2}
                  style={{
                    width: "100%",
                    background: themeAccent,
                    color: "#08090a",
                    border: "none",
                    borderRadius: 999,
                    fontSize: 15,
                    fontWeight: 700,
                    padding: "14px 0",
                    marginTop: 18,
                    boxShadow: `0 4px 12px ${themeAccent}25`,
                  }}
                >
                  Επόμενο
                </button>
              </div>
            )}

            {!loggedThisVisit && logStep === 2 && (
              <div className="card animate-in" style={{ padding: "20px 20px 22px" }}>
                <button
                  className="tap"
                  onClick={() => { playTap(); setLogStep(1); }}
                  style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, padding: 0, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}
                >
                  ‹ {fmtMoney(parseFloat(form.cost) || 0)}
                </button>

                <div style={{ textAlign: "center", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted)", marginBottom: 2 }}>
                  Λίτρα
                </div>
                <input
                  className="big-input"
                  type="number"
                  inputMode="decimal"
                  placeholder={litersEstimate != null ? fmtNum(litersEstimate, 1) : "0"}
                  autoFocus
                  value={form.liters}
                  onChange={(e) => setForm({ ...form, liters: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") addFillup(); }}
                />

                <button
                  className="tap"
                  onClick={() => { playTap(); setShowDateFields((s) => !s); }}
                  style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, padding: "10px 0", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", gap: 4 }}
                >
                  {showDateFields ? "Απόκρυψη επιλογών" : "Περισσότερες επιλογές"}
                  <ChevronDown className="chev" size={13} style={{ transform: showDateFields ? "rotate(180deg)" : "none" }} />
                </button>

                {showDateFields && (
                  <div className="animate-fade">
                    <div className="fillup-row" style={{ marginBottom: 10, marginTop: 4 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΗΜΕΡΟΜΗΝΙΑ</div>
                        <div
                          onClick={() => {
                            if (dateInputRef.current?.showPicker) dateInputRef.current.showPicker();
                            else dateInputRef.current?.focus();
                          }}
                          style={{ position: "relative" }}
                        >
                          <div className="pill-input" style={{ cursor: "pointer" }}>
                            {fmtDateGR(form.date)}
                          </div>
                          <input
                            ref={dateInputRef}
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                            style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", border: "none" }}
                          />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                          ΧΙΛΙΟΜΕΤΡΑ {lastOdometer != null && (
                            <span style={{ color: "var(--muted)", textTransform: "none", fontWeight: 400 }}>
                              · τελ. {fmtNum(lastOdometer, 0)}
                            </span>
                          )}
                        </div>
                        <input
                          className="pill-input"
                          type="number"
                          inputMode="decimal"
                          placeholder="προαιρετικό"
                          value={form.odometer}
                          onChange={(e) => setForm({ ...form, odometer: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: 4 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΤΙΜΗ ΑΝΑ ΛΙΤΡΟ € (αν την ξέρεις)</div>
                      <input
                        className="pill-input"
                        type="number"
                        inputMode="decimal"
                        placeholder={lastPricePerLiter != null ? fmtNum(lastPricePerLiter, 2) : "π.χ. 1.65"}
                        value={manualPrice}
                        onChange={(e) => setManualPrice(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={() => { playTap(); setForm((f) => ({ ...f, isFull: !f.isFull })); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: form.isFull ? `${themeAccent}22` : "rgba(255,255,255,0.06)",
                        border: "none",
                        borderRadius: 12,
                        padding: "10px 12px",
                        width: "100%",
                        marginTop: 10,
                        color: form.isFull ? themeAccent : "var(--muted)",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <Fuel size={15} />
                      Γέμισε το ρεζερβουάρ;
                      <span style={{ marginLeft: "auto", fontSize: 11.5, opacity: 0.8 }}>{form.isFull ? "Ναι" : "Όχι"}</span>
                    </button>
                  </div>
                )}

                {tankCapacity && parseFloat(form.liters) > 0 && (
                  <div className="animate-fade" style={{ fontSize: 10.5, lineHeight: 1.3, color: "var(--muted)", opacity: 0.65, textAlign: "center", margin: "2px 0" }}>
                    ≈{Math.round((parseFloat(form.liters) / tankCapacity) * 100)}% του ρεζερβουάρ ({tankCapacity} L)
                  </div>
                )}

                {litersEstimate != null && (
                  <div style={{ fontSize: 10.5, lineHeight: 1.3, color: "var(--muted)", opacity: 0.65, textAlign: "center", margin: "8px 0 2px" }}>
                    {fullTankLitersEstimate != null
                      ? `${fmtNum(distanceSinceFull!, 0)} km από το τελευταίο γέμισμα · με €${fmtNum(effectivePrice!, 2)}/L`
                      : `εκτ. με €${fmtNum(effectivePrice!, 2)}/L${manualPriceNum > 0 ? "" : " (τελευταία τιμή)"}`}
                  </div>
                )}

                {error && <div style={{ fontSize: 12.5, color: themeAccent, textAlign: "center", margin: "6px 0" }}>{error}</div>}

                <button
                  className="tap"
                  onClick={addFillup}
                  style={{
                    width: "100%",
                    background: themeAccent,
                    color: "#08090a",
                    border: "none",
                    borderRadius: 999,
                    fontSize: 15,
                    fontWeight: 700,
                    padding: "14px 0",
                    marginTop: 14,
                    boxShadow: `0 4px 12px ${themeAccent}25`,
                  }}
                >
                  Καταχώρηση
                </button>
              </div>
            )}

            {loggedThisVisit && (
              <div className="card animate-in" style={{ padding: "26px 20px", textAlign: "center" }}>
                <div
                  className="animate-pop"
                  style={{ width: 46, height: 46, borderRadius: 99, background: `${themeAccent}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}
                >
                  <Check size={22} color={themeAccent} />
                </div>
                <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Καταχωρήθηκε</div>
                <div style={{ fontSize: 13.5, color: "var(--muted)" }}>{confirmGreeting}</div>
              </div>
            )}

            {!showStats && (
              <button
                className="tap"
                onClick={() => { playTap(); setShowStats(true); }}
                style={{ width: "100%", background: "none", border: "none", color: "var(--muted)", fontSize: 13, padding: "20px 0 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
              >
                Προβολή ιστορικού &amp; στατιστικών <ChevronDown size={14} className="chev" />
              </button>
            )}

            {showStats && (
              <>
                <div className="card animate-in" style={{ padding: 20, marginTop: 18, marginBottom: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 20, columnGap: 14 }}>
                    <Stat label="Φέτος" value={fmtMoney(stats.totalSpent)} accent={themeAccent} />
                    <Stat label="Λίτρα" value={fmtNum(stats.totalLiters)} />
                    <Stat label="Μέση τιμή €/L" value={stats.avgPrice ? fmtMoney(stats.avgPrice) : "—"} />
                    <Stat label="Κατανάλωση L/100km" value={stats.efficiency ? fmtNum(stats.efficiency, 2) : "—"} />
                  </div>
                </div>

                {entries.length > 0 && (
                  <>
                    <div className="card animate-in" style={{ padding: "18px 20px 8px", marginBottom: 16 }}>
                      <SectionLabel>Μηνιαία δαπάνη</SectionLabel>
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={monthlyData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                          <XAxis dataKey="label" tick={{ fill: "#868d99", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.04)" }}
                            contentStyle={{ background: "#16181c", border: "none", borderRadius: 10, fontSize: 12 }}
                            formatter={(v: number) => [fmtMoney(v), "Δαπάνη"]}
                          />
                          <Bar dataKey="spend" fill={themeAccent} radius={[5, 5, 0, 0]} maxBarSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="card animate-in" style={{ padding: "6px 16px" }}>
                      <div style={{ padding: "14px 4px 4px" }}>
                        <SectionLabel style={{ marginBottom: 0 }}>Ιστορικό</SectionLabel>
                      </div>
                      {entries.map((e, i) => {
                        const borderBottom = i < entries.length - 1 ? "1px solid var(--hairline)" : "none";

                        if (editingId === e.id) {
                          return (
                            <div key={e.id} style={{ padding: "14px 4px", borderBottom }}>
                              <div className="fillup-row" style={{ marginBottom: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΗΜΕΡΟΜΗΝΙΑ</div>
                                  <input className="pill-input" type="date" style={{ fontSize: 14 }} value={editForm.date} onChange={(ev) => setEditForm({ ...editForm, date: ev.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΧΙΛΙΟΜΕΤΡΑ</div>
                                  <input className="pill-input" type="number" inputMode="decimal" placeholder="προαιρετικό" style={{ fontSize: 14 }} value={editForm.odometer} onChange={(ev) => setEditForm({ ...editForm, odometer: ev.target.value })} />
                                </div>
                              </div>
                              <div className="fillup-row" style={{ marginBottom: 12 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΛΙΤΡΑ</div>
                                  <input className="pill-input" type="number" inputMode="decimal" style={{ fontSize: 14 }} value={editForm.liters} onChange={(ev) => setEditForm({ ...editForm, liters: ev.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΚΟΣΤΟΣ €</div>
                                  <input className="pill-input" type="number" inputMode="decimal" style={{ fontSize: 14 }} value={editForm.cost} onChange={(ev) => setEditForm({ ...editForm, cost: ev.target.value })} />
                                </div>
                              </div>
                              <button
                                onClick={() => setEditForm({ ...editForm, isTrip: !editForm.isTrip })}
                                style={{ display: "flex", alignItems: "center", gap: 8, background: editForm.isTrip ? `${themeAccent}22` : "rgba(255,255,255,0.06)", border: "none", borderRadius: 12, padding: "8px 12px", width: "100%", marginBottom: 8, color: editForm.isTrip ? themeAccent : "var(--muted)", fontSize: 12.5, fontWeight: 600 }}
                              >
                                <MapPin size={14} />
                                Ταξίδι
                                <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.8 }}>{editForm.isTrip ? "Ναι" : "Όχι"}</span>
                              </button>
                              <button
                                onClick={() => setEditForm({ ...editForm, isFull: !editForm.isFull })}
                                style={{ display: "flex", alignItems: "center", gap: 8, background: editForm.isFull ? `${themeAccent}22` : "rgba(255,255,255,0.06)", border: "none", borderRadius: 12, padding: "8px 12px", width: "100%", marginBottom: 12, color: editForm.isFull ? themeAccent : "var(--muted)", fontSize: 12.5, fontWeight: 600 }}
                              >
                                <Fuel size={14} />
                                Γέμισε το ρεζερβουάρ;
                                <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.8 }}>{editForm.isFull ? "Ναι" : "Όχι"}</span>
                              </button>
                              <div style={{ display: "flex", gap: 16 }}>
                                <button className="tap" onClick={() => saveEdit(e.id)} style={{ background: "none", border: "none", color: themeAccent, fontSize: 13, fontWeight: 700, padding: 0 }}>Αποθήκευση</button>
                                <button className="tap" onClick={cancelEdit} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, padding: 0 }}>Άκυρο</button>
                              </div>
                            </div>
                          );
                        }

                        if (confirmDeleteId === e.id) {
                          return (
                            <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", borderBottom }}>
                              <div style={{ fontSize: 13.5 }}>Διαγραφή ανεφοδιασμού;</div>
                              <div style={{ display: "flex", gap: 14 }}>
                                <button className="tap" onClick={() => removeEntry(e.id)} style={{ background: "none", border: "none", color: themeAccent, fontSize: 13, fontWeight: 700, padding: 0 }}>Ναι</button>
                                <button className="tap" onClick={() => setConfirmDeleteId(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, padding: 0 }}>Άκυρο</button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={e.id} className="row-fade" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 4px", borderBottom }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                              <span className="row-icon" style={{ background: `${themeAccent}1c` }}>
                                <Fuel size={15} color={themeAccent} />
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                                  {fmtDateGR(e.date)}
                                  {e.isTrip && <span className="animate-pop" style={{ fontSize: 10, fontWeight: 700, color: themeAccent, background: `${themeAccent}22`, borderRadius: 6, padding: "1px 6px" }}>ΤΑΞΙΔΙ</span>}
                                  {e.isFull && <span className="animate-pop" style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "1px 6px" }}>ΠΛΗΡΕΣ</span>}
                                </div>
                                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
                                  {fmtNum(e.liters)} L
                                  {tankCapacity ? ` · ${Math.round((e.liters / tankCapacity) * 100)}%` : ""}
                                  {e.odometer != null ? ` · ${fmtNum(e.odometer, 0)}${e.odometerEstimated ? "*" : ""} km` : ""}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                              <div className="display" style={{ fontSize: 14.5, fontWeight: 700, marginRight: 2 }}>{fmtMoney(e.cost)}</div>
                              <button className="icon-btn tap" onClick={() => startEdit(e)}><Pencil size={14} /></button>
                              <button className="icon-btn tap" onClick={() => setConfirmDeleteId(e.id)}><Trash2 size={14} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {entries.some((e) => e.odometerEstimated) && (
                      <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 10, padding: "0 4px" }}>
                        * εκτιμώμενα χιλιόμετρα βάσει της γνωστής κατανάλωσης του οχήματος
                      </div>
                    )}
                  </>
                )}

                <button
                  className="tap"
                  onClick={() => { playTap(); setShowStats(false); }}
                  style={{ width: "100%", background: "none", border: "none", color: "var(--muted)", fontSize: 13, padding: "18px 0 0" }}
                >
                  Απόκρυψη
                </button>
              </>
            )}
          </>
        )}

        {viewMode === "service" && (
          <>
            <div className="card animate-in" style={{ padding: "20px 20px 22px" }}>
              <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                Νέα καταχώρηση συντήρησης
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {availableTypes.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { playTap(); setServiceForm({ ...serviceForm, type: t.key }); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: serviceForm.type === t.key ? `${themeAccent}33` : "rgba(255,255,255,0.06)",
                      border: "none",
                      borderRadius: 999,
                      padding: "8px 12px",
                      color: serviceForm.type === t.key ? themeAccent : "var(--muted)",
                      fontSize: 12.5,
                      fontWeight: 600,
                      transform: serviceForm.type === t.key ? "scale(1.04)" : "scale(1)",
                    }}
                  >
                    <t.Icon size={14} />
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="fillup-row" style={{ marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΗΜΕΡΟΜΗΝΙΑ</div>
                  <div
                    onClick={() => {
                      if (dateInputRef.current?.showPicker) dateInputRef.current.showPicker();
                      else dateInputRef.current?.focus();
                    }}
                    style={{ position: "relative" }}
                  >
                    <div className="pill-input" style={{ cursor: "pointer" }}>{fmtDateGR(serviceForm.date)}</div>
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={serviceForm.date}
                      onChange={(e) => setServiceForm({ ...serviceForm, date: e.target.value })}
                      style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", border: "none" }}
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΧΙΛΙΟΜΕΤΡΑ</div>
                  <input className="pill-input" type="number" inputMode="decimal" placeholder="προαιρετικό" value={serviceForm.odometer} onChange={(e) => setServiceForm({ ...serviceForm, odometer: e.target.value })} />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΣΗΜΕΙΩΣΗ (προαιρετικό)</div>
                <input className="pill-input" type="text" placeholder="π.χ. Michelin, συνεργείο Γιώργου" value={serviceForm.note} onChange={(e) => setServiceForm({ ...serviceForm, note: e.target.value })} />
              </div>

              {serviceError && <div style={{ fontSize: 12.5, color: themeAccent, textAlign: "center", marginBottom: 8 }}>{serviceError}</div>}

              <button
                className="tap"
                onClick={addService}
                style={{ width: "100%", background: themeAccent, color: "#08090a", border: "none", borderRadius: 999, fontSize: 15, fontWeight: 700, padding: "14px 0", boxShadow: `0 4px 12px ${themeAccent}25` }}
              >
                Καταχώρηση
              </button>
            </div>

            <div style={{ height: 1, background: "var(--hairline)", margin: "28px 0 20px" }} />

            <div className="card animate-in" style={{ padding: "6px 16px" }}>
              <div style={{ padding: "14px 4px 4px" }}>
                <SectionLabel style={{ marginBottom: 0 }}>Ιστορικό συντήρησης</SectionLabel>
              </div>
              {serviceEntries.length === 0 && (
                <div style={{ padding: "8px 4px 16px", fontSize: 13, color: "var(--muted)" }}>Καμία καταχώρηση ακόμα.</div>
              )}
              {[...serviceEntries]
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((s, i, arr) => {
                  const Icon = serviceIcon(s.type);
                  const borderBottom = i < arr.length - 1 ? "1px solid var(--hairline)" : "none";

                  if (serviceConfirmDeleteId === s.id) {
                    return (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", borderBottom }}>
                        <div style={{ fontSize: 13.5 }}>Διαγραφή καταχώρησης;</div>
                        <div style={{ display: "flex", gap: 14 }}>
                          <button className="tap" onClick={() => removeService(s.id)} style={{ background: "none", border: "none", color: themeAccent, fontSize: 13, fontWeight: 700, padding: 0 }}>Ναι</button>
                          <button className="tap" onClick={() => setServiceConfirmDeleteId(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, padding: 0 }}>Άκυρο</button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={s.id} className="row-fade" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 4px", borderBottom }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <span className="row-icon" style={{ background: `${themeAccent}1c` }}>
                          <Icon size={15} color={themeAccent} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{serviceLabel(s.type)}</div>
                          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
                            {fmtDateGR(s.date)}
                            {s.odometer != null ? ` · ${fmtNum(s.odometer, 0)} km` : ""}
                            {s.note ? ` · ${s.note}` : ""}
                          </div>
                        </div>
                      </div>
                      <button className="icon-btn tap" onClick={() => setServiceConfirmDeleteId(s.id)}><Trash2 size={14} /></button>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>

      {tripToast && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: "calc(24px + env(safe-area-inset-bottom, 0px))", display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 10 }}>
          <div className="trip-toast" style={{ background: "rgba(20,20,22,0.92)", color: themeAccent, fontSize: 12.5, fontWeight: 600, padding: "9px 16px", borderRadius: 999, boxShadow: "0 6px 18px rgba(0,0,0,0.35)" }}>
            {tripToast}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div key={value} className="display animate-pop" style={{ fontSize: 19, fontWeight: 700, color: accent || "var(--text)" }}>{value}</div>
    </div>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginBottom: 10, ...style }}>
      {children}
    </div>
  );
}
