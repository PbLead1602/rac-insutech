import type { MetadataRoute } from "next";
import { catalogue } from "@/lib/catalogue";

const siteUrl = "https://racinsutech.com";
const publicPages = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/products", changeFrequency: "weekly", priority: 0.9 },
  { path: "/solutions", changeFrequency: "monthly", priority: 0.8 },
  { path: "/industries", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services", changeFrequency: "monthly", priority: 0.8 },
  { path: "/brochures", changeFrequency: "weekly", priority: 0.7 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...publicPages.map((page) => ({ url: `${siteUrl}${page.path}`, changeFrequency: page.changeFrequency, priority: page.priority })),
    ...catalogue.map((product) => ({ url: `${siteUrl}/products/${product.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
