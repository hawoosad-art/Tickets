import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import {
  profileUpdateSchema,
  refundRequestSchema,
} from "@/lib/validation/schemas";
import { requestCustomerRefund } from "@/services/orders/order-service";
import { recordAuditLog } from "@/lib/logger";

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const parsed = profileUpdateSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone || null,
        countryCode: parsed.countryCode.toUpperCase(),
        preferredCurrency: parsed.preferredCurrency,
      },
    });

    await recordAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      action: "PROFILE_UPDATED",
      entityType: "User",
      entityId: user.id,
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        countryCode: updated.countryCode,
        preferredCurrency: updated.preferredCurrency,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const parsed = refundRequestSchema.parse(body);

    const res = await requestCustomerRefund({
      orderId: parsed.orderId,
      requestedByUserId: user.id,
      reason: parsed.reason,
      requestedAmountMinor: parsed.amountMinor,
    });

    return NextResponse.json(res);
  } catch (err) {
    return handleApiError(err);
  }
}
