interface Props {
  visible: boolean;
  message: string;
}

export default function Toast({ visible, message }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <div className="rounded-[12px] border border-[rgba(201,165,90,0.22)] bg-[rgba(10,10,12,0.92)] px-5 py-3 text-sm font-medium text-[var(--text-primary)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        {message}
      </div>
    </div>
  );
}
