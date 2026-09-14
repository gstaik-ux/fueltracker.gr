import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isDocsUnlocked } from "@/lib/session";

const COLUMN_MAP: Record<string, string> = {
  insurance: "insurance_photo_url",
  kteo: "kteo_photo_url",
};

// The actual document content only ever leaves the server through this
// route, and only once that specific vehicle's docs cookie checks out -
// the initial page load never includes it, so there's nothing to find in
// page source or dev tools without unlocking first.
export async function GET(req: NextRequest, { params }: { params: { slug: string; field: string } }) {
  if (!(await isDocsUnlocked(params.slug))) {
    return NextResponse.json({ error: "Locked" }, { status: 401 });
  }
  const column = COLUMN_MAP[params.field];
  if (!column) return NextResponse.json({ error: "Unknown field" }, { status: 400 });

  const result = await query(`select ${column} as url from vehicles where slug = $1`, [params.slug]);
  const url = result.rows[0]?.url;
  if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ url });
}
