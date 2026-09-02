import type { MetadataRoute } from "next";

const siteUrl = "https://racinsutech.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/account/", "/api/", "/enquiry", "/generate-quotation", "/quotation/", "/quote/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
