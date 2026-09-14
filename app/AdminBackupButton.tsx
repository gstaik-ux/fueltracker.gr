"use client";

import { Download } from "lucide-react";

export default function AdminBackupButton() {
  async function downloadBackup() {
    const res = await fetch("/api/admin/backup");
    if (!res.ok) return;
    const data = await res.json();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fuel-log-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={downloadBackup}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.06)",
        border: "none",
        borderRadius: 999,
        color: "var(--text)",
        fontSize: 13,
        fontWeight: 600,
        padding: "12px 0",
        marginTop: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <Download size={14} /> Λήψη πλήρους αντιγράφου (JSON)
    </button>
  );
}
