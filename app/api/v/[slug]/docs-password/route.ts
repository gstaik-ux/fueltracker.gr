import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createDocsToken, docsCookieName, DOCS_COOKIE_OPTIONS } from "@/lib/auth";

// Sets a vehicle's document password - but ONLY the first time. This is
// checked here on the server, not just hidden in the UI, so there's no way
// to reach this endpoint and overwrite an already-set password without
// going through a real "forgot password" flow (which doesn't exist here on
// purpose - see the README for how to reset one if truly needed).
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { password } = await req.json();
  if (!password || typeof password !== "string" || password.length < 4) {
    return NextResponse.json({ error: "Ο κωδικός πρέπει να έχει τουλάχιστον 4 χαρακτήρες." }, { status: 400 });
  }

  const existing = await query("select docs_password_hash from vehicles where slug = $1", [params.slug]);
  const row = existing.rows[0];
  if (!row) return NextResponse.json({ error: "Unknown vehicle" }, { status: 404 });
  if (row.docs_password_hash) {
    return NextResponse.json({ error: "Ο κωδικός έχει ήδη οριστεί για αυτό το όχημα." }, { status: 403 });
  }

  const hash = await bcrypt.hash(password, 10);
  await query("update vehicles set docs_password_hash = $1 where slug = $2", [hash, params.slug]);

  // Setting it yourself counts as already unlocked on this device.
  const token = await createDocsToken(params.slug);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(docsCookieName(params.slug), token, DOCS_COOKIE_OPTIONS);
  return res;
}
