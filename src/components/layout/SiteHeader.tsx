"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  LogOut,
  Menu,
  QrCode,
  ShieldCheck,
  Ticket,
  User,
  X,
} from "lucide-react";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { SUPPORTED_CURRENCIES, SupportedCurrency } from "@/lib/money";

export interface HeaderUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export function SiteHeader({ user }: { user: HeaderUserSummary | null }) {
  const { currency, setCurrency } = useCurrency();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const isStaff =
    user &&
    [
      "SUPER_ADMIN",
      "FINANCE_MANAGER",
      "EVENT_MANAGER",
      "SUPPORT_AGENT",
    ].includes(user.role);
  const canScan =
    user &&
    ["SUPER_ADMIN", "EVENT_MANAGER", "TICKET_SCANNER"].includes(user.role);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#293548] bg-[#0B1020]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-[#F8FAFC]"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#35D399]/15 border border-[#35D399]/40 text-[#35D399]">
              <Ticket className="h-5 w-5" />
            </span>
            <span>
              TICKET<span className="text-[#35D399]">254</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#94A3B8]">
            <Link
              href="/matches"
              className="hover:text-[#F8FAFC] transition-colors"
            >
              Matches
            </Link>
            <Link
              href="/#how-it-works"
              className="hover:text-[#F8FAFC] transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/help"
              className="hover:text-[#F8FAFC] transition-colors"
            >
              Help Centre
            </Link>
            {user && (
              <Link
                href="/tickets"
                className="hover:text-[#35D399] transition-colors"
              >
                My Tickets
              </Link>
            )}
            {canScan && (
              <Link
                href="/scanner"
                className="inline-flex items-center gap-1.5 text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
              >
                <QrCode className="h-4 w-4" />
                Gate Scanner
              </Link>
            )}
            {isStaff && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-[#35D399] hover:text-[#6EE7B7] transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="relative flex items-center rounded-xl border border-[#293548] bg-[#161E2E] px-2.5 py-1.5 text-xs text-[#F8FAFC]">
            <Globe className="mr-1.5 h-3.5 w-3.5 text-[#35D399]" />
            <label htmlFor="currency-select" className="sr-only">
              Display Currency
            </label>
            <select
              id="currency-select"
              value={currency}
              onChange={(e) =>
                setCurrency(e.target.value as SupportedCurrency)
              }
              className="bg-transparent font-semibold text-[#F8FAFC] focus:outline-none cursor-pointer"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c} className="bg-[#161E2E] text-[#F8FAFC]">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/account"
                className="inline-flex items-center gap-2 rounded-xl border border-[#293548] bg-[#161E2E] px-3.5 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[#35D399]"
              >
                <User className="h-3.5 w-3.5 text-[#35D399]" />
                {user.firstName}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="inline-flex items-center justify-center rounded-xl border border-[#293548] bg-[#161E2E] p-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:border-rose-500/50 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-xl px-3.5 py-2 text-sm font-semibold text-[#F8FAFC] hover:text-[#35D399] transition"
            >
              Sign In
            </Link>
          )}

          <Link href="/matches" className="t254-btn-primary text-xs px-4 py-2">
            Explore Matches
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden inline-flex items-center justify-center rounded-xl border border-[#293548] bg-[#161E2E] p-2 text-[#F8FAFC]"
          aria-label="Toggle Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#293548] bg-[#111827] px-4 py-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#293548]">
            <span className="text-xs text-[#94A3B8]">Display Currency</span>
            <select
              value={currency}
              onChange={(e) =>
                setCurrency(e.target.value as SupportedCurrency)
              }
              className="rounded-lg border border-[#293548] bg-[#161E2E] px-2.5 py-1 text-xs font-semibold text-[#F8FAFC]"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Link
            href="/matches"
            onClick={() => setMobileOpen(false)}
            className="block py-1.5 text-sm font-medium text-[#F8FAFC]"
          >
            Matches
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="block py-1.5 text-sm font-medium text-[#94A3B8]"
          >
            How It Works
          </Link>
          <Link
            href="/help"
            onClick={() => setMobileOpen(false)}
            className="block py-1.5 text-sm font-medium text-[#94A3B8]"
          >
            Help Centre
          </Link>
          {canScan && (
            <Link
              href="/scanner"
              onClick={() => setMobileOpen(false)}
              className="block py-1.5 text-sm font-semibold text-[#60A5FA]"
            >
              Gate QR Scanner
            </Link>
          )}
          {isStaff && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="block py-1.5 text-sm font-semibold text-[#35D399]"
            >
              Admin Dashboard
            </Link>
          )}
          <div className="pt-2 flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="t254-btn-secondary w-full"
                >
                  My Account ({user.firstName})
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-xl border border-rose-500/40 px-4 py-2 text-xs font-semibold text-rose-300"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="t254-btn-secondary w-full"
              >
                Sign In
              </Link>
            )}
            <Link
              href="/matches"
              onClick={() => setMobileOpen(false)}
              className="t254-btn-primary w-full"
            >
              Explore Matches
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
