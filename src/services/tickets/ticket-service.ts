import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { ScanOutcome } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  sha256Hex,
  verifySignedQrTokenStructure,
} from "@/lib/crypto-tokens";
import { formatEventDateTimeFull } from "@/lib/timezone";
import { recordAuditLog, trackAnalyticsEvent } from "@/lib/logger";
import { enqueueAndSendEmail } from "@/services/email/email-service";
import { emailTemplates } from "@/services/email/templates";

export async function generateQrCodeDataUrl(
  qrOpaqueToken: string
): Promise<string> {
  return QRCode.toDataURL(qrOpaqueToken, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
    color: {
      dark: "#0B1020",
      light: "#FFFFFF",
    },
  });
}

export async function generateTicketPdfBuffer(
  ticketId: string
): Promise<{ buffer: Buffer; filename: string }> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: { include: { venue: true } },
      ticketType: true,
      order: true,
    },
  });

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Dark Navy background (#0B1020)
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
    color: rgb(11 / 255, 16 / 255, 32 / 255),
  });

  // Ticket Card (#161E2E)
  page.drawRectangle({
    x: 36,
    y: 120,
    width: 523.28,
    height: 670,
    color: rgb(22 / 255, 30 / 255, 46 / 255),
    borderColor: rgb(41 / 255, 53 / 255, 72 / 255),
    borderWidth: 1.5,
  });

  // Top Header Strip (#111827)
  page.drawRectangle({
    x: 36,
    y: 720,
    width: 523.28,
    height: 70,
    color: rgb(17 / 255, 24 / 255, 39 / 255),
  });

  // Brand Logo
  page.drawText("TICKET", {
    x: 60,
    y: 747,
    size: 22,
    font: fontBold,
    color: rgb(248 / 255, 250 / 255, 252 / 255),
  });
  page.drawText("254", {
    x: 144,
    y: 747,
    size: 22,
    font: fontBold,
    color: rgb(53 / 255, 211 / 255, 153 / 255),
  });

  page.drawText("OFFICIAL DIGITAL MATCH TICKET", {
    x: 330,
    y: 752,
    size: 10,
    font: fontBold,
    color: rgb(148 / 255, 163 / 255, 184 / 255),
  });

  if (ticket.isSimulated || ticket.event.isSampleData) {
    page.drawRectangle({
      x: 60,
      y: 682,
      width: 475,
      height: 26,
      color: rgb(120 / 255, 53 / 255, 15 / 255),
    });
    page.drawText(
      "SAMPLE / SIMULATED DEMONSTRATION TICKET — NOT VALID FOR REAL STADIUM ENTRY",
      {
        x: 72,
        y: 691,
        size: 9,
        font: fontBold,
        color: rgb(253 / 255, 224 / 255, 71 / 255),
      }
    );
  }

  // Competition & Match Title
  page.drawText(sanitizePdfText(ticket.event.competition.toUpperCase()), {
    x: 60,
    y: 650,
    size: 10,
    font: fontBold,
    color: rgb(53 / 255, 211 / 255, 153 / 255),
  });

  page.drawText(
    sanitizePdfText(`${ticket.event.homeTeam} vs ${ticket.event.awayTeam}`),
    {
      x: 60,
      y: 625,
      size: 20,
      font: fontBold,
      color: rgb(248 / 255, 250 / 255, 252 / 255),
    }
  );

  const dateStr = formatEventDateTimeFull(
    ticket.event.kickoffAt,
    ticket.event.timezone
  );
  page.drawText(sanitizePdfText(dateStr), {
    x: 60,
    y: 602,
    size: 11,
    font: fontRegular,
    color: rgb(96 / 255, 165 / 255, 250 / 255),
  });

  page.drawText(
    sanitizePdfText(
      `${ticket.event.venue.name} — ${ticket.event.venue.city}, ${ticket.event.venue.country}`
    ),
    {
      x: 60,
      y: 584,
      size: 11,
      font: fontRegular,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    }
  );

  // Ticket Details Grid
  const drawField = (label: string, val: string, x: number, y: number) => {
    page.drawText(label, {
      x,
      y,
      size: 8.5,
      font: fontBold,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    });
    page.drawText(sanitizePdfText(val), {
      x,
      y: y - 15,
      size: 12,
      font: fontBold,
      color: rgb(248 / 255, 250 / 255, 252 / 255),
    });
  };

  drawField("TICKET IDENTIFIER", ticket.ticketNumber, 60, 540);
  drawField("BOOKING REFERENCE", ticket.order.bookingReference, 260, 540);
  drawField("CATEGORY", ticket.ticketType.name, 60, 495);

  const seatLabel = ticket.seatSection
    ? `${ticket.seatSection}${ticket.seatRow ? ` • Row ${ticket.seatRow}` : ""}${ticket.seatNumber ? ` • Seat ${ticket.seatNumber}` : ""}`
    : ticket.ticketType.sectionInfo || "General Section Allocation";
  drawField("SEAT / SECTION", seatLabel, 260, 495);

  drawField("TICKET HOLDER", ticket.holderName, 60, 450);
  drawField(
    "ISSUED UTC",
    ticket.issuedAt.toISOString().slice(0, 19).replace("T", " ") + " UTC",
    260,
    450
  );
  drawField("STATUS", ticket.status, 455, 540);

  // QR Code PNG (contains ONLY opaque signed token, zero PII!)
  const qrPngBuffer = await QRCode.toBuffer(ticket.qrOpaqueToken, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 240,
    color: {
      dark: "#0B1020",
      light: "#FFFFFF",
    },
  });
  const qrImage = await pdfDoc.embedPng(qrPngBuffer);

  page.drawRectangle({
    x: 60,
    y: 235,
    width: 170,
    height: 170,
    color: rgb(1, 1, 1),
  });
  page.drawImage(qrImage, {
    x: 65,
    y: 240,
    width: 160,
    height: 160,
  });

  // Entry Instructions next to QR
  page.drawText("STADIUM ENTRY INSTRUCTIONS", {
    x: 255,
    y: 392,
    size: 10,
    font: fontBold,
    color: rgb(53 / 255, 211 / 255, 153 / 255),
  });

  const wrappedInstructions = wrapTextLines(
    sanitizePdfText(ticket.event.entryInstructions),
    46
  ).slice(0, 7);
  wrappedInstructions.forEach((line, idx) => {
    page.drawText(line, {
      x: 255,
      y: 372 - idx * 15,
      size: 9.5,
      font: fontRegular,
      color: rgb(203 / 255, 213 / 255, 225 / 255),
    });
  });

  page.drawText(
    "Privacy notice: The QR code contains an opaque cryptographic token with zero personal data.",
    {
      x: 60,
      y: 155,
      size: 8.5,
      font: fontRegular,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    }
  );
  page.drawText(
    "Each QR code admits one person once. Duplicate scans are automatically rejected at the turnstile.",
    {
      x: 60,
      y: 140,
      size: 8.5,
      font: fontRegular,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    }
  );

  const bytes = await pdfDoc.save();
  return {
    buffer: Buffer.from(bytes),
    filename: `${ticket.ticketNumber}.pdf`,
  };
}

