import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { query } from "@/lib/db";

// Same idea as apple-icon.tsx, but for the browser tab favicon - so if you
// have a few vehicle tabs open at once, each tab is visually distinct by
// its own vehicle's color, not identical generic icons.
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default async function Icon({ params }: { params: { slug: string } }) {
  const result = await query("select theme_accent from vehicles where slug = $1", [params.slug]);
  const accent = result.rows[0]?.theme_accent || "#0a0b0d";

  const logoPath = join(process.cwd(), "public", "logo.png");
  const logoBase64 = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: accent,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoBase64} width="28" height="28" alt="" />
      </div>
    ),
    { ...size }
  );
}
