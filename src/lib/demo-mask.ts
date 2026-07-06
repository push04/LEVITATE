// Partially masks a phone number for public demo pages — proves we actually
// have the contact on file (real scraped data) without handing out a free,
// usable phone number to anonymous visitors.
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return 'XXXXXXXXXX';
  const visible = digits.slice(0, digits.length - 4);
  return `${visible}${'X'.repeat(4)}`;
}
