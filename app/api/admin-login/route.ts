import { NextRequest, NextResponse } from "next/server";
import { createAdminToken, ADMIN_COOKIE_OPTIONS } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Λάθος κωδικός." }, { status: 401 });
  }
  const token = await createAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", token, ADMIN_COOKIE_OPTIONS);
  return res;
}
