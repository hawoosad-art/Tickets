import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserPermission } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { formatMinorToDecimalString } from "@/lib/money";
import { recordAuditLog } from "@/lib/logger";

function csvCell(val: string | number | null | undefined): string {
  const s = val === null || val === undefined ? "" : String(val);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  try {
    const actor = await requireUserPermission("reports:export");
    const reportType =
      req.nextUrl.searchParams.get("type") || "sales-by-event";

    let csv = "";

    if (reportType === "sales-by-category") {
      const items = await prisma.orderItem.findMany({
        where: {
          order: {
            status: {
              in: ["PAID", "TICKETS_ISSUED", "PARTIALLY_REFUNDED", "REFUNDED"],
            },
          },
        },
        include: {
          ticketType: { include: { event: { select: { title: true } } } },
        },
      });

      const grouped = new Map<
        string,
        {
          event: string;
          category: string;
          currency: string;
          qty: number;
          grossMinor: number;
        }
      >();
      for (const it of items) {
        const key = it.ticketTypeId;
        const curr = grouped.get(key) || {
          event: it.ticketType.event.title,
          category: it.ticketTypeName,
          currency: it.currency,
          qty: 0,
          grossMinor: 0,
        };
        curr.qty += it.quantity;
        curr.grossMinor += it.lineTotalMinor;
        grouped.set(key, curr);
      }

      const header = "Event,Category,Currency,TicketsSold,GrossSales";
      const lines = Array.from(grouped.values()).map((r) =>
        [
          r.event,
          r.category,
          r.currency,
          r.qty,
          formatMinorToDecimalString(r.grossMinor),
        ]
          .map(csvCell)
          .join(",")
      );
      csv = [header, ...lines].join("\n");
    } else {
      const events = await prisma.event.findMany({
        include: {
          orders: {
            where: {
              status: {
                in: ["PAID", "TICKETS_ISSUED", "PARTIALLY_REFUNDED", "REFUNDED"],
              },
            },
          },
          tickets: true,
        },
      });

      const header =
        "Event,Competition,Currency,ConfirmedOrders,TicketsIssued,TicketsRedeemed,GrossSales,Refunded,NetSales";
      const lines = events.map((ev) => {
        const gross = ev.orders.reduce((s, o) => s + o.totalMinor, 0);
        const rfd = ev.orders.reduce((s, o) => s + o.refundedMinor, 0);
        const net = gross - rfd;
        const redeemed = ev.tickets.filter((t) => t.status === "USED").length;
        return [
          ev.title,
          ev.competition,
          ev.currency,
          ev.orders.length,
          ev.tickets.length,
          redeemed,
          formatMinorToDecimalString(gross),
          formatMinorToDecimalString(rfd),
          formatMinorToDecimalString(net),
        ]
          .map(csvCell)
          .join(",");
      });
      csv = [header, ...lines].join("\n");
    }

    await recordAuditLog({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "REPORT_CSV_EXPORTED",
      entityType: "Report",
      entityId: reportType,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ticket254-${reportType}-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
