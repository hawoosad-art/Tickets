"use client";

import React, { useState } from "react";
import { Mail, RefreshCw } from "lucide-react";

export function BookingActionsClient({
  orderId,
  bookingReference,
  accessToken,
  canVerify,
}: {
  orderId: string;
  bookingReference: string;
  accessToken?: string;
  canVerify: boolean;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleResend() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/tickets/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, accessToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend tickets.");
      setMsg(`Tickets resent successfully (${data.ticketCount} ticket(s)).`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error resending tickets.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRefreshPayment() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingReference, accessToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification check failed.");
      setMsg(`Current verified status: ${data.status}`);
      if (data.verified) window.location.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error verifying payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {canVerify ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleRefreshPayment}
            className="t254-btn-secondary text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Re-check Payment Status
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={handleResend}
            className="t254-btn-secondary text-xs"
          >
            <Mail className="h-3.5 w-3.5" />
            Resend Tickets to Email
          </button>
        )}
      </div>
      {msg && <p className="text-xs text-[#35D399]">{msg}</p>}
    </div>
  );
}
