import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import VehicleDashboard from "../VehicleDashboard";

export const dynamic = "force-dynamic";

function toDateStr(d: any): string {
  return typeof d === "string" ? d : d ? d.toISOString().slice(0, 10) : "";
}

// Same page as /v/[slug], just opens straight to the Καύσιμο tab instead of
// Αρχική - a second NFC tag option for "just log a fill-up fast" instead of
// "check everything".
export default async function VehicleFuelPage({ params }: { params: { slug: string } }) {
  const vehicleResult = await query(
    `select id, slug, name, theme_accent, theme_bg, vehicle_icon, tank_capacity,
            plate_number, vin, insurance_date, kteo_date, insurance_photo_url, kteo_photo_url
     from vehicles where slug = $1`,
    [params.slug]
  );
  const v = vehicleResult.rows[0];
  if (!v) notFound();

  const fillupsResult = await query(
    `select id, date, liters, cost, odometer, odometer_estimated, is_trip, is_full
     from fillups where vehicle_id = $1 order by date desc, created_at desc`,
    [v.id]
  );
  const serviceResult = await query(
    `select id, type, date, odometer, cost, note, is_trip
     from service_entries where vehicle_id = $1 order by date desc, created_at desc`,
    [v.id]
  );

  const fillups = fillupsResult.rows.map((r: any) => ({
    id: r.id,
    date: toDateStr(r.date),
    liters: Number(r.liters),
    cost: Number(r.cost),
    odometer: r.odometer == null ? null : Number(r.odometer),
    odometerEstimated: !!r.odometer_estimated,
    isTrip: !!r.is_trip,
    isFull: !!r.is_full,
  }));

  const lastOdometer = fillups.reduce(
    (max: number | null, f: any) => (f.odometer != null && (max == null || f.odometer > max) ? f.odometer : max),
    null as number | null
  );

  return (
    <VehicleDashboard
      initialTab="fuel"
      vehicle={{
        slug: v.slug,
        name: v.name,
        themeAccent: v.theme_accent,
        themeBg: v.theme_bg,
        vehicleIcon: v.vehicle_icon,
        tankCapacity: v.tank_capacity != null ? Number(v.tank_capacity) : null,
        plateNumber: v.plate_number || null,
        vin: v.vin || null,
        insuranceDate: v.insurance_date ? toDateStr(v.insurance_date) : null,
        kteoDate: v.kteo_date ? toDateStr(v.kteo_date) : null,
        insurancePhotoUrl: v.insurance_photo_url || null,
        kteoPhotoUrl: v.kteo_photo_url || null,
        lastOdometer,
      }}
      initialFillups={fillups}
      initialServiceEntries={serviceResult.rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        date: toDateStr(r.date),
        odometer: r.odometer == null ? null : Number(r.odometer),
        cost: r.cost == null ? null : Number(r.cost),
        note: r.note || "",
        isTrip: !!r.is_trip,
      }))}
    />
  );
}
