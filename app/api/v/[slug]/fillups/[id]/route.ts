import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

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
