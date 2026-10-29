import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ticket254.co.ke";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/matches", "/help", "/contact", "/about", "/terms", "/privacy", "/refund-policy"],
        disallow: [
          "/admin",
          "/account",
          "/checkout",
          "/tickets",
          "/booking",
          "/scanner",
          "/api",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
