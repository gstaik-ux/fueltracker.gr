import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/session";

// Admin-only: every vehicle, every fill-up, every service/trip entry, as
// one JSON file - a full backup independent of any per-vehicle export.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vehicles = await query("select * from vehicles order by name");
  const fillups = await query("select * from fillups order by vehicle_id, date");
  const serviceEntries = await query("select * from service_entries order by vehicle_id, date");

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    vehicles: vehicles.rows,
    fillups: fillups.rows,
    serviceEntries: serviceEntries.rows,
  });
}
