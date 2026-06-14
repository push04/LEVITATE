'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Play, ChevronDown, ChevronUp, Users, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface Step { day: number; message: string }
interface Sequence {
  id: string;
  name: string;
  steps: Step[];
  status: 'active' | 'paused' | 'archived';
  created_at: string;
}

const card: React.CSSProperties = { background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px' };

const EXAMPLE_STEPS: Step[] = [
  { day: 0, message: 'Hi {{name}}, thanks for connecting! This is {{company}}. Let us know if you need anything.' },
  { day: 3, message: 'Hi {{name}}, just checking in! Have any questions about our products/services?' },
  { day: 7, message: 'Hi {{name}}, we\'d love to help you grow your business. Reply YES to get a free consultation.' },
  { day: 14, message: 'Hi {{name}}, last follow-up from our side. Let us know if you\'re interested — we\'re here!' },
];

export default function SequencesTab({ companyId }: { companyId: string }) {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSteps, setNewSteps] = useState<Step[]>([{ day: 0, message: '' }, { day: 3, message: '' }]);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [enrollOpen, setEnrollOpen] = useState<string | null>(null);
  const [enrollPhones, setEnrollPhones] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState<{ enrolled: number; queued: number } | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/business/whatsapp/sequences');
      const data = await res.json() as { sequences?: Sequence[] };
      setSequences(data.sequences ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!newName.trim() || newSteps.some(s => !s.message.trim())) return;
    setSaving(true);
    try {
      const res = await fetch('/api/business/whatsapp/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), steps: newSteps }),
      });
      if (res.ok) {
        setCreating(false); setNewName(''); setNewSteps([{ day: 0, message: '' }, { day: 3, message: '' }]);
        showToast('Sequence created!'); load();
      }
    } finally { setSaving(false); }
  };

  const deleteSeq = async (id: string) => {
    if (!confirm('Delete this sequence?')) return;
    await fetch('/api/business/whatsapp/sequences', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    showToast('Deleted'); load();
  };

  const enroll = async (seqId: string) => {
    const lines = enrollPhones.split('\n').map(l => l.trim()).filter(Boolean);
    const contacts = lines.map(l => {
      const [phone, name] = l.split(',').map(s => s.trim());
      return { phone: phone.replace(/[^0-9]/g, ''), name: name ?? '' };
    }).filter(c => c.phone.length >= 10);

    if (!contacts.length) { showToast('No valid phone numbers found'); return; }
    setEnrolling(true);
    try {
      const res = await fetch('/api/business/whatsapp/sequences/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence_id: seqId, contacts }),
      });
      const data = await res.json() as { enrolled?: number; queued?: number };
      setEnrollResult({ enrolled: data.enrolled ?? 0, queued: data.queued ?? 0 });
      showToast(`${data.enrolled} contacts enrolled, ${data.queued} messages queued`);
    } finally { setEnrolling(false); }
  };

  const addStep = () => setNewSteps(s => [...s, { day: (s[s.length - 1]?.day ?? 0) + 7, message: '' }]);
  const removeStep = (i: number) => setNewSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i: number, key: keyof Step, val: string | number) =>
    setNewSteps(s => s.map((step, idx) => idx === i ? { ...step, [key]: val } : step));

  const f: React.CSSProperties = { fontFamily: 'Inter, sans-serif' };

  return (
    <div style={{ ...f, maxWidth: 720 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#111827', color: 'white', padding: '10px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={13} color="#22c55e" /> {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 3px' }}>Drip Sequences</h2>
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Multi-step WhatsApp follow-ups sent automatically over days</p>
        </div>
        <button
          onClick={() => { setCreating(true); setNewSteps(EXAMPLE_STEPS.map(s => ({ ...s }))); setNewName(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', background: '#22c55e', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={14} /> New Sequence
        </button>
      </div>

      {/* How it works */}
      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 10 }}>
        <Clock size={14} color="#3B82F6" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12, color: '#1D4ED8', margin: 0, lineHeight: 1.6 }}>
          Create a sequence with steps (Day 0, Day 3, Day 7…). Enroll contacts — messages are pre-scheduled and sent automatically by your WhatsApp agent. Use <code>{'{{name}}'}</code>, <code>{'{{city}}'}</code> for personalization.
        </p>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{ ...card, marginBottom: 20, border: '2px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>New Sequence</h3>
            <button onClick={() => setCreating(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9CA3AF' }}>×</button>
          </div>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Sequence name (e.g. New Lead Nurture)"
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, marginBottom: 14, boxSizing: 'border-box', outline: 'none' }}
          />

          {newSteps.map((step, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 28px', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
              <div>
                <label style={{ fontSize: 11, color: '#9CA3AF', display: 'block', marginBottom: 3 }}>Day</label>
                <input
                  type="number" min={0} value={step.day}
                  onChange={e => updateStep(i, 'day', parseInt(e.target.value, 10) || 0)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9CA3AF', display: 'block', marginBottom: 3 }}>Message (use {'{{name}}'}, {'{{city}}'})</label>
                <textarea
                  value={step.message}
                  onChange={e => updateStep(i, 'message', e.target.value)}
                  rows={2}
                  placeholder={`Step ${i + 1} message…`}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, resize: 'vertical', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <button onClick={() => removeStep(i)} style={{ marginTop: 22, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <Trash2 size={14} color="#9CA3AF" />
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={addStep} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 12, cursor: 'pointer' }}>+ Add step</button>
            <button
              onClick={save}
              disabled={saving || !newName.trim() || newSteps.some(s => !s.message.trim())}
              style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#22c55e', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1, marginLeft: 'auto' }}
            >
              {saving ? 'Saving…' : 'Create Sequence'}
            </button>
          </div>
        </div>
      )}

      {/* Sequences list */}
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading…</div>
      ) : sequences.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', border: '2px dashed #E5E7EB', borderRadius: 12 }}>
          <p style={{ color: '#9CA3AF', fontSize: 14, margin: 0 }}>No sequences yet. Create one to automate your follow-ups.</p>
        </div>
      ) : sequences.map(seq => (
        <div key={seq.id} style={{ ...card, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{seq.name}</p>
              <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                {seq.steps.length} steps · Days {seq.steps.map(s => s.day).join(', ')} ·
                <span style={{ marginLeft: 4, padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: seq.status === 'active' ? '#F0FDF4' : '#F9FAFB', color: seq.status === 'active' ? '#059669' : '#6B7280', border: `1px solid ${seq.status === 'active' ? '#BBF7D0' : '#E5E7EB'}` }}>
                  {seq.status}
                </span>
              </p>
            </div>
            <button onClick={() => setExpanded(expanded === seq.id ? null : seq.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              {expanded === seq.id ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
            </button>
            <button
              onClick={() => { setEnrollOpen(seq.id); setEnrollResult(null); setEnrollPhones(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: 'none', background: '#22c55e', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              <Play size={11} /> Enroll
            </button>
            <button onClick={() => deleteSeq(seq.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Trash2 size={14} color="#EF4444" />
            </button>
          </div>

          {/* Steps expand */}
          {expanded === seq.id && (
            <div style={{ marginTop: 14, borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
              {seq.steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 56, padding: '5px 0', textAlign: 'center', borderRadius: 7, background: '#EEF2FF', fontSize: 12, fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>
                    Day {step.day}
                  </div>
                  <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#374151', flex: 1, lineHeight: 1.5 }}>
                    {step.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Enroll panel */}
          {enrollOpen === seq.id && (
            <div style={{ marginTop: 14, borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
                Enroll contacts into &quot;{seq.name}&quot;
              </p>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 8px' }}>
                One per line: <code>phone</code> or <code>phone, Name</code> — e.g. <code>9876543210, Rahul Sharma</code>
              </p>
              <textarea
                value={enrollPhones}
                onChange={e => setEnrollPhones(e.target.value)}
                rows={5}
                placeholder={'9876543210, Rahul Sharma\n9123456789, Priya Patel\n...'}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
              />
              {enrollResult && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={13} color="#059669" />
                  <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{enrollResult.enrolled} enrolled, {enrollResult.queued} messages scheduled</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => setEnrollOpen(null)} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid #E5E7EB', background: 'white', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={() => enroll(seq.id)}
                  disabled={enrolling || !enrollPhones.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, border: 'none', background: '#22c55e', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: enrolling ? 0.6 : 1 }}
                >
                  <Users size={12} /> {enrolling ? 'Enrolling…' : 'Enroll Contacts'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
