import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/session";

// Vehicle identity (name, color, icon type, tank capacity) can only be
// changed by an admin - unlike most vehicle-page actions, these aren't
// meant to be editable by anyone with the open NFC link.
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, themeAccent, vehicleIcon, tankCapacity } = await req.json();

  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;
  if (name !== undefined) { sets.push(`name = $${i++}`); values.push(name); }
  if (themeAccent !== undefined) { sets.push(`theme_accent = $${i++}`); values.push(themeAccent); }
  if (vehicleIcon !== undefined) { sets.push(`vehicle_icon = $${i++}`); values.push(vehicleIcon); }
  if (tankCapacity !== undefined) { sets.push(`tank_capacity = $${i++}`); values.push(tankCapacity); }

  if (sets.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  values.push(params.slug);
  await query(`update vehicles set ${sets.join(", ")} where slug = $${i}`, values);
  return NextResponse.json({ ok: true });
}

// Deletes the vehicle and everything under it - fill-ups, service/trip
// entries, all of it. Admin-only, same reasoning as above.
export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await query("select id from vehicles where slug = $1", [params.slug]);
  const vehicleId = result.rows[0]?.id;
  if (!vehicleId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await query("delete from fillups where vehicle_id = $1", [vehicleId]);
  await query("delete from service_entries where vehicle_id = $1", [vehicleId]);
  await query("delete from vehicles where id = $1", [vehicleId]);

  return NextResponse.json({ ok: true });
}
