import { query } from "@/lib/db";
import AddVehicleForm from "./AddVehicleForm";
import AdminBackupButton from "./AdminBackupButton";
import VehicleList from "./VehicleList";

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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, padding: "0 4px" }}>
          <img src="/logo.png" alt="Carall" style={{ width: 46, height: 46, flexShrink: 0 }} />
          <div className="display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: 0.2 }}>
            Carall
          </div>
        </div>

        <VehicleList initialVehicles={vehicles} />

        <AddVehicleForm />
        <AdminBackupButton />
      </div>
    </div>
  );
}
