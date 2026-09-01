import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAC Insutech | Engineered Insulation Solutions",
  description:
    "Advanced thermal, acoustic and HVAC insulation solutions for demanding projects.",
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
      <body>{children}</body>
    </html>
  );
}
