import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { generateTicketPdfBuffer } from "@/services/tickets/ticket-service";
import { verifyOrderOwnershipOrToken } from "@/services/orders/order-service";

export async function GET(
  req: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.ticketId },
      include: { order: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    const user = await getCurrentUser();
    const accessToken = req.nextUrl.searchParams.get("token");

    const allowed = await verifyOrderOwnershipOrToken({
      bookingReference: ticket.order.bookingReference,
      currentUserId: user?.id ?? null,
      currentUserRole: user?.role ?? null,
      accessToken,
    });

    if (!allowed) {
      return NextResponse.json(
        { error: "Forbidden: you do not have access to this ticket." },
        { status: 403 }
      );
    }

    const { buffer, filename } = await generateTicketPdfBuffer(ticket.id);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
