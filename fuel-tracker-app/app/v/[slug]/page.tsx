import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import VehicleDashboard from "./VehicleDashboard";

export default async function VehiclePage({ params }: { params: { slug: string } }) {
  const vehicleResult = await query("select id, name from vehicles where slug = $1", [
    params.slug,
  ]);
  const vehicle = vehicleResult.rows[0];
  if (!vehicle) notFound();

  const fillupsResult = await query(
    "select id, date, liters, cost, odometer from fillups where vehicle_id = $1 order by date desc, created_at desc",
    [vehicle.id]
  );

  return (
    <VehicleDashboard
      slug={params.slug}
      vehicleName={vehicle.name}
      initialFillups={fillupsResult.rows.map((r: any) => ({
        id: r.id,
        date: typeof r.date === "string" ? r.date : r.date.toISOString().slice(0, 10),
        liters: Number(r.liters),
        cost: Number(r.cost),
        odometer: r.odometer == null ? null : Number(r.odometer),
      }))}
    />
  );
}
