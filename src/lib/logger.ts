import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type LogLevel = "info" | "warn" | "error";

export function logStructured(
  level: LogLevel,
  event: string,
  context: Record<string, unknown> = {}
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    service: "ticket254",
    level,
    event,
    ...context,
  };
  if (process.env.NODE_ENV === "test") {
    return;
  }
  const serialized = JSON.stringify(entry);
  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

export async function recordAuditLog(params: {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        actorRole: params.actorRole ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    logStructured("error", "audit_log_write_failed", {
      action: params.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function trackAnalyticsEvent(params: {
  eventType:
    | "EVENT_VIEW"
    | "TICKET_SELECTION"
    | "CHECKOUT_INITIATED"
    | "CHECKOUT_COMPLETED"
    | "PAYMENT_FAILED"
    | "TICKETS_ISSUED"
    | "TICKET_REDEEMED"
    | "REFUND_REQUESTED";
  eventId?: string | null;
  orderId?: string | null;
  sessionAnon?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: params.eventType,
        eventId: params.eventId ?? null,
        orderId: params.orderId ?? null,
        sessionAnon: params.sessionAnon ?? null,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    logStructured("warn", "analytics_track_failed", {
      eventType: params.eventType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
