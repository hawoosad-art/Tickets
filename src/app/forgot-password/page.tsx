"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";

function ForgotPasswordInner() {
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");
      setStatusMsg(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset failed.");
      setStatusMsg(
        "Your password has been updated and previous sessions were invalidated. You can now sign in."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="t254-card p-8 space-y-6">
        <div className="text-center space-y-1">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#60A5FA]/15 text-[#60A5FA]">
            <KeyRound className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC] pt-2">
            {resetToken ? "Choose a New Password" : "Reset Your Password"}
          </h1>
        </div>

        {statusMsg && (
          <div className="rounded-xl border border-[#35D399]/40 bg-[#35D399]/10 p-3.5 text-xs text-[#35D399]">
            {statusMsg}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-200">
            {error}
          </div>
        )}

        {resetToken ? (
          <form onSubmit={handleConfirmReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                New Password (min 8 chars, 1 uppercase, 1 number)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="t254-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="t254-btn-primary w-full py-2.5"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save New Password
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                Account Email Address
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
            <button
              type="submit"
              disabled={loading}
              className="t254-btn-primary w-full py-2.5"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Reset Instructions
            </button>
          </form>
        )}

        <p className="text-center text-xs text-[#94A3B8]">
          <Link href="/login" className="text-[#35D399] hover:underline">
            Return to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm">Loading...</div>}>
      <ForgotPasswordInner />
    </Suspense>
  );
}
