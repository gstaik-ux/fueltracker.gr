import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me"
);

export async function createAdminToken() {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
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
  maxAge: 60 * 60, // 1 hour
};

// Document passwords (one per vehicle) have NO session or cookie at all -
// the password is required fresh for every single view, download, or
// upload, by design. The 3/6/9 month choice made at setup isn't a session
// length - it's a password rotation schedule: once that many months pass
// since the password was set, it's automatically cleared (see
// lib/docsPassword.ts), so it can be re-set - either because the family
// forgot it, or just wants to rotate it periodically.
export const VALID_RESET_MONTHS = [3, 6, 9] as const;
export type ResetMonths = (typeof VALID_RESET_MONTHS)[number];
