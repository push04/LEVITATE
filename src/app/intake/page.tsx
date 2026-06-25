import IntakeWizard from '@/components/intake/IntakeWizard';
import { LevitateLockup } from '@/components/brand/LevitateLogo';

export const metadata = {
  title: 'Get Started — Levitate Labs',
  description: "Tell us about your business and we'll recommend the right growth services for you.",
};

interface Props {
  searchParams: Promise<{ ref?: string }>;
}

export default async function IntakePage({ searchParams }: Props) {
  const params = await searchParams;
  const refToken = params.ref ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex flex-col">
      {/* Minimal header */}
      <header className="w-full px-6 py-4 flex justify-center border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <LevitateLockup
          markClassName="h-8 w-8 rounded-[10px]"
          wordmarkClassName="text-[15px] font-semibold text-gray-900"
        />
      </header>

      {/* Wizard */}
      <main className="flex-1 flex items-start justify-center px-4 py-10 md:py-16">
        <IntakeWizard refToken={refToken} />
      </main>

      <footer className="py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Levitate Labs · All rights reserved
      </footer>
    </div>
  );
}
