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

// One password PER VEHICLE, set once by the family and never changeable
// again through the app (enforced server-side, not just hidden in the UI -
// see the docs-password route). Unlocking sets a cookie scoped to that one
// vehicle's slug specifically, so a cookie from one vehicle can't unlock a
// different vehicle's documents even if somehow copied between devices.
// Lasts about a year - meant to be entered once and forgotten about.
export async function createDocsToken(slug: string) {
  return new SignJWT({ docs: true, slug })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(secret);
}

export async function verifyDocsToken(token: string, slug: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.docs === true && payload.slug === slug;
  } catch {
    return false;
  }
}

export function docsCookieName(slug: string) {
  return `docs_${slug}`;
}

export const DOCS_COOKIE_OPTIONS = {
  httpOnly: true as const,
  secure: true as const,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 year
};
