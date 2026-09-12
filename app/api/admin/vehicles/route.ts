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

  const result = await query(
    `insert into vehicles (slug, name, theme_accent, theme_bg, vehicle_icon, tank_capacity)
     values ($1, $2, $3, $4, $5, $6)
     returning slug, name, theme_accent, vehicle_icon`,
    [
      cleanSlug,
      name.trim(),
      themeAccent || "#e7a33e",
      themeBg || "#0e0f12",
      vehicleIcon === "bike" ? "bike" : "car",
      tankCapacity ? Number(tankCapacity) : null,
    ]
  );

  return NextResponse.json({ vehicle: result.rows[0] });
}
