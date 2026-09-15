import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// Deliberately open, no admin check - this is how a non-admin family
// member pulls an existing vehicle into their own device's personal list,
// using a short code (or a direct link) instead of needing the admin
// password. It only ever returns the vehicle's own public name and slug -
// nothing sensitive.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim();
  const slug = req.nextUrl.searchParams.get("slug")?.trim();

  if (slug) {
    const result = await query("select slug, name, theme_accent, vehicle_icon from vehicles where slug = $1", [slug]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Δεν βρέθηκε όχημα με αυτόν τον σύνδεσμο." }, { status: 404 });
    }
    const v = result.rows[0];
    return NextResponse.json({ slug: v.slug, name: v.name, themeAccent: v.theme_accent, vehicleIcon: v.vehicle_icon });
  }

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Ο κωδικός πρέπει να είναι 6 ψηφία." }, { status: 400 });
  }

  const result = await query("select slug, name, theme_accent, vehicle_icon from vehicles where vehicle_code = $1", [code]);
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Δεν βρέθηκε όχημα με αυτόν τον κωδικό." }, { status: 404 });
  }

  const v = result.rows[0];
  return NextResponse.json({ slug: v.slug, name: v.name, themeAccent: v.theme_accent, vehicleIcon: v.vehicle_icon });
}
