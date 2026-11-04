import type { Metadata } from "next";
import { Cormorant_Garamond, Great_Vibes, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-brand-script", display: "swap" });
export const metadata: Metadata = { title: "Mr. Little Coffee", description: "El pequeño café con gran estilo.", icons: { icon: "/images/brand/mr-little-coffee-mascot.png" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${serif.variable} ${sans.variable} ${greatVibes.variable}`}><Providers>{children}</Providers></body></html>;
}
