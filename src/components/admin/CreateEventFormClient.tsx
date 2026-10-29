"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";

export function CreateEventFormClient({
  venues,
}: {
  venues: Array<{ id: string; name: string; city: string; timezone: string }>;
}) {
  const router = useRouter();
  const defaultKickoff = new Date(Date.now() + 14 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 16);

  const [state, setState] = useState({
    title: "",
    slug: "",
    competition: "",
    homeTeam: "",
    awayTeam: "",
    homeTeamShort: "",
    awayTeamShort: "",
    venueId: venues[0]?.id || "",
    kickoffLocal: defaultKickoff,
    timezone: venues[0]?.timezone || "Africa/Nairobi",
    currency: "KES",
    status: "PUBLISHED",
    organiserName: "",
    organiserAuthorised: true,
    isFeatured: false,
    isSampleData: false,
    description: "",
    entryInstructions:
      "Gates open 2 hours before kick-off. Present your Ticket254 QR ticket at the assigned turnstile.",
    refundPolicyText:
      "Eligible for refund up to 48 hours before kick-off if tickets remain unused.",
    postponementPolicyText:
      "Issued tickets remain valid for the rescheduled match date.",
    maxTicketsPerCustomer: 8,
    bookingFeeBps: 0,
    taxBps: 0,
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function autoSlug(home: string, away: string) {
    return `${home}-vs-${away}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const kickoffIso = new Date(state.kickoffLocal).toISOString();
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...state,
          kickoffAt: kickoffIso,
          slug: state.slug || autoSlug(state.homeTeam, state.awayTeam),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create event.");
      router.push(`/admin/events/${data.event.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating event.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="t254-card p-6 space-y-5">
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Home Team *
          </label>
          <input
            required
            value={state.homeTeam}
            onChange={(e) => {
              const homeTeam = e.target.value;
              setState({
                ...state,
                homeTeam,
                title:
                  homeTeam && state.awayTeam
                    ? `${homeTeam} vs ${state.awayTeam}`
                    : state.title,
                slug: autoSlug(homeTeam, state.awayTeam || "away"),
              });
            }}
            className="t254-input"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Away Team *
          </label>
          <input
            required
            value={state.awayTeam}
            onChange={(e) => {
              const awayTeam = e.target.value;
              setState({
                ...state,
                awayTeam,
                title:
                  state.homeTeam && awayTeam
                    ? `${state.homeTeam} vs ${awayTeam}`
                    : state.title,
                slug: autoSlug(state.homeTeam || "home", awayTeam),
              });
            }}
            className="t254-input"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Home Short Code (3 chars) *
          </label>
          <input
            required
            maxLength={5}
            value={state.homeTeamShort}
            onChange={(e) =>
              setState({
                ...state,
                homeTeamShort: e.target.value.toUpperCase(),
              })
            }
            placeholder="NBI"
            className="t254-input uppercase"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Away Short Code (3 chars) *
          </label>
          <input
            required
            maxLength={5}
            value={state.awayTeamShort}
            onChange={(e) =>
              setState({
                ...state,
                awayTeamShort: e.target.value.toUpperCase(),
              })
            }
            placeholder="MBA"
            className="t254-input uppercase"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Match Title *
          </label>
          <input
            required
            value={state.title}
            onChange={(e) => setState({ ...state, title: e.target.value })}
            className="t254-input"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            URL Slug *
          </label>
          <input
            required
            value={state.slug}
            onChange={(e) => setState({ ...state, slug: e.target.value })}
            className="t254-input font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Competition *
          </label>
          <input
            required
            value={state.competition}
            onChange={(e) =>
              setState({ ...state, competition: e.target.value })
            }
            placeholder="International Friendly"
            className="t254-input"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Authorised Organiser Name *
          </label>
          <input
            required
            value={state.organiserName}
            onChange={(e) =>
              setState({ ...state, organiserName: e.target.value })
            }
            className="t254-input"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Venue *
          </label>
          <select
            value={state.venueId}
            onChange={(e) => {
              const v = venues.find((x) => x.id === e.target.value);
              setState({
                ...state,
                venueId: e.target.value,
                timezone: v?.timezone || state.timezone,
              });
            }}
            className="t254-input"
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.city})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Kick-Off Date & Time (UTC input) *
          </label>
          <input
            type="datetime-local"
            required
            value={state.kickoffLocal}
            onChange={(e) =>
              setState({ ...state, kickoffLocal: e.target.value })
            }
            className="t254-input"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Pricing Currency *
          </label>
          <select
            value={state.currency}
            onChange={(e) => setState({ ...state, currency: e.target.value })}
            className="t254-input"
          >
            <option value="KES">KES — Kenyan Shilling</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
            Initial Status
          </label>
          <select
            value={state.status}
            onChange={(e) => setState({ ...state, status: e.target.value })}
            className="t254-input"
          >
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="DRAFT">DRAFT</option>
            <option value="UNPUBLISHED">UNPUBLISHED</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
          Event Description *
        </label>
        <textarea
          required
          minLength={10}
          rows={3}
          value={state.description}
          onChange={(e) => setState({ ...state, description: e.target.value })}
          className="t254-input"
        />
      </div>

      <div className="flex flex-wrap gap-6 text-xs text-[#F8FAFC]">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={state.organiserAuthorised}
            onChange={(e) =>
              setState({ ...state, organiserAuthorised: e.target.checked })
            }
          />
          <span>Organiser Inventory Authorised</span>
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={state.isSampleData}
            onChange={(e) =>
              setState({ ...state, isSampleData: e.target.checked })
            }
          />
          <span>Label as Development Sample Event</span>
        </label>
      </div>

      <button type="submit" disabled={saving} className="t254-btn-primary">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <PlusCircle className="h-4 w-4" />
        )}
        Create Match Event
      </button>
    </form>
  );
}
