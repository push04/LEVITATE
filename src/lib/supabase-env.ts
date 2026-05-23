const PLACEHOLDER_MARKERS = ['placeholder.supabase.co', '.placeholder', 'placeholder@gmail.com', 'placeholder'];

function isUsableValue(value?: string | null) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  const normalized = trimmed.toLowerCase();
  return !PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

function pickFirstUsable(name: string, candidates: Array<string | undefined>) {
  const resolved = candidates.find((candidate) => isUsableValue(candidate));
  if (!resolved) {
    throw new Error(`${name} is missing or still using placeholder values`);
  }

  return resolved.trim();
}

export function getSupabaseUrl() {
  return pickFirstUsable('Supabase URL', [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  ]);
}

export function getSupabasePublishableKey() {
  return pickFirstUsable('Supabase publishable key', [
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
  ]);
}

export function getSupabaseServiceRoleKey() {
  return pickFirstUsable('Supabase service role key', [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ]);
}
