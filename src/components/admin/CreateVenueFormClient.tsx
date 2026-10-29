"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function CreateVenueFormClient() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    city: "Nairobi",
    country: "Kenya",
    countryCode: "KE",
    timezone: "Africa/Nairobi",
    capacity: 30000,
    gatesInfo: "Gates 1–4: Standard | Gate 5: VIP",
  });
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const slug =
      form.slug ||
      form.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const res = await fetch("/api/admin/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        slug,
        capacity: Number(form.capacity),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed to add venue.");
      return;
    }
    setMsg("Venue created.");
    setForm({ ...form, name: "", slug: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="t254-card p-6 space-y-4">
      <h2 className="text-base font-bold text-[#F8FAFC]">Add Stadium / Venue</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          required
          placeholder="Stadium Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="t254-input text-xs"
        />
        <input
          required
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="t254-input text-xs"
        />
        <input
          required
          placeholder="Country"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          className="t254-input text-xs"
        />
        <input
          required
          maxLength={2}
          placeholder="ISO-2 (KE)"
          value={form.countryCode}
          onChange={(e) =>
            setForm({ ...form, countryCode: e.target.value.toUpperCase() })
          }
          className="t254-input text-xs uppercase"
        />
        <input
          required
          placeholder="IANA Timezone (Africa/Nairobi)"
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          className="t254-input text-xs"
        />
        <input
          type="number"
          required
          min={100}
          placeholder="Capacity"
          value={form.capacity}
          onChange={(e) =>
            setForm({ ...form, capacity: Number(e.target.value) })
          }
          className="t254-input text-xs"
        />
      </div>
      {msg && <p className="text-xs text-[#35D399]">{msg}</p>}
      <button type="submit" className="t254-btn-primary text-xs">
        <Plus className="h-4 w-4" />
        Create Venue
      </button>
    </form>
  );
}
