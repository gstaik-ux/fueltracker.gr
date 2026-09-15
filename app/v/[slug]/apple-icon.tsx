import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { query } from "@/lib/db";

// A per-vehicle home-screen icon: the Carall mark on a solid background
// tinted with that specific vehicle's theme color, generated dynamically
// per slug. Adding /v/matiz to the home screen gets a different-colored
// icon than /v/jetx, matching each vehicle's own accent - not one fixed
// logo for every vehicle.
export const size = { width: 180, height: 180 };
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
        <img src={logoBase64} width="108" height="108" alt="" />
      </div>
    ),
    { ...size }
  );
}