function sanitizePdfText(text: string): string {
  // Replace non-WinAnsi bullet/em-dash characters cleanly for standard Helvetica PDF font
  return text
    .replace(/•/g, "-")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
}

function wrapTextLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length <= maxChars) {
      current = (current + " " + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function resendOrderTicketsEmail(params: {
  orderId: string;
  actorUserId?: string | null;
  actorRole?: string | null;
}): Promise<{ sent: boolean; ticketCount: number }> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      event: { include: { venue: true } },
      tickets: { where: { status: "VALID" } },
    },
  });

  if (!order || order.tickets.length === 0) {
    throw new Error("No valid issued tickets found for this booking.");
  }

  const appBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const bookingUrl = `${appBase}/booking/${encodeURIComponent(order.bookingReference)}`;

  await enqueueAndSendEmail({
    deduplicationKey: `ticket-resend:${order.id}:${Date.now()}`,
    recipientEmail: order.customerEmail,
    userId: order.userId,
    templateType: "TICKET_RESEND",
    rendered: emailTemplates.ticketDelivery({
      customerName: `${order.customerFirstName} ${order.customerLastName}`,
      bookingReference: order.bookingReference,
      eventTitle: order.event.title,
      eventDateFormatted: formatEventDateTimeFull(
        order.event.kickoffAt,
        order.event.timezone
      ),
      venueName: order.event.venue.name,
      ticketNumbers: order.tickets.map((t) => t.ticketNumber),
      bookingUrl,
      isResend: true,
      isSimulated: order.isSimulated || order.event.isSampleData,
    }),
  });

  await prisma.ticket.updateMany({
    where: { id: { in: order.tickets.map((t) => t.id) } },
    data: { lastEmailedAt: new Date() },
  });

  await recordAuditLog({
    actorUserId: params.actorUserId ?? null,
    actorRole: params.actorRole ?? null,
    action: "TICKETS_RESENT",
    entityType: "Order",
    entityId: order.id,
    metadata: {
      bookingReference: order.bookingReference,
      ticketCount: order.tickets.length,
    },
  });

  return { sent: true, ticketCount: order.tickets.length };
}

