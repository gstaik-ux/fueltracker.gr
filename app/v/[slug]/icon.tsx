import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { query } from "@/lib/db";

export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default async function Icon({ params }: { params: { slug: string } }) {
  const result = await query("select home_icon_url from vehicles where slug = $1", [params.slug]);
  const customIcon = result.rows[0]?.home_icon_url as string | undefined;

  if (customIcon) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={customIcon} width="48" height="48" style={{ objectFit: "cover" }} alt="" />
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
        <img src={logoBase64} width="28" height="28" alt="" />
      </div>
    ),
    { ...size }
  );
}
