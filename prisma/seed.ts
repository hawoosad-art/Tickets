import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function sha256(val: string): string {
  return crypto.createHash("sha256").update(val).digest("hex");
}

function makeSignedQr(): { qrOpaqueToken: string; qrTokenHash: string } {
  const secret =
    process.env.TICKET_QR_SIGNING_SECRET ||
    "dev-only-qr-secret-change-in-production-immediately";
  const nonce = crypto.randomBytes(16).toString("base64url");
  const versioned = `T254.v1.${nonce}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(versioned)
    .digest("base64url")
    .slice(0, 24);
  const qrOpaqueToken = `${versioned}.${sig}`;
  return { qrOpaqueToken, qrTokenHash: sha256(qrOpaqueToken) };
}

async function main() {
  console.log("Seeding Ticket254 PostgreSQL database...");

  const defaultPassHash = await bcrypt.hash("Ticket254!Pass", 12);
  const now = new Date();

  // 1. Seed all 6 RBAC role accounts for demonstration & testing
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@ticket254.co.ke" },
    update: {},
    create: {
      email: "admin@ticket254.co.ke",
      passwordHash: defaultPassHash,
      firstName: "Amina",
      lastName: "Ochieng",
      phone: "+254712000001",
      countryCode: "KE",
      preferredCurrency: "KES",
      role: "SUPER_ADMIN",
      emailVerifiedAt: now,
    },
  });

  await prisma.user.upsert({
    where: { email: "finance@ticket254.co.ke" },
    update: {},
    create: {
      email: "finance@ticket254.co.ke",
      passwordHash: defaultPassHash,
      firstName: "David",
      lastName: "Mwangi",
      phone: "+254712000002",
      countryCode: "KE",
      preferredCurrency: "KES",
      role: "FINANCE_MANAGER",
      emailVerifiedAt: now,
    },
  });

  await prisma.user.upsert({
    where: { email: "events@ticket254.co.ke" },
    update: {},
    create: {
      email: "events@ticket254.co.ke",
      passwordHash: defaultPassHash,
      firstName: "Grace",
      lastName: "Wanjiku",
      phone: "+254712000003",
      countryCode: "KE",
      preferredCurrency: "KES",
      role: "EVENT_MANAGER",
      emailVerifiedAt: now,
    },
  });

  const scannerUser = await prisma.user.upsert({
    where: { email: "scanner@ticket254.co.ke" },
    update: {},
    create: {
      email: "scanner@ticket254.co.ke",
      passwordHash: defaultPassHash,
      firstName: "Kevin",
      lastName: "Otieno",
      phone: "+254712000004",
      countryCode: "KE",
      preferredCurrency: "KES",
      role: "TICKET_SCANNER",
      emailVerifiedAt: now,
    },
  });

  await prisma.user.upsert({
    where: { email: "support@ticket254.co.ke" },
    update: {},
    create: {
      email: "support@ticket254.co.ke",
      passwordHash: defaultPassHash,
      firstName: "Faith",
      lastName: "Mutua",
      phone: "+254712000005",
      countryCode: "KE",
      preferredCurrency: "KES",
      role: "SUPPORT_AGENT",
      emailVerifiedAt: now,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: "fan@ticket254.co.ke" },
    update: {},
    create: {
      email: "fan@ticket254.co.ke",
      passwordHash: defaultPassHash,
      firstName: "Brian",
      lastName: "Kamau",
      phone: "+254722111222",
      countryCode: "KE",
      preferredCurrency: "KES",
      role: "CUSTOMER",
      emailVerifiedAt: now,
    },
  });

  // 2. Seed Venues
  const kasarani = await prisma.venue.upsert({
    where: { slug: "kasarani-stadium-nairobi" },
    update: {},
    create: {
      name: "Moi International Sports Centre, Kasarani",
      slug: "kasarani-stadium-nairobi",
      city: "Nairobi",
      country: "Kenya",
      countryCode: "KE",
      address: "Thika Superhighway, Kasarani, Nairobi",
      timezone: "Africa/Nairobi",
      capacity: 60000,
      description:
        "Premier multi-purpose international football stadium in Nairobi with dedicated turnstile QR gates and covered VIP seating.",
      entryGuidelines:
        "Gates open 3 hours before kick-off. Present digital QR ticket on high screen brightness or A4 printout. No glass bottles, flares, or large backpacks permitted.",
      gatesInfo: "Gates 1–4: Standard | Gates 5–6: Premium | Gate 7: VIP & Hospitality",
    },
  });

  const nyayo = await prisma.venue.upsert({
    where: { slug: "nyayo-national-stadium-nairobi" },
    update: {},
    create: {
      name: "Nyayo National Stadium",
      slug: "nyayo-national-stadium-nairobi",
      city: "Nairobi",
      country: "Kenya",
      countryCode: "KE",
      address: "Uhuru Highway / Mombasa Road, Nairobi",
      timezone: "Africa/Nairobi",
      capacity: 30000,
      description:
        "Central Nairobi football arena offering close-to-pitch sightlines and rapid CBD access.",
      entryGuidelines:
        "Arrive at least 90 minutes before kick-off with valid photo ID matching booking holder where requested.",
      gatesInfo: "Uhuru Gate: Standard | Aerodrome Gate: Premium, VIP & Hospitality",
    },
  });

  const londonArena = await prisma.venue.upsert({
    where: { slug: "thames-international-arena-london" },
    update: {},
    create: {
      name: "Thames International Football Arena",
      slug: "thames-international-arena-london",
      city: "London",
      country: "United Kingdom",
      countryCode: "GB",
      address: "Olympic Way, London",
      timezone: "Europe/London",
      capacity: 55000,
      description:
        "Modern international exhibition venue equipped with contactless optical QR turnstiles.",
      entryGuidelines:
        "Turnstiles open 2.5 hours prior to kick-off. Small A4-sized clear bags only.",
      gatesInfo: "North Concourse: Standard & Premium | Club Level Entrance: VIP & Hospitality",
    },
  });

  // 3. Seed Sample Events (explicitly badged as Development Sample Data!)
  const inDays = (d: number, hourUtc: number) => {
    const dt = new Date(now.getTime() + d * 24 * 3600 * 1000);
    dt.setUTCHours(hourUtc, 0, 0, 0);
    return dt;
  };

  const event1 = await prisma.event.upsert({
    where: { slug: "nairobi-city-xi-vs-mombasa-harbour-xi-sample" },
    update: {},
    create: {
      slug: "nairobi-city-xi-vs-mombasa-harbour-xi-sample",
      title: "Nairobi City XI vs Mombasa Harbour XI",
      competition: "East Africa Super Cup (Sample Demo)",
      homeTeam: "Nairobi City XI",
      awayTeam: "Mombasa Harbour XI",
      homeTeamShort: "NBI",
      awayTeamShort: "MBA",
      homeBadgeColor: "#35D399",
      awayBadgeColor: "#60A5FA",
      description:
        "Development demonstration fixture showcasing high-demand stadium ticketing across Standard, Premium, VIP, and Hospitality tiers in Nairobi.",
      venueId: kasarani.id,
      kickoffAt: inDays(18, 13), // 16:00 EAT
      gatesOpenAt: inDays(18, 10),
      timezone: "Africa/Nairobi",
      status: "PUBLISHED",
      isFeatured: true,
      isSampleData: true,
      sampleDataNotice:
        "DEVELOPMENT SAMPLE EVENT — Configured with demonstration inventory and test pricing for organiser review.",
      organiserName: "Ticket254 Demo Organiser Sandbox",
      organiserAuthorised: true,
      entryInstructions:
        "Arrive at least 90 minutes before kick-off. Proceed to the gate printed on your ticket and scan your Ticket254 QR code at the turnstile.",
      purchaseRestrictions:
        "Maximum 8 tickets per customer across all categories. Under-16 attendees must be accompanied by an adult.",
      currency: "KES",
      policy: {
        create: {
          refundable: true,
          refundCutoffHours: 48,
          refundPolicyText:
            "Full refunds are eligible up to 48 hours before kick-off provided tickets have not been scanned at the venue.",
          postponementPolicyText:
            "If postponed, issued tickets remain automatically valid for the rescheduled fixture or may be refunded within 14 days of announcement.",
          maxTicketsPerCustomer: 8,
          bookingFeeBps: 0,
          bookingFeeFlatMinor: 0,
          taxBps: 0,
          taxLabel: "VAT (Inclusive)",
          requirePhoneNumber: true,
          requireBillingAddress: false,
        },
      },
    },
  });

  const event2 = await prisma.event.upsert({
    where: { slug: "london-athletic-xi-vs-munich-sporting-xi-sample" },
    update: {},
    create: {
      slug: "london-athletic-xi-vs-munich-sporting-xi-sample",
      title: "London Athletic XI vs Munich Sporting XI",
      competition: "International Club Showcase (Sample Demo)",
      homeTeam: "London Athletic XI",
      awayTeam: "Munich Sporting XI",
      homeTeamShort: "LDN",
      awayTeamShort: "MUN",
      homeBadgeColor: "#60A5FA",
      awayBadgeColor: "#F43F5E",
      description:
        "International USD-denominated demonstration match configured to showcase cross-border PayPal & International Card checkout alongside instant QR PDF ticket issuance.",
      venueId: londonArena.id,
      kickoffAt: inDays(28, 19),
      gatesOpenAt: inDays(28, 16),
      timezone: "Europe/London",
      status: "PUBLISHED",
      isFeatured: false,
      isSampleData: true,
      sampleDataNotice:
        "DEVELOPMENT SAMPLE EVENT — International USD demonstration fixture.",
      organiserName: "Ticket254 International Sandbox",
      organiserAuthorised: true,
      entryInstructions:
        "Use contactless QR reader at North Concourse or Club Level entrance. Screenshot copies are discouraged; download your official PDF ticket.",
      purchaseRestrictions: "Maximum 6 tickets per customer.",
      currency: "USD",
      policy: {
        create: {
          refundable: true,
          refundCutoffHours: 72,
          refundPolicyText:
            "Eligible for full refund up to 72 hours prior to kick-off for unredeemed tickets.",
          postponementPolicyText:
            "Tickets remain valid for the new match date or qualify for a full face-value refund.",
          maxTicketsPerCustomer: 6,
          bookingFeeBps: 0,
          bookingFeeFlatMinor: 0,
          taxBps: 0,
          taxLabel: "Tax Inclusive",
          requirePhoneNumber: false,
          requireBillingAddress: false,
        },
      },
    },
  });

  const event3 = await prisma.event.upsert({
    where: { slug: "kampala-select-xi-vs-dar-city-xi-sample" },
    update: {},
    create: {
      slug: "kampala-select-xi-vs-dar-city-xi-sample",
      title: "Kampala Select XI vs Dar City XI",
      competition: "Regional Invitational Cup (Sample Demo)",
      homeTeam: "Kampala Select XI",
      awayTeam: "Dar City XI",
      homeTeamShort: "KLA",
      awayTeamShort: "DAR",
      homeBadgeColor: "#F59E0B",
      awayBadgeColor: "#35D399",
      description:
        "Regional East African invitational fixture hosted under floodlights at Nyayo National Stadium in Nairobi.",
      venueId: nyayo.id,
      kickoffAt: inDays(36, 16),
      gatesOpenAt: inDays(36, 13),
      timezone: "Africa/Nairobi",
      status: "PUBLISHED",
      isFeatured: false,
      isSampleData: true,
      sampleDataNotice:
        "DEVELOPMENT SAMPLE EVENT — Sample regional fixture for platform demonstration.",
      organiserName: "Ticket254 Demo Organiser Sandbox",
      organiserAuthorised: true,
      entryInstructions:
        "Enter via designated Uhuru or Aerodrome gates and present your Ticket254 QR code.",
      purchaseRestrictions: "Maximum 8 tickets per customer.",
      currency: "KES",
      policy: {
        create: {
          refundable: true,
          refundCutoffHours: 48,
          refundPolicyText:
            "Refundable up to 48 hours before kick-off when tickets remain unused.",
          postponementPolicyText:
            "Tickets carry over automatically to the rescheduled kick-off date.",
          maxTicketsPerCustomer: 8,
          bookingFeeBps: 0,
          bookingFeeFlatMinor: 0,
          taxBps: 0,
          taxLabel: "VAT (Inclusive)",
          requirePhoneNumber: true,
          requireBillingAddress: false,
        },
      },
    },
  });

  // Helper to upsert TicketTypes + InventoryAllocations
  async function seedCategories(
    eventId: string,
    currency: string,
    tiers: Array<{
      code: string;
      name: string;
      categoryTier: string;
      description: string;
      sectionInfo: string;
      seated: boolean;
      priceMinor: number;
      capacity: number;
      maxPerOrder: number;
      sortOrder: number;
    }>
  ) {
    const created = [];
    for (const t of tiers) {
      const tt = await prisma.ticketType.upsert({
        where: { eventId_code: { eventId, code: t.code } },
        update: {},
        create: {
          eventId,
          code: t.code,
          name: t.name,
          categoryTier: t.categoryTier,
          description: t.description,
          sectionInfo: t.sectionInfo,
          seated: t.seated,
          priceMinor: t.priceMinor,
          currency,
          minPerOrder: 1,
          maxPerOrder: t.maxPerOrder,
          sortOrder: t.sortOrder,
          allocation: {
            create: {
              sourceType: "NATIVE",
              authorisedCapacity: t.capacity,
              reservedCount: 0,
              soldCount: 0,
              blockedCount: 0,
            },
          },
        },
      });
      created.push(tt);
    }
    return created;
  }

  const event1Tiers = await seedCategories(event1.id, "KES", [
    {
      code: "STD",
      name: "Standard Terrace",
      categoryTier: "STANDARD",
      description: "General Bowl seating via Gates 1–4 with vibrant matchday atmosphere.",
      sectionInfo: "East & North Terraces",
      seated: false,
      priceMinor: 50000, // KES 500.00
      capacity: 1200,
      maxPerOrder: 6,
      sortOrder: 1,
    },
    {
      code: "PRM",
      name: "Premium Lower Tier",
      categoryTier: "PREMIUM",
      description: "Reserved numbered seating along the touchline with fast-track gate entry.",
      sectionInfo: "West Lower Block B",
      seated: true,
      priceMinor: 150000, // KES 1,500.00
      capacity: 400,
      maxPerOrder: 6,
      sortOrder: 2,
    },
    {
      code: "VIP",
      name: "VIP Covered Main Stand",
      categoryTier: "VIP",
      description: "Padded central midfield seats under cover via Dedicated Gate 7.",
      sectionInfo: "VIP Main Stand",
      seated: true,
      priceMinor: 350000, // KES 3,500.00
      capacity: 150,
      maxPerOrder: 4,
      sortOrder: 3,
    },
    {
      code: "HOSP",
      name: "Executive Hospitality Suite",
      categoryTier: "HOSPITALITY",
      description: "Private lounge access, pre-match refreshments, and executive balcony seating.",
      sectionInfo: "Presidential Hospitality Deck",
      seated: true,
      priceMinor: 850000, // KES 8,500.00
      capacity: 40,
      maxPerOrder: 4,
      sortOrder: 4,
    },
  ]);

  await seedCategories(event2.id, "USD", [
    {
      code: "STD",
      name: "Standard Concourse",
      categoryTier: "STANDARD",
      description: "Reserved upper-tier matchday seat with panoramic pitch view.",
      sectionInfo: "North Stand Upper",
      seated: true,
      priceMinor: 3500, // USD 35.00
      capacity: 800,
      maxPerOrder: 6,
      sortOrder: 1,
    },
    {
      code: "PRM",
      name: "Premium Sideline",
      categoryTier: "PREMIUM",
      description: "Lower-tier halfway-line seating close to the dugouts.",
      sectionInfo: "West Sideline Block 104",
      seated: true,
      priceMinor: 7500, // USD 75.00
      capacity: 300,
      maxPerOrder: 4,
      sortOrder: 2,
    },
    {
      code: "VIP",
      name: "Club VIP Lounge",
      categoryTier: "VIP",
      description: "Club-level padded seat with lounge access before kick-off and at half-time.",
      sectionInfo: "Club Level Central",
      seated: true,
      priceMinor: 14500, // USD 145.00
      capacity: 100,
      maxPerOrder: 4,
      sortOrder: 3,
    },
    {
      code: "HOSP",
      name: "International Hospitality Box",
      categoryTier: "HOSPITALITY",
      description: "Full matchday dining package, complimentary programme, and private box seating.",
      sectionInfo: "Sky Suite Level 3",
      seated: true,
      priceMinor: 29000, // USD 290.00
      capacity: 30,
      maxPerOrder: 4,
      sortOrder: 4,
    },
  ]);

  await seedCategories(event3.id, "KES", [
    {
      code: "STD",
      name: "Standard Open Stand",
      categoryTier: "STANDARD",
      description: "Open stand admission via Uhuru Gate.",
      sectionInfo: "Main Bowl",
      seated: false,
      priceMinor: 40000, // KES 400.00
      capacity: 900,
      maxPerOrder: 6,
      sortOrder: 1,
    },
    {
      code: "VIP",
      name: "VIP Covered Stand",
      categoryTier: "VIP",
      description: "Reserved covered seating via Aerodrome Gate.",
      sectionInfo: "Covered Main Stand",
      seated: true,
      priceMinor: 200000, // KES 2,000.00
      capacity: 120,
      maxPerOrder: 4,
      sortOrder: 2,
    },
  ]);

  // 4. Seed one simulated sample completed booking for fan@ticket254.co.ke so Demo Customer & Admin views show live linked data
  const sampleBookingRef = "T254-DEMO-0001";
  const existingDemoOrder = await prisma.order.findUnique({
    where: { bookingReference: sampleBookingRef },
  });

  if (!existingDemoOrder && event1Tiers[1]) {
    const prmTier = event1Tiers[1];
    const totalMinor = prmTier.priceMinor * 2; // 2 tickets = KES 3,000.00
    const qr1 = makeSignedQr();
    const qr2 = makeSignedQr();

    const demoOrder = await prisma.order.create({
      data: {
        bookingReference: sampleBookingRef,
        accessTokenHash: sha256("demo-booking-access-token"),
        userId: customerUser.id,
        eventId: event1.id,
        status: "TICKETS_ISSUED",
        customerFirstName: customerUser.firstName,
        customerLastName: customerUser.lastName,
        customerEmail: customerUser.email,
        customerPhone: customerUser.phone,
        customerCountry: "KE",
        currency: "KES",
        subtotalMinor: totalMinor,
        bookingFeeMinor: 0,
        taxMinor: 0,
        totalMinor,
        idempotencyKey: "seed-demo-order-0001",
        isSimulated: true,
        reservationExpiresAt: new Date(now.getTime() + 15 * 60 * 1000),
        paidAt: now,
        ticketsIssuedAt: now,
        items: {
          create: [
            {
              ticketTypeId: prmTier.id,
              ticketTypeName: prmTier.name,
              quantity: 2,
              unitPriceMinor: prmTier.priceMinor,
              lineTotalMinor: totalMinor,
              currency: "KES",
            },
          ],
        },
      },
      include: { items: true },
    });

    await prisma.inventoryAllocation.update({
      where: { ticketTypeId: prmTier.id },
      data: { soldCount: 2 },
    });

    await prisma.payment.create({
      data: {
        orderId: demoOrder.id,
        provider: "SIMULATED",
        method: "simulated",
        status: "SUCCEEDED",
        amountMinor: totalMinor,
        currency: "KES",
        settledCurrency: "KES",
        settledAmountMinor: totalMinor,
        providerOrderId: "SIM-ORD-DEMO-0001",
        providerCaptureId: "SIM-CAP-DEMO-0001",
        providerReference: "SIM-ORD-DEMO-0001",
        idempotencyKey: "seed-demo-pay-0001",
        isSimulated: true,
        verifiedAt: now,
      },
    });

    const t1 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-DEMO01-001",
        orderId: demoOrder.id,
        orderItemId: demoOrder.items[0].id,
        eventId: event1.id,
        ticketTypeId: prmTier.id,
        userId: customerUser.id,
        holderName: "Brian Kamau",
        holderEmail: customerUser.email,
        seatSection: "West Lower Block B",
        seatRow: "A",
        seatNumber: "1",
        qrTokenHash: qr1.qrTokenHash,
        qrOpaqueToken: qr1.qrOpaqueToken,
        status: "VALID",
        isSimulated: true,
      },
    });

    const t2 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-DEMO01-002",
        orderId: demoOrder.id,
        orderItemId: demoOrder.items[0].id,
        eventId: event1.id,
        ticketTypeId: prmTier.id,
        userId: customerUser.id,
        holderName: "Brian Kamau",
        holderEmail: customerUser.email,
        seatSection: "West Lower Block B",
        seatRow: "A",
        seatNumber: "2",
        qrTokenHash: qr2.qrTokenHash,
        qrOpaqueToken: qr2.qrOpaqueToken,
        status: "USED",
        isSimulated: true,
        redeemedAt: now,
        redeemedGate: "Gate 5 (Premium)",
      },
    });

    await prisma.ticketScan.create({
      data: {
        ticketId: t2.id,
        eventId: event1.id,
        scannedByUserId: scannerUser.id,
        scannedInputRef: t2.ticketNumber,
        gateName: "Gate 5 (Premium)",
        outcome: "ACCEPTED",
        message: "Sample seed scan — Entry Approved.",
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: adminUser.id,
        actorRole: "SUPER_ADMIN",
        action: "SEED_SAMPLE_DATA_INITIALIZED",
        entityType: "Order",
        entityId: demoOrder.id,
        metadata: {
          note: "Seeded sample order and tickets for platform demonstration",
          sampleTicketValid: t1.ticketNumber,
        },
      },
    });
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
