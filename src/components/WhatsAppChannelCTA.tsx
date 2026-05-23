import { MessageCircle } from 'lucide-react';

export default function WhatsAppChannelCTA() {
  return (
    <a
      href="https://wa.me/message/levitate"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2.5 rounded-full border border-[rgba(37,211,102,0.3)] bg-[rgba(37,211,102,0.08)] px-4 py-2 text-sm font-medium text-[#25D366] transition-all hover:bg-[rgba(37,211,102,0.14)]"
    >
      <MessageCircle className="h-4 w-4" fill="currentColor" strokeWidth={0} />
      Join our WhatsApp channel
    </a>
  );
}
