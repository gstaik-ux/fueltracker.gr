import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createDocsToken, docsCookieName, DOCS_COOKIE_OPTIONS } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { password } = await req.json();
  const result = await query("select docs_password_hash from vehicles where slug = $1", [params.slug]);
  const hash = result.rows[0]?.docs_password_hash;

  if (!hash || !password || !(await bcrypt.compare(password, hash))) {
    return NextResponse.json({ error: "Λάθος κωδικός." }, { status: 401 });
  }

  const token = await createDocsToken(params.slug);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(docsCookieName(params.slug), token, DOCS_COOKIE_OPTIONS);
  return res;
}
