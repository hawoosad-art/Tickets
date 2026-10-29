"use client";

import React, { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

export function ProfileSettingsForm({
  initial,
}: {
  initial: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryCode: string;
    preferredCurrency: string;
  };
}) {
  const [state, setState] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile.");
      setMsg("Profile preferences updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="t254-card p-6 sm:p-8 space-y-5">
      {msg && (
        <div className="rounded-xl border border-[#35D399]/40 bg-[#35D399]/10 p-3 text-xs text-[#35D399]">
          {msg}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            First Name
          </label>
          <input
            required
            value={state.firstName}
            onChange={(e) => setState({ ...state, firstName: e.target.value })}
            className="t254-input"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Last Name
          </label>
          <input
            required
            value={state.lastName}
            onChange={(e) => setState({ ...state, lastName: e.target.value })}
            className="t254-input"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Email Address (Login ID)
          </label>
          <input
            disabled
            value={state.email}
            className="t254-input opacity-60 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Phone Number
          </label>
          <input
            value={state.phone}
            onChange={(e) => setState({ ...state, phone: e.target.value })}
            className="t254-input"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Country Code (ISO-2)
          </label>
          <input
            maxLength={2}
            value={state.countryCode}
            onChange={(e) =>
              setState({ ...state, countryCode: e.target.value.toUpperCase() })
            }
            className="t254-input uppercase"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Preferred Display Currency
          </label>
          <select
            value={state.preferredCurrency}
            onChange={(e) =>
              setState({ ...state, preferredCurrency: e.target.value })
            }
            className="t254-input"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" disabled={saving} className="t254-btn-primary">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Profile Changes
      </button>
    </form>
  );
}
