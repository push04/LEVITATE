'use client';

interface Props {
  step: number;
  total?: number;
}

export default function ProgressBar({ step, total = 4 }: Props) {
  const pct = Math.min((step / total) * 100, 100);
  return (
    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
