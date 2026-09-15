import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { query } from "@/lib/db";

// Serves each vehicle's own custom home-screen icon if one's been
// uploaded (via the "Εικονίδιο Αρχικής Οθόνης" card in Έγγραφα), falling
// back to the plain Carall logo for any vehicle that doesn't have one yet.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function Icon({ params }: { params: { slug: string } }) {
  const result = await query("select home_icon_url from vehicles where slug = $1", [params.slug]);
  const customIcon = result.rows[0]?.home_icon_url as string | undefined;

  if (customIcon) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={customIcon} width="180" height="180" style={{ objectFit: "cover" }} alt="" />
        </div>
      ),
      { ...size }
    );
  }

  const logoPath = join(process.cwd(), "public", "logo.png");
  const logoBase64 = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0b0d" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoBase64} width="108" height="108" alt="" />
      </div>
    ),
    { ...size }
  );
}
