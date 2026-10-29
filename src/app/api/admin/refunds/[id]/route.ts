import { NextRequest, NextResponse } from "next/server";
import { requireUserPermission } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { adminRefundReviewSchema } from "@/lib/validation/schemas";
import { reviewAndExecuteRefund } from "@/services/orders/order-service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewer = await requireUserPermission("refunds:review");
    const body = await req.json();
    const parsed = adminRefundReviewSchema.parse(body);

    const outcome = await reviewAndExecuteRefund({
      refundId: params.id,
      reviewerUserId: reviewer.id,
      reviewerRole: reviewer.role,
      action: parsed.action,
      adminNotes: parsed.adminNotes,
      overrideAmountMinor: parsed.amountMinor,
      invalidateTickets: parsed.invalidateTickets,
    });

    return NextResponse.json(outcome);
  } catch (err) {
    return handleApiError(err);
  }
}
