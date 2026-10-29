"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    countryCode: "KE",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed.");
      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <div className="t254-card p-8 space-y-6">
        <div className="text-center space-y-1">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#35D399]/15 text-[#35D399]">
            <UserPlus className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC] pt-2">
            Create Your Ticket254 Account
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Manage football bookings, download PDF tickets, and track match
            notifications.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                First Name *
              </label>
              <input
                required
                value={formState.firstName}
                onChange={(e) =>
                  setFormState({ ...formState, firstName: e.target.value })
                }
                className="t254-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                Last Name *
              </label>
              <input
                required
                value={formState.lastName}
                onChange={(e) =>
                  setFormState({ ...formState, lastName: e.target.value })
                }
                className="t254-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formState.email}
              onChange={(e) =>
                setFormState({ ...formState, email: e.target.value })
              }
              className="t254-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                Phone Number
              </label>
              <input
                value={formState.phone}
                onChange={(e) =>
                  setFormState({ ...formState, phone: e.target.value })
                }
                placeholder="+254712345678"
                className="t254-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                Country (ISO-2) *
              </label>
              <input
                required
                maxLength={2}
                value={formState.countryCode}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    countryCode: e.target.value.toUpperCase(),
                  })
                }
                className="t254-input uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
              Password (min 8 chars, 1 uppercase, 1 number) *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={formState.password}
              onChange={(e) =>
                setFormState({ ...formState, password: e.target.value })
              }
              className="t254-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="t254-btn-primary w-full py-3"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Account
          </button>
        </form>

        <p className="text-center text-xs text-[#94A3B8]">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#35D399] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
