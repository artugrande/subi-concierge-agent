import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SUBI Concierge - Space Universal Basic Income",
  description: "Claim your share of space resource revenue. Self-verified, Celo-powered UBI.",
  keywords: "UBI, Celo, Self, MiniPay, space resources, blockchain",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#35D07F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gradient-to-br from-green-50 to-blue-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