export interface ScanValidationResult {
  valid: boolean;
  outcome: ScanOutcome;
  message: string;
  scannedAt: string;
  ticket?: {
    id: string;
    ticketNumber: string;
    bookingReference: string;
    holderName: string;
    categoryName: string;
    seatInfo: string | null;
    previousRedeemedAt?: string | null;
    previousRedeemedGate?: string | null;
  };
}

/**
 * Atomically validates and redeems a ticket QR token or manual ticket reference.
 * Prevents simultaneous scans at multiple gates from accepting the same ticket twice.
 */
export async function validateAndRedeemTicket(params: {
  eventId: string;
  scannedInput: string;
  scannedByUserId: string;
  gateName: string;
  ipAddress?: string | null;
}): Promise<ScanValidationResult> {
  const trimmed = params.scannedInput.trim();
  const isQrFormat = trimmed.startsWith("T254.v1.");

  // Cryptographic tamper check for QR tokens before hitting ticket status logic
  if (isQrFormat && !verifySignedQrTokenStructure(trimmed)) {
    const scanRecord = await prisma.ticketScan.create({
      data: {
        eventId: params.eventId,
        scannedByUserId: params.scannedByUserId,
        scannedInputRef: trimmed.slice(0, 64),
        gateName: params.gateName,
        outcome: "INVALID_TICKET",
        message: "Invalid ticket: cryptographic QR signature failed verification.",
        ipAddress: params.ipAddress ?? null,
      },
    });
    return {
      valid: false,
      outcome: "INVALID_TICKET",
      message: "Invalid ticket: unrecognized or tampered QR signature.",
      scannedAt: scanRecord.scannedAt.toISOString(),
    };
  }

  const ticket = isQrFormat
    ? await prisma.ticket.findUnique({
        where: { qrTokenHash: sha256Hex(trimmed) },
        include: { order: true, ticketType: true, event: true },
      })
    : await prisma.ticket.findUnique({
        where: { ticketNumber: trimmed.toUpperCase() },
        include: { order: true, ticketType: true, event: true },
      });

  if (!ticket) {
    const scanRecord = await prisma.ticketScan.create({
      data: {
        eventId: params.eventId,
        scannedByUserId: params.scannedByUserId,
        scannedInputRef: trimmed.slice(0, 64),
        gateName: params.gateName,
        outcome: "INVALID_TICKET",
        message: "Invalid ticket: ticket does not exist.",
        ipAddress: params.ipAddress ?? null,
      },
    });
    return {
      valid: false,
      outcome: "INVALID_TICKET",
      message: "Invalid ticket: no matching ticket record found.",
      scannedAt: scanRecord.scannedAt.toISOString(),
    };
  }

  const summary = {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    bookingReference: ticket.order.bookingReference,
    holderName: ticket.holderName,
    categoryName: ticket.ticketType.name,
    seatInfo: ticket.seatSection
      ? `${ticket.seatSection}${ticket.seatRow ? ` / Row ${ticket.seatRow}` : ""}${ticket.seatNumber ? ` / Seat ${ticket.seatNumber}` : ""}`
      : ticket.ticketType.sectionInfo,
    previousRedeemedAt: ticket.redeemedAt?.toISOString() ?? null,
    previousRedeemedGate: ticket.redeemedGate ?? null,
  };

  // 1. Check expected event
  if (ticket.eventId !== params.eventId) {
    const scanRecord = await prisma.ticketScan.create({
      data: {
        ticketId: ticket.id,
        eventId: params.eventId,
        scannedByUserId: params.scannedByUserId,
        scannedInputRef: ticket.ticketNumber,
        gateName: params.gateName,
        outcome: "WRONG_EVENT",
        message: `Ticket belongs to another event (${ticket.event.title}).`,
        ipAddress: params.ipAddress ?? null,
      },
    });
    return {
      valid: false,
      outcome: "WRONG_EVENT",
      message: `Ticket is for another event: ${ticket.event.title}.`,
      scannedAt: scanRecord.scannedAt.toISOString(),
      ticket: summary,
    };
  }

  // 2. Check payment status on order
  const paidOrderStates = new Set([
    "PAID",
    "TICKETS_ISSUED",
    "PARTIALLY_REFUNDED",
  ]);
  if (!paidOrderStates.has(ticket.order.status)) {
    const outcome: ScanOutcome =
      ticket.order.status === "CANCELLED" || ticket.order.status === "REFUNDED"
        ? "CANCELLED_TICKET"
        : "UNPAID_TICKET";
    const msg =
      outcome === "CANCELLED_TICKET"
        ? `Cancelled ticket: order status is ${ticket.order.status}.`
        : `Unpaid ticket: order status is ${ticket.order.status}.`;

    const scanRecord = await prisma.ticketScan.create({
      data: {
        ticketId: ticket.id,
        eventId: params.eventId,
        scannedByUserId: params.scannedByUserId,
        scannedInputRef: ticket.ticketNumber,
        gateName: params.gateName,
        outcome,
        message: msg,
        ipAddress: params.ipAddress ?? null,
      },
    });
    return {
      valid: false,
      outcome,
      message: msg,
      scannedAt: scanRecord.scannedAt.toISOString(),
      ticket: summary,
    };
  }

  // 3. Check cancelled / invalidated ticket status
  if (ticket.status === "CANCELLED" || ticket.status === "INVALIDATED") {
    const scanRecord = await prisma.ticketScan.create({
      data: {
        ticketId: ticket.id,
        eventId: params.eventId,
        scannedByUserId: params.scannedByUserId,
        scannedInputRef: ticket.ticketNumber,
        gateName: params.gateName,
        outcome: "CANCELLED_TICKET",
        message: `Cancelled ticket (${ticket.invalidatedReason || ticket.status}).`,
        ipAddress: params.ipAddress ?? null,
      },
    });
    return {
      valid: false,
      outcome: "CANCELLED_TICKET",
      message: `Cancelled ticket: this ticket was invalidated (${ticket.invalidatedReason || ticket.status}).`,
      scannedAt: scanRecord.scannedAt.toISOString(),
      ticket: summary,
    };
  }

  // 4. Atomic single-statement redemption in PostgreSQL (prevents race condition!)
  const now = new Date();
  const atomicResult = await prisma.$transaction(async (tx) => {
    const updatedCount = await tx.$executeRaw`
      UPDATE "Ticket"
      SET "status" = 'USED'::"TicketStatus",
          "redeemedAt" = ${now},
          "redeemedGate" = ${params.gateName},
          "updatedAt" = ${now}
      WHERE "id" = ${ticket.id}
        AND "status" = 'VALID'::"TicketStatus"
    `;

    if (updatedCount === 1) {
      const scan = await tx.ticketScan.create({
        data: {
          ticketId: ticket.id,
          eventId: params.eventId,
          scannedByUserId: params.scannedByUserId,
          scannedInputRef: ticket.ticketNumber,
          gateName: params.gateName,
          outcome: "ACCEPTED",
          message: "Ticket valid — entry approved.",
          ipAddress: params.ipAddress ?? null,
          scannedAt: now,
        },
      });
      return { accepted: true as const, scan };
    }

    const latest = await tx.ticket.findUnique({ where: { id: ticket.id } });
    const scan = await tx.ticketScan.create({
      data: {
        ticketId: ticket.id,
        eventId: params.eventId,
        scannedByUserId: params.scannedByUserId,
        scannedInputRef: ticket.ticketNumber,
        gateName: params.gateName,
        outcome: "ALREADY_USED",
        message: `Already-used ticket (redeemed at ${latest?.redeemedAt?.toISOString() || "earlier"} via ${latest?.redeemedGate || "gate"}).`,
        ipAddress: params.ipAddress ?? null,
        scannedAt: now,
      },
    });
    return { accepted: false as const, scan, latest };
  });

  if (atomicResult.accepted) {
    await trackAnalyticsEvent({
      eventType: "TICKET_REDEEMED",
      eventId: params.eventId,
      orderId: ticket.orderId,
      metadata: { ticketId: ticket.id, gateName: params.gateName },
    });

    return {
      valid: true,
      outcome: "ACCEPTED",
      message: "Entry Approved — Valid Ticket Redeemed",
      scannedAt: atomicResult.scan.scannedAt.toISOString(),
      ticket: summary,
    };
  }

  return {
    valid: false,
    outcome: "ALREADY_USED",
    message: `Already-used ticket! Previously scanned at ${atomicResult.latest?.redeemedGate || "gate"} (${atomicResult.latest?.redeemedAt?.toISOString().replace("T", " ").slice(0, 19) || "earlier"} UTC).`,
    scannedAt: atomicResult.scan.scannedAt.toISOString(),
    ticket: {
      ...summary,
      previousRedeemedAt: atomicResult.latest?.redeemedAt?.toISOString() ?? null,
      previousRedeemedGate: atomicResult.latest?.redeemedGate ?? null,
    },
  };
}
