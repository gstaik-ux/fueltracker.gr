import { query } from "@/lib/db";
import { Fuel, Car, Bike, ChevronRight } from "lucide-react";
import AddVehicleForm from "./AddVehicleForm";
import AdminBackupButton from "./AdminBackupButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const result = await query(
    "select slug, name, theme_accent, vehicle_icon from vehicles order by name"
  );
  const vehicles = result.rows as {
    slug: string;
    name: string;
    theme_accent: string;
    vehicle_icon: string;
  }[];

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 18px 60px" }}>
        <div className="display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: 0.2, marginBottom: 22, padding: "0 4px" }}>
          Ημερολόγιο Καυσίμου
        </div>

        {vehicles.length === 0 && (
          <div style={{ color: "var(--muted)", fontSize: 13.5, padding: "0 4px" }}>
            Δεν έχεις προσθέσει ακόμα κάποιο όχημα. Πρόσθεσέ το στον πίνακα{" "}
            <code>vehicles</code> στη βάση δεδομένων.
          </div>
        )}

        <div className="card" style={{ padding: "4px 16px" }}>
          {vehicles.map((v, i) => {
            const Icon = v.vehicle_icon === "bike" ? Bike : Car;
            return (
              <a
                key={v.slug}
                href={`/v/${v.slug}`}
                className="tap"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: i < vehicles.length - 1 ? "1px solid var(--hairline)" : "none",
                  color: "var(--text)",
                  padding: "16px 0",
                  fontSize: 15.5,
                  fontWeight: 600,
                  textDecoration: "none",
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="row-icon" style={{ background: `${v.theme_accent}22` }}>
                    <Icon size={16} color={v.theme_accent} />
                  </span>
                  {v.name}
                </span>
                <ChevronRight size={17} color="var(--muted)" />
              </a>
            );
          })}
        </div>

        <AddVehicleForm />
        <AdminBackupButton />
      </div>
    </div>
  );
}
