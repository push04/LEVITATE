'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'

export default function OnboardingSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const workspaceUrl = searchParams.get('workspace') ?? searchParams.get('subdomainUrl') ?? 'https://levitatelabs.online/your-company'
  const company = searchParams.get('company') ?? 'Your company'
  const dashboardUrl = searchParams.get('dashboard') ?? '/business/dashboard?onboard=success'

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace(dashboardUrl)
    }, 2800)

    return () => window.clearTimeout(timer)
  }, [dashboardUrl, router])

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(196,164,102,0.18),_transparent_26%),linear-gradient(180deg,_#0c0c0b_0%,_#141414_100%)] px-4 py-16 text-[#f5f1ea] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-8 lg:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-100">
          <Sparkles className="h-4 w-4" />
          Payment confirmed
        </div>

        <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{company} is now active</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
          Your subscription has cleared, your confirmation email is on the way, and we are sending you into the business dashboard now.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
              <div className="text-sm uppercase tracking-[0.22em] text-white/45">Provisioned business backlink</div>
            <div className="mt-2 break-words text-xl font-semibold leading-tight sm:text-2xl">{workspaceUrl}</div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="text-sm uppercase tracking-[0.22em] text-white/45">Next destination</div>
            <div className="mt-2 break-words text-xl font-semibold leading-tight sm:text-2xl">business dashboard</div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={dashboardUrl}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 font-semibold text-white transition-colors hover:opacity-90"
          >
            Open dashboard
            <CheckCircle2 className="h-4 w-4" />
          </Link>
          <div className="inline-flex items-center gap-2 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin text-[#d9c59b]" />
            Redirecting automatically...
          </div>
        </div>
      </div>
    </main>
  )
}

