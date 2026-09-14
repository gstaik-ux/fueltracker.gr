import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  const { date, odometer, cost, note } = await req.json();
  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

  const result = await query(
    `update service_entries set
       date = $1,
       odometer = $2,
       cost = $3,
       note = $4
     where id = $5
       and vehicle_id = (select id from vehicles where slug = $6)
     returning id, type, date, odometer, cost, note, is_trip`,
    [date, odometer ?? null, cost ?? null, (note || "").trim(), params.id, params.slug]
  );
  const r = result.rows[0];
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    entry: {
      id: r.id,
      type: r.type,
      date: typeof r.date === "string" ? r.date : r.date.toISOString().slice(0, 10),
      odometer: r.odometer == null ? null : Number(r.odometer),
      cost: r.cost == null ? null : Number(r.cost),
      note: r.note || "",
      isTrip: !!r.is_trip,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  await query(
    `delete from service_entries
     where id = $1
       and vehicle_id = (select id from vehicles where slug = $2)`,
    [params.id, params.slug]
  );
  return NextResponse.json({ ok: true });
}
