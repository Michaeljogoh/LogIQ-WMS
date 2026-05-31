import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "LogIQ WMS | Intelligent Warehouse OS for Modern 3PLs",
  description:
    "Unified warehouse management with embedded AI. Inventory, fulfillment, merchant billing, and LogIQ intelligence in one platform built for third-party logistics operators.",
  keywords: [
    "warehouse management system",
    "3PL software",
    "fulfillment platform",
    "WMS",
    "LogIQ",
    "AI warehouse",
    "multi-tenant WMS",
    "merchant portal",
    "inventory management",
    "order fulfillment",
  ],
  openGraph: {
    title: "LogIQ WMS | Intelligent Warehouse OS for Modern 3PLs",
    description:
      "Run fulfillment at scale. Catch problems before they ship. LogIQ WMS unifies ops and AI for 3PL operators.",
    type: "website",
    siteName: "LogIQ WMS",
  },
  twitter: {
    card: "summary_large_image",
    title: "LogIQ WMS | Intelligent Warehouse OS for Modern 3PLs",
    description:
      "Unified WMS + AI co-pilot for third-party logistics. Inventory, outbound, billing, and merchant portal in one platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  return <LandingPage />;
}
