"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

export function EditEventControlsClient({
  eventId,
  initialStatus,
  initialNotice,
  initialBookingFeeBps,
  initialTaxBps,
}: {
  eventId: string;
  initialStatus: string;
  initialNotice: string;
  initialBookingFeeBps: number;
  initialTaxBps: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [notice, setNotice] = useState(initialNotice);
  const [bookingFeeBps, setBookingFeeBps] = useState(initialBookingFeeBps);
  const [taxBps, setTaxBps] = useState(initialTaxBps);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          officialStatusNotice: notice,
          bookingFeeBps: Number(bookingFeeBps),
          taxBps: Number(taxBps),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed.");
      setMsg(
        data.notifiedBookings !== undefined
          ? `Event updated (${status}). Notified ${data.notifiedBookings} affected bookings.`
          : "Event settings saved."
      );
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to update event.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="t254-card p-6 space-y-4">
      <h2 className="text-base font-bold text-[#F8FAFC]">
        Status, Postponement / Cancellation & Fee Controls
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Event Lifecycle Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="t254-input"
          >
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="UNPUBLISHED">UNPUBLISHED</option>
            <option value="POSTPONED">POSTPONED (Notifies Buyers)</option>
            <option value="CANCELLED">CANCELLED (Notifies Buyers)</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Booking Fee (Basis Points, 100 = 1%)
          </label>
          <input
            type="number"
            min={0}
            max={2500}
            value={bookingFeeBps}
            onChange={(e) => setBookingFeeBps(Number(e.target.value))}
            className="t254-input"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Applicable Tax / VAT (Bps, 1600 = 16%)
          </label>
          <input
            type="number"
            min={0}
            max={3000}
            value={taxBps}
            onChange={(e) => setTaxBps(Number(e.target.value))}
            className="t254-input"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
          Official Public Status / Postponement Instructions
        </label>
        <textarea
          rows={2}
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder="Official instructions shown on match page and emailed to ticket holders if postponed or cancelled..."
          className="t254-input text-xs"
        />
      </div>

      {msg && <p className="text-xs text-[#35D399]">{msg}</p>}

      <button type="submit" disabled={busy} className="t254-btn-primary text-xs">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Event Configuration
      </button>
    </form>
  );
}
