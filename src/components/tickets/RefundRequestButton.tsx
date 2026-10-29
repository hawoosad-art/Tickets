"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";

export function RefundRequestButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund request failed.");
      setMsg(`Refund requested (${data.refundReference}). Refreshing...`);
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to submit request.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Request Refund
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-xl border border-[#293548] bg-[#0B1020] p-4 space-y-3"
    >
      <label className="block text-xs font-semibold text-[#F8FAFC]">
        Reason for Refund Request (subject to organiser refund policy)
      </label>
      <textarea
        required
        minLength={10}
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Please describe why you are requesting a refund..."
        className="t254-input text-xs"
      />
      {msg && <p className="text-xs text-amber-300">{msg}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="t254-btn-primary text-xs py-1.5 px-3"
        >
          Submit Request
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="t254-btn-secondary text-xs py-1.5 px-3"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
