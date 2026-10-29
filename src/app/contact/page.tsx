"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    bookingReference: "",
    category: "GENERAL",
    subject: "",
    message: "",
  });
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit request.");
      setSubmittedRef(data.ticketReference);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
          Customer & Organiser Desk
        </span>
        <h1 className="text-3xl font-extrabold text-[#F8FAFC] mt-1">
          Contact Ticket254 Support
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Submit a support ticket below and receive an immediate tracking
          reference via email.
        </p>
      </div>

      {submittedRef ? (
        <div className="t254-card p-8 text-center space-y-4">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#35D399]" />
          <h2 className="text-2xl font-extrabold text-[#F8FAFC]">
            Support Request Logged
          </h2>
          <p className="text-sm text-[#94A3B8]">
            Your support ticket reference is{" "}
            <strong className="font-mono text-[#35D399]">{submittedRef}</strong>
            . A confirmation has been queued to <strong>{form.email}</strong>.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmittedRef(null);
              setForm({
                name: "",
                email: "",
                bookingReference: "",
                category: "GENERAL",
                subject: "",
                message: "",
              });
            }}
            className="t254-btn-secondary"
          >
            Submit Another Inquiry
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="t254-card p-7 space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                Full Name *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="t254-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="t254-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="t254-input"
              >
                <option value="BOOKING">Booking Inquiry</option>
                <option value="PAYMENT">Payment Verification</option>
                <option value="TICKET_DELIVERY">Ticket Delivery / PDF</option>
                <option value="REFUND">Refund Policy Question</option>
                <option value="EVENT_ENTRY">Venue Gate Entry</option>
                <option value="GENERAL">General / Organiser Inquiry</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                Booking Reference (Optional)
              </label>
              <input
                value={form.bookingReference}
                onChange={(e) =>
                  setForm({ ...form, bookingReference: e.target.value })
                }
                placeholder="e.g. T254-DEMO-0001"
                className="t254-input font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
              Subject *
            </label>
            <input
              required
              minLength={4}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="t254-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
              Message *
            </label>
            <textarea
              required
              minLength={10}
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="t254-input"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="t254-btn-primary"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Support Request
          </button>
        </form>
      )}
    </div>
  );
}
