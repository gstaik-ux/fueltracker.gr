import { query } from "./db";

// Checks a vehicle's document password against its rotation schedule. If
// the chosen number of months has passed since it was set, the password is
// cleared right here (lazily, on whichever request happens to check it
// next) - there's no separate cron job needed. Once cleared, the vehicle
// is back to "no password set", so the family sees the setup card again
// and can pick a new one - whether they forgot the old one or just want to
// rotate it.
export async function getEffectiveDocsPassword(slug: string) {
  const result = await query(
    "select docs_password_hash, docs_reset_months, docs_password_set_at from vehicles where slug = $1",
    [slug]
  );
  const row = result.rows[0];
  if (!row) return { hash: null as string | null };
  if (!row.docs_password_hash) return { hash: null as string | null };

  if (row.docs_reset_months && row.docs_password_set_at) {
    const setAt = new Date(row.docs_password_set_at);
    const deadline = new Date(setAt);
    deadline.setMonth(deadline.getMonth() + row.docs_reset_months);
    if (new Date() > deadline) {
      await query(
        "update vehicles set docs_password_hash = null, docs_reset_months = null, docs_password_set_at = null where slug = $1",
        [slug]
      );
      return { hash: null as string | null };
    }
  }

  return { hash: row.docs_password_hash as string };
}
