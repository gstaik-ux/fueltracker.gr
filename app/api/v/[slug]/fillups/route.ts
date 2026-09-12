import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

async function getVehicleId(slug: string) {
  const result = await query("select id from vehicles where slug = $1", [slug]);
  return result.rows[0]?.id as string | undefined;
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const vehicleId = await getVehicleId(params.slug);
  if (!vehicleId) return NextResponse.json({ error: "Unknown vehicle" }, { status: 404 });

  const { date, liters, cost, odometer, odometerEstimated, isTrip, isFull } = await req.json();
  if (!date || !liters || !cost) {
    return NextResponse.json({ error: "Date, liters, and cost are required" }, { status: 400 });
  }

  const result = await query(
    `insert into fillups (vehicle_id, date, liters, cost, odometer, odometer_estimated, is_trip, is_full)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     returning id, date, liters, cost, odometer, odometer_estimated, is_trip, is_full`,
    [vehicleId, date, liters, cost, odometer ?? null, !!odometerEstimated, !!isTrip, !!isFull]
  );
  const r = result.rows[0];
  return NextResponse.json({
    fillup: {
      id: r.id,
      date: typeof r.date === "string" ? r.date : r.date.toISOString().slice(0, 10),
      liters: Number(r.liters),
      cost: Number(r.cost),
      odometer: r.odometer == null ? null : Number(r.odometer),
      odometerEstimated: !!r.odometer_estimated,
      isTrip: !!r.is_trip,
      isFull: !!r.is_full,
    },
  });
}
