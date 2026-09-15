import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getEffectiveDocsPassword } from "@/lib/docsPassword";

// A stateless password check - no cookie, no session. This exists purely
// to gate the upload UI before a document exists yet to fetch (viewing an
// existing document verifies independently in the document route below,
// and uploading verifies independently in the photo route). The password
// is required fresh every time, everywhere - nothing here is remembered
// server-side between requests.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { password } = await req.json();
  const { hash } = await getEffectiveDocsPassword(params.slug);

  if (!hash || !password || !(await bcrypt.compare(password, hash))) {
    return NextResponse.json({ error: "Λάθος κωδικός." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
