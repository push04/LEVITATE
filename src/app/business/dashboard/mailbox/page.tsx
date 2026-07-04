'use client';

import { useEffect, useMemo, useState } from 'react';
import { Inbox, Mail, RefreshCw, Send, User, X } from 'lucide-react';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';

interface AgentEmail {
  id: string;
  direction: 'inbound' | 'outbound';
  to_email: string | null;
  from_email: string | null;
  subject: string | null;
  body: string | null;
  status: string;
  created_at: string;
}

function getStatusMeta(status: string) {
  const key = String(status || '').toLowerCase();
  if (key === 'queued') return { label: 'Queued', className: 'bg-stone-500/15 text-stone-300' };
  if (key === 'accepted' || key === 'sent') return { label: 'Sent', className: 'bg-[#c8a96e]/15 text-[#e5c487]' };
  if (key === 'opened') return { label: 'Opened', className: 'bg-amber-500/15 text-amber-300' };
  if (key === 'replied') return { label: 'Replied', className: 'bg-emerald-500/15 text-emerald-300' };
  if (key === 'failed') return { label: 'Failed', className: 'bg-rose-500/15 text-rose-300' };
  if (key === 'received') return { label: 'Incoming', className: 'bg-stone-500/15 text-stone-200' };
  return { label: status || 'Unknown', className: 'bg-stone-500/15 text-stone-300' };
}

