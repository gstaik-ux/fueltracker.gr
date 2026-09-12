import { cookies } from "next/headers";
import { verifyAdminToken } from "./auth";

export async function isAdmin(): Promise<boolean> {
  const token = cookies().get("admin_session")?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}
