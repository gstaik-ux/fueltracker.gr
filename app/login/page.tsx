"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Λάθος κωδικός.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        className="animate-in"
        style={{ "--accent": "#ffffff", position: "relative", maxWidth: 480, width: "100%", margin: "0 auto", padding: "0 18px" } as React.CSSProperties}
      >
        <div style={{ textAlign: "center", marginBottom: 22, position: "relative" }}>
          <span
            className="row-icon"
            style={{ background: "rgba(255,255,255,0.9)", width: 56, height: 56, margin: "0 auto 14px", borderRadius: 14, padding: 8 }}
          >
            <img src="/logo.png" alt="Carall" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </span>
          <div className="display" style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#ffffff" }}>
            Carall
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Εισήγαγε τον κωδικό διαχειριστή</div>
        </div>

        <div className="card" style={{ padding: "20px 20px 22px", position: "relative" }}>
          <input
            className="pill-input"
            type="password"
            inputMode="numeric"
            placeholder="Κωδικός διαχειριστή"
            autoFocus
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            style={{ textAlign: "center", fontSize: 18, marginBottom: 12 }}
          />
          {error && (
            <div style={{ fontSize: 12.5, color: "#e2323a", textAlign: "center", marginBottom: 10 }}>{error}</div>
          )}
          <button
            className="tap"
            onClick={submit}
            disabled={loading}
            style={{
              width: "100%",
              background: "#ffffff",
              color: "#08090a",
              border: "none",
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 700,
              padding: "14px 0",
            }}
          >
            {loading ? "..." : "Είσοδος"}
          </button>
        </div>
      </div>
    </div>
  );
}
