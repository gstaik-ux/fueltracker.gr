"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  ChevronDown,
  Pencil,
  Fuel,
  Check,
  Plane,
  Settings,
  Droplet,
  Droplets,
  Wrench,
  Filter,
  Car,
  Bike,
  FileText,
  Sparkles,
  Camera,
  Coins,
  Home,
  Utensils,
  Bell,
  Gauge,
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
  cost: number | null;
  note: string;
  isTrip: boolean;
};

const SERVICE_TYPES = [
  { key: "oil", label: "Λάδια", Icon: Droplet },
  { key: "tires", label: "Λάστιχα", Icon: Settings },
  { key: "filter", label: "Φίλτρα", Icon: Filter },
  { key: "washer", label: "Υγρό Υαλοκαθαριστήρων", Icon: Droplets },
  { key: "wash", label: "Πλυντήριο", Icon: Sparkles },
  { key: "tolls", label: "Διόδια", Icon: Coins },
  { key: "food", label: "Φαγητό", Icon: Utensils },
  { key: "other", label: "Άλλο", Icon: Wrench },
  { key: "general", label: "Σέρβις", Icon: Wrench },
];
function serviceIcon(type: string) {
  return (SERVICE_TYPES.find((t) => t.key === type) || SERVICE_TYPES[7]).Icon;
}
function serviceLabel(type: string) {
  return (SERVICE_TYPES.find((t) => t.key === type) || SERVICE_TYPES[7]).label;
}
function serviceNotePlaceholder(type: string) {
  const examples: Record<string, string> = {
    oil: "π.χ. Mobil 5W-30, συνεργείο Γιώργου",
    tires: "π.χ. Michelin, 4 λάστιχα",
    filter: "π.χ. φίλτρο αέρα + λαδιού",
    washer: "π.χ. καλοκαιρινό υγρό",
    wash: "π.χ. πλυντήριο Γιώργου",
    other: "π.χ. τι έγινε",
    general: "π.χ. τι έγινε",
  };
  return examples[type] || "προαιρετικό";
}
// Vehicles with a small tank (scooters/mopeds) get everything done together
// in one visit, so the picker only shows a single generic "Σέρβις" option.
// Washing and trip expenses (tolls/food) are hidden here regardless - tolls
// and food only ever get added through the Trip tab's quick-add, not this
// general maintenance form.
function availableServiceTypes(vehicleIcon: string) {
  if (vehicleIcon === "bike") return SERVICE_TYPES.filter((t) => t.key === "general" || t.key === "wash");
  return SERVICE_TYPES.filter((t) => t.key !== "general" && t.key !== "tolls" && t.key !== "food");
}

const TRIP_EXPENSE_TYPES = [
  { key: "tolls", label: "Διόδια", Icon: Coins },
  { key: "food", label: "Φαγητό", Icon: Utensils },
  { key: "other", label: "Άλλο", Icon: Wrench },
];

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
  { key: "washer", label: "Υγρό υαλοκαθαριστήρων" },
  { key: "coolant", label: "Υγρό ψυγείου" },
  { key: "brakes", label: "Φρένα" },
];

const TAB_ORDER = ["main", "docs", "fuel", "service", "trip"] as const;
type Tab = (typeof TAB_ORDER)[number];
const TAB_TITLES: Record<Tab, string | undefined> = {
  main: "Αρχική",
  docs: "Έγγραφα",
  fuel: undefined,
  service: "Συντήρηση",
  trip: "Εκδρομή",
};

const SERVICE_CHART_COLOR = "#7c93b3";
const TRIP_CHART_COLOR = "#c98cd9";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function fmtMoney(n: number) {
  return isFinite(n) ? "€" + n.toFixed(2) : "—";
}
function fmtCost(n: number) {
  return n === 0 ? "Δωρεάν" : fmtMoney(n);
}
function fmtNum(n: number, d = 1) {
  return isFinite(n) ? n.toFixed(d) : "—";
}
function fmtDateGR(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
// Some phones (Greek locale iPhones especially) only offer a comma on their
// decimal keypad, and a plain HTML number input silently rejects commas -
// so these fields are type="text" and we normalize here before parsing.
function num(str: string) {
  return parseFloat(str.replace(",", "."));
}
function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}
function docStatusColor(days: number | null) {
  if (days == null) return "#868d99";
  if (days < 0 || days <= 15) return "#e2323a";
  if (days <= 30) return "#e0b23e";
  return "#4e9e76";
}
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function vehicleIconFor(icon: string) {
  return icon === "bike" ? Bike : Car;
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
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.7;
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  return {
    playTap: () => tone(340, 0, 0.05, 0.035),
    playSuccess: () => tone(400, 0, 0.07, 0.028),
  };
}

// Swipe a row left to reveal a delete action underneath - tap it to confirm.
function SwipeToDelete({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const [dragX, setDragX] = useState(0);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startDragXRef = useRef(0);
  const REVEAL = 78;

  function start(clientX: number) {
    draggingRef.current = true;
    startXRef.current = clientX;
    startDragXRef.current = dragX;
  }
  function move(clientX: number) {
    if (!draggingRef.current) return;
    const next = startDragXRef.current + (clientX - startXRef.current);
    setDragX(Math.min(0, Math.max(next, -REVEAL)));
  }
  function end() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragX((x) => (x < -REVEAL / 2 ? -REVEAL : 0));
  }

  return (
    <div style={{ overflow: "hidden" }}>
      <div
        onTouchStart={(e) => { e.stopPropagation(); start(e.touches[0].clientX); }}
        onTouchMove={(e) => { e.stopPropagation(); move(e.touches[0].clientX); }}
        onTouchEnd={(e) => { e.stopPropagation(); end(); }}
        onMouseDown={(e) => { e.stopPropagation(); start(e.clientX); }}
        onMouseMove={(e) => { e.stopPropagation(); draggingRef.current && move(e.clientX); }}
        onMouseUp={(e) => { e.stopPropagation(); end(); }}
        onMouseLeave={end}
        style={{
          display: "flex",
          transform: `translateX(${dragX}px)`,
          transition: draggingRef.current ? "none" : "transform 0.2s ease",
          touchAction: "pan-y",
        }}
      >
        <div style={{ width: "100%", flexShrink: 0 }}>{children}</div>
        <button
          onClick={() => { onDelete(); setDragX(0); }}
          style={{ width: REVEAL, flexShrink: 0, background: "#e2323a", border: "none", color: "#fff", fontSize: 11.5, fontWeight: 700 }}
        >
          Διαγραφή
        </button>
      </div>
    </div>
  );
}

type Vehicle = {
  slug: string;
  name: string;
  themeAccent: string;
  themeBg: string;
  vehicleIcon: string;
  tankCapacity: number | null;
  plateNumber: string | null;
  vin: string | null;
  insuranceDate: string | null;
  kteoDate: string | null;
  insurancePhotoUrl: string | null;
  kteoPhotoUrl: string | null;
  lastOdometer: number | null;
};

