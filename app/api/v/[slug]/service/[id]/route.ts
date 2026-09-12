import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

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
