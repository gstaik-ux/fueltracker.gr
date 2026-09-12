import { query } from "@/lib/db";
import { Fuel } from "lucide-react";

export default async function Home() {
  const result = await query("select slug, name from vehicles order by name");
  const vehicles = result.rows as { slug: string; name: string }[];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--amber-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Fuel size={18} color="var(--amber)" />
          </div>
          <div className="display" style={{ fontSize: 24, fontWeight: 600 }}>Fuel Log</div>
        </div>
        {vehicles.length === 0 && (
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>
            No vehicles set up yet. Add rows to the <code>vehicles</code> table (see schema.sql).
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {vehicles.map((v) => (
            <a
              key={v.slug}
              href={`/v/${v.slug}`}
              style={{
                display: "block",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "14px 16px",
                color: "var(--text)",
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {v.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
