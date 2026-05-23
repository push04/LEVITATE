'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

function isPortalPath(pathname: string) {
  return pathname.startsWith('/business') || pathname.startsWith('/admin');
}

export default function RootChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const portalRoute = isPortalPath(pathname);

  if (portalRoute) {
    return <main className="flex min-h-screen flex-1 flex-col">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
