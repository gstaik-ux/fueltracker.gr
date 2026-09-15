"use client";

import { useState } from "react";
import { Car, Bike, Camera } from "lucide-react";

// Only rendered on the admin homepage (behind the admin password) - the
// per-vehicle pages themselves never expose this control, so an outsider
// with just an NFC tag link can't change a vehicle's home-screen icon.
export default function VehicleIconEditor({
  slug, themeAccent, vehicleIcon, initialIconUrl,
}: {
  slug: string; themeAccent: string; vehicleIcon: string; initialIconUrl: string | null;
}) {
  const [iconUrl, setIconUrl] = useState(initialIconUrl);
  const [uploading, setUploading] = useState(false);
  const TypeIcon = vehicleIcon === "bike" ? Bike : Car;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    e.stopPropagation();
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/v/${slug}/home-icon`, { method: "POST", body: formData });
    setUploading(false);
    if (res.ok) {
      const data = await res.json();
      setIconUrl(data.url);
    }
  }

  return (
    <label
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "relative",
        width: 34,
        height: 34,
        borderRadius: 10,
        background: iconUrl ? "transparent" : `${themeAccent}22`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: "pointer",
        overflow: "hidden",
      }}
      title="Αλλαγή εικονιδίου αρχικής οθόνης"
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <TypeIcon size={16} color={themeAccent} />
      )}
      <div
        style={{
          position: "absolute",
          bottom: -1,
          right: -1,
          width: 15,
          height: 15,
          borderRadius: 99,
          background: "#16181c",
          border: "2px solid var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Camera size={8} color="var(--muted)" />
      </div>
      <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} style={{ display: "none" }} />
    </label>
  );
}
