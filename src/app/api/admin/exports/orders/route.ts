import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserPermission } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { formatMinorToDecimalString } from "@/lib/money";
import { recordAuditLog } from "@/lib/logger";

function csvCell(val: string | number | boolean | null | undefined): string {
  const s = val === null || val === undefined ? "" : String(val);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  try {
    const actor = await requireUserPermission("orders:export");

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 2000,
      include: {
        event: { select: { title: true } },
        tickets: { select: { id: true } },
      },
    });

    const header = [
      "BookingReference",
      "CreatedAtUTC",
      "Event",
      "CustomerName",
      "CustomerEmail",
      "Status",
      "Currency",
      "Subtotal",
      "BookingFee",
      "Tax",
      "Total",
      "Refunded",
      "TicketsIssued",
      "Simulated",
    ].join(",");

    const rows = orders.map((o) =>
      [
        o.bookingReference,
        o.createdAt.toISOString(),
        o.event.title,
        `${o.customerFirstName} ${o.customerLastName}`,
        o.customerEmail,
        o.status,
        o.currency,
        formatMinorToDecimalString(o.subtotalMinor),
        formatMinorToDecimalString(o.bookingFeeMinor),
        formatMinorToDecimalString(o.taxMinor),
        formatMinorToDecimalString(o.totalMinor),
        formatMinorToDecimalString(o.refundedMinor),
        o.tickets.length,
        o.isSimulated,
      ]
        .map(csvCell)
        .join(",")
    );

    await recordAuditLog({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "ORDERS_CSV_EXPORTED",
      entityType: "Order",
      entityId: "bulk",
      metadata: { count: orders.length },
    });

    return new NextResponse([header, ...rows].join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ticket254-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
