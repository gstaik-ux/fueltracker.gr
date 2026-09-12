import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me"
);

export async function createAdminToken() {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return !!payload.admin;
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true as const,
  secure: true as const,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};
