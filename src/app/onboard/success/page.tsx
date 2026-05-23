'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import s from '@/styles/home.module.css'

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
    <main className="min-h-screen overflow-x-hidden bg-[#FAFAF8] px-4 py-16 text-[#1A1916] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-[#E5E0D8] bg-white p-6 shadow-[0_8px_32px_rgba(26,25,22,0.04)] sm:p-8 lg:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50 px-4 py-2 text-xs uppercase tracking-wider font-bold text-emerald-700">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          Workspace confirmed
        </div>

        <h1 className={`${s.sectionHeadline} mt-5 text-4xl sm:text-5xl lg:text-6xl mb-2`}>{company} is now active</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#6B6860] sm:text-lg">
          Your setup has cleared, your confirmation email is on the way, and we are sending you into the business dashboard now.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#E5E0D8] bg-[#F4F2EE] p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B6860]">Provisioned business backlink</div>
            <div className="mt-2 break-words text-xl font-bold leading-tight sm:text-2xl text-[#1A1916]">{workspaceUrl}</div>
          </div>
          <div className="rounded-2xl border border-[#E5E0D8] bg-[#F4F2EE] p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B6860]">Next destination</div>
            <div className="mt-2 break-words text-xl font-bold leading-tight sm:text-2xl text-[#1A1916]">Business Dashboard</div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={dashboardUrl}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B08D57] px-6 py-4 font-semibold text-[#FAFAF8] transition-all hover:bg-[#8C6D3F] hover:shadow-[0_4px_20px_rgba(176,141,87,0.3)] shadow-sm active:scale-[0.98]"
          >
            Open dashboard
            <CheckCircle2 className="h-4 w-4" />
          </Link>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-[#6B6860]">
            <Loader2 className="h-4 w-4 animate-spin text-[#B08D57]" />
            Redirecting automatically...
          </div>
        </div>
      </div>
    </main>
  )
}
