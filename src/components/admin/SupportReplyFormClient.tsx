"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function SupportReplyFormClient({
  supportId,
  currentStatus,
}: {
  supportId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch(`/api/admin/support/${supportId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        ...(reply.trim() ? { staffReply: reply.trim() } : {}),
      }),
    });
    setBusy(false);
    setReply("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 pt-2">
      <input
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Write reply to email customer..."
        className="t254-input text-xs flex-1 min-w-[200px]"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="t254-input text-xs w-36"
      >
        <option value="OPEN">OPEN</option>
        <option value="IN_PROGRESS">IN_PROGRESS</option>
        <option value="RESOLVED">RESOLVED</option>
        <option value="CLOSED">CLOSED</option>
      </select>
      <button type="submit" disabled={busy} className="t254-btn-primary text-xs">
        Send Update
      </button>
    </form>
  );
}
