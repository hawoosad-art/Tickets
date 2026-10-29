import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      DATABASE_URL:
        "postgresql://postgres:postgres@localhost:5432/ticket254_test?schema=public",
      ENABLE_SIMULATED_PAYMENTS: "true",
      PAYSTACK_ENABLED: "true",
      PAYSTACK_SECRET_KEY: "sk_test_ticket254_unit_secret",
      EMAIL_PROVIDER: "outbox",
      SESSION_SECRET: "test-session-secret-64-chars-minimum-value-here-12345",
      TICKET_QR_SIGNING_SECRET:
        "test-qr-signing-secret-64-chars-minimum-value-here-12345",
      BOOKING_ACCESS_SECRET:
        "test-booking-secret-64-chars-minimum-value-here-12345",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
