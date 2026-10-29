import crypto from "crypto";

function getQrSecret(): string {
  return (
    process.env.TICKET_QR_SIGNING_SECRET ||
    "dev-only-qr-secret-change-in-production-immediately"
  );
}

function getBookingSecret(): string {
  return (
    process.env.BOOKING_ACCESS_SECRET ||
    "dev-only-booking-secret-change-in-production-immediately"
  );
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function generateBookingReference(): string {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `T254-${datePart}-${suffix}`;
}

export function generateTicketNumber(sequenceIndex: number): string {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  const seq = String(sequenceIndex + 1).padStart(3, "0");
  return `TKT-${rand}-${seq}`;
}

/**
 * Generates an opaque, cryptographically signed QR payload containing ZERO PII.
 * Format: T254.v1.<opaqueNonce>.<hmac24>
 */
export function createSignedQrToken(): {
  qrOpaqueToken: string;
  qrTokenHash: string;
} {
  const nonce = crypto.randomBytes(16).toString("base64url");
  const versioned = `T254.v1.${nonce}`;
  const sig = crypto
    .createHmac("sha256", getQrSecret())
    .update(versioned)
    .digest("base64url")
    .slice(0, 24);
  const qrOpaqueToken = `${versioned}.${sig}`;
  const qrTokenHash = sha256Hex(qrOpaqueToken);
  return { qrOpaqueToken, qrTokenHash };
}

export function verifySignedQrTokenStructure(token: string): boolean {
  const parts = token.trim().split(".");
  if (parts.length !== 4 || parts[0] !== "T254" || parts[1] !== "v1") {
    return false;
  }
  const versioned = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const expectedSig = crypto
    .createHmac("sha256", getQrSecret())
    .update(versioned)
    .digest("base64url")
    .slice(0, 24);

  const actualBuf = Buffer.from(parts[3]);
  const expectedBuf = Buffer.from(expectedSig);
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function createBookingAccessToken(bookingReference: string): {
  rawToken: string;
  tokenHash: string;
} {
  const nonce = crypto.randomBytes(16).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getBookingSecret())
    .update(`${bookingReference}:${nonce}`)
    .digest("base64url")
    .slice(0, 20);
  const rawToken = `${nonce}.${sig}`;
  return {
    rawToken,
    tokenHash: sha256Hex(rawToken),
  };
}
