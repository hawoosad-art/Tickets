"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2 } from "lucide-react";

export function CreateSettlementFormClient() {
  const router = useRouter();
  const [provider, setProvider] = useState("SIMULATED");
  const [currency, setCurrency] = useState("KES");
  const [payoutMajor, setPayoutMajor] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    const res = await fetch("/api/admin/reconciliation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        currency,
        periodStart: start.toISOString(),
        periodEnd: now.toISOString(),
        providerFeesMinor: 0,
        ...(payoutMajor
          ? { actualBankPayoutMinor: Math.round(Number(payoutMajor) * 100) }
          : {}),
        notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed to generate settlement record.");
      return;
    }
    setMsg(
      `Settlement ${data.settlement.settlementReference} recorded (${data.settlement.status}).`
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="t254-card p-6 space-y-4">
      <h2 className="text-base font-bold text-[#F8FAFC]">
        Generate 30-Day Settlement Reconciliation Batch
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="t254-input text-xs"
        >
          <option value="PAYPAL">PAYPAL</option>
          <option value="PAYSTACK">PAYSTACK</option>
          <option value="SIMULATED">SIMULATED</option>
        </select>

        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="t254-input text-xs"
        >
          <option value="KES">KES</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>

        <input
          type="number"
          step="0.01"
          placeholder="Actual Bank Statement Payout (optional)"
          value={payoutMajor}
          onChange={(e) => setPayoutMajor(e.target.value)}
          className="t254-input text-xs"
        />

        <input
          placeholder="Reconciliation Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="t254-input text-xs"
        />
      </div>
      {msg && <p className="text-xs text-[#35D399]">{msg}</p>}
      <button type="submit" className="t254-btn-primary text-xs">
        <FileCheck2 className="h-4 w-4" />
        Run Reconciliation Snapshot
      </button>
    </form>
  );
}
