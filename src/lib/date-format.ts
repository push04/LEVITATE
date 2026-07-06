// Indian convention: day before month (e.g. "05 Jul 2026"), matching how
// dates are read across NSE/BSE-facing material - avoids the MM/DD ambiguity
// of a raw ISO string or the default US locale format.
export function formatIndianDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  // Date-only strings (e.g. "2026-07-05") parse as UTC midnight; anchoring to
  // noon before formatting keeps the calendar day stable across timezones
  // instead of shifting a day back for negative-offset viewers.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  const d = new Date(isDateOnly ? `${dateStr}T12:00:00` : dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
