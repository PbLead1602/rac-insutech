import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAC Insutech | Engineered Insulation Solutions",
  description:
    "Advanced thermal, acoustic and HVAC insulation solutions for demanding projects.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
