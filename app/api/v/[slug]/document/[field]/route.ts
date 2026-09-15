import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getEffectiveDocsPassword } from "@/lib/docsPassword";

const COLUMN_MAP: Record<string, string> = {
  insurance: "insurance_photo_url",
  kteo: "kteo_photo_url",
};

// The actual document content only ever leaves the server through this
// route, and only with the correct password included in THIS request -
// there's no cookie or session to fall back on, so it's verified fresh
// every single time, by design.
export async function POST(req: NextRequest, { params }: { params: { slug: string; field: string } }) {
  const { password } = await req.json();
  const { hash } = await getEffectiveDocsPassword(params.slug);

  if (!hash || !password || !(await bcrypt.compare(password, hash))) {
    return NextResponse.json({ error: "Λάθος κωδικός." }, { status: 401 });
  }

  const column = COLUMN_MAP[params.field];
  if (!column) return NextResponse.json({ error: "Unknown field" }, { status: 400 });

  const result = await query(`select ${column} as url from vehicles where slug = $1`, [params.slug]);
  const url = result.rows[0]?.url;
  if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ url });
}
