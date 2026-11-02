import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Product Intelligence Hub — Engineering Operations",
  description: "An evidence-backed knowledge and product operations demo with GitHub ingestion and role-aware retrieval.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
