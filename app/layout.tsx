import type { Metadata } from "next";
import { Playfair_Display, Lato } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

const lato = Lato({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "FairRent — Is your rent fair?",
  description:
    "Compare your rent against what similar properties in your Melbourne suburb actually signed for. Hedonic pricing model for Australian renters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${lato.variable}`}>
      <body
        style={{
          fontFamily: "var(--font-sans), system-ui, sans-serif",
          background: "var(--cream)",
          color: "var(--text)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