export default function BusinessMailboxPage() {
  const portal = useCompanyPortalState();
  const [rawEmails, setRawEmails] = useState<AgentEmail[]>([]);
  const [alias, setAlias] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function fetchEmails(showRefreshState = true) {
    if (showRefreshState) {
      setIsRefreshing(true);
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/business/mailbox');
      const json = await res.json() as { emails?: AgentEmail[]; alias?: string | null; error?: string };
      setRawEmails(json.emails ?? []);
      setAlias(json.alias ?? null);
    } catch {
      setRawEmails([]);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }

  useEffect(() => {
    if (portal.loading || !portal.hasPaidAccess) {
      return;
    }

    void fetchEmails();
    const interval = window.setInterval(() => void fetchEmails(false), 30000);
    return () => window.clearInterval(interval);
  }, [portal.hasPaidAccess, portal.loading]);

  async function handleSend() {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/business/mailbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: composeTo.trim(), subject: composeSubject.trim(), body: composeBody.trim() }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Failed to send');
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setShowCompose(false);
      await fetchEmails(false);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  const threads = useMemo(() => {
    const groups: Record<string, AgentEmail[]> = {};

    rawEmails.forEach((email) => {
      let contactEmail = '';
      if (email.direction === 'inbound') {
        contactEmail = email.from_email || 'unknown';
      } else {
        contactEmail = email.to_email || 'unknown';
      }
      contactEmail = contactEmail.replace(/.*</, '').replace(/>.*/, '').trim() || 'unknown';

      if (!groups[contactEmail]) groups[contactEmail] = [];
      groups[contactEmail].push(email);
    });

    const threadArr = Object.values(groups).map((group) => {
      const sorted = group.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
      return {
        contactEmail: sorted[0].direction === 'inbound' ? sorted[0].from_email : sorted[0].to_email,
        cleanEmail:
          sorted[0].direction === 'inbound'
            ? sorted[0].from_email?.replace(/.*</, '').replace(/>.*/, '').trim() || 'unknown'
            : sorted[0].to_email?.replace(/.*</, '').replace(/>.*/, '').trim() || 'unknown',
        messages: sorted.reverse(),
        latest: sorted[0],
      };
    });

    return threadArr.sort((left, right) => new Date(right.latest.created_at).getTime() - new Date(left.latest.created_at).getTime());
  }, [rawEmails]);

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = thread.latest.subject?.toLowerCase().includes(q);
        const matchesEmail = thread.cleanEmail?.toLowerCase().includes(q);
        const matchesBody = thread.latest.body?.toLowerCase().includes(q);
        if (!matchesSubject && !matchesEmail && !matchesBody) return false;
      }

      if (filterTab === 'inbound') {
        return thread.latest.direction === 'inbound';
      }
      if (filterTab === 'outbound') {
        return thread.latest.direction === 'outbound';
      }
      return true;
    });
  }, [threads, searchQuery, filterTab]);

  const activeThread = useMemo(() => {
    return threads.find((thread) => thread.cleanEmail === selectedContact);
  }, [threads, selectedContact]);

  if (portal.loading) {
    return <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--muted)]">Loading mailbox...</div>;
  }

  if (!portal.hasPaidAccess) {
    return (
      <BusinessPortalLocked
        companyName={portal.companyName}
        subscriptionStatus={portal.subscriptionStatus}
        planName={portal.planName}
        billingCycle={portal.billingCycle}
        subdomainUrl={portal.workspaceUrl}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[#c8a96e]/30 bg-[#c8a96e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#e5c487]">
              Mailbox
            </div>
            <h1 className="mt-4 text-3xl font-bold font-heading">Mailbox Operations</h1>
            <p className="mt-2 max-w-3xl text-[var(--muted)]">
              Conversation history, delivery status, and outreach context for the business workspace.
            </p>
            {alias ? (
              <p className="mt-2 text-sm text-[var(--muted)]">
                Your business email: <span className="font-mono text-[#e5c487]">{alias}</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">
                A dedicated business.&lt;yourname&gt;@levitatelabs.online address is available on Growth OS and above.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {alias && (
              <button
                type="button"
                onClick={() => setShowCompose((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#c8a96e] px-5 py-3 text-sm font-semibold text-[#140f07] transition-colors hover:bg-[#dab97e]"
              >
                <Send className="h-4 w-4" />
                Compose
              </button>
            )}
            <button
              type="button"
              onClick={() => void fetchEmails()}
              className={`inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[#c8a96e]/40 hover:text-[#e5c487] ${isRefreshing ? 'opacity-80' : ''}`}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh mailbox
            </button>
          </div>
        </div>

        {showCompose && alias && (
          <div className="mt-6 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
            {sendError && <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{sendError}</div>}
            <input
              type="email"
              placeholder="To"
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[#c8a96e]/40"
            />
            <input
              type="text"
              placeholder="Subject"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[#c8a96e]/40"
            />
            <textarea
              placeholder="Message"
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[#c8a96e]/40"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCompose(false)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => void handleSend()}
                className="rounded-xl bg-[#c8a96e] px-4 py-2 text-sm font-semibold text-[#140f07] hover:bg-[#dab97e] disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-[720px] gap-6">
        <div className={`flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] ${activeThread ? 'hidden md:flex md:w-[360px]' : 'w-full md:w-[360px]'}`}>
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#e5c487]" />
                Your Inbox
              </h2>
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{filteredThreads.length} threads</span>
            </div>
            <div className="mt-4">
              <input
                type="text"
                placeholder="Search mail..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#c8a96e]/40"
              />
            </div>
            <div className="mt-3 flex gap-1 rounded-lg bg-[var(--background)] p-1">
              {(['all', 'inbound', 'outbound'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-colors ${
                    filterTab === tab ? 'bg-[var(--primary)] text-[#140f07]' : 'text-[var(--muted)] hover:text-[#e5c487]'
                  }`}
                >
                  {tab === 'inbound' ? 'Incoming' : tab === 'outbound' ? 'Sent' : 'All'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-[var(--muted)]">Loading conversations...</div>
            ) : filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => (
                <div
                  key={thread.cleanEmail}
                  onClick={() => setSelectedContact(thread.cleanEmail)}
                  className={`cursor-pointer border-b border-[var(--border)] p-4 transition-colors hover:bg-[var(--secondary)]/50 ${selectedContact === thread.cleanEmail ? 'bg-[var(--secondary)] border-l-4 border-l-[#c8a96e]' : ''}`}
                >
                  <div className="flex justify-between mb-1">
                    <span className={`font-medium truncate ${thread.latest.status === 'received' ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}>
                      {thread.contactEmail}
                    </span>
                    <span className="ml-2 whitespace-nowrap text-xs text-[var(--muted)]">
                      {new Date(thread.latest.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium mb-1 truncate">{thread.latest.subject || '(no subject)'}</h3>
                  <div className="flex items-center gap-2">
                    <p className="line-clamp-1 flex-1 text-xs text-[var(--muted)]">{thread.latest.body}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getStatusMeta(thread.latest.status).className}`}>
                      {getStatusMeta(thread.latest.status).label}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[var(--muted)]">No emails match the current filters.</div>
            )}
          </div>
        </div>

        <div className={`flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] ${activeThread ? 'w-full md:flex-1' : 'hidden md:flex md:flex-1'}`}>
          {activeThread ? (
            <>
              <div className="border-b border-[var(--border)] p-4 md:p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg md:text-xl font-bold mb-1">{activeThread.latest.subject || '(no subject)'}</h2>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-[var(--muted)]">
                    <User className="w-4 h-4" />
                    <span>{activeThread.contactEmail}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`hidden rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] md:inline-flex ${getStatusMeta(activeThread.latest.status).className}`}>
                    {getStatusMeta(activeThread.latest.status).label}
                  </span>
                  <button className="md:hidden p-2 rounded-lg bg-[var(--secondary)]" onClick={() => setSelectedContact(null)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeThread.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${msg.direction === 'outbound' ? 'bg-[var(--primary)] text-[#140f07]' : 'bg-[var(--secondary)] text-[var(--foreground)]'}`}>
                      <div className="flex justify-between items-center mb-2 gap-4 text-xs opacity-70">
                        <span className="font-semibold flex items-center gap-1">
                          {msg.direction === 'outbound' ? <Send className="w-3 h-3" /> : <Inbox className="w-3 h-3" />}
                          {msg.direction === 'outbound' ? (alias ?? 'You') : msg.from_email}
                        </span>
                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-7">{msg.body}</div>
                      <div className="mt-3 flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.12em]">
                        <span>{msg.direction}</span>
                        <span>{getStatusMeta(msg.status).label}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
              Select a conversation to review the mailbox thread.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
