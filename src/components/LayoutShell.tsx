'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // These route groups have their own layouts (sidebar + no footer)
  const isDashboard =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/business')

  const isSitePage = pathname.startsWith('/sites/')

  if (isSitePage || isDashboard) {
    return <>{children}</>
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}

