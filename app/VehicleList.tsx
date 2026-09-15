"use client";

import { useRef, useState } from "react";
import { Car, Bike, ChevronRight } from "lucide-react";

type VehicleRow = { slug: string; name: string; theme_accent: string; vehicle_icon: string };

export default function VehicleList({ initialVehicles }: { initialVehicles: VehicleRow[] }) {
  const [vehicles, setVehicles] = useState(initialVehicles);

  return (
    <div className="card" style={{ padding: "4px 16px" }}>
      {vehicles.length === 0 && (
        <div style={{ color: "var(--muted)", fontSize: 13.5, padding: "16px 4px" }}>
          Δεν έχεις προσθέσει ακόμα κάποιο όχημα.
        </div>
      )}
      {vehicles.map((v, i) => (
        <VehicleRow
          key={v.slug}
          vehicle={v}
          borderBottom={i < vehicles.length - 1}
          delay={i * 0.05}
          onDelete={() => setVehicles((prev) => prev.filter((x) => x.slug !== v.slug))}
        />
      ))}
    </div>
  );
}

function VehicleRow({
  vehicle: v, borderBottom, delay, onDelete,
}: { vehicle: VehicleRow; borderBottom: boolean; delay: number; onDelete: () => void }) {
  const [dragX, setDragX] = useState(0);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startDragXRef = useRef(0);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const REVEAL = 78;
  const Icon = v.vehicle_icon === "bike" ? Bike : Car;

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

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/v/${v.slug}/identity`, { method: "DELETE" });
    if (res.ok) {
      onDelete();
    } else {
      setDeleting(false);
      setConfirming(false);
      setDragX(0);
    }
  }

  return (
    <div style={{ overflow: "hidden" }}>
      <div
        onTouchStart={(e) => start(e.touches[0].clientX)}
        onTouchMove={(e) => move(e.touches[0].clientX)}
        onTouchEnd={end}
        onMouseDown={(e) => start(e.clientX)}
        onMouseMove={(e) => draggingRef.current && move(e.clientX)}
        onMouseUp={end}
        onMouseLeave={end}
        style={{ display: "flex", transform: `translateX(${dragX}px)`, transition: draggingRef.current ? "none" : "transform 0.2s ease", touchAction: "pan-y" }}
      >
        <a
          href={`/v/${v.slug}`}
          className="tap"
          style={{
            width: "100%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: borderBottom ? "1px solid var(--hairline)" : "none",
            color: "var(--text)",
            padding: "16px 0",
            fontSize: 15.5,
            fontWeight: 600,
            textDecoration: "none",
            animationDelay: `${delay}s`,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="row-icon" style={{ background: `${v.theme_accent}22` }}>
              <Icon size={16} color={v.theme_accent} />
            </span>
            {v.name}
          </span>
          <ChevronRight size={17} color="var(--muted)" />
        </a>
        <button
          onClick={() => (confirming ? handleDelete() : setConfirming(true))}
          disabled={deleting}
          style={{ width: REVEAL, flexShrink: 0, background: "#e2323a", border: "none", color: "#fff", fontSize: confirming ? 10.5 : 11.5, fontWeight: 700, padding: "0 6px" }}
        >
          {deleting ? "..." : confirming ? "Σίγουρα;" : "Διαγραφή"}
        </button>
      </div>
    </div>
  );
}
