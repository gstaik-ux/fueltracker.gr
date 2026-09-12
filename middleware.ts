import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken } from "./lib/auth";

// Only the vehicle list ("/") is guarded. Each vehicle's own /v/<slug> page -
// what the NFC tags point to - is intentionally never touched here.
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/") {
    const token = req.cookies.get("admin_session")?.value;
    const ok = token ? await verifyAdminToken(token) : false;
    if (!ok) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
