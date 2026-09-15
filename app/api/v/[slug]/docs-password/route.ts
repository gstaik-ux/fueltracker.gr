import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { VALID_RESET_MONTHS } from "@/lib/auth";
import { getEffectiveDocsPassword } from "@/lib/docsPassword";

// Sets a vehicle's document password - but ONLY when none is currently
// active. This is checked here on the server, not just hidden in the UI,
// so there's no way to reach this endpoint and overwrite a live password
// without going through the actual rotation schedule (or the manual SQL
// reset described in the README). No cookie is set here or anywhere else
// for document passwords - see lib/docsPassword.ts.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { password, resetMonths } = await req.json();
  if (!password || typeof password !== "string" || password.length < 4) {
    return NextResponse.json({ error: "Ο κωδικός πρέπει να έχει τουλάχιστον 4 χαρακτήρες." }, { status: 400 });
  }
  if (!VALID_RESET_MONTHS.includes(resetMonths)) {
    return NextResponse.json({ error: "Διάλεξε 3, 6, ή 9 μήνες." }, { status: 400 });
  }

  const { hash: existingHash } = await getEffectiveDocsPassword(params.slug);
  if (existingHash) {
    return NextResponse.json({ error: "Ο κωδικός έχει ήδη οριστεί για αυτό το όχημα." }, { status: 403 });
  }

  const hash = await bcrypt.hash(password, 10);
  await query(
    "update vehicles set docs_password_hash = $1, docs_reset_months = $2, docs_password_set_at = now() where slug = $3",
    [hash, resetMonths, params.slug]
  );

  return NextResponse.json({ ok: true });
}
