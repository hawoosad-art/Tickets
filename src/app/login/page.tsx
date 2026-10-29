"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

function LoginFormInner({ showDemoLogins }: { showDemoLogins: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign in failed.");

      if (returnUrl !== "/account") {
        router.push(returnUrl);
      } else if (
        [
          "SUPER_ADMIN",
          "FINANCE_MANAGER",
          "EVENT_MANAGER",
          "SUPPORT_AGENT",
        ].includes(data.user.role)
      ) {
        router.push("/admin");
      } else if (data.user.role === "TICKET_SCANNER") {
        router.push("/scanner");
      } else {
        router.push("/account");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("Ticket254!Pass");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 space-y-6">
      <div className="t254-card p-8 space-y-6">
        <div className="space-y-1 text-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#35D399]/15 text-[#35D399]">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC] pt-2">
            Sign In to Ticket254
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Access your match bookings, digital tickets, or authorised staff
            tools.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="t254-input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#94A3B8]">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#60A5FA] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="t254-input"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="t254-btn-primary w-full py-3"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="text-center text-xs text-[#94A3B8]">
          New to Ticket254?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#35D399] hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>

      {showDemoLogins && (
        <div className="t254-card p-5 space-y-3 bg-[#111827]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
            Development Demo Role Accounts (Password: Ticket254!Pass)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: "Super Admin", email: "admin@ticket254.co.ke" },
              { label: "Finance Manager", email: "finance@ticket254.co.ke" },
              { label: "Event Manager", email: "events@ticket254.co.ke" },
              { label: "Ticket Scanner", email: "scanner@ticket254.co.ke" },
              { label: "Support Agent", email: "support@ticket254.co.ke" },
              { label: "Customer Fan", email: "fan@ticket254.co.ke" },
            ].map((acct) => (
              <button
                key={acct.email}
                type="button"
                onClick={() => fillDemo(acct.email)}
                className="rounded-lg border border-[#293548] bg-[#161E2E] px-2.5 py-2 text-left hover:border-[#35D399] transition"
              >
                <span className="block font-bold text-[#F8FAFC]">
                  {acct.label}
                </span>
                <span className="block text-[10px] text-[#94A3B8] truncate">
                  {acct.email}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm">Loading...</div>}>
      <LoginFormInner showDemoLogins={process.env.NODE_ENV !== "production"} />
    </Suspense>
  );
}
