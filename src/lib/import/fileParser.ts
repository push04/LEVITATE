// Client-side file parser: CSV (papaparse) + XLSX (SheetJS)
// Runs in the browser. Never imported by server routes.

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  rowCount: number;
  fileType: 'csv' | 'xlsx';
}

// ── Expanded auto-mapping dictionary ────────────────────────────────────────
export const AUTO_MAP: Record<string, string> = {
  // Business / company name
  name: 'business_name',
  'business name': 'business_name',
  'company name': 'business_name',
  company: 'business_name',
  'account name': 'business_name',
  'party name': 'business_name',
  firm: 'business_name',
  'firm name': 'business_name',
  organisation: 'business_name',
  organization: 'business_name',
  'client name': 'business_name',

  // Contact / person name
  contact: 'name',
  'contact name': 'name',
  'person name': 'name',
  person: 'name',
  'full name': 'name',
  'customer name': 'name',
  'first name': 'name',
  'display name': 'name',
  owner: 'name',
  salesperson: 'name',

  // Email
  email: 'email',
  'email id': 'email',
  'email address': 'email',
  'e-mail': 'email',
  'e mail': 'email',
  mail: 'email',
  'work email': 'email',

  // Phone
  phone: 'phone',
  mobile: 'phone',
  'mobile no': 'phone',
  'mobile no.': 'phone',
  'mobile number': 'phone',
  'phone no': 'phone',
  'phone no.': 'phone',
  'phone number': 'phone',
  'contact no': 'phone',
  'contact no.': 'phone',
  'contact number': 'phone',
  whatsapp: 'phone',
  'whatsapp no': 'phone',
  'whatsapp number': 'phone',
  cell: 'phone',
  'cell phone': 'phone',
  tel: 'phone',
  telephone: 'phone',

  // City / location
  city: 'city',
  location: 'city',
  district: 'city',
  area: 'city',
  place: 'city',
  region: 'city',
  state: 'city',
  town: 'city',

  // Category / industry
  category: 'service_category',
  'service category': 'service_category',
  service: 'service_category',
  type: 'service_category',
  industry: 'service_category',
  sector: 'service_category',
  'account group': 'service_category',
  group: 'service_category',
  'business type': 'service_category',
  segment: 'service_category',
  vertical: 'service_category',
  'lead type': 'service_category',

  // Budget / value
  budget: 'budget',
  'opening balance': 'budget',
  balance: 'budget',
  amount: 'budget',
  value: 'budget',
  'deal value': 'budget',
  revenue: 'budget',
  price: 'budget',

  // Notes
  notes: 'notes',
  note: 'notes',
  remark: 'notes',
  remarks: 'notes',
  comment: 'notes',
  comments: 'notes',
  description: 'notes',
  details: 'notes',
  info: 'notes',

  // Status
  status: 'status',
  'lead status': 'status',
  stage: 'status',
  'deal stage': 'status',
};

export const LEAD_FIELDS = [
  { value: '', label: '— Skip —' },
  { value: 'business_name', label: 'Business Name', important: true },
  { value: 'name', label: 'Contact Name', important: true },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone / WhatsApp', important: true },
  { value: 'city', label: 'City' },
  { value: 'service_category', label: 'Category' },
  { value: 'budget', label: 'Budget' },
  { value: 'notes', label: 'Notes' },
  { value: 'status', label: 'Status' },
];

export function autoMapHeaders(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const h of headers) {
    const key = h.toLowerCase().trim();
    const mapped = AUTO_MAP[key];
    if (mapped) result[h] = mapped;
  }
  return result;
}

// ── CSV parser via PapaParse ─────────────────────────────────────────────────
async function parseCsv(file: File): Promise<ParsedFile> {
  const Papa = (await import('papaparse')).default;

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      transformHeader: (h) => h.trim(),
      encoding: 'UTF-8',
      complete: (results) => {
        const headers = (results.meta.fields ?? []) as string[];
        const rows = (results.data as Record<string, string>[]).map((row) => {
          const clean: Record<string, string> = {};
          for (const h of headers) {
            clean[h] = String(row[h] ?? '').trim();
          }
          return clean;
        });
        resolve({ headers, rows, fileName: file.name, rowCount: rows.length, fileType: 'csv' });
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}

// ── XLSX parser via SheetJS ──────────────────────────────────────────────────
async function parseExcel(file: File): Promise<ParsedFile> {
  const XLSX = await import('xlsx');

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellText: false,
    cellDates: true,
    dense: false,
  });

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON (header row as keys)
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,         // format dates as strings
    dateNF: 'yyyy-mm-dd',
  });

  if (!raw.length) {
    return { headers: [], rows: [], fileName: file.name, rowCount: 0, fileType: 'xlsx' };
  }

  const headers = Object.keys(raw[0]).map((h) => h.trim());
  const rows = raw.map((r) => {
    const clean: Record<string, string> = {};
    for (const h of headers) {
      clean[h] = String(r[h] ?? '').trim();
    }
    return clean;
  });

  return { headers, rows, fileName: file.name, rowCount: rows.length, fileType: 'xlsx' };
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    return parseCsv(file);
  }
  if (ext === 'xlsx' || ext === 'xls' || ext === 'ods') {
    return parseExcel(file);
  }
  throw new Error(`Unsupported file type: .${ext}. Use CSV or Excel (.xlsx).`);
}

// Generate a sample CSV template for download
export function generateCsvTemplate(): string {
  const headers = ['business_name', 'name', 'email', 'phone', 'city', 'service_category', 'budget', 'notes', 'status'];
  const sample = ['Acme Corp', 'John Doe', 'john@acme.com', '+919876543210', 'Mumbai', 'Technology', '50000', 'Met at conference', 'New'];
  return [headers.join(','), sample.join(',')].join('\n');
}

// Extract phone numbers from mapped rows (for WhatsApp automation)
export function extractPhones(
  rows: Record<string, string>[],
  mapping: Record<string, string>
): string[] {
  const phones: string[] = [];
  for (const row of rows) {
    for (const [col, field] of Object.entries(mapping)) {
      if (field === 'phone' && row[col]) {
        const normalized = row[col].replace(/\D/g, '');
        if (normalized.length >= 10) {
          // Normalize to international format
          let p = normalized;
          if (p.length === 10) p = '91' + p;
          if (p.length >= 11 && p.length <= 15) phones.push(p);
        }
        break;
      }
    }
  }
  return [...new Set(phones)]; // deduplicate
}
