import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserPermission } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import {
  httpOrganiserInventoryProvider,
  releaseExpiredReservations,
} from "@/services/inventory/inventory-service";
import { recordAuditLog } from "@/lib/logger";

const inventoryActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("REAP_EXPIRED"),
  }),
  z.object({
    action: z.literal("UPDATE_NATIVE_ALLOCATION"),
    allocationId: z.string().min(1),
    authorisedCapacity: z.number().int().min(0).max(200000),
    blockedCount: z.number().int().min(0).max(200000).default(0),
  }),
  z.object({
    action: z.literal("SYNC_EXTERNAL"),
    allocationId: z.string().min(1),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const admin = await requireUserPermission("inventory:manage");
    const body = await req.json();
    const parsed = inventoryActionSchema.parse(body);

    if (parsed.action === "REAP_EXPIRED") {
      const reaped = await releaseExpiredReservations();
      return NextResponse.json(reaped);
    }

    if (parsed.action === "UPDATE_NATIVE_ALLOCATION") {
      const alloc = await prisma.inventoryAllocation.findUnique({
        where: { id: parsed.allocationId },
      });
      if (!alloc) {
        return NextResponse.json(
          { error: "Allocation not found." },
          { status: 404 }
        );
      }
      if (alloc.sourceType === "EXTERNAL_ORGANISER") {
        return NextResponse.json(
          {
            error:
              "Cannot manually override external organiser capacity; sync from organiser feed instead.",
          },
          { status: 400 }
        );
      }
      if (parsed.authorisedCapacity < alloc.soldCount + alloc.reservedCount) {
        return NextResponse.json(
          {
            error:
              "Authorised capacity cannot be reduced below already sold + reserved tickets.",
          },
          { status: 400 }
        );
      }

      const updated = await prisma.inventoryAllocation.update({
        where: { id: alloc.id },
        data: {
          authorisedCapacity: parsed.authorisedCapacity,
          blockedCount: parsed.blockedCount,
          version: { increment: 1 },
        },
      });

      await recordAuditLog({
        actorUserId: admin.id,
        actorRole: admin.role,
        action: "INVENTORY_ALLOCATION_UPDATED",
        entityType: "InventoryAllocation",
        entityId: alloc.id,
        metadata: {
          authorisedCapacity: parsed.authorisedCapacity,
          blockedCount: parsed.blockedCount,
        },
      });

      return NextResponse.json({ allocation: updated });
    }

    const alloc = await prisma.inventoryAllocation.findUnique({
      where: { id: parsed.allocationId },
    });
    if (
      !alloc ||
      alloc.sourceType !== "EXTERNAL_ORGANISER" ||
      !alloc.externalEndpointUrl ||
      !alloc.externalEventRef ||
      !alloc.externalAllocationRef
    ) {
      return NextResponse.json(
        { error: "External organiser feed details are not configured." },
        { status: 400 }
      );
    }

    const live = await httpOrganiserInventoryProvider.checkAvailability({
      endpointUrl: alloc.externalEndpointUrl,
      externalEventRef: alloc.externalEventRef,
      externalAllocationRef: alloc.externalAllocationRef,
    });

    const synced = await prisma.inventoryAllocation.update({
      where: { id: alloc.id },
      data: {
        authorisedCapacity:
          alloc.soldCount + alloc.reservedCount + live.availableCount,
        lastExternalSyncAt: new Date(),
      },
    });

    return NextResponse.json({ allocation: synced });
  } catch (err) {
    return handleApiError(err);
  }
}
