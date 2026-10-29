"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

export function UsersAdminClient() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "TICKET_SCANNER",
  });
  const [msg, setMsg] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CREATE_STAFF",
        ...form,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed to create staff user.");
      return;
    }
    setMsg(`Created ${data.email} (${data.role}).`);
    setForm({ ...form, firstName: "", lastName: "", email: "", password: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleCreate} className="t254-card p-6 space-y-4">
      <h2 className="text-base font-bold text-[#F8FAFC]">
        Provision Staff Account (Least-Privilege RBAC)
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input
          required
          placeholder="First Name"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          className="t254-input text-xs"
        />
        <input
          required
          placeholder="Last Name"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          className="t254-input text-xs"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="t254-input text-xs"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Initial Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="t254-input text-xs"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="t254-input text-xs"
        >
          <option value="TICKET_SCANNER">TICKET_SCANNER</option>
          <option value="SUPPORT_AGENT">SUPPORT_AGENT</option>
          <option value="EVENT_MANAGER">EVENT_MANAGER</option>
          <option value="FINANCE_MANAGER">FINANCE_MANAGER</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
      </div>
      {msg && <p className="text-xs text-[#35D399]">{msg}</p>}
      <button type="submit" className="t254-btn-primary text-xs">
        <UserPlus className="h-4 w-4" />
        Create Staff Member
      </button>
    </form>
  );
}
