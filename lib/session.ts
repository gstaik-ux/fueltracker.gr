import { cookies } from "next/headers";
import { verifyAdminToken, verifyDocsToken, docsCookieName } from "./auth";

export async function isAdmin(): Promise<boolean> {
  const token = cookies().get("admin_session")?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export async function isDocsUnlocked(slug: string): Promise<boolean> {
  const token = cookies().get(docsCookieName(slug))?.value;
  if (!token) return false;
  return verifyDocsToken(token, slug);
}
