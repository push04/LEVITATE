import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";

export const metadata: Metadata = {
  title: "Levitate Labs | Industrial Futurism Agency",
  description: "A multidisciplinary agency fusing mechanical precision with digital abstraction. Web Development, Mechanical Engineering, Growth Marketing, and Creative Services.",
  keywords: ["web development", "mechanical engineering", "growth marketing", "creative services", "agency", "levitate labs"],
  authors: [{ name: "Levitate Labs Team" }],
  openGraph: {
    title: "Levitate Labs | Industrial Futurism Agency",
    description: "A multidisciplinary agency fusing mechanical precision with digital abstraction.",
    type: "website",
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
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
