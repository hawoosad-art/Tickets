"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function InventoryReapButtonClient() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleReap() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REAP_EXPIRED" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Failed.");
      return;
    }
    setMsg(
      `Released ${data.releasedReservations} expired hold(s) across ${data.expiredOrders} abandoned order(s).`
    );
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={handleReap}
        className="t254-btn-secondary text-xs"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Release Expired Reservations
      </button>
      {msg && <span className="text-xs text-[#35D399]">{msg}</span>}
    </div>
  );
}
