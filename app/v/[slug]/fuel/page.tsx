import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import VehicleDashboard from "../VehicleDashboard";

export const dynamic = "force-dynamic";

function toDateStr(d: any): string {
  return typeof d === "string" ? d : d ? d.toISOString().slice(0, 10) : "";
}

// Same page as /v/[slug], just opens straight to the Καύσιμο tab instead of
// Αρχική - a second NFC tag option for "just log a fill-up fast" instead of
// "check everything".
export default async function VehicleFuelPage({ params }: { params: { slug: string } }) {
  const isCurrentlyAdmin = await isAdmin();
  const vehicleResult = await query(
    `select id, slug, name, theme_accent, theme_bg, vehicle_icon, tank_capacity,
            plate_number, insurance_date, kteo_date,
            (insurance_photo_url is not null) as has_insurance_photo,
            (kteo_photo_url is not null) as has_kteo_photo,
            (docs_password_hash is not null) as has_docs_password,
            home_icon_url, oil_interval_km, reminders_enabled, vehicle_code
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

  const linkedResult = await query(
    `select v2.slug, v2.name, v2.theme_accent, v2.vehicle_icon
     from vehicle_links vl
     join vehicles v2 on v2.id = vl.linked_vehicle_id
     where vl.vehicle_id = $1
     order by v2.name`,
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
        insuranceDate: v.insurance_date ? toDateStr(v.insurance_date) : null,
        kteoDate: v.kteo_date ? toDateStr(v.kteo_date) : null,
        hasInsurancePhoto: !!v.has_insurance_photo,
        hasKteoPhoto: !!v.has_kteo_photo,
        hasDocsPassword: !!v.has_docs_password,
        homeIconUrl: v.home_icon_url || null,
        oilIntervalKm: Number(v.oil_interval_km) || 10000,
        remindersEnabled: v.reminders_enabled !== false,
        vehicleCode: v.vehicle_code || null,
        lastOdometer,
      }}
      isAdmin={isCurrentlyAdmin}
      linkedVehicles={linkedResult.rows.map((r: any) => ({ slug: r.slug, name: r.name, themeAccent: r.theme_accent, vehicleIcon: r.vehicle_icon }))}
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
