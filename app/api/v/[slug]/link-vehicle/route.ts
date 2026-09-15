import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getEffectiveDocsPassword } from "@/lib/docsPassword";

// Open, no admin check - any family member can link a vehicle they know
// the code AND password for. Creates the link both ways in one go: this
// vehicle sees the target, and the target sees this vehicle back, on any
// device. The password requirement here is the same one used to guard
// documents - it's now a general-purpose access password for the vehicle,
// not just a documents-specific one, and linking requires it too so a
// bare 6-digit code (only a million possibilities) isn't enough on its
// own to pull a vehicle into someone else's view.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { code, password } = await req.json();
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Ο κωδικός πρέπει να είναι 6 ψηφία." }, { status: 400 });
  }

  const meResult = await query("select id from vehicles where slug = $1", [params.slug]);
  const meId = meResult.rows[0]?.id;
  if (!meId) return NextResponse.json({ error: "Δεν βρέθηκε το τρέχον όχημα." }, { status: 404 });

  const targetResult = await query(
    "select id, slug, name, theme_accent, vehicle_icon from vehicles where vehicle_code = $1",
    [code]
  );
  const target = targetResult.rows[0];
  if (!target) return NextResponse.json({ error: "Δεν βρέθηκε όχημα με αυτόν τον κωδικό." }, { status: 404 });
  if (target.id === meId) return NextResponse.json({ error: "Αυτό είναι ήδη το τρέχον όχημα." }, { status: 400 });

  const { hash } = await getEffectiveDocsPassword(target.slug);
  if (!hash) {
    return NextResponse.json({ error: "Αυτό το όχημα δεν έχει ορίσει κωδικό ακόμα, οπότε δεν μπορεί να προστεθεί." }, { status: 409 });
  }
  if (!password || !(await bcrypt.compare(password, hash))) {
    return NextResponse.json({ error: "Λάθος κωδικός." }, { status: 401 });
  }

  await query(
    `insert into vehicle_links (vehicle_id, linked_vehicle_id) values ($1, $2), ($2, $1)
     on conflict do nothing`,
    [meId, target.id]
  );

  return NextResponse.json({
    slug: target.slug,
    name: target.name,
    themeAccent: target.theme_accent,
    vehicleIcon: target.vehicle_icon,
  });
}

// Removes the link both ways in one go, same reciprocal principle as
// creating it - swiping to delete "Vehicle B" from Vehicle A's list also
// removes Vehicle A from Vehicle B's list, everywhere, not just locally.
// No password needed to unlink - only to link in the first place.
export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const { targetSlug } = await req.json();
  if (!targetSlug) return NextResponse.json({ error: "Missing targetSlug" }, { status: 400 });

  const meResult = await query("select id from vehicles where slug = $1", [params.slug]);
  const meId = meResult.rows[0]?.id;
  if (!meId) return NextResponse.json({ error: "Δεν βρέθηκε το τρέχον όχημα." }, { status: 404 });

  const targetResult = await query("select id from vehicles where slug = $1", [targetSlug]);
  const targetId = targetResult.rows[0]?.id;
  if (!targetId) return NextResponse.json({ error: "Δεν βρέθηκε το όχημα." }, { status: 404 });

  await query(
    `delete from vehicle_links
     where (vehicle_id = $1 and linked_vehicle_id = $2)
        or (vehicle_id = $2 and linked_vehicle_id = $1)`,
    [meId, targetId]
  );

  return NextResponse.json({ ok: true });
}
