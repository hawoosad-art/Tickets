import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { BookingActionsClient } from "@/components/tickets/BookingActionsClient";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      event: { include: { venue: true } },
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      tickets: true,
      refunds: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-bold text-[#60A5FA]">
            {order.bookingReference}
          </span>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
            Order Detail & Ledger Trail
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <BookingActionsClient
            orderId={order.id}
            bookingReference={order.bookingReference}
            canVerify={order.status === "AWAITING_PAYMENT"}
          />
          <Link href="/admin/orders" className="t254-btn-secondary text-xs">
            ← Orders
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="t254-card p-6 space-y-2 text-xs">
          <h2 className="text-sm font-bold text-[#F8FAFC]">Customer & Match</h2>
          <p className="text-[#94A3B8]">
            Customer:{" "}
            <strong className="text-[#F8FAFC]">
              {order.customerFirstName} {order.customerLastName} (
              {order.customerEmail})
            </strong>
          </p>
          <p className="text-[#94A3B8]">
            Phone: {order.customerPhone || "N/A"} • Country:{" "}
            {order.customerCountry}
          </p>
          <p className="text-[#94A3B8]">
            Match: <strong className="text-[#F8FAFC]">{order.event.title}</strong>
          </p>
          <p className="text-[#94A3B8]">
            State: <strong className="text-[#35D399]">{order.status}</strong>
          </p>
        </div>

        <div className="t254-card p-6 space-y-2 text-xs">
          <h2 className="text-sm font-bold text-[#F8FAFC]">
            Minor-Unit Financial Summary
          </h2>
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Subtotal:</span>
            <span>{formatMoney(order.subtotalMinor, order.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Booking Fee:</span>
            <span>{formatMoney(order.bookingFeeMinor, order.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Tax:</span>
            <span>{formatMoney(order.taxMinor, order.currency)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm border-t border-[#293548] pt-2">
            <span>Total Charged:</span>
            <span className="text-[#35D399]">
              {formatMoney(order.totalMinor, order.currency)}
            </span>
          </div>
          <div className="flex justify-between text-amber-300">
            <span>Refunded Total:</span>
            <span>{formatMoney(order.refundedMinor, order.currency)}</span>
          </div>
        </div>
      </div>

      <div className="t254-card p-6 space-y-3">
        <h2 className="text-sm font-bold text-[#F8FAFC]">
          Payment Transactions ({order.payments.length})
        </h2>
        <div className="divide-y divide-[#293548] text-xs">
          {order.payments.map((p) => (
            <div key={p.id} className="py-3 flex flex-wrap justify-between gap-2">
              <div>
                <span className="font-bold text-[#60A5FA]">{p.provider}</span> •{" "}
                <span className="font-mono text-[#F8FAFC]">
                  {p.providerOrderId || p.id}
                </span>
                {p.providerCaptureId && (
                  <span className="text-[#94A3B8]">
                    {" "}
                    (Capture: {p.providerCaptureId})
                  </span>
                )}
              </div>
              <div>
                <span className="font-bold text-[#35D399]">{p.status}</span> •{" "}
                {formatMoney(p.amountMinor, p.currency)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="t254-card p-6 space-y-3">
        <h2 className="text-sm font-bold text-[#F8FAFC]">
          Issued Digital Tickets ({order.tickets.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {order.tickets.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-[#293548] bg-[#0B1020] p-3 flex items-center justify-between"
            >
              <div>
                <p className="font-mono font-bold text-[#F8FAFC]">
                  {t.ticketNumber}
                </p>
                <p className="text-[#94A3B8]">
                  {t.seatSection} • {t.status}
                </p>
              </div>
              <a
                href={`/api/tickets/${t.id}/pdf`}
                className="text-[#35D399] font-semibold hover:underline"
              >
                PDF
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
