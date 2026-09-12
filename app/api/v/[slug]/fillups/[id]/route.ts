import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  const { date, liters, cost, odometer, isTrip, isFull } = await req.json();
  if (!date || !liters || !cost) {
    return NextResponse.json({ error: "Date, liters, and cost are required" }, { status: 400 });
  }

  const result = await query(
    `update fillups set
       date = $1,
       liters = $2,
       cost = $3,
       odometer = $4,
       odometer_estimated = false,
       is_trip = $5,
       is_full = $6
     where id = $7
       and vehicle_id = (select id from vehicles where slug = $8)
     returning id, date, liters, cost, odometer, odometer_estimated, is_trip, is_full`,
    [date, liters, cost, odometer ?? null, !!isTrip, !!isFull, params.id, params.slug]
  );
  const r = result.rows[0];
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  // Scope the delete through the vehicle slug too, so one vehicle's link
  // can never delete another vehicle's fillup even by guessing an id.
  await query(
    `delete from fillups
     where id = $1
       and vehicle_id = (select id from vehicles where slug = $2)`,
    [params.id, params.slug]
  );
  return NextResponse.json({ ok: true });
}
