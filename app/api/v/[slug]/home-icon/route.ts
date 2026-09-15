import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// A custom home-screen icon per vehicle - not sensitive content like the
// insurance/ΚΤΕΟ documents, so no password gate here, just a normal
// upload. Stored as a base64 data URL directly on the vehicles row, same
// approach as the document photos.
const MAX_BYTES = 3 * 1024 * 1024; // 3MB - icons should be small anyway

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Το αρχείο πρέπει να είναι εικόνα." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Η εικόνα είναι πολύ μεγάλη." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;

  await query("update vehicles set home_icon_url = $1 where slug = $2", [dataUrl, params.slug]);

  return NextResponse.json({ ok: true, url: dataUrl });
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  await query("update vehicles set home_icon_url = null where slug = $1", [params.slug]);
  return NextResponse.json({ ok: true });
}
