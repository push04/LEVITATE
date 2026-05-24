'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Mail, Phone, Calendar,
    MoreVertical, CheckCircle2, Clock, Upload, X, ChevronRight,
    FileSpreadsheet, Check, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── CSV parser ─────────────────────────────────────────────────────────────
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
    if (!lines.length) return { headers: [], rows: [] }
    function split(line: string) {
        const r: string[] = []; let c = '', q = false
        for (let i = 0; i < line.length; i++) {
            const ch = line[i]
            if (ch === '"') { if (q && line[i+1] === '"') { c += '"'; i++ } else q = !q }
            else if (ch === ',' && !q) { r.push(c.trim()); c = '' }
            else c += ch
        }
        r.push(c.trim()); return r
    }
    const headers = split(lines[0])
    return { headers, rows: lines.slice(1).map(l => Object.fromEntries(headers.map((h, i) => [h, split(l)[i] ?? '']))) }
}

const CRM_FIELDS = [
    { value: '', label: '— Skip —' },
    { value: 'business_name', label: 'Business Name' },
    { value: 'name', label: 'Contact Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'city', label: 'City' },
    { value: 'service_category', label: 'Service Category' },
    { value: 'budget', label: 'Budget' },
    { value: 'notes', label: 'Notes' },
    { value: 'website_link', label: 'Website' },
    { value: 'status', label: 'Status' },
]
const AUTO_MAP: Record<string, string> = {
    'name': 'business_name', 'business name': 'business_name', 'company': 'business_name',
    'contact name': 'name', 'contact': 'name', 'person': 'name',
    'email': 'email', 'email id': 'email', 'email address': 'email',
    'phone': 'phone', 'mobile': 'phone', 'mobile no': 'phone', 'phone no': 'phone',
    'city': 'city', 'location': 'city',
    'category': 'service_category', 'service': 'service_category', 'industry': 'service_category',
    'budget': 'budget', 'amount': 'budget',
    'notes': 'notes', 'remarks': 'notes', 'description': 'notes', 'message': 'notes',
    'website': 'website_link', 'url': 'website_link',
    'status': 'status',
}
function autoMap(headers: string[]): Record<string, string> {
    return Object.fromEntries(headers.map(h => [h, AUTO_MAP[h.toLowerCase().trim()] ?? '']))
}

// Types — match the actual `leads` table columns
interface Lead {
    id: string;
    // The DB column is `business_name`, but some rows from the old
    // addToCRM call may use `name`. Handle both gracefully.
    business_name?: string;
    name?: string;
    email?: string;
    phone?: string;
    service_category?: string;
    // The DB may use `notes` or `message` — handle both
    message?: string | null;
    notes?: string | null;
    budget?: string | null;
    status?: string | null;
    created_at: string;
    source?: string | null;
    city?: string | null;
    score?: number | null;
    website_link?: string | null;
}

// Safe helpers to avoid [object Object]
function leadName(lead: Lead): string {
    const raw = lead.business_name ?? lead.name ?? '';
    return typeof raw === 'string' ? raw : String(raw ?? '');
}

function leadMessage(lead: Lead): string {
    const raw = lead.message ?? lead.notes ?? '';
    return typeof raw === 'string' ? raw : String(raw ?? '');
}

function safeStr(val: unknown): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');

    // CSV Import
    const [showImport, setShowImport] = useState(false);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
    const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvImporting, setCsvImporting] = useState(false);
    const [csvResult, setCsvResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);
    const [csvError, setCsvError] = useState('');
    const dropRef = useRef<HTMLDivElement>(null);

    const handleCsvFile = (file: File) => {
        setCsvFile(file); setCsvResult(null); setCsvError('');
        const reader = new FileReader();
        reader.onload = e => {
            const { headers, rows } = parseCsv(e.target?.result as string);
            setCsvHeaders(headers); setCsvRows(rows);
            setCsvMapping(autoMap(headers));
        };
        reader.readAsText(file);
    };

    const uploadCsv = async () => {
        if (!csvRows.length) return;
        setCsvImporting(true); setCsvError(''); setCsvResult(null);
        const mapped = csvRows.map(row => {
            const out: Record<string, string> = {};
            for (const [col, field] of Object.entries(csvMapping)) {
                if (field && row[col]) out[field] = row[col];
            }
            return out;
        });
        const res = await fetch('/api/admin/leads/import', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leads: mapped, source: 'csv_import' }),
        });
        const json = await res.json();
        setCsvImporting(false);
        if (json.error) { setCsvError(json.error); return; }
        setCsvResult({ imported: json.imported, skipped: json.skipped, failed: json.failed });
        fetchLeads();
    };

    const fetchLeads = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setLeads(data as Lead[]);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const updateStatus = async (id: string, newStatus: string) => {
        // Optimistic update
        setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
        await supabase.from('leads').update({ status: newStatus }).eq('id', id);
    };

    const filteredLeads = leads.filter(lead => {
        const name = leadName(lead).toLowerCase();
        const email = safeStr(lead.email).toLowerCase();
        const q = search.toLowerCase();
        const matchesSearch = !q || name.includes(q) || email.includes(q);
        const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string | null | undefined) => {
        switch (status) {
            case 'New': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Contacted': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'Follow Up': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'Closed': return 'bg-green-500/10 text-green-500 border-green-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    return (
        <div className="space-y-8">
            {/* CSV Import Modal */}
            <AnimatePresence>
                {showImport && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowImport(false)}
                            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                        />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-x-4 top-8 bottom-8 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[720px] z-50 bg-[var(--background)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between z-10">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="w-5 h-5 text-[var(--primary)]" />
                                    <h2 className="font-bold text-lg">Import Leads from CSV</h2>
                                </div>
                                <button onClick={() => setShowImport(false)} className="p-2 rounded-lg hover:bg-[var(--secondary)] transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Drop zone */}
                                <div
                                    ref={dropRef}
                                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.csv')) handleCsvFile(f); }}
                                    onDragOver={e => e.preventDefault()}
                                    onClick={() => document.getElementById('leads-csv-input')?.click()}
                                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${csvFile ? 'border-green-400 bg-green-50' : 'border-[var(--border)] hover:border-[var(--primary)]/50 bg-[var(--secondary)]/30'}`}
                                >
                                    <FileSpreadsheet className={`w-8 h-8 mx-auto mb-3 ${csvFile ? 'text-green-500' : 'text-[var(--muted)]'}`} />
                                    {csvFile ? (
                                        <>
                                            <p className="font-semibold text-green-700">{csvFile.name}</p>
                                            <p className="text-sm text-[var(--muted)] mt-1">{csvRows.length} rows · click to change</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-semibold">Drop your CSV file here</p>
                                            <p className="text-sm text-[var(--muted)] mt-1">or click to browse · .csv files only</p>
                                        </>
                                    )}
                                    <input id="leads-csv-input" type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleCsvFile(e.target.files[0])} />
                                </div>

                                {/* Column mapper */}
                                {csvHeaders.length > 0 && (
                                    <div className="space-y-4">
                                        <p className="font-semibold text-sm">Map CSV columns to CRM fields</p>
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                            {csvHeaders.map(h => (
                                                <div key={h} className="grid grid-cols-[1fr_20px_1fr] gap-2 items-center">
                                                    <div className="px-3 py-2 rounded-lg bg-[var(--secondary)] text-sm font-medium truncate">{h}</div>
                                                    <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
                                                    <select
                                                        value={csvMapping[h] ?? ''}
                                                        onChange={e => setCsvMapping(m => ({ ...m, [h]: e.target.value }))}
                                                        className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                                    >
                                                        {CRM_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Preview */}
                                        <div>
                                            <p className="text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wide">Preview (first 3 rows)</p>
                                            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-[var(--secondary)]">
                                                        <tr>{csvHeaders.map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--muted)] whitespace-nowrap">{h}</th>)}</tr>
                                                    </thead>
                                                    <tbody>
                                                        {csvRows.slice(0, 3).map((r, i) => (
                                                            <tr key={i} className="border-t border-[var(--border)]">
                                                                {csvHeaders.map(h => <td key={h} className="px-3 py-2 text-[var(--foreground)] max-w-[120px] truncate">{r[h]}</td>)}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Error / Result */}
                                        {csvError && (
                                            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                                                <AlertCircle className="w-4 h-4 shrink-0" />{csvError}
                                            </div>
                                        )}
                                        {csvResult && (
                                            <div className="flex items-center gap-6 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm">
                                                <span className="text-green-700 font-semibold flex items-center gap-1.5"><Check className="w-4 h-4" />{csvResult.imported} imported</span>
                                                {csvResult.skipped > 0 && <span className="text-amber-600 font-medium">{csvResult.skipped} skipped</span>}
                                                {csvResult.failed > 0 && <span className="text-red-600 font-medium">{csvResult.failed} failed</span>}
                                            </div>
                                        )}

                                        <button
                                            onClick={uploadCsv}
                                            disabled={csvImporting}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--primary)] text-white font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
                                        >
                                            <Upload className="w-4 h-4" />
                                            {csvImporting ? 'Importing...' : `Import ${csvRows.length} Leads`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">CRM &amp; Leads</h1>
                    <p className="text-[var(--muted)]">Manage incoming inquiries and potential clients</p>
                </div>
                <button
                    onClick={() => { setShowImport(true); setCsvFile(null); setCsvHeaders([]); setCsvRows([]); setCsvResult(null); setCsvError(''); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--secondary)] border border-[var(--border)] text-sm font-semibold hover:border-[var(--primary)]/50 transition-colors"
                >
                    <Upload className="w-4 h-4" />
                    Import CSV
                </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                    <input
                        type="text"
                        placeholder="Search leads..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] shrink-0 overflow-x-auto">
                    {['All', 'New', 'Contacted', 'Follow Up', 'Closed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${statusFilter === status
                                ? 'bg-[var(--secondary)] text-[var(--foreground)] shadow-sm'
                                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leads List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="p-8 text-center text-[var(--muted)]">Loading leads...</div>
                ) : filteredLeads.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-[var(--border)] rounded-2xl">
                        <p className="text-[var(--muted)]">No leads found matching your criteria.</p>
                    </div>
                ) : (
                    filteredLeads.map((lead, index) => {
                        const name = leadName(lead) || 'Unknown';
                        const msg = leadMessage(lead);
                        const email = safeStr(lead.email);
                        const phone = safeStr(lead.phone);
                        const budget = safeStr(lead.budget);
                        const category = safeStr(lead.service_category) || safeStr(lead.city) || 'General Inquiry';
                        const status = safeStr(lead.status) || 'New';

                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={lead.id}
                                className="glass-card p-6 flex flex-col lg:flex-row gap-6 hover:border-[var(--primary)]/30 transition-colors"
                            >
                                {/* Main Info */}
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="text-lg font-bold">{name}</h3>
                                            <p className="text-sm text-[var(--muted)]">{category}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(status)}`}>
                                            {status}
                                        </span>
                                    </div>

                                    {msg && (
                                        <p className="text-sm text-[var(--foreground)]/80 line-clamp-2 mb-4 bg-[var(--secondary)]/30 p-3 rounded-lg">
                                            &ldquo;{msg}&rdquo;
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                                        {email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4" />
                                                <a href={`mailto:${email}`} className="hover:text-[var(--primary)] transition-colors">{email}</a>
                                            </div>
                                        )}
                                        {phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4" />
                                                <a href={`tel:${phone}`} className="hover:text-[var(--primary)] transition-colors">{phone}</a>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {budget && (
                                            <div className="flex items-center gap-2 px-2 py-0.5 bg-[var(--secondary)] rounded text-xs font-medium">
                                                <span>Budget: {budget}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex lg:flex-col items-center justify-center gap-2 pt-4 lg:pt-0 lg:pl-6 lg:border-l border-[var(--border)] shrink-0">
                                    <p className="text-xs font-medium text-[var(--muted)] mb-2 uppercase hidden lg:block">Move To</p>
                                    <div className="flex lg:flex-col gap-2 w-full">
                                        {status !== 'Contacted' && (
                                            <button
                                                onClick={() => updateStatus(lead.id, 'Contacted')}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 transition-colors w-full justify-center"
                                            >
                                                <Clock className="w-3 h-3" /> Contacted
                                            </button>
                                        )}
                                        {status !== 'Closed' && (
                                            <button
                                                onClick={() => updateStatus(lead.id, 'Closed')}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors w-full justify-center"
                                            >
                                                <CheckCircle2 className="w-3 h-3" /> Close Deal
                                            </button>
                                        )}
                                        {status !== 'Follow Up' && status !== 'Closed' && (
                                            <button
                                                onClick={() => updateStatus(lead.id, 'Follow Up')}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition-colors w-full justify-center"
                                            >
                                                <MoreVertical className="w-3 h-3" /> Follow Up
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
