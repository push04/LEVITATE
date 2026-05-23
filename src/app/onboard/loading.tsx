export default function OnboardLoading() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAFAF8] px-4 py-12 sm:px-6 lg:px-8 flex justify-center">
      <div className="w-full max-w-2xl">
        {/* Header skeleton */}
        <div className="mb-10 text-center sm:text-left">
          <div className="h-4 w-28 bg-[#E5E0D8] rounded-full animate-pulse mb-6" />
          <div className="h-12 w-3/4 max-w-md bg-[#E5E0D8] rounded-xl animate-pulse mb-4 mx-auto sm:mx-0" />
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
            <div className="h-6 w-32 bg-[#E5E0D8] rounded-full animate-pulse" />
            <div className="h-6 w-40 bg-[#E5E0D8] rounded-full animate-pulse" />
          </div>
        </div>

        {/* Progress bar skeleton */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1">
              <div className="h-1.5 rounded-full bg-[#E5E0D8] animate-pulse" />
              <div className="h-3 w-16 bg-[#E5E0D8] rounded-full animate-pulse mt-2" />
            </div>
          ))}
        </div>

        {/* Card skeleton */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-8 shadow-[0_8px_32px_rgba(26,25,22,0.04)] space-y-6">
          <div>
            <div className="h-8 w-48 bg-[#E5E0D8] rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-64 bg-[#E5E0D8] rounded-full animate-pulse" />
          </div>
          
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-3 w-20 bg-[#E5E0D8] rounded-full animate-pulse mb-2" />
                <div className="h-[52px] w-full bg-[#FAFAF8] border border-[#E5E0D8] rounded-xl animate-pulse" />
              </div>
            ))}
            <div className="h-[56px] w-full bg-[#B08D57]/20 rounded-xl animate-pulse mt-6" />
          </div>
        </div>

        {/* Social proof skeleton */}
        <div className="mt-12 pt-8 border-t border-[#E5E0D8] flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="flex items-center">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`w-10 h-10 rounded-full bg-[#E5E0D8] border-2 border-[#FAFAF8] animate-pulse ${i > 1 ? '-ml-3' : ''}`} />
            ))}
          </div>
          <div className="h-8 w-48 bg-[#E5E0D8] rounded-lg animate-pulse" />
        </div>
      </div>
    </main>
  );
}
