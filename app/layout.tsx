import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://racinsutech.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "RAC Insutech",
  title: "RAC Insutech | HVAC, Thermal & Acoustic Insulation Solutions",
  description:
    "RAC Insutech provides thermal, acoustic, HVAC and industrial insulation solutions, material guidance and project quotation support across India.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/favicon.png", type: "image/png", sizes: "512x512" }],
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "RAC Insutech",
    title: "RAC Insutech | HVAC, Thermal & Acoustic Insulation Solutions",
    description: "Thermal, acoustic, HVAC and industrial insulation solutions with project-focused material guidance.",
    images: [{ url: "/assets/logo/rac-logo.png", width: 1448, height: 1086, alt: "RAC Insutech" }],
  },
  twitter: {
    card: "summary",
    title: "RAC Insutech | HVAC, Thermal & Acoustic Insulation Solutions",
    description: "Thermal, acoustic, HVAC and industrial insulation solutions with project-focused material guidance.",
    images: ["/assets/logo/rac-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RAC Insutech",
  url: siteUrl,
  logo: `${siteUrl}/assets/logo/rac-logo.png`,
  image: `${siteUrl}/assets/logo/rac-logo.png`,
  description: "Thermal, acoustic, HVAC and industrial insulation solutions with project-focused material guidance.",
  email: "racinsutech@gmail.com",
  telephone: "+91-91309-58594",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rukhmini Niwas, Near Vrundavan Garden Apartment, Behind Tulshan Bungalow, Geeta Nagar",
    addressLocality: "Akola",
    addressRegion: "Maharashtra",
    postalCode: "444001",
    addressCountry: "IN",
  },
  contactPoint: [{
    "@type": "ContactPoint",
    telephone: "+91-91309-58594",
    contactType: "sales and technical enquiries",
    areaServed: "IN",
    availableLanguage: ["English", "Hindi", "Marathi"],
  }],
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "RAC Insutech",
  alternateName: "RAC",
  url: siteUrl,
};

// Vinext's Cloudflare output is deliberately given an explicit mobile
// viewport. This prevents browsers from rendering a desktop-sized quotation
// builder and scaling it down to a narrow phone screen.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData).replace(/</g, "\\u003c") }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData).replace(/</g, "\\u003c") }} />
        {children}
      </body>
    </html>
  );
}
