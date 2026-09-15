import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/session";

// This route lives under /api, which the middleware doesn't cover (it only
// guards "/"), so the admin check has to happen here directly.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, name, themeAccent, themeBg, vehicleIcon, tankCapacity } = await req.json();

  const cleanSlug = (slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!cleanSlug || !name || !name.trim()) {
    return NextResponse.json({ error: "Χρειάζεται slug και όνομα." }, { status: 400 });
  }

  const existing = await query("select id from vehicles where slug = $1", [cleanSlug]);
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "Αυτό το slug υπάρχει ήδη." }, { status: 409 });
  }

  // A short shareable code, separate from the slug - lets a family member
  // pull an existing vehicle into their own device's list without needing
  // the admin password, just this code (or a direct link). Retried on the
  // rare chance of a collision with an existing code.
  let vehicleCode = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
    const clash = await query("select 1 from vehicles where vehicle_code = $1", [candidate]);
    if (clash.rows.length === 0) {
      vehicleCode = candidate;
      break;
    }
  }

  const result = await query(
    `insert into vehicles (slug, name, theme_accent, theme_bg, vehicle_icon, tank_capacity, vehicle_code)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning slug, name, theme_accent, vehicle_icon, vehicle_code`,
    [
      cleanSlug,
      name.trim(),
      themeAccent || "#e7a33e",
      themeBg || "#0e0f12",
      vehicleIcon === "bike" ? "bike" : "car",
      tankCapacity ? Number(tankCapacity) : null,
      vehicleCode || null,
    ]
  );

  return NextResponse.json({ vehicle: result.rows[0] });
}
