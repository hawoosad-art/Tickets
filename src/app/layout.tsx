import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { CurrencyProvider } from "@/components/providers/CurrencyProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SupportedCurrency } from "@/lib/money";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://ticket254.co.ke"
  ),
  title: {
    default: "Ticket254 — International & Kenyan Football Ticketing Platform",
    template: "%s | Ticket254",
  },
  description:
    "Discover football events in Kenya and internationally, book verified match tickets securely, and receive instant digital QR tickets.",
  openGraph: {
    title: "Ticket254 — Be There for Every Moment.",
    description:
      "Discover football events, book your tickets securely, and get ready for match day.",
    type: "website",
    siteName: "Ticket254",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const initialCurrency = (user?.preferredCurrency ||
    "KES") as SupportedCurrency;

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-[#0B1020] text-[#F8FAFC]">
        <CurrencyProvider initialCurrency={initialCurrency}>
          <SiteHeader
            user={
              user
                ? {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                  }
                : null
            }
          />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </CurrencyProvider>
      </body>
    </html>
  );
}
