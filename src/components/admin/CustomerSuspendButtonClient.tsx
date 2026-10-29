"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function CustomerSuspendButtonClient({
  userId,
  isSuspended,
}: {
  userId: string;
  isSuspended: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch(`/api/admin/customers/${userId}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        suspend: !isSuspended,
        reason: !isSuspended
          ? "Suspended by administrator"
          : "Reinstated by administrator",
      }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={toggle}
      className={`rounded-lg px-3 py-1 text-xs font-semibold ${
        isSuspended
          ? "bg-[#35D399]/15 text-[#35D399]"
          : "border border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
      }`}
    >
      {isSuspended ? "Reinstate" : "Suspend"}
    </button>
  );
}
