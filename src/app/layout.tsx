import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import AIChatWidget from "@/components/AIChatWidget";

export const metadata: Metadata = {
  title: {
    default: "Levitate Labs | Web Development, CAD Design, Marketing & Branding Agency",
    template: "%s | Levitate Labs",
  },
  description: "Full-service digital agency offering web development, mechanical CAD design, SEO marketing, and brand identity. Fast delivery, transparent pricing, real results for startups and businesses.",
  keywords: ["web development agency India", "CAD design services", "SolidWorks CAD modeling", "full stack developer for hire", "affordable website development", "mechanical engineering design", "startup web development", "MVP development services", "digital marketing", "brand identity", "SEO services India"],
  authors: [{ name: "Levitate Labs Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://levitatelabs.online/",
    title: "Levitate Labs | Web Development, CAD Design, Marketing & Branding Agency",
    description: "We build websites, CAD designs, and marketing systems that scale your business faster. No freelancer roulette, just real results.",
    siteName: "Levitate Labs",
  },
  twitter: {
    card: "summary_large_image",
    title: "Levitate Labs | Web Development & CAD Design Agency",
    description: "Full-service agency for web development, mechanical engineering, marketing, and design.",
    creator: "@levitatelabs",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1 pt-16">
            {children}
          </main>
          <FloatingWhatsApp />
          <AIChatWidget />
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
