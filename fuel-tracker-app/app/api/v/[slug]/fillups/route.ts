import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

async function getVehicleId(slug: string) {
  const result = await query("select id from vehicles where slug = $1", [slug]);
  return result.rows[0]?.id as string | undefined;
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const vehicleId = await getVehicleId(params.slug);
  if (!vehicleId) return NextResponse.json({ error: "Unknown vehicle" }, { status: 404 });

  const result = await query(
    "select id, date, liters, cost, odometer from fillups where vehicle_id = $1 order by date desc, created_at desc",
    [vehicleId]
  );
  return NextResponse.json({ fillups: result.rows });
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const vehicleId = await getVehicleId(params.slug);
  if (!vehicleId) return NextResponse.json({ error: "Unknown vehicle" }, { status: 404 });

  const { date, liters, cost, odometer } = await req.json();
  if (!date || !liters || !cost) {
    return NextResponse.json({ error: "Date, liters, and cost are required" }, { status: 400 });
  }

  const result = await query(
    "insert into fillups (vehicle_id, date, liters, cost, odometer) values ($1,$2,$3,$4,$5) returning id, date, liters, cost, odometer",
    [vehicleId, date, liters, cost, odometer ?? null]
  );
  return NextResponse.json({ fillup: result.rows[0] });
}
