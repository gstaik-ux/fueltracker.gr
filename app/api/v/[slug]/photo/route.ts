import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// Stores the photo as a base64 data URL directly in the vehicles table.
// For a personal app with a handful of documents (insurance + ΚΤΕΟ across a
// few vehicles) this is simple and avoids setting up Supabase Storage - a
// few photos add up to kilobytes against Supabase's free-tier 500MB limit,
// nowhere close to a concern. If photos are ever consistently huge (many MB
// each, e.g. uncompressed camera originals), moving this to Supabase
// Storage would be the next step, but isn't needed for this use case.
const COLUMN_MAP: Record<string, string> = {
  insurancePhotoUrl: "insurance_photo_url",
  kteoPhotoUrl: "kteo_photo_url",
};

const MAX_BYTES = 6 * 1024 * 1024; // 6MB raw upload cap

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const field = formData.get("field") as string | null;

  if (!file || !field || !COLUMN_MAP[field]) {
    return NextResponse.json({ error: "Missing file or field" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Η φωτογραφία είναι πολύ μεγάλη." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
  const column = COLUMN_MAP[field];

  await query(`update vehicles set ${column} = $1 where slug = $2`, [dataUrl, params.slug]);

  return NextResponse.json({ url: dataUrl });
}
