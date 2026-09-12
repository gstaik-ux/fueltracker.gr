import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

async function getVehicleId(slug: string) {
  const result = await query("select id from vehicles where slug = $1", [slug]);
  return result.rows[0]?.id as string | undefined;
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const vehicleId = await getVehicleId(params.slug);
  if (!vehicleId) return NextResponse.json({ error: "Unknown vehicle" }, { status: 404 });

  const { type, date, odometer, note } = await req.json();
  if (!type || !date) {
    return NextResponse.json({ error: "Type and date are required" }, { status: 400 });
  }

  const result = await query(
    `insert into service_entries (vehicle_id, type, date, odometer, note)
     values ($1,$2,$3,$4,$5)
     returning id, type, date, odometer, note`,
    [vehicleId, type, date, odometer ?? null, (note || "").trim()]
  );
  const r = result.rows[0];
  return NextResponse.json({
    entry: {
      id: r.id,
      type: r.type,
      date: typeof r.date === "string" ? r.date : r.date.toISOString().slice(0, 10),
      odometer: r.odometer == null ? null : Number(r.odometer),
      note: r.note || "",
    },
  });
}
