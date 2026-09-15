import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getEffectiveDocsPassword } from "@/lib/docsPassword";

// Stores the document (photo or PDF) as a base64 data URL directly in the
// vehicles table. For a personal app with a handful of documents (insurance
// + ΚΤΕΟ across a few vehicles) this is simple and avoids setting up
// Supabase Storage - a few files add up to kilobytes against Supabase's
// free-tier 500MB limit, nowhere close to a concern. If files are ever
// consistently huge (many MB each), moving this to Supabase Storage would
// be the next step, but isn't needed for this use case.
const COLUMN_MAP: Record<string, string> = {
  insurancePhotoUrl: "insurance_photo_url",
  kteoPhotoUrl: "kteo_photo_url",
};

const MAX_BYTES = 6 * 1024 * 1024; // 6MB raw upload cap

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const field = formData.get("field") as string | null;
  const password = formData.get("password") as string | null;

  if (!file || !field || !COLUMN_MAP[field]) {
    return NextResponse.json({ error: "Missing file or field" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Το αρχείο είναι πολύ μεγάλο." }, { status: 400 });
  }

  // The document password is required fresh for every upload too, same as
  // viewing or downloading - no cookie, no session, checked right here.
  const { hash } = await getEffectiveDocsPassword(params.slug);
  if (!hash) {
    return NextResponse.json({ error: "Όρισε πρώτα κωδικό εγγράφων." }, { status: 403 });
  }
  if (!password || !(await bcrypt.compare(password, hash))) {
    return NextResponse.json({ error: "Λάθος κωδικός." }, { status: 401 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
  const column = COLUMN_MAP[field];

  await query(`update vehicles set ${column} = $1 where slug = $2`, [dataUrl, params.slug]);

  return NextResponse.json({ ok: true, url: dataUrl });
}
