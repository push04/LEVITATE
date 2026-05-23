export const ADMIN_ROLES = ['super_admin', 'admin', 'manager'] as const;
export const BUSINESS_ROLES = ['business', 'company_admin'] as const;
export const SALES_ROLES = ['sales'] as const;

const ADMIN_ROLE_SET = new Set<string>(ADMIN_ROLES);
const BUSINESS_ROLE_SET = new Set<string>(BUSINESS_ROLES);
const SALES_ROLE_SET = new Set<string>(SALES_ROLES);

export function isAdminRole(role?: string | null) {
  return Boolean(role && ADMIN_ROLE_SET.has(role));
}

export function isBusinessRole(role?: string | null) {
  return Boolean(role && BUSINESS_ROLE_SET.has(role));
}

export function isSalesRole(role?: string | null) {
  return Boolean(role && SALES_ROLE_SET.has(role));
}

export function normalizeBusinessRole(role?: string | null) {
  if (role === 'company_admin') {
    return 'business';
  }

  return role ?? null;
}