export default function VehicleDashboard({
  vehicle: initialVehicle,
  initialFillups,
  initialServiceEntries,
}: {
  vehicle: Vehicle;
  initialFillups: Fillup[];
  initialServiceEntries: ServiceEntry[];
}) {
  const slug = initialVehicle.slug;
  const themeAccent = initialVehicle.themeAccent;
  const themeBg = initialVehicle.themeBg;

  const dateInputRef = useRef<HTMLInputElement>(null);
  const serviceDateInputRef = useRef<HTMLInputElement>(null);
  const { playTap, playSuccess } = useSound();

  const [vehicle, setVehicle] = useState<Vehicle>(initialVehicle);
  const [fillups, setFillups] = useState<Fillup[]>(initialFillups);
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>(initialServiceEntries);

  const [form, setForm] = useState({ date: todayStr(), liters: "", cost: "", odometer: "", isTrip: false, isFull: false });
  const [logStep, setLogStep] = useState(1);
  const [loggedThisVisit, setLoggedThisVisit] = useState(false);
  const [showDateFields, setShowDateFields] = useState(false);
  const [manualPrice, setManualPrice] = useState("");
  const [error, setError] = useState("");
  const [confirmGreeting, setConfirmGreeting] = useState(SEND_OFF_GREETINGS[0]);
  const [overCapacityConfirm, setOverCapacityConfirm] = useState<{ cost: number; liters: number } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: "", liters: "", cost: "", odometer: "", isTrip: false, isFull: false });

  const [tripModeActive, setTripModeActive] = useState(false);
  const [tripChecklist, setTripChecklist] = useState<Record<string, boolean>>({});
  const [showChecklistDropdown, setShowChecklistDropdown] = useState(true);
  const [tripSessionExpenses, setTripSessionExpenses] = useState<ServiceEntry[]>([]);
  const [addingExpenseType, setAddingExpenseType] = useState<string | null>(null);
  const [expenseCost, setExpenseCost] = useState("");
  const [expenseNote, setExpenseNote] = useState("");

  const [viewMode, setViewMode] = useState<Tab>("main");
  const availableTypes = availableServiceTypes(vehicle.vehicleIcon);
  const [serviceForm, setServiceForm] = useState({ type: availableTypes[0].key, date: todayStr(), odometer: "", cost: "", note: "" });
  const [serviceError, setServiceError] = useState("");
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceForm, setEditServiceForm] = useState({ date: "", odometer: "", cost: "", note: "" });

  const [showVehicleDetailsForm, setShowVehicleDetailsForm] = useState(false);
  const [vehicleDetailsDraft, setVehicleDetailsDraft] = useState({ plate: "", vin: "" });

  const [statsFilters, setStatsFilters] = useState({ fuel: true, service: false, trip: false });

  const [headerText, setHeaderText] = useState<string | null>(null);
  const pendingGreetingRef = useRef<string | null>(
    (() => {
      const hour = new Date().getHours();
      return hour < 12 ? "Καλημέρα" : "Καλησπέρα";
    })()
  );

  const [showNotifications, setShowNotifications] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState<Set<string>>(new Set());
  const bellWrapperRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  // Whenever the tab changes, briefly show that section's name in place of
  // the vehicle name, then settle back. On first mount this shows the
  // time-of-day greeting instead (queued by the ref above).
  useEffect(() => {
    const title = pendingGreetingRef.current || TAB_TITLES[viewMode] || null;
    pendingGreetingRef.current = null;
    setHeaderText(title);
    if (!title) return;
    const t = setTimeout(() => setHeaderText(null), 1200);
    return () => clearTimeout(t);
  }, [viewMode]);

  // Closes the notification dropdown on a click/tap anywhere else.
  useEffect(() => {
    if (!showNotifications) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      const insideBell = bellWrapperRef.current && bellWrapperRef.current.contains(target);
      const insideDropdown = notificationDropdownRef.current && notificationDropdownRef.current.contains(target);
      if (!insideBell && !insideDropdown) setShowNotifications(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [showNotifications]);

  // The dropdown is fixed to the screen, not anchored to the bell - closes
  // on scroll so it never visually drifts away from the bell icon.
  useEffect(() => {
    if (!showNotifications) return;
    function handleScroll() {
      setShowNotifications(false);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showNotifications]);

  // Closes on any tab change too.
  useEffect(() => {
    setShowNotifications(false);
  }, [viewMode]);

  const entries = useMemo(
    () =>
      [...fillups].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return 0;
      }),
    [fillups]
  );
  const ascEntries = useMemo(() => [...entries].reverse(), [entries]);

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
    const oilEntries = serviceEntries.filter((s) => s.type === "oil" && s.odometer != null);
    if (oilEntries.length === 0 || vehicle.lastOdometer == null) return null;
    const lastOil = oilEntries.reduce((max, s) => (s.odometer! > max.odometer! ? s : max), oilEntries[0]);
    const sinceOil = vehicle.lastOdometer - lastOil.odometer!;
    if (sinceOil >= OIL_CHANGE_INTERVAL_KM) return { overdue: true, km: sinceOil, remaining: 0 };
    if (sinceOil >= OIL_CHANGE_INTERVAL_KM * 0.9) return { overdue: false, km: sinceOil, remaining: OIL_CHANGE_INTERVAL_KM - sinceOil };
    return null;
  }, [serviceEntries, vehicle.lastOdometer]);

  const reminderNotifications = useMemo(() => {
    const list: { id: string; color: string; tab: Tab; Icon: any; text: string }[] = [];
    if (oilReminder) {
      list.push({
        id: "oil",
        color: oilReminder.overdue ? "#e2323a" : "#e0b23e",
        tab: "service",
        Icon: Droplet,
        text: oilReminder.overdue
          ? `Καθυστερημένη αλλαγή λαδιών - ${fmtNum(oilReminder.km, 0)} km από την τελευταία`
          : `Θα χρειαστεί σύντομα αλλαγή λαδιών - ακόμα ${fmtNum(oilReminder.remaining, 0)} km`,
      });
    }
    const insDays = daysUntil(vehicle.insuranceDate);
    if (insDays != null && insDays <= 30) {
      list.push({
        id: "insurance",
        color: docStatusColor(insDays),
        tab: "docs",
        Icon: FileText,
        text: insDays < 0 ? `Η ασφάλεια έληξε πριν από ${Math.abs(insDays)} ημέρες` : `Η ασφάλεια θα λήξει σε ${insDays} ημέρες`,
      });
    }
    const kteoDays = daysUntil(vehicle.kteoDate);
    if (kteoDays != null && kteoDays <= 30) {
      list.push({
        id: "kteo",
        color: docStatusColor(kteoDays),
        tab: "docs",
        Icon: FileText,
        text: kteoDays < 0 ? `Το ΚΤΕΟ έληξε πριν από ${Math.abs(kteoDays)} ημέρες` : `Το ΚΤΕΟ θα λήξει σε ${kteoDays} ημέρες`,
      });
    }
    return list;
  }, [vehicle.insuranceDate, vehicle.kteoDate, oilReminder]);
  const unseenCount = reminderNotifications.filter((n) => !seenNotificationIds.has(n.id)).length;

  const yearlyDistance = useMemo(() => {
    const year = new Date().getFullYear();
    let total = 0;
    for (let i = 1; i < ascEntries.length; i++) {
      const p = ascEntries[i - 1], c = ascEntries[i];
      if (p.odometer != null && c.odometer != null && c.odometer > p.odometer) {
        if (new Date(c.date + "T00:00:00").getFullYear() === year) total += c.odometer - p.odometer;
      }
    }
    return total;
  }, [ascEntries]);

  const monthlyData = useMemo(() => {
    const year = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => ({
      label: new Date(year, i, 1).toLocaleDateString("el-GR", { month: "short" }).replace(".", ""),
      fuel: 0,
      service: 0,
      trip: 0,
    }));
    entries.forEach((e) => {
      const d = new Date(e.date + "T00:00:00");
      if (d.getFullYear() === year) months[d.getMonth()].fuel += e.cost;
    });
    serviceEntries.forEach((s) => {
      if (s.cost == null) return;
      const d = new Date(s.date + "T00:00:00");
      if (d.getFullYear() !== year) return;
      if (s.type === "tolls" || s.type === "food") months[d.getMonth()].trip += s.cost;
      else months[d.getMonth()].service += s.cost;
    });
    return months;
  }, [entries, serviceEntries]);

  const statsFilteredTotal = useMemo(() => {
    const year = new Date().getFullYear();
    let total = 0;
    if (statsFilters.fuel) {
      total += entries.filter((e) => new Date(e.date + "T00:00:00").getFullYear() === year).reduce((s, e) => s + e.cost, 0);
    }
    if (statsFilters.service || statsFilters.trip) {
      serviceEntries.forEach((s) => {
        if (s.cost == null) return;
        if (new Date(s.date + "T00:00:00").getFullYear() !== year) return;
        const isTripType = s.type === "tolls" || s.type === "food";
        if (isTripType && statsFilters.trip) total += s.cost;
        if (!isTripType && statsFilters.service) total += s.cost;
      });
    }
    return total;
  }, [entries, serviceEntries, statsFilters]);

  const allHistory = useMemo(() => {
    const fuelItems = entries.map((e) => ({ ...e, kind: "fuel" as const }));
    const serviceItems = serviceEntries.map((s) => ({ ...s, kind: "service" as const }));
    return [...fuelItems, ...serviceItems].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [entries, serviceEntries]);

  const lifetimeTotal = useMemo(() => {
    const fuelTotal = entries.reduce((s, e) => s + e.cost, 0);
    const serviceTotal = serviceEntries.reduce((s, e) => s + (e.cost || 0), 0);
    return fuelTotal + serviceTotal;
  }, [entries, serviceEntries]);

  const repairHistory = useMemo(
    () => [...serviceEntries].filter((s) => s.type !== "tolls" && s.type !== "food").sort((a, b) => (a.date < b.date ? 1 : -1)),
    [serviceEntries]
  );
  const repairTotal = useMemo(() => repairHistory.reduce((s, e) => s + (e.cost || 0), 0), [repairHistory]);

  function goToStep2() {
    const cost = num(form.cost);
    if (!isFinite(cost) || cost <= 0) {
      setError("Γράψε πόσο κόστισε ο ανεφοδιασμός.");
      return;
    }
    setError("");
    playTap();
    setLogStep(2);
  }

  const costNum = num(form.cost) || 0;
  const manualPriceNum = num(manualPrice);
  const effectivePrice = isFinite(manualPriceNum) && manualPriceNum > 0 ? manualPriceNum : lastPricePerLiter;
  const priceLitersEstimate = effectivePrice != null && costNum > 0 ? costNum / effectivePrice : null;
  const odometerNum = num(form.odometer);
  const distanceSinceFull = form.isFull && isFinite(odometerNum) && lastFullOdometer != null ? odometerNum - lastFullOdometer : null;
  const fullTankLitersEstimate =
    distanceSinceFull != null && distanceSinceFull > 0 && knownEfficiency != null ? (distanceSinceFull * knownEfficiency) / 100 : null;
  const litersEstimate = fullTankLitersEstimate != null ? fullTankLitersEstimate : priceLitersEstimate;

  async function addFillup() {
    const cost = num(form.cost);
    const liters = form.liters.trim() === "" ? litersEstimate : num(form.liters);
    if (!isFinite(cost) || cost <= 0 || !liters || !isFinite(liters) || liters <= 0) {
      setError("Συμπλήρωσε κόστος και λίτρα για την καταχώρηση.");
      return;
    }
    if (vehicle.tankCapacity && liters > vehicle.tankCapacity) {
      setOverCapacityConfirm({ cost, liters });
      return;
    }
    await commitFillup(cost, liters);
  }

  async function commitFillup(cost: number, liters: number) {
    let odometer = form.odometer.trim() === "" ? null : num(form.odometer);
    let odometerEstimated = false;
    if (odometer == null) {
      if (vehicle.lastOdometer != null && knownEfficiency != null && knownEfficiency > 0) {
        const impliedDistance = (liters * 100) / knownEfficiency;
        odometer = Math.round(vehicle.lastOdometer + impliedDistance);
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
      if (data.fillup.odometer != null) setVehicle((v) => ({ ...v, lastOdometer: data.fillup.odometer }));
      setForm({ date: todayStr(), liters: "", cost: "", odometer: "", isTrip: false, isFull: false });
      setLogStep(1);
      setShowDateFields(false);
      setManualPrice("");
      setError("");
      setOverCapacityConfirm(null);
      setLoggedThisVisit(true);
      setConfirmGreeting(SEND_OFF_GREETINGS[Math.floor(Math.random() * SEND_OFF_GREETINGS.length)]);
      playSuccess();
      setTimeout(() => setLoggedThisVisit(false), 20 * 60 * 1000);
    } else {
      setError("Κάτι πήγε στραβά - δοκίμασε ξανά.");
    }
  }

  async function removeEntry(id: string) {
    setFillups((prev) => prev.filter((e) => e.id !== id));
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
  }
  function cancelEdit() {
    setEditingId(null);
  }
  async function saveEdit(id: string) {
    const liters = num(editForm.liters);
    const cost = num(editForm.cost);
    if (!editForm.date || !isFinite(liters) || liters <= 0 || !isFinite(cost) || cost <= 0) return;
    const odometer = editForm.odometer.trim() === "" ? null : num(editForm.odometer);

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
    if (serviceForm.cost.trim() === "") {
      setServiceError("Συμπλήρωσε το κόστος - βάλε 0 αν ήταν δωρεάν.");
      return;
    }
    const odometer = serviceForm.odometer.trim() === "" ? null : num(serviceForm.odometer);
    const cost = num(serviceForm.cost);
    const res = await fetch(`/api/v/${slug}/service`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: serviceForm.type, date: serviceForm.date, odometer, cost, note: serviceForm.note.trim(), isTrip: false }),
    });
    if (res.ok) {
      const data = await res.json();
      setServiceEntries((prev) => [...prev, data.entry]);
      setServiceForm({ type: availableTypes[0].key, date: todayStr(), odometer: "", cost: "", note: "" });
      setServiceError("");
      playSuccess();
    } else {
      setServiceError("Κάτι πήγε στραβά - δοκίμασε ξανά.");
    }
  }
  async function removeService(id: string) {
    setServiceEntries((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/v/${slug}/service/${id}`, { method: "DELETE" });
  }
  function startEditService(s: ServiceEntry) {
    setEditingServiceId(s.id);
    setEditServiceForm({
      date: s.date,
      odometer: s.odometer != null ? String(s.odometer) : "",
      cost: s.cost != null ? String(s.cost) : "",
      note: s.note || "",
    });
  }
  function cancelEditService() {
    setEditingServiceId(null);
  }
  async function saveEditService(id: string) {
    if (!editServiceForm.date) return;
    const odometer = editServiceForm.odometer.trim() === "" ? null : num(editServiceForm.odometer);
    const cost = editServiceForm.cost.trim() === "" ? null : num(editServiceForm.cost);
    const res = await fetch(`/api/v/${slug}/service/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: editServiceForm.date, odometer, cost, note: editServiceForm.note.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setServiceEntries((prev) => prev.map((s) => (s.id === id ? data.entry : s)));
    }
    setEditingServiceId(null);
  }

  function toggleTripMode() {
    playTap();
    setTripModeActive((active) => {
      const next = !active;
      setForm((f) => ({ ...f, isTrip: next }));
      if (next) {
        setTripChecklist({});
        setTripSessionExpenses([]);
        setShowChecklistDropdown(true);
      } else {
        setAddingExpenseType(null);
      }
      return next;
    });
  }

  async function logTripExpense() {
    const cost = expenseCost.trim() === "" ? null : num(expenseCost);
    const res = await fetch(`/api/v/${slug}/service`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: addingExpenseType, date: todayStr(), odometer: null, cost, note: expenseNote.trim(), isTrip: true }),
    });
    if (res.ok) {
      const data = await res.json();
      setServiceEntries((prev) => [...prev, data.entry]);
      setTripSessionExpenses((prev) => [...prev, data.entry]);
      setAddingExpenseType(null);
      setExpenseCost("");
      setExpenseNote("");
      playSuccess();
    }
  }

  async function saveVehicleDetails() {
    const res = await fetch(`/api/v/${slug}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plateNumber: vehicleDetailsDraft.plate.trim(), vin: vehicleDetailsDraft.vin.trim() }),
    });
    if (res.ok) {
      setVehicle((v) => ({ ...v, plateNumber: vehicleDetailsDraft.plate.trim(), vin: vehicleDetailsDraft.vin.trim() }));
      setShowVehicleDetailsForm(false);
      playSuccess();
    }
  }

  async function updateDocDate(field: "insuranceDate" | "kteoDate", value: string) {
    setVehicle((v) => ({ ...v, [field]: value }));
    await fetch(`/api/v/${slug}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  async function updateDocPhoto(field: "insurancePhotoUrl" | "kteoPhotoUrl", file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("field", field);
    const res = await fetch(`/api/v/${slug}/photo`, { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      setVehicle((v) => ({ ...v, [field]: data.url }));
    }
  }
  async function removeDocPhoto(field: "insurancePhotoUrl" | "kteoPhotoUrl") {
    setVehicle((v) => ({ ...v, [field]: null }));
    await fetch(`/api/v/${slug}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: null }),
    });
  }

  const VehicleIcon = vehicleIconFor(vehicle.vehicleIcon);

  function onSwipeStart(x: number, y: number, ref: { x: number; y: number }) {
    ref.x = x;
    ref.y = y;
  }
  const swipeRef = useRef({ x: 0, y: 0 });

  function goTab(idx: number) {
    const clamped = Math.max(0, Math.min(TAB_ORDER.length - 1, idx));
    setViewMode(TAB_ORDER[clamped]);
  }

  return (
    <div style={{ background: themeBg, color: "var(--text)", minHeight: "100vh", position: "relative" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 18px 100px", position: "relative", zIndex: 1, ["--accent" as any]: themeAccent }}>
        <div className="animate-fade" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "0 4px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="row-icon" style={{ background: `${themeAccent}22` }}>
              <VehicleIcon size={17} color={themeAccent} />
            </span>
            <div key={headerText || "name"} className="display animate-fade" style={{ fontSize: 17, fontWeight: 700 }}>
              {headerText || vehicle.name}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {tripModeActive && (
              <button
                onClick={toggleTripMode}
                title="Απενεργοποίηση εκδρομής"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, background: `${themeAccent}22`, color: themeAccent, border: "none", borderRadius: 99 }}
              >
                <Plane size={16} />
              </button>
            )}

            <div ref={bellWrapperRef} style={{ position: "relative" }}>
              <button
                onClick={() => {
                  playTap();
                  setShowNotifications((s) => {
                    const next = !s;
                    if (next) {
                      setSeenNotificationIds((prev) => {
                        const updated = new Set(prev);
                        reminderNotifications.forEach((n) => updated.add(n.id));
                        return updated;
                      });
                    }
                    return next;
                  });
                }}
                style={{ position: "relative", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 99, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}
              >
                <Bell size={17} color={unseenCount > 0 ? themeAccent : "var(--muted)"} />
                {unseenCount > 0 && (
                  <span className="animate-pop" style={{ position: "absolute", top: 7, right: 7, width: 8, height: 8, borderRadius: 99, background: "#e2323a" }} />
                )}
              </button>
            </div>
          </div>
        </div>

        <div
          key={viewMode}
          className="animate-fade"
          onTouchStart={(e) => onSwipeStart(e.touches[0].clientX, e.touches[0].clientY, swipeRef.current)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - swipeRef.current.x;
            const dy = e.changedTouches[0].clientY - swipeRef.current.y;
            if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
            const idx = TAB_ORDER.indexOf(viewMode);
            if (dx < 0) goTab(idx + 1);
            else goTab(idx - 1);
          }}
        >
          {viewMode === "fuel" && (
            <>
              {!loggedThisVisit && logStep === 1 && (
                <div className="animate-in" style={{ ...({} as any), background: "rgba(255,255,255,0.045)", borderRadius: 22, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 20px rgba(0,0,0,0.25)", padding: "28px 20px 22px" }}>
                  <div style={{ textAlign: "center", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted)", marginBottom: 2 }}>Κόστος €</div>
                  <input
                    className="big-input"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    placeholder="0€"
                    autoFocus
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") goToStep2(); }}
                  />
                  {error && <div style={{ fontSize: 12.5, color: themeAccent, textAlign: "center", marginTop: 4 }}>{error}</div>}
                  <button className="tap" onClick={goToStep2} style={{ width: "100%", background: themeAccent, color: "#08090a", border: "none", borderRadius: 999, fontSize: 15, fontWeight: 700, padding: "14px 0", marginTop: 18, boxShadow: `0 4px 12px ${themeAccent}25` }}>
                    Επόμενο
                  </button>
                </div>
              )}

              {!loggedThisVisit && logStep === 2 && (
                <div className="animate-in card" style={{ padding: "28px 20px 22px", position: "relative" }}>
                  <button
                    className="tap"
                    onClick={() => { playTap(); setLogStep(1); }}
                    style={{ position: "absolute", top: 6, left: 18, background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, lineHeight: 1, padding: 0, margin: 0, display: "flex", alignItems: "center", gap: 4 }}
                  >
                    ‹ {fmtMoney(num(form.cost) || 0)}
                  </button>
                  <div style={{ textAlign: "center", fontSize: 12, lineHeight: 1, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted)", marginBottom: 2 }}>Λίτρα L</div>
                  <input
                    className="big-input"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    placeholder={litersEstimate != null ? fmtNum(litersEstimate, 1) : "0"}
                    autoFocus
                    value={form.liters}
                    onChange={(e) => setForm({ ...form, liters: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") addFillup(); }}
                  />
                  <button
                    onClick={() => { playTap(); setShowDateFields((s) => !s); }}
                    style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, lineHeight: 1, padding: "2px 0", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", gap: 4 }}
                  >
                    {showDateFields ? "Απόκρυψη επιλογών" : "Περισσότερες επιλογές"}
                    <ChevronDown className="chev" size={13} style={{ transform: showDateFields ? "rotate(180deg)" : "none" }} />
                  </button>

                  {showDateFields && (
                    <div className="animate-fade">
                      <div className="fillup-row" style={{ marginBottom: 10, marginTop: 4 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΗΜΕΡΟΜΗΝΙΑ</div>
                          <div onClick={() => (dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.focus())} style={{ position: "relative" }}>
                            <div className="pill-input" style={{ cursor: "pointer" }}>{fmtDateGR(form.date)}</div>
                            <input ref={dateInputRef} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", border: "none" }} />
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                            ΧΙΛΙΟΜΕΤΡΑ {vehicle.lastOdometer != null && <span style={{ color: "var(--muted)", textTransform: "none", fontWeight: 400 }}>· τελ. {fmtNum(vehicle.lastOdometer, 0)}</span>}
                          </div>
                          <input className="pill-input" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" placeholder="προαιρετικό" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΤΙΜΗ ΑΝΑ ΛΙΤΡΟ € (αν την ξέρεις)</div>
                        <input className="pill-input" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" placeholder={lastPricePerLiter != null ? fmtNum(lastPricePerLiter, 2) : "π.χ. 1.65"} value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} />
                      </div>
                      <button
                        onClick={() => { playTap(); setForm((f) => ({ ...f, isFull: !f.isFull })); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, background: form.isFull ? `${themeAccent}22` : "rgba(255,255,255,0.06)", border: "none", borderRadius: 12, padding: "10px 12px", width: "100%", marginTop: 10, color: form.isFull ? themeAccent : "var(--muted)", fontSize: 13, fontWeight: 600 }}
                      >
                        <Fuel size={15} /> Γέμισε το ρεζερβουάρ;
                        <span style={{ marginLeft: "auto", fontSize: 11.5, opacity: 0.8 }}>{form.isFull ? "Ναι" : "Όχι"}</span>
                      </button>
                    </div>
                  )}

                  {vehicle.tankCapacity && num(form.liters) > 0 && (
                    <div className="animate-fade" style={{ fontSize: 10.5, lineHeight: 1.3, color: "var(--muted)", opacity: 0.65, textAlign: "center", margin: "2px 0" }}>
                      ≈{Math.round((num(form.liters) / vehicle.tankCapacity) * 100)}% του ρεζερβουάρ ({vehicle.tankCapacity} L)
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

                  <button className="tap" onClick={addFillup} style={{ width: "100%", background: themeAccent, color: "#08090a", border: "none", borderRadius: 999, fontSize: 15, fontWeight: 700, padding: "14px 0", marginTop: 14, boxShadow: `0 4px 12px ${themeAccent}25` }}>
                    Καταχώρηση
                  </button>
                </div>
              )}

              {overCapacityConfirm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }} onClick={() => setOverCapacityConfirm(null)}>
                  <div className="animate-pop card" style={{ padding: "22px 20px", maxWidth: 320, width: "100%" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                      <span style={{ width: 42, height: 42, borderRadius: 99, background: "rgba(226,50,58,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Gauge size={20} color="#e2323a" />
                      </span>
                    </div>
                    <div className="display" style={{ fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 6 }}>Είσαι σίγουρος/η;</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", lineHeight: 1.5, marginBottom: 18 }}>
                      Καταχωρείς {fmtNum(overCapacityConfirm.liters)} L, πάνω από το 100% του ρεζερβουάρ ({vehicle.tankCapacity} L). Σίγουρα είναι σωστό;
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setOverCapacityConfirm(null)} className="tap" style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 999, color: "var(--text)", fontSize: 13.5, fontWeight: 600, padding: "11px 0" }}>Άκυρο</button>
                      <button onClick={() => commitFillup(overCapacityConfirm.cost, overCapacityConfirm.liters)} className="tap" style={{ flex: 1, background: themeAccent, border: "none", borderRadius: 999, color: "#08090a", fontSize: 13.5, fontWeight: 700, padding: "11px 0" }}>Ναι, σωστά</button>
                    </div>
                  </div>
                </div>
              )}

              {loggedThisVisit && (
                <div className="animate-in card" style={{ padding: "26px 20px", textAlign: "center" }}>
                  <div className="animate-pop" style={{ width: 46, height: 46, borderRadius: 99, background: `${themeAccent}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <Check size={22} color={themeAccent} />
                  </div>
                  <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Καταχωρήθηκε</div>
                  <div style={{ fontSize: 13.5, color: "var(--muted)" }}>{confirmGreeting}</div>
                </div>
              )}
            </>
          )}

          {viewMode === "main" && (
            <>
              <div className="animate-in card" style={{ padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {[
                    { key: "fuel" as const, label: "Καύσιμα", color: themeAccent },
                    { key: "service" as const, label: "Συντήρηση", color: SERVICE_CHART_COLOR },
                    { key: "trip" as const, label: "Εκδρομή", color: TRIP_CHART_COLOR },
                  ].map((opt) => {
                    const active = statsFilters[opt.key];
                    return (
                      <button
                        key={opt.key}
                        onClick={() => {
                          playTap();
                          setStatsFilters((f) => {
                            const next = { ...f, [opt.key]: !f[opt.key] };
                            const any = next.fuel || next.service || next.trip;
                            return any ? next : f;
                          });
                        }}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          background: active ? `${opt.color}33` : "rgba(255,255,255,0.06)",
                          border: "none",
                          borderRadius: 999,
                          padding: "8px 6px",
                          color: active ? opt.color : "var(--muted)",
                          fontSize: 11.5,
                          fontWeight: 600,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: 99, background: active ? opt.color : "var(--muted)", flexShrink: 0 }} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>Σύνολο φέτος</div>
                <div key={`${statsFilters.fuel}${statsFilters.service}${statsFilters.trip}`} className="display animate-pop" style={{ fontSize: 30, fontWeight: 700, color: themeAccent, marginBottom: 18 }}>
                  {fmtMoney(statsFilteredTotal)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", rowGap: 20, columnGap: 10 }}>
                  <Stat label="Λίτρα" value={fmtNum(stats.totalLiters)} accent={themeAccent} />
                  <Stat label="Μέση τιμή €/L" value={stats.avgPrice ? fmtMoney(stats.avgPrice) : "—"} />
                  <Stat label="Κατανάλωση L/100km" value={stats.efficiency ? fmtNum(stats.efficiency, 2) : "—"} />
                  <Stat label="Χιλιόμετρα φέτος" value={yearlyDistance > 0 ? `${fmtNum(yearlyDistance, 0)} km` : "—"} />
                </div>
              </div>

              {entries.length > 0 && (
                <>
                  <div className="animate-in card" style={{ padding: "18px 20px 8px", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <SectionLabel style={{ marginBottom: 0 }}>Μηνιαία δαπάνη</SectionLabel>
                      <div style={{ display: "flex", gap: 10 }}>
                        {statsFilters.fuel && <LegendDot color={themeAccent} label="Καύσιμα" />}
                        {statsFilters.service && <LegendDot color={SERVICE_CHART_COLOR} label="Συντήρηση" />}
                        {statsFilters.trip && <LegendDot color={TRIP_CHART_COLOR} label="Εκδρομή" />}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={monthlyData} margin={{ top: 4, right: 0, left: 0, bottom: 8 }}>
                        <XAxis dataKey="label" interval={0} minTickGap={0} ticks={monthlyData.map((m) => m.label)} tick={{ fill: "#868d99", fontSize: 9.5 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.04)" }}
                          contentStyle={{ background: "#16181c", border: "none", borderRadius: 10, fontSize: 12 }}
                          formatter={(v: any, name: any) => [fmtMoney(v), name === "fuel" ? "Καύσιμα" : name === "service" ? "Συντήρηση" : "Εκδρομή"]}
                        />
                        {statsFilters.fuel && <Bar dataKey="fuel" stackId="a" fill={themeAccent} radius={[5, 5, 0, 0]} maxBarSize={20} />}
                        {statsFilters.service && <Bar dataKey="service" stackId="a" fill={SERVICE_CHART_COLOR} radius={[5, 5, 0, 0]} maxBarSize={20} />}
                        {statsFilters.trip && <Bar dataKey="trip" stackId="a" fill={TRIP_CHART_COLOR} radius={[5, 5, 0, 0]} maxBarSize={20} />}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="animate-in card" style={{ padding: "6px 16px" }}>
                    <div style={{ padding: "14px 4px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <SectionLabel style={{ marginBottom: 0 }}>Ιστορικό (όλα)</SectionLabel>
                      <div className="display" style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Σύνολο: {fmtMoney(lifetimeTotal)}</div>
                    </div>
                    {allHistory.map((e: any, i) => {
                      const borderBottom = i < allHistory.length - 1 ? "1px solid var(--hairline)" : "none";

                      if (e.kind === "service") {
                        const Icon = serviceIcon(e.type);
                        if (editingServiceId === e.id) {
                          return (
                            <div key={e.id} style={{ padding: "14px 4px", borderBottom }}>
                              <div className="fillup-row" style={{ marginBottom: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΗΜΕΡΟΜΗΝΙΑ</div>
                                  <input className="pill-input" type="date" style={{ fontSize: 14 }} value={editServiceForm.date} onChange={(ev) => setEditServiceForm({ ...editServiceForm, date: ev.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΧΙΛΙΟΜΕΤΡΑ</div>
                                  <input className="pill-input" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" placeholder="προαιρετικό" style={{ fontSize: 14 }} value={editServiceForm.odometer} onChange={(ev) => setEditServiceForm({ ...editServiceForm, odometer: ev.target.value })} />
                                </div>
                              </div>
                              <div className="fillup-row" style={{ marginBottom: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΚΟΣΤΟΣ €</div>
                                  <input className="pill-input" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" placeholder="προαιρετικό" style={{ fontSize: 14 }} value={editServiceForm.cost} onChange={(ev) => setEditServiceForm({ ...editServiceForm, cost: ev.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΣΗΜΕΙΩΣΗ</div>
                                  <input className="pill-input" type="text" style={{ fontSize: 14 }} value={editServiceForm.note} onChange={(ev) => setEditServiceForm({ ...editServiceForm, note: ev.target.value })} />
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 16 }}>
                                <button className="tap" onClick={() => saveEditService(e.id)} style={{ background: "none", border: "none", color: themeAccent, fontSize: 13, fontWeight: 700, padding: 0 }}>Αποθήκευση</button>
                                <button className="tap" onClick={cancelEditService} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, padding: 0 }}>Άκυρο</button>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <SwipeToDelete key={e.id} onDelete={() => removeService(e.id)}>
                            <div className="row-fade" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 4px", borderBottom }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                                <span className="row-icon" style={{ background: `${themeAccent}1c` }}><Icon size={15} color={themeAccent} /></span>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                                    {serviceLabel(e.type)}
                                    {e.isTrip && (
                                      <span className="animate-pop" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, color: themeAccent, background: `${themeAccent}22`, borderRadius: 6 }}>
                                        <Plane size={11} />
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
                                    {fmtDateGR(e.date)}
                                    {e.odometer != null ? ` · ${fmtNum(e.odometer, 0)} km` : ""}
                                    {e.note ? ` · ${e.note}` : ""}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                {e.cost != null && <div className="display" style={{ fontSize: 14.5, fontWeight: 700, marginRight: 2 }}>{fmtCost(e.cost)}</div>}
                                <button className="icon-btn tap" onClick={() => startEditService(e)}><Pencil size={14} /></button>
                              </div>
                            </div>
                          </SwipeToDelete>
                        );
                      }

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
                                <input className="pill-input" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" placeholder="προαιρετικό" style={{ fontSize: 14 }} value={editForm.odometer} onChange={(ev) => setEditForm({ ...editForm, odometer: ev.target.value })} />
                              </div>
                            </div>
                            <div className="fillup-row" style={{ marginBottom: 12 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΛΙΤΡΑ</div>
                                <input className="pill-input" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" style={{ fontSize: 14 }} value={editForm.liters} onChange={(ev) => setEditForm({ ...editForm, liters: ev.target.value })} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΚΟΣΤΟΣ €</div>
                                <input className="pill-input" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" style={{ fontSize: 14 }} value={editForm.cost} onChange={(ev) => setEditForm({ ...editForm, cost: ev.target.value })} />
                              </div>
                            </div>
                            <button
                              onClick={() => setEditForm({ ...editForm, isTrip: !editForm.isTrip })}
                              style={{ display: "flex", alignItems: "center", gap: 8, background: editForm.isTrip ? `${themeAccent}22` : "rgba(255,255,255,0.06)", border: "none", borderRadius: 12, padding: "8px 12px", width: "100%", marginBottom: 8, color: editForm.isTrip ? themeAccent : "var(--muted)", fontSize: 12.5, fontWeight: 600 }}
                            >
                              <Plane size={14} /> Εκδρομή
                              <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.8 }}>{editForm.isTrip ? "Ναι" : "Όχι"}</span>
                            </button>
                            <button
                              onClick={() => setEditForm({ ...editForm, isFull: !editForm.isFull })}
                              style={{ display: "flex", alignItems: "center", gap: 8, background: editForm.isFull ? `${themeAccent}22` : "rgba(255,255,255,0.06)", border: "none", borderRadius: 12, padding: "8px 12px", width: "100%", marginBottom: 12, color: editForm.isFull ? themeAccent : "var(--muted)", fontSize: 12.5, fontWeight: 600 }}
                            >
                              <Fuel size={14} /> Γέμισε το ρεζερβουάρ;
                              <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.8 }}>{editForm.isFull ? "Ναι" : "Όχι"}</span>
                            </button>
                            <div style={{ display: "flex", gap: 16 }}>
                              <button className="tap" onClick={() => saveEdit(e.id)} style={{ background: "none", border: "none", color: themeAccent, fontSize: 13, fontWeight: 700, padding: 0 }}>Αποθήκευση</button>
                              <button className="tap" onClick={cancelEdit} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, padding: 0 }}>Άκυρο</button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <SwipeToDelete key={e.id} onDelete={() => removeEntry(e.id)}>
                          <div className="row-fade" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 4px", borderBottom }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                              <span className="row-icon" style={{ background: `${themeAccent}1c` }}><Fuel size={15} color={themeAccent} /></span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                                  {fmtDateGR(e.date)}
                                  {e.isTrip && (
                                    <span className="animate-pop" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, color: themeAccent, background: `${themeAccent}22`, borderRadius: 6 }}>
                                      <Plane size={11} />
                                    </span>
                                  )}
                                  {e.isFull && (
                                    <span className="animate-pop" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, color: "var(--muted)", background: "rgba(255,255,255,0.08)", borderRadius: 6 }}>
                                      <Gauge size={11} />
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
                                  {fmtNum(e.liters)} L
                                  {vehicle.tankCapacity ? ` · ${Math.round((e.liters / vehicle.tankCapacity) * 100)}%` : ""}
                                  {e.odometer != null ? ` · ${fmtNum(e.odometer, 0)}${e.odometerEstimated ? "*" : ""} km` : ""}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                              <div className="display" style={{ fontSize: 14.5, fontWeight: 700, marginRight: 2 }}>{fmtMoney(e.cost)}</div>
                              <button className="icon-btn tap" onClick={() => startEdit(e)}><Pencil size={14} /></button>
                            </div>
                          </div>
                        </SwipeToDelete>
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
            </>
          )}

          {viewMode === "service" && (
            <>
              <div className="animate-in card" style={{ padding: "20px 20px 22px" }}>
                <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>Νέα καταχώρηση συντήρησης</div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
                  {availableTypes.map((t) => {
                    const selected = serviceForm.type === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => { playTap(); setServiceForm({ ...serviceForm, type: t.key }); }}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 76,
                          background: selected ? `${themeAccent}1c` : "rgba(255,255,255,0.045)",
                          border: `1.5px solid ${selected ? themeAccent : "transparent"}`,
                          borderRadius: 14, padding: "10px 4px", color: selected ? themeAccent : "var(--muted)",
                        }}
                      >
                        <span style={{ width: 28, height: 28, borderRadius: 99, background: selected ? `${themeAccent}2e` : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <t.Icon size={14} />
                        </span>
                        <span style={{ fontSize: 10.5, fontWeight: 600, textAlign: "center", lineHeight: 1.25 }}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ textAlign: "center", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted)", marginBottom: 2 }}>ΚΟΣΤΟΣ €</div>
                <input
                  className="big-input"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  placeholder="0€"
                  value={serviceForm.cost}
                  onChange={(e) => setServiceForm({ ...serviceForm, cost: e.target.value })}
                  style={{ marginBottom: 14 }}
                />

                <div className="fillup-row" style={{ marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΗΜΕΡΟΜΗΝΙΑ</div>
                    <div onClick={() => (serviceDateInputRef.current?.showPicker ? serviceDateInputRef.current.showPicker() : serviceDateInputRef.current?.focus())} style={{ position: "relative" }}>
                      <div className="pill-input" style={{ cursor: "pointer" }}>{fmtDateGR(serviceForm.date)}</div>
                      <input ref={serviceDateInputRef} type="date" value={serviceForm.date} onChange={(e) => setServiceForm({ ...serviceForm, date: e.target.value })} style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", border: "none" }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΧΙΛΙΟΜΕΤΡΑ</div>
                    <input className="pill-input" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" placeholder="προαιρετικό" value={serviceForm.odometer} onChange={(e) => setServiceForm({ ...serviceForm, odometer: e.target.value })} />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <input className="pill-input" type="text" placeholder={serviceNotePlaceholder(serviceForm.type)} value={serviceForm.note} onChange={(e) => setServiceForm({ ...serviceForm, note: e.target.value })} style={{ textAlign: "center" }} />
                </div>

                {serviceError && <div style={{ fontSize: 12.5, color: themeAccent, textAlign: "center", marginBottom: 8 }}>{serviceError}</div>}

                <button className="tap" onClick={addService} style={{ width: "100%", background: themeAccent, color: "#08090a", border: "none", borderRadius: 999, fontSize: 15, fontWeight: 700, padding: "14px 0", boxShadow: `0 4px 12px ${themeAccent}25` }}>
                  Καταχώρηση
                </button>
              </div>

              <div style={{ height: 1, background: "var(--hairline)", margin: "28px 0 20px" }} />

              <div className="animate-in card" style={{ padding: "6px 16px" }}>
                <div style={{ padding: "14px 4px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <SectionLabel style={{ marginBottom: 0 }}>Ιστορικό συντήρησης</SectionLabel>
                  <div className="display" style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Σύνολο: {fmtMoney(repairTotal)}</div>
                </div>
                {repairHistory.length === 0 && <div style={{ padding: "8px 4px 16px", fontSize: 13, color: "var(--muted)" }}>Καμία καταχώρηση ακόμα.</div>}
                {repairHistory.map((e, i) => {
                  const Icon = serviceIcon(e.type);
                  const borderBottom = i < repairHistory.length - 1 ? "1px solid var(--hairline)" : "none";
                  if (editingServiceId === e.id) {
                    return (
                      <div key={e.id} style={{ padding: "14px 4px", borderBottom }}>
                        <div className="fillup-row" style={{ marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΗΜΕΡΟΜΗΝΙΑ</div>
                            <input className="pill-input" type="date" style={{ fontSize: 14 }} value={editServiceForm.date} onChange={(ev) => setEditServiceForm({ ...editServiceForm, date: ev.target.value })} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΧΙΛΙΟΜΕΤΡΑ</div>
                            <input className="pill-input" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" placeholder="προαιρετικό" style={{ fontSize: 14 }} value={editServiceForm.odometer} onChange={(ev) => setEditServiceForm({ ...editServiceForm, odometer: ev.target.value })} />
                          </div>
                        </div>
                        <div className="fillup-row" style={{ marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΚΟΣΤΟΣ €</div>
                            <input className="pill-input" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" placeholder="προαιρετικό" style={{ fontSize: 14 }} value={editServiceForm.cost} onChange={(ev) => setEditServiceForm({ ...editServiceForm, cost: ev.target.value })} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ΣΗΜΕΙΩΣΗ</div>
                            <input className="pill-input" type="text" style={{ fontSize: 14 }} value={editServiceForm.note} onChange={(ev) => setEditServiceForm({ ...editServiceForm, note: ev.target.value })} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 16 }}>
                          <button className="tap" onClick={() => saveEditService(e.id)} style={{ background: "none", border: "none", color: themeAccent, fontSize: 13, fontWeight: 700, padding: 0 }}>Αποθήκευση</button>
                          <button className="tap" onClick={cancelEditService} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, padding: 0 }}>Άκυρο</button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <SwipeToDelete key={e.id} onDelete={() => removeService(e.id)}>
                      <div className="row-fade" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 4px", borderBottom }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <span className="row-icon" style={{ background: `${themeAccent}1c` }}><Icon size={15} color={themeAccent} /></span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{serviceLabel(e.type)}</div>
                            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
                              {fmtDateGR(e.date)}
                              {e.odometer != null ? ` · ${fmtNum(e.odometer, 0)} km` : ""}
                              {e.note ? ` · ${e.note}` : ""}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {e.cost != null && <div className="display" style={{ fontSize: 14.5, fontWeight: 700, marginRight: 2 }}>{fmtCost(e.cost)}</div>}
                          <button className="icon-btn tap" onClick={() => startEditService(e)}><Pencil size={14} /></button>
                        </div>
                      </div>
                    </SwipeToDelete>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === "docs" && (
            <>
              <div className="animate-in card" style={{ padding: "18px 18px 20px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div className="display" style={{ fontSize: 15, fontWeight: 700 }}>Στοιχεία Οχήματος</div>
                  {(vehicle.plateNumber || vehicle.vin) && !showVehicleDetailsForm && (
                    <button
                      onClick={() => { setVehicleDetailsDraft({ plate: vehicle.plateNumber || "", vin: vehicle.vin || "" }); setShowVehicleDetailsForm(true); }}
                      style={{ background: "none", border: "none", color: "var(--muted)", padding: 4 }}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
                {!(vehicle.plateNumber || vehicle.vin) || showVehicleDetailsForm ? (
                  <>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", opacity: 0.8, marginBottom: 12 }}>Αυτά δεν αλλάζουν συχνά - τα καταχωρείς μία φορά.</div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ΠΙΝΑΚΙΔΑ</div>
                      <input className="pill-input" placeholder="π.χ. ΙΖΗ-1234" value={vehicleDetailsDraft.plate} onChange={(e) => setVehicleDetailsDraft({ ...vehicleDetailsDraft, plate: e.target.value })} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>VIN (αριθμός πλαισίου, προαιρετικό)</div>
                      <input className="pill-input" placeholder="προαιρετικό" value={vehicleDetailsDraft.vin} onChange={(e) => setVehicleDetailsDraft({ ...vehicleDetailsDraft, vin: e.target.value })} />
                    </div>
                    <button className="tap" onClick={saveVehicleDetails} style={{ width: "100%", background: themeAccent, color: "#08090a", border: "none", borderRadius: 999, fontSize: 14, fontWeight: 700, padding: "12px 0" }}>Αποθήκευση</button>
                  </>
                ) : (
                  <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.9 }}>
                    {vehicle.plateNumber && <div>Πινακίδα: <b>{vehicle.plateNumber}</b></div>}
                    {vehicle.vin && <div>VIN: <b>{vehicle.vin}</b></div>}
                  </div>
                )}
              </div>

              <DocCard title="Ασφάλεια" Icon={FileText} dateVal={vehicle.insuranceDate} onChange={(v) => updateDocDate("insuranceDate", v)} photoUrl={vehicle.insurancePhotoUrl} onPhoto={(f) => updateDocPhoto("insurancePhotoUrl", f)} onRemovePhoto={() => removeDocPhoto("insurancePhotoUrl")} accent={themeAccent} />
              <DocCard title="ΚΤΕΟ" Icon={FileText} dateVal={vehicle.kteoDate} onChange={(v) => updateDocDate("kteoDate", v)} photoUrl={vehicle.kteoPhotoUrl} onPhoto={(f) => updateDocPhoto("kteoPhotoUrl", f)} onRemovePhoto={() => removeDocPhoto("kteoPhotoUrl")} accent={themeAccent} />
            </>
          )}

          {viewMode === "trip" && (
            <>
              <div className="animate-in card" style={{ padding: "18px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div className="display" style={{ fontSize: 16, fontWeight: 700 }}>Λειτουργία Εκδρομής</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{tripModeActive ? "Ενεργή" : "Ανενεργή"}</div>
                </div>
                <button onClick={toggleTripMode} style={{ background: tripModeActive ? themeAccent : "rgba(255,255,255,0.06)", border: "none", borderRadius: 999, padding: "10px 18px", color: tripModeActive ? "#08090a" : "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                  {tripModeActive ? "Ενεργή" : "Ενεργοποίηση"}
                </button>
              </div>

              {tripModeActive && (
                <>
                  <div className="animate-in card" style={{ padding: "16px 18px", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <SectionLabel style={{ marginBottom: 0 }}>Έξοδα εκδρομής</SectionLabel>
                      <div className="display" style={{ fontSize: 14, fontWeight: 700, color: themeAccent }}>{fmtMoney(tripSessionExpenses.reduce((s, e) => s + (e.cost || 0), 0))}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: addingExpenseType ? 4 : 0 }}>
                      {TRIP_EXPENSE_TYPES.map((t) => {
                        const selected = addingExpenseType === t.key;
                        return (
                          <button
                            key={t.key}
                            onClick={() => { playTap(); setAddingExpenseType((cur) => (cur === t.key ? null : t.key)); setExpenseCost(""); setExpenseNote(""); }}
                            style={{
                              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 76,
                              background: selected ? `${themeAccent}1c` : "rgba(255,255,255,0.045)",
                              border: `1.5px solid ${selected ? themeAccent : "transparent"}`,
                              borderRadius: 14, padding: "10px 4px", color: selected ? themeAccent : "var(--muted)",
                            }}
                          >
                            <span style={{ width: 28, height: 28, borderRadius: 99, background: selected ? `${themeAccent}2e` : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <t.Icon size={14} />
                            </span>
                            <span style={{ fontSize: 10.5, fontWeight: 600, textAlign: "center", lineHeight: 1.25 }}>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {addingExpenseType && (
                      <div className="animate-fade">
                        <div style={{ textAlign: "center", fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted)", marginTop: 10, marginBottom: 2 }}>ΚΟΣΤΟΣ €</div>
                        <input className="big-input" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" placeholder="0€" autoFocus value={expenseCost} onChange={(e) => setExpenseCost(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && expenseCost.trim() !== "") logTripExpense(); }} style={{ fontSize: 38, marginBottom: 6 }} />
                        <input className="pill-input" type="text" placeholder="Σημείωση (προαιρετικό)" value={expenseNote} onChange={(e) => setExpenseNote(e.target.value)} style={{ textAlign: "center", marginBottom: 12 }} />
                        <button onClick={logTripExpense} className="tap" disabled={expenseCost.trim() === ""} style={{ width: "100%", background: themeAccent, color: "#08090a", border: "none", borderRadius: 999, fontSize: 14, fontWeight: 700, padding: "12px 0", opacity: expenseCost.trim() === "" ? 0.5 : 1 }}>
                          Καταχώρηση
                        </button>
                      </div>
                    )}
                    {tripSessionExpenses.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        {tripSessionExpenses.map((e, i) => {
                          const t = TRIP_EXPENSE_TYPES.find((x) => x.key === e.type);
                          return (
                            <div key={e.id} className="row-fade" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: i > 0 ? "1px solid var(--hairline)" : "none" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                {t && <t.Icon size={14} color={themeAccent} />}
                                {t ? t.label : e.type}
                                {e.note ? ` · ${e.note}` : ""}
                              </div>
                              <div className="display" style={{ fontSize: 13, fontWeight: 700 }}>{e.cost != null ? fmtCost(e.cost) : "—"}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="animate-in card" style={{ padding: "16px 18px", marginBottom: 16 }}>
                    <button onClick={() => { playTap(); setShowChecklistDropdown((s) => !s); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0 }}>
                      <SectionLabel style={{ marginBottom: 0 }}>
                        Λίστα πριν την εκδρομή <span style={{ color: themeAccent, fontWeight: 700 }}>({Object.values(tripChecklist).filter(Boolean).length}/{TRIP_CHECKLIST_ITEMS.length})</span>
                      </SectionLabel>
                      <ChevronDown className="chev" size={15} color="var(--muted)" style={{ transform: showChecklistDropdown ? "rotate(180deg)" : "none" }} />
                    </button>
                    {showChecklistDropdown && (
                      <div className="animate-fade" style={{ marginTop: 8 }}>
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
                                  if (allDone) setTimeout(() => setShowChecklistDropdown(false), 500);
                                  return next;
                                });
                              }}
                              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", padding: "8px 0", color: done ? "var(--muted)" : "var(--text)", fontSize: 13.5, textDecoration: done ? "line-through" : "none" }}
                            >
                              <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${done ? themeAccent : "var(--muted)"}`, background: done ? themeAccent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s ease, border-color 0.15s ease" }}>
                                {done && <Check key={item.key} className="animate-pop" size={12} color="#08090a" />}
                              </span>
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {vehicle && showNotifications && (
        <div
          ref={notificationDropdownRef}
          className="animate-fade"
          style={{ position: "fixed", top: 74, right: 18, width: 260, maxHeight: 280, overflowY: "auto", padding: "8px 0", zIndex: 9999, background: "#131417", borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}
        >
          {reminderNotifications.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "22px 16px" }}>
              <span style={{ width: 30, height: 30, borderRadius: 99, background: "rgba(78,158,118,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={15} color="#4e9e76" />
              </span>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Όλα καλά!</div>
            </div>
          ) : (
            <>
              <div style={{ padding: "6px 16px 10px", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                {reminderNotifications.length} {reminderNotifications.length === 1 ? "ειδοποίηση" : "ειδοποιήσεις"}
              </div>
              {reminderNotifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { playTap(); setViewMode(n.tab); setShowNotifications(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", textAlign: "left", padding: "10px 16px", borderTop: "1px solid var(--hairline)" }}
                >
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: `${n.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <n.Icon size={13} color={n.color} />
                  </span>
                  <div style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.4 }}>{n.text}</div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      <div style={{ position: "fixed", left: 0, right: 0, bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", display: "flex", justifyContent: "center", zIndex: 8, pointerEvents: "none" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", background: "rgba(20,20,22,0.85)", backdropFilter: "blur(12px)", borderRadius: 999, padding: "6px 8px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", pointerEvents: "auto", width: "min(74vw, 290px)" }}>
          {[
            { key: "main" as Tab, Icon: Home },
            { key: "docs" as Tab, Icon: FileText },
            { key: "fuel" as Tab, Icon: Fuel },
            { key: "service" as Tab, Icon: Wrench },
            { key: "trip" as Tab, Icon: Plane },
          ].map((tab) => {
            const active = viewMode === tab.key;
            return (
              <button
                key={tab.key}
                onClick={(e) => { playTap(); setViewMode(tab.key); (e.currentTarget as HTMLButtonElement).blur(); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", background: active ? themeAccent : "transparent", border: "none", borderRadius: 999, padding: "10px", flex: 1, minWidth: 0, color: active ? "#08090a" : "var(--muted)" }}
              >
                {active ? <tab.Icon key={tab.key} className="animate-pop" size={19} /> : <tab.Icon size={19} />}
              </button>
            );
          })}
        </div>
      </div>
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
  return <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginBottom: 10, ...style }}>{children}</div>;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--muted)" }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: color }} />
      {label}
    </div>
  );
}

function DocCard({
  title, Icon, dateVal, onChange, accent, photoUrl, onPhoto, onRemovePhoto,
}: {
  title: string; Icon: any; dateVal: string | null; onChange: (v: string) => void; accent: string;
  photoUrl: string | null; onPhoto: (f: File) => void; onRemovePhoto: () => void;
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const days = daysUntil(dateVal);
  const statusColor = docStatusColor(days);
  let statusText = "Όρισε ημερομηνία λήξης";
  if (days != null) {
    statusText = days < 0 ? `Έληξε πριν από ${Math.abs(days)} ημέρες` : days <= 30 ? `Λήγει σε ${days} ημέρες` : `Ισχύει έως ${fmtDateGR(dateVal!)}`;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (file) onPhoto(file);
  }

  return (
    <div className="animate-in card" style={{ padding: "18px 18px 20px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span className="row-icon" style={{ background: `${accent}22` }}><Icon size={16} color={accent} /></span>
        <div className="display" style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: statusColor, marginBottom: 10 }}>{statusText}</div>
      <div onClick={() => (dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.focus())} style={{ position: "relative", marginBottom: 12 }}>
        <div className="pill-input" style={{ cursor: "pointer", fontSize: 14 }}>{dateVal ? fmtDateGR(dateVal) : "Όρισε ημερομηνία"}</div>
        <input ref={dateInputRef} type="date" value={dateVal || ""} onChange={(e) => onChange(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", border: "none" }} />
      </div>

      {photoUrl ? (
        <div style={{ position: "relative" }}>
          <img src={photoUrl} alt={title} style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 12, display: "block" }} />
          <button onClick={onRemovePhoto} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 999, color: "#fff", fontSize: 11, fontWeight: 600, padding: "6px 10px" }}>
            Αφαίρεση
          </button>
        </div>
      ) : (
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 0", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", cursor: "pointer" }}>
          <Camera size={15} /> Προσθήκη φωτογραφίας
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        </label>
      )}
    </div>
  );
}
