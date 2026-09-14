import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// Updates whichever of these fields are present in the request body - lets
// the dashboard save one field at a time (e.g. just the insurance date)
// without needing to resend everything else.
const COLUMN_MAP: Record<string, string> = {
  plateNumber: "plate_number",
  vin: "vin",
  insuranceDate: "insurance_date",
  kteoDate: "kteo_date",
  insurancePhotoUrl: "insurance_photo_url",
  kteoPhotoUrl: "kteo_photo_url",
};

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const body = await req.json();
  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;

  for (const [key, column] of Object.entries(COLUMN_MAP)) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const v = body[key];
      sets.push(`${column} = $${i}`);
      values.push(v === "" ? null : v);
      i++;
    }
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  values.push(params.slug);
  await query(`update vehicles set ${sets.join(", ")} where slug = $${i}`, values);
  return NextResponse.json({ ok: true });
}
