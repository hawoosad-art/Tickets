import { prisma } from "@/lib/db";
import { logStructured } from "@/lib/logger";

export interface ExternalOrganiserHoldResult {
  approved: boolean;
  externalHoldRef?: string;
  availableCount?: number;
  reason?: string;
}

export interface OrganiserInventoryProvider {
  checkAvailability(params: {
    endpointUrl: string;
    externalEventRef: string;
    externalAllocationRef: string;
  }): Promise<{ availableCount: number }>;

  createHold(params: {
    endpointUrl: string;
    externalEventRef: string;
    externalAllocationRef: string;
    quantity: number;
    idempotencyKey: string;
    expiresAt: Date;
  }): Promise<ExternalOrganiserHoldResult>;

  confirmHold(params: {
    endpointUrl: string;
    externalHoldRef: string;
    orderReference: string;
  }): Promise<{ confirmed: boolean }>;

  releaseHold(params: {
    endpointUrl: string;
    externalHoldRef: string;
  }): Promise<void>;
}

export const httpOrganiserInventoryProvider: OrganiserInventoryProvider = {
  async checkAvailability({
    endpointUrl,
    externalEventRef,
    externalAllocationRef,
  }) {
    const timeoutMs = Number(process.env.ORGANISER_FEED_TIMEOUT_MS || "5000");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = new URL(`${endpointUrl.replace(/\/$/, "")}/availability`);
      url.searchParams.set("eventRef", externalEventRef);
      url.searchParams.set("allocationRef", externalAllocationRef);
      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          ...(process.env.ORGANISER_API_TOKEN
            ? { Authorization: `Bearer ${process.env.ORGANISER_API_TOKEN}` }
            : {}),
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Organiser availability feed returned ${res.status}`);
      }
      const data = (await res.json()) as { availableCount: number };
      return { availableCount: Math.max(0, Number(data.availableCount || 0)) };
    } finally {
      clearTimeout(timer);
    }
  },

  async createHold({
    endpointUrl,
    externalEventRef,
    externalAllocationRef,
    quantity,
    idempotencyKey,
    expiresAt,
  }) {
    const timeoutMs = Number(process.env.ORGANISER_FEED_TIMEOUT_MS || "5000");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${endpointUrl.replace(/\/$/, "")}/holds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          ...(process.env.ORGANISER_API_TOKEN
            ? { Authorization: `Bearer ${process.env.ORGANISER_API_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          eventRef: externalEventRef,
          allocationRef: externalAllocationRef,
          quantity,
          expiresAt: expiresAt.toISOString(),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        return {
          approved: false,
          reason: `External organiser declined hold (${res.status})`,
        };
      }
      const data = (await res.json()) as ExternalOrganiserHoldResult;
      return data;
    } finally {
      clearTimeout(timer);
    }
  },

  async confirmHold({ endpointUrl, externalHoldRef, orderReference }) {
    const res = await fetch(
      `${endpointUrl.replace(/\/$/, "")}/holds/${encodeURIComponent(externalHoldRef)}/confirm`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.ORGANISER_API_TOKEN
            ? { Authorization: `Bearer ${process.env.ORGANISER_API_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({ orderReference }),
      }
    );
    return { confirmed: res.ok };
  },

  async releaseHold({ endpointUrl, externalHoldRef }) {
    await fetch(
      `${endpointUrl.replace(/\/$/, "")}/holds/${encodeURIComponent(externalHoldRef)}/release`,
      {
        method: "POST",
        headers: {
          ...(process.env.ORGANISER_API_TOKEN
            ? { Authorization: `Bearer ${process.env.ORGANISER_API_TOKEN}` }
            : {}),
        },
      }
    ).catch((err) => {
      logStructured("warn", "external_hold_release_failed", {
        externalHoldRef,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  },
};

export function computeAvailableStock(allocation: {
  authorisedCapacity: number;
  soldCount: number;
  reservedCount: number;
  blockedCount: number;
}): number {
  return Math.max(
    0,
    allocation.authorisedCapacity -
      allocation.soldCount -
      allocation.reservedCount -
      allocation.blockedCount
  );
}

/**
 * Releases expired inventory reservations and marks abandoned orders EXPIRED.
 * Safe and idempotent under concurrent execution.
 */
export async function releaseExpiredReservations(): Promise<{
  releasedReservations: number;
  expiredOrders: number;
}> {
  const now = new Date();
  const expiredList = await prisma.inventoryReservation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
    include: {
      allocation: true,
    },
    take: 100,
  });

  let releasedReservations = 0;
  const affectedOrderIds = new Set<string>();

  for (const resv of expiredList) {
    const released = await prisma.$transaction(async (tx) => {
      const claim = await tx.inventoryReservation.updateMany({
        where: {
          id: resv.id,
          status: "ACTIVE",
        },
        data: {
          status: "EXPIRED",
          releasedAt: now,
        },
      });
      if (claim.count === 0) return false;

      await tx.$executeRaw`
        UPDATE "InventoryAllocation"
        SET "reservedCount" = GREATEST(0, "reservedCount" - ${resv.quantity}),
            "version" = "version" + 1,
            "updatedAt" = NOW()
        WHERE "id" = ${resv.allocationId}
      `;
      return true;
    });

    if (released) {
      releasedReservations++;
      if (resv.orderId) affectedOrderIds.add(resv.orderId);

      if (
        resv.allocation.sourceType === "EXTERNAL_ORGANISER" &&
        resv.allocation.externalEndpointUrl &&
        resv.externalHoldRef
      ) {
        await httpOrganiserInventoryProvider.releaseHold({
          endpointUrl: resv.allocation.externalEndpointUrl,
          externalHoldRef: resv.externalHoldRef,
        });
      }
    }
  }

  let expiredOrders = 0;
  for (const orderId of Array.from(affectedOrderIds)) {
    const updated = await prisma.order.updateMany({
      where: {
        id: orderId,
        status: { in: ["PENDING", "AWAITING_PAYMENT"] },
      },
      data: {
        status: "EXPIRED",
        expiredAt: now,
      },
    });
    expiredOrders += updated.count;
  }

  return { releasedReservations, expiredOrders };
}

/**
 * Atomically reserves inventory for one or more ticket types.
 * Uses conditional SQL row updates inside a short transaction so overselling is impossible.
 */
export async function reserveInventoryAtomically(params: {
  items: Array<{ ticketTypeId: string; quantity: number }>;
  userId?: string | null;
  orderIdempotencyKey: string;
  ttlMinutes?: number;
}): Promise<{
  reservationIds: string[];
  expiresAt: Date;
}> {
  // First clean up any expired reservations so stale holds don't block genuine buyers
  await releaseExpiredReservations();

  const ttl =
    params.ttlMinutes ??
    Math.max(5, Number(process.env.RESERVATION_TTL_MINUTES || "15"));
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

  // Check if any item uses external organiser inventory BEFORE opening a DB transaction
  const externalHolds: Map<string, string> = new Map();
  const allocations = await prisma.inventoryAllocation.findMany({
    where: {
      ticketTypeId: { in: params.items.map((i) => i.ticketTypeId) },
    },
  });
  const allocByType = new Map(allocations.map((a) => [a.ticketTypeId, a]));

  for (const item of params.items) {
    const alloc = allocByType.get(item.ticketTypeId);
    if (!alloc) {
      throw new Error("Ticket inventory allocation is not configured.");
    }
    if (alloc.sourceType === "EXTERNAL_ORGANISER") {
      if (
        !alloc.externalEndpointUrl ||
        !alloc.externalEventRef ||
        !alloc.externalAllocationRef
      ) {
        throw new Error(
          "External organiser inventory feed is not configured for this ticket category."
        );
      }
      const hold = await httpOrganiserInventoryProvider.createHold({
        endpointUrl: alloc.externalEndpointUrl,
        externalEventRef: alloc.externalEventRef,
        externalAllocationRef: alloc.externalAllocationRef,
        quantity: item.quantity,
        idempotencyKey: `${params.orderIdempotencyKey}:${item.ticketTypeId}`,
        expiresAt,
      });
      if (!hold.approved || !hold.externalHoldRef) {
        throw new Error(
          hold.reason || "Authorised organiser declined ticket allocation."
        );
      }
      externalHolds.set(item.ticketTypeId, hold.externalHoldRef);
    }
  }

  try {
    // Sort items deterministically by ticketTypeId to avoid deadlocks under concurrent load
    const sortedItems = [...params.items].sort((a, b) =>
      a.ticketTypeId.localeCompare(b.ticketTypeId)
    );

    const reservationIds = await prisma.$transaction(async (tx) => {
      const createdIds: string[] = [];

      for (const item of sortedItems) {
        const resKey = `${params.orderIdempotencyKey}:${item.ticketTypeId}`;
        const existingRes = await tx.inventoryReservation.findUnique({
          where: { idempotencyKey: resKey },
        });
        if (existingRes && existingRes.status === "ACTIVE") {
          createdIds.push(existingRes.id);
          continue;
        }

        const alloc = allocByType.get(item.ticketTypeId)!;

        // Atomic conditional update: only increments reservedCount if sufficient authorised stock exists
        const updatedRows = await tx.$executeRaw`
          UPDATE "InventoryAllocation"
          SET "reservedCount" = "reservedCount" + ${item.quantity},
              "version" = "version" + 1,
              "updatedAt" = NOW()
          WHERE "id" = ${alloc.id}
            AND ("authorisedCapacity" - "soldCount" - "reservedCount" - "blockedCount") >= ${item.quantity}
        `;

        if (updatedRows !== 1) {
          throw new Error(
            "Insufficient available tickets in the requested category. Please reduce quantity."
          );
        }

        const resv = await tx.inventoryReservation.create({
          data: {
            allocationId: alloc.id,
            ticketTypeId: item.ticketTypeId,
            userId: params.userId ?? null,
            idempotencyKey: resKey,
            quantity: item.quantity,
            status: "ACTIVE",
            externalHoldRef: externalHolds.get(item.ticketTypeId) ?? null,
            expiresAt,
          },
        });
        createdIds.push(resv.id);
      }

      return createdIds;
    });

    return { reservationIds, expiresAt };
  } catch (err) {
    // Compensating release of any external organiser holds if DB reservation rolled back
    for (const [ticketTypeId, holdRef] of Array.from(externalHolds.entries())) {
      const alloc = allocByType.get(ticketTypeId);
      if (alloc?.externalEndpointUrl) {
        await httpOrganiserInventoryProvider.releaseHold({
          endpointUrl: alloc.externalEndpointUrl,
          externalHoldRef: holdRef,
        });
      }
    }
    throw err;
  }
}

export async function releaseOrderReservations(orderId: string): Promise<void> {
  const reservations = await prisma.inventoryReservation.findMany({
    where: { orderId, status: "ACTIVE" },
    include: { allocation: true },
  });

  for (const resv of reservations) {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.inventoryReservation.updateMany({
        where: { id: resv.id, status: "ACTIVE" },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
      if (claim.count > 0) {
        await tx.$executeRaw`
          UPDATE "InventoryAllocation"
          SET "reservedCount" = GREATEST(0, "reservedCount" - ${resv.quantity}),
              "version" = "version" + 1,
              "updatedAt" = NOW()
          WHERE "id" = ${resv.allocationId}
        `;
      }
    });

    if (
      resv.allocation.sourceType === "EXTERNAL_ORGANISER" &&
      resv.allocation.externalEndpointUrl &&
      resv.externalHoldRef
    ) {
      await httpOrganiserInventoryProvider.releaseHold({
        endpointUrl: resv.allocation.externalEndpointUrl,
        externalHoldRef: resv.externalHoldRef,
      });
    }
  }
}
