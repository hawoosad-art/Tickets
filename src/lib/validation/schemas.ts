import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(60),
  lastName: z.string().trim().min(2, "Last name is required").max(60),
  email: z.string().trim().email("Valid email address required").toLowerCase(),
  phone: z.string().trim().min(7, "Valid phone number required").max(24).optional().or(z.literal("")),
  countryCode: z.string().trim().length(2, "2-letter country code required").default("KE"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Must include at least one uppercase letter")
    .regex(/[0-9]/, "Must include at least one number"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Valid email required").toLowerCase(),
  password: z.string().min(1, "Password is required").max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Valid email required").toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Must include at least one uppercase letter")
    .regex(/[0-9]/, "Must include at least one number"),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  phone: z.string().trim().max(24).optional().or(z.literal("")),
  countryCode: z.string().trim().length(2),
  preferredCurrency: z.enum(["KES", "USD", "EUR", "GBP"]),
});

export const checkoutItemSchema = z.object({
  ticketTypeId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

export const createCheckoutOrderSchema = z.object({
  eventId: z.string().min(1),
  items: z.array(checkoutItemSchema).min(1, "Select at least one ticket"),
  customer: z.object({
    firstName: z.string().trim().min(2, "First name required").max(60),
    lastName: z.string().trim().min(2, "Last name required").max(60),
    email: z.string().trim().email("Valid email required").toLowerCase(),
    phone: z.string().trim().max(24).optional().or(z.literal("")),
    countryCode: z.string().trim().length(2, "Country code required"),
    billingAddressLine1: z.string().trim().max(120).optional().or(z.literal("")),
    billingCity: z.string().trim().max(60).optional().or(z.literal("")),
    billingPostalCode: z.string().trim().max(20).optional().or(z.literal("")),
  }),
  provider: z.enum(["PAYPAL", "PAYSTACK", "SIMULATED"]),
  paymentMethod: z.string().max(40).optional(),
  idempotencyKey: z.string().min(10).max(128),
});

export const scannerValidateSchema = z.object({
  eventId: z.string().min(1, "Select an active event"),
  scannedInput: z.string().trim().min(4, "Provide a QR token or ticket reference").max(512),
  gateName: z.string().trim().min(1).max(60).default("Gate A"),
});

export const refundRequestSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().trim().min(10, "Please explain the reason for your refund request").max(1000),
  amountMinor: z.number().int().positive().optional(),
});

export const adminRefundReviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  adminNotes: z.string().trim().max(1000).optional(),
  amountMinor: z.number().int().positive().optional(),
  invalidateTickets: z.boolean().default(true),
});

export const supportRequestSchema = z.object({
  name: z.string().trim().min(2, "Your name is required").max(80),
  email: z.string().trim().email("Valid email is required").toLowerCase(),
  bookingReference: z.string().trim().max(40).optional().or(z.literal("")),
  category: z.enum(["BOOKING", "PAYMENT", "REFUND", "TICKET_DELIVERY", "EVENT_ENTRY", "GENERAL"]).default("GENERAL"),
  subject: z.string().trim().min(4, "Subject is required").max(120),
  message: z.string().trim().min(10, "Please describe your issue in detail").max(2000),
});

export const adminVenueSchema = z.object({
  name: z.string().trim().min(3).max(120),
  slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9-]+$/),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  countryCode: z.string().trim().length(2),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  timezone: z.string().trim().min(3).max(64).default("Africa/Nairobi"),
  capacity: z.number().int().min(100).max(200000),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  entryGuidelines: z.string().trim().max(1000).optional().or(z.literal("")),
  gatesInfo: z.string().trim().max(500).optional().or(z.literal("")),
});

export const adminEventSchema = z.object({
  title: z.string().trim().min(4).max(160),
  slug: z.string().trim().min(4).max(160).regex(/^[a-z0-9-]+$/),
  competition: z.string().trim().min(2).max(100),
  homeTeam: z.string().trim().min(2).max(80),
  awayTeam: z.string().trim().min(2).max(80),
  homeTeamShort: z.string().trim().min(2).max(5).toUpperCase(),
  awayTeamShort: z.string().trim().min(2).max(5).toUpperCase(),
  homeBadgeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#35D399"),
  awayBadgeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#60A5FA"),
  description: z.string().trim().min(10).max(4000),
  venueId: z.string().min(1),
  kickoffAt: z.string().datetime(),
  gatesOpenAt: z.string().datetime().optional().or(z.literal("")),
  timezone: z.string().trim().min(3).max(64).default("Africa/Nairobi"),
  status: z.enum(["DRAFT", "PUBLISHED", "UNPUBLISHED", "POSTPONED", "CANCELLED", "COMPLETED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  isSampleData: z.boolean().default(false),
  sampleDataNotice: z.string().trim().max(500).optional().or(z.literal("")),
  organiserName: z.string().trim().min(2).max(120),
  organiserAuthorised: z.boolean().default(true),
  entryInstructions: z.string().trim().min(10).max(2000),
  purchaseRestrictions: z.string().trim().max(1000).optional().or(z.literal("")),
  officialStatusNotice: z.string().trim().max(1000).optional().or(z.literal("")),
  currency: z.enum(["KES", "USD", "EUR", "GBP"]).default("KES"),
  refundable: z.boolean().default(true),
  refundCutoffHours: z.number().int().min(0).max(720).default(48),
  refundPolicyText: z.string().trim().min(10).max(2000),
  postponementPolicyText: z.string().trim().min(10).max(2000),
  maxTicketsPerCustomer: z.number().int().min(1).max(50).default(8),
  bookingFeeBps: z.number().int().min(0).max(2500).default(0),
  bookingFeeFlatMinor: z.number().int().min(0).max(1000000).default(0),
  taxBps: z.number().int().min(0).max(3000).default(0),
  taxLabel: z.string().trim().min(1).max(30).default("VAT"),
});

export const adminTicketTypeSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(2).max(30).toUpperCase(),
  categoryTier: z.enum(["STANDARD", "PREMIUM", "VIP", "HOSPITALITY"]),
  description: z.string().trim().min(5).max(500),
  sectionInfo: z.string().trim().max(120).optional().or(z.literal("")),
  seated: z.boolean().default(false),
  priceMinor: z.number().int().min(0),
  currency: z.enum(["KES", "USD", "EUR", "GBP"]),
  minPerOrder: z.number().int().min(1).max(10).default(1),
  maxPerOrder: z.number().int().min(1).max(20).default(6),
  authorisedCapacity: z.number().int().min(0).max(200000),
  sourceType: z.enum(["NATIVE", "EXTERNAL_ORGANISER"]).default("NATIVE"),
  externalEventRef: z.string().trim().max(120).optional().or(z.literal("")),
  externalAllocationRef: z.string().trim().max(120).optional().or(z.literal("")),
  externalEndpointUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(100).default(0),
});
