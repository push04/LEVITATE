export default function OnboardLoading() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(196,164,102,0.18),_transparent_28%),linear-gradient(180deg,_#0c0c0b_0%,_#141414_100%)] px-4 py-10 text-[#f5f1ea] sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-[1600px] flex-col gap-10 lg:gap-14">
        <div className="grid gap-10 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5">
            <div className="h-10 w-56 rounded-full bg-white/10 animate-pulse" />
            <div className="space-y-3">
              <div className="h-16 w-full rounded-3xl bg-white/10 animate-pulse" />
              <div className="h-16 w-[90%] rounded-3xl bg-white/10 animate-pulse" />
              <div className="h-16 w-[72%] rounded-3xl bg-white/10 animate-pulse" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-24 rounded-2xl bg-white/10 animate-pulse" />
              <div className="h-24 rounded-2xl bg-white/10 animate-pulse" />
              <div className="h-24 rounded-2xl bg-white/10 animate-pulse" />
              <div className="h-24 rounded-2xl bg-white/10 animate-pulse" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-28 rounded-[24px] bg-white/10 animate-pulse" />
              <div className="h-28 rounded-[24px] bg-white/10 animate-pulse" />
              <div className="h-28 rounded-[24px] bg-white/10 animate-pulse" />
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/10 backdrop-blur-sm">
            <div className="h-6 w-40 rounded-full bg-white/10 animate-pulse" />
            <div className="mt-4 h-9 w-72 rounded-2xl bg-white/10 animate-pulse" />
            <div className="mt-3 h-5 w-full rounded-full bg-white/10 animate-pulse" />
            <div className="mt-2 h-5 w-[82%] rounded-full bg-white/10 animate-pulse" />

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="h-12 rounded-2xl bg-white/10 animate-pulse" />
              <div className="h-12 rounded-2xl bg-white/10 animate-pulse" />
              <div className="h-12 rounded-2xl bg-white/10 animate-pulse sm:col-span-2" />
              <div className="h-12 rounded-2xl bg-white/10 animate-pulse sm:col-span-2" />
            </div>

            <div className="mt-6 h-36 rounded-[24px] bg-white/10 animate-pulse" />
            <div className="mt-4 h-28 rounded-[24px] bg-white/10 animate-pulse" />
            <div className="mt-6 h-12 rounded-2xl bg-[#d9c59b]/30 animate-levitate-shimmer" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="h-[360px] rounded-[28px] bg-white/10 animate-pulse" />
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="h-[160px] rounded-[24px] bg-white/10 animate-pulse" />
            <div className="h-[160px] rounded-[24px] bg-white/10 animate-pulse" />
            <div className="h-[160px] rounded-[24px] bg-white/10 animate-pulse" />
            <div className="h-[160px] rounded-[24px] bg-white/10 animate-pulse" />
          </div>
        </div>
      </section>
    </main>
  )
}
