import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  KeyRound,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  PackageCheck,
  QrCode,
  RotateCcw,
  Settings,
  ShieldAlert,
  Ticket,
  Users,
} from "lucide-react";
import { getCurrentUser, hasRolePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/venues", label: "Venues", icon: Building2 },
  { href: "/admin/ticket-types", label: "Ticket Categories", icon: Ticket },
  { href: "/admin/inventory", label: "Inventory", icon: Layers },
  { href: "/admin/orders", label: "Orders", icon: PackageCheck },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
  { href: "/admin/reconciliation", label: "Reconciliation", icon: FileSpreadsheet },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/scanner", label: "Scanner Ops", icon: QrCode },
  { href: "/admin/reports", label: "Reports & Analytics", icon: BarChart3 },
  { href: "/admin/support", label: "Support Desk", icon: LifeBuoy },
  { href: "/admin/users", label: "Staff & Roles", icon: KeyRound },
  { href: "/admin/settings", label: "Settings & Gateways", icon: Settings },
  { href: "/admin/audit-log", label: "Audit Log", icon: Activity },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?returnUrl=/admin");
  }

  if (!hasRolePermission(user.role, "admin:access", user.permissions)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-4">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-400" />
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Administrative Access Restricted
        </h1>
        <p className="text-sm text-[#94A3B8]">
          Your role ({user.role}) is not authorised to access administrative
          routes. Every access check is enforced server-side.
        </p>
        <Link href="/" className="t254-btn-primary">
          Return to Public Website
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-3 xl:col-span-2">
          <div className="t254-card p-4 space-y-4 sticky top-20">
            <div className="border-b border-[#293548] pb-3 px-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#35D399]">
                Admin Console
              </span>
              <p className="text-sm font-bold text-[#F8FAFC] truncate">
                {user.firstName} {user.lastName}
              </p>
              <span className="text-[11px] text-[#60A5FA] font-mono">
                {user.role}
              </span>
            </div>

            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#94A3B8] hover:bg-[#111827] hover:text-[#F8FAFC] transition"
                  >
                    <Icon className="h-4 w-4 text-[#35D399] shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="lg:col-span-9 xl:col-span-10 space-y-6">
          {children}
        </section>
      </div>
    </div>
  );
}
