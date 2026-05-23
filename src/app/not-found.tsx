import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <h1 className="text-6xl font-bold text-[#C8A96E]">404</h1>
      <p className="mt-4 text-xl">Page not found</p>
      <div className="mt-8 flex gap-4">
        <Link href="/" className="px-4 py-2 bg-[#C8A96E] text-[var(--foreground)] rounded">Home</Link>
        <Link href="/demo" className="px-4 py-2 border border-[#C8A96E] text-[#C8A96E] rounded">Demo</Link>
        <Link href="/pricing" className="px-4 py-2 border border-[#C8A96E] text-[#C8A96E] rounded">Pricing</Link>
      </div>
    </div>
  );
}
