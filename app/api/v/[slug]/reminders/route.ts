import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { oilIntervalKm, remindersEnabled } = await req.json();

  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;
  if (oilIntervalKm !== undefined) { sets.push(`oil_interval_km = $${i++}`); values.push(oilIntervalKm); }
  if (remindersEnabled !== undefined) { sets.push(`reminders_enabled = $${i++}`); values.push(remindersEnabled); }

  if (sets.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  values.push(params.slug);
  await query(`update vehicles set ${sets.join(", ")} where slug = $${i}`, values);
  return NextResponse.json({ ok: true });
}
