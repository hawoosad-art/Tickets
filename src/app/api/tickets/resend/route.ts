import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, hasRolePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { resendOrderTicketsEmail } from "@/services/tickets/ticket-service";
import { verifyOrderOwnershipOrToken } from "@/services/orders/order-service";

const resendSchema = z.object({
  orderId: z.string().min(1),
  accessToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resendSchema.parse(body);
    const user = await getCurrentUser();

    const order = await prisma.order.findUnique({
      where: { id: parsed.orderId },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const staffCanResend = user
      ? hasRolePermission(user.role, "tickets:resend", user.permissions)
      : false;

    const ownerAllowed = await verifyOrderOwnershipOrToken({
      bookingReference: order.bookingReference,
      currentUserId: user?.id ?? null,
      currentUserRole: user?.role ?? null,
      accessToken: parsed.accessToken ?? null,
    });

    if (!staffCanResend && !ownerAllowed) {
      return NextResponse.json(
        { error: "Forbidden: not authorised to resend tickets for this booking." },
        { status: 403 }
      );
    }

    const res = await resendOrderTicketsEmail({
      orderId: order.id,
      actorUserId: user?.id ?? null,
      actorRole: user?.role ?? "CUSTOMER",
    });

    return NextResponse.json(res);
  } catch (err) {
    return handleApiError(err);
  }
}
