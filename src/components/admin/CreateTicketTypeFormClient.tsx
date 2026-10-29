"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function CreateTicketTypeFormClient({
  events,
}: {
  events: Array<{ id: string; title: string; currency: string }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    eventId: events[0]?.id || "",
    name: "",
    code: "STD",
    categoryTier: "STANDARD",
    description: "",
    sectionInfo: "",
    seated: false,
    priceMajor: "1000",
    currency: events[0]?.currency || "KES",
    minPerOrder: 1,
    maxPerOrder: 6,
    authorisedCapacity: 200,
    sourceType: "NATIVE",
  });
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const priceMinor = Math.round(Number(form.priceMajor) * 100);
    const res = await fetch("/api/admin/ticket-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: form.eventId,
        name: form.name,
        code: form.code.toUpperCase(),
        categoryTier: form.categoryTier,
        description: form.description,
        sectionInfo: form.sectionInfo,
        seated: form.seated,
        priceMinor,
        currency: form.currency,
        minPerOrder: Number(form.minPerOrder),
        maxPerOrder: Number(form.maxPerOrder),
        authorisedCapacity: Number(form.authorisedCapacity),
        sourceType: form.sourceType,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed to create category.");
      return;
    }
    setMsg("Ticket category & allocation created.");
    setForm({ ...form, name: "", description: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="t254-card p-6 space-y-4">
      <h2 className="text-base font-bold text-[#F8FAFC]">
        Create Ticket Category & Inventory Allocation
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={form.eventId}
          onChange={(e) => {
            const ev = events.find((x) => x.id === e.target.value);
            setForm({
              ...form,
              eventId: e.target.value,
              currency: ev?.currency || form.currency,
            });
          }}
          className="t254-input text-xs"
        >
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} ({ev.currency})
            </option>
          ))}
        </select>

        <select
          value={form.categoryTier}
          onChange={(e) => setForm({ ...form, categoryTier: e.target.value })}
          className="t254-input text-xs"
        >
          <option value="STANDARD">STANDARD</option>
          <option value="PREMIUM">PREMIUM</option>
          <option value="VIP">VIP</option>
          <option value="HOSPITALITY">HOSPITALITY</option>
        </select>

        <input
          required
          placeholder="Category Name (e.g. VIP Main Stand)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="t254-input text-xs"
        />

        <input
          required
          placeholder="Short Code (e.g. VIP2)"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          className="t254-input text-xs uppercase"
        />

        <input
          type="number"
          step="0.01"
          min="0"
          required
          placeholder={`Price (${form.currency})`}
          value={form.priceMajor}
          onChange={(e) => setForm({ ...form, priceMajor: e.target.value })}
          className="t254-input text-xs"
        />

        <input
          type="number"
          min="1"
          required
          placeholder="Authorised Capacity"
          value={form.authorisedCapacity}
          onChange={(e) =>
            setForm({ ...form, authorisedCapacity: Number(e.target.value) })
          }
          className="t254-input text-xs"
        />
      </div>

      <input
        required
        placeholder="Description shown to customers on match page..."
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="t254-input text-xs"
      />

      <label className="inline-flex items-center gap-2 text-xs text-[#F8FAFC]">
        <input
          type="checkbox"
          checked={form.seated}
          onChange={(e) => setForm({ ...form, seated: e.target.checked })}
        />
        <span>Assign numbered rows & seats automatically</span>
      </label>

      {msg && <p className="text-xs text-[#35D399]">{msg}</p>}

      <div>
        <button type="submit" className="t254-btn-primary text-xs">
          <Plus className="h-4 w-4" />
          Save Category
        </button>
      </div>
    </form>
  );
}
