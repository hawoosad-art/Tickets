"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function RefundReviewButtonsClient({ refundId }: { refundId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(action: "APPROVE" | "REJECT") {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/refunds/${refundId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        invalidateTickets: true,
        adminNotes: `${action} via Admin Refunds Console`,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Action failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => act("APPROVE")}
          className="rounded-lg bg-[#35D399] px-3 py-1 text-xs font-bold text-[#0B1020] hover:bg-[#10B981]"
        >
          Approve & Refund
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act("REJECT")}
          className="rounded-lg border border-rose-500/40 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
        >
          Reject
        </button>
      </div>
      {err && <p className="text-[11px] text-rose-400">{err}</p>}
    </div>
  );
}
