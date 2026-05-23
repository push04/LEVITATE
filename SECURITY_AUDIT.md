# SECURITY AUDIT — LEVITATE LABS

Audit date: 2026-04-26  
Repo root: `C:\Users\pushp\Downloads\LEVITATE-main\LEVITATE-main`  
Commit: `fa6f0178`  

Method: manual review of security-sensitive flows + targeted static grep + custom repo scan (`scripts/security_audit.py`) + `npm audit` output captured in `security-audit/npm-audit.json`.

Notes:
- This report **redacts** all secrets/tokens in evidence snippets.
- `src/middleware.ts` enforces auth for `/api/admin/*` + `/api/business/*`, but it **does not** protect `/.netlify/functions/*`.

---

## CRITICAL FINDINGS SUMMARY (P0/P1)

P0 (patch immediately)
1. **Hardcoded Supabase service_role key committed** in multiple scripts → full DB compromise (`check_*.mjs`, `test_*.mjs`).
2. **Netlify Functions are unauthenticated** and use the Supabase service role key → anyone can trigger agent workflows, emails, DB writes (`netlify/functions/*.mts`).
3. **Public contact API uses service role + public file upload** and exposes in-memory leads via GET (`src/app/api/contact/route.ts`).

P1 (patch next)
4. **Public scraping endpoint** can be abused for DoS and potential SSRF (`src/app/api/sales/generate-leads/route.ts`).
5. **Stored/Reflected XSS** via `dangerouslySetInnerHTML` without sanitization (multiple UI components).
6. **Dependency vulnerabilities (SCA)**: `npm audit` reports **35 vulnerable packages** (2 critical, 27 high, 5 moderate, 1 low).

---

## FINDINGS

### F-001 — Hardcoded Supabase Service Role Key in Repo
1. Vulnerability Name / Title: Hardcoded Supabase `service_role` JWT committed to repository  
2. Category: Secrets & Credential Exposure  
3. Severity: **CRITICAL**  
4. CVSS Score: **9.8** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)  
5. File Path & Line Number (exact):
   - `check_bizdev_leads.mjs:5`
   - `check_conversations.mjs:5`
   - `check_emails.mjs:5`
   - `check_old.mjs:5`
   - `migrate_emails.mjs:5`
   - `test_agents.mjs:8`
   - `test_extensive.mjs:7`
   - `test_trigger.mjs:5`
   - `test_trigger2.mjs:5`
6. Description:
   - Supabase `service_role` keys bypass Row Level Security (RLS). Committing them gives any attacker who reads the repo **admin-level DB access** (read/write) and enables full account/data compromise depending on schema/policies.
7. Proof of Concept / Evidence (redacted):
   - `check_bizdev_leads.mjs:3-6` contains `createClient('https://<project>.supabase.co', 'eyJ…REDACTED…')` where the token payload corresponds to `service_role`.
8. Impact:
   - Exfiltrate/modify all tables (leads/clients/projects/revenue/messages/etc.).
   - Bypass authorization/RLS controls, create admin users/roles (if tables allow), tamper with billing/workflows.
9. Remediation:
   - **Rotate Supabase API keys immediately** (rotate project JWT secret / regenerate keys) and invalidate the exposed token(s).
   - Remove hardcoded keys from all scripts; load from env:
     ```js
     const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
     ```
   - Purge secrets from git history if they were ever pushed (`git filter-repo` / BFG) + force-push + rotate again.
10. References:
   - CWE-798 (Use of Hard-coded Credentials)
   - OWASP Top 10 2021: A02 (Cryptographic Failures), A07 (Identification & Authentication Failures)
   - Supabase: service_role key guidance (RLS bypass)

---

### F-002 — Unauthenticated Netlify Functions (Remote Trigger of Privileged Workflows)
1. Vulnerability Name / Title: Unauthenticated `/.netlify/functions/*` endpoints with service-role DB access  
2. Category: Authentication & Authorization / API Security  
3. Severity: **CRITICAL**  
4. CVSS Score: **9.1** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)  
5. File Path & Line Number (exact, representative):
   - `netlify/functions/discovery-bg.mts:13-15`
   - `netlify/functions/proposal-bg.mts:1`
   - `netlify/functions/onboarding-bg.mts:1`
   - `netlify/functions/outreach.mts:1`
   - `netlify/functions/followup.mts:1`
   - `netlify/functions/bizdev.mts:1`
   - `netlify/functions/research.mts:1`
   - `netlify/functions/reporter.mts:41-43`
   - `netlify/functions/agent-evaluator.mts:1`
   - `netlify/functions/invoice-check.mts:1`
   - `netlify/functions/retention.mts:1`
   - `netlify/functions/market-tracker.mts:1`
   - `netlify/functions/email-reader.mts:1`
   - `netlify/functions/supabase-heartbeat.mts:1`
6. Description:
   - Netlify Functions are HTTP-accessible by default. These handlers perform **privileged operations** (email sending, AI calls, DB updates, workflow triggers) and commonly instantiate `getServiceSupabase()` (service role).
   - There is **no request authentication** (no signature, no bearer token, no allowlist) in these handlers.
7. Proof of Concept / Evidence:
   - `netlify/functions/discovery-bg.mts:13-20` accepts JSON (`leadId`, `incomingMessage`) and runs DB reads/writes + sends emails.
8. Impact:
   - Anonymous attacker can:
     - Trigger outbound emails/WhatsApp notifications (spam, phishing from your domain).
     - Modify lead/project/revenue state, create noise in `agent_logs`, disrupt operations.
     - Burn LLM quota/cost and cause DoS via repeated invocations.
9. Remediation:
   - Add a mandatory shared-secret check to **every** function:
     - Require `Authorization: Bearer ${INTERNAL_FUNCTION_TOKEN}` (or `X-Internal-Token`) and reject otherwise.
   - Ensure scheduled invocations (cron) and internal webhooks supply the secret (implementation depends on your deployment wiring).
   - Prefer signature verification for third-party triggers (HMAC per provider) and keep internal triggers behind an authenticated gateway.
10. References:
   - OWASP Top 10 2021: A01 (Broken Access Control), A04 (Insecure Design)
   - CWE-306 (Missing Authentication for Critical Function)

---

### F-003 — Public Contact API Uses Service Role + Unsafe File Upload + PII Leak via GET
1. Vulnerability Name / Title: Public contact form endpoint performs privileged storage/DB actions and exposes PII  
2. Category: File Upload / Sensitive Data Exposure / API Security  
3. Severity: **CRITICAL**  
4. CVSS Score: **9.4** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)  
5. File Path & Line Number (exact):
   - `src/app/api/contact/route.ts:53` (service role usage)
   - `src/app/api/contact/route.ts:57-71` (file upload)
   - `src/app/api/contact/route.ts:159-165` (unauthenticated GET returns `localLeads`)
6. Description:
   - Endpoint is public (intended), but uses `getServiceSupabase()` (service role key) and uploads user-supplied files to a public bucket (`getPublicUrl`) with **no** MIME allowlist, **no** size limit, **no** malware scanning.
   - A GET handler returns in-memory `localLeads` with PII without authentication.
7. Proof of Concept / Evidence:
   - `src/app/api/contact/route.ts:61-69` uploads arbitrary `file` to `client-assets` and exposes a public URL.
   - `src/app/api/contact/route.ts:159-165` returns `localLeads` array containing emails/messages.
8. Impact:
   - Storage abuse (arbitrary public file hosting on your domain/bucket).
   - Potential stored XSS via SVG/HTML uploads if served with permissive content-type.
   - Leakage of lead PII (names/emails/messages) via unauthenticated GET.
9. Remediation:
   - Remove the public GET endpoint or protect it behind admin auth.
   - Do not use service role for public form:
     - Use anon client + strict RLS policy for `INSERT` only to `leads`.
   - Enforce file upload controls:
     - Max size, MIME sniffing, extension allowlist (e.g., pdf/png/jpg only), reject SVG/HTML, store in **private** bucket, serve via signed URLs.
   - Add anti-abuse: CAPTCHA + rate limiting + duplicate detection.
10. References:
   - OWASP Top 10 2021: A01, A05 (Security Misconfiguration), A08 (Software & Data Integrity Failures)
   - CWE-434 (Unrestricted Upload of File with Dangerous Type)
   - CWE-200 (Exposure of Sensitive Information)

---

### F-004 — Public Scraper Endpoint Enables DoS + Potential SSRF
1. Vulnerability Name / Title: Unauthenticated server-side URL fetching from external results  
2. Category: SSRF / API Abuse / Injection (network)  
3. Severity: **HIGH**  
4. CVSS Score: **8.2** (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)  
5. File Path & Line Number (exact):
   - `src/app/api/sales/generate-leads/route.ts:49` (public POST)
   - `src/app/api/sales/generate-leads/route.ts:225-229` (fetching `lead.url`)
6. Description:
   - Endpoint streams results and performs high-concurrency fetches to many third-party URLs. It is unauthenticated and has no rate limits.
   - It fetches arbitrary `lead.url` values derived from search results; this can be coerced into internal/metadata targets in some threat models (SSRF) and is a clear DoS vector.
7. Proof of Concept / Evidence:
   - `src/app/api/sales/generate-leads/route.ts:225` → `fetch(lead.url, …)`
8. Impact:
   - Resource exhaustion (CPU/mem/network), potential internal network probing (SSRF), IP reputation damage, legal/compliance issues.
9. Remediation:
   - Require authentication + role (admin/sales) before allowing scraping.
   - Add strict egress validation:
     - allow only `https:`/`http:`; block `localhost`, link-local, RFC1918 ranges, `169.254.169.254`, and non-80/443 ports.
   - Add rate limiting + concurrency caps + caching.
10. References:
   - OWASP Top 10 2021: A10 (SSRF), A04 (Insecure Design)
   - CWE-918 (SSRF)

---

### F-005 — Stored XSS via `dangerouslySetInnerHTML` Without Sanitization (Multiple)
1. Vulnerability Name / Title: Unsafe HTML rendering of untrusted/AI/RSS content  
2. Category: Cross-Site Scripting (XSS)  
3. Severity: **HIGH**  
4. CVSS Score: **8.0** (AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:N)  
5. File Path & Line Number (exact):
   - `src/components/MarkdownRenderer.tsx:53`
   - `src/app/services/[slug]/ServicePageClient.tsx:165`
   - `src/app/services/[slug]/ServicePageClient.tsx:176`
   - `src/app/admin/dashboard/careers/page.tsx:228`
   - `src/app/admin/dashboard/growth/scout/page.tsx:206`
6. Description:
   - Components construct HTML strings from untrusted sources (AI output, RSS/job descriptions, rich text) and inject them directly into the DOM without a sanitizer.
7. Proof of Concept / Evidence:
   - `src/components/MarkdownRenderer.tsx:15-33` performs regex replacements then assigns `dangerouslySetInnerHTML` without sanitization.
   - `src/app/admin/dashboard/growth/scout/page.tsx:206` only strips `<img>` tags, leaving other dangerous HTML intact.
8. Impact:
   - Account/session compromise (if cookies accessible), admin panel takeover, data exfiltration, CSRF token theft (if present), phishing UI injection.
9. Remediation:
   - Prefer rendering markdown via a safe pipeline (remark/rehype) with strict allowlist.
   - If HTML must be rendered, sanitize with a vetted sanitizer (DOMPurify / sanitize-html) with an allowlist (no `script`, no event handlers, no `javascript:` URLs).
10. References:
   - OWASP Top 10 2021: A03 (Injection)
   - CWE-79 (XSS)

---

### F-006 — Weak Share Token Secret Strategy (Key Reuse + Insecure Default)
1. Vulnerability Name / Title: Share token signing falls back to service role key and hardcoded default  
2. Category: Cryptography / Secrets Management  
3. Severity: **HIGH**  
4. CVSS Score: **7.4** (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:H/A:N)  
5. File Path & Line Number (exact):
   - `src/lib/business-share.ts:8-14`
6. Description:
   - `getShareSecret()` falls back to `SUPABASE_SERVICE_ROLE_KEY` and then `'levitate-local-share-secret'`.
   - Key reuse increases blast radius: compromise of service role also implies ability to forge share tokens.
   - Hardcoded default is unsafe if environment is misconfigured.
7. Proof of Concept / Evidence:
   - `src/lib/business-share.ts:9-14` shows fallback chain ending in a literal secret.
8. Impact:
   - Forged share tokens could grant unauthorized access to shared resources (depending on validation locations).
9. Remediation:
   - Require `SHARE_SIGNING_SECRET` (no fallback). Fail fast in production if missing.
   - Keep it distinct from DB/service keys and rotate independently.
10. References:
   - CWE-321 (Use of Hard-coded Cryptographic Key)
   - OWASP Top 10 2021: A02 (Cryptographic Failures)

---

### F-007 — Public Health Endpoint Information Leakage
1. Vulnerability Name / Title: Health endpoint discloses internal integration details  
2. Category: Sensitive Data Exposure / Security Misconfiguration  
3. Severity: **MEDIUM**  
4. CVSS Score: **5.3** (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)  
5. File Path & Line Number (exact):
   - `src/app/api/health/route.ts:65-90`
6. Description:
   - Returns detailed status of Supabase/AI/SMTP/Razorpay. Leaks service names, SMTP user/host (`info: "${user} via ${host}"`), and operational configuration that helps attackers.
7. Proof of Concept / Evidence:
   - `src/app/api/health/route.ts:40-46` returns SMTP info.
8. Impact:
   - Reconnaissance enabling targeted phishing and abuse; amplifies other attacks.
9. Remediation:
   - Protect with a secret header/token or allowlist monitoring IPs.
   - Return minimal `200 OK`/`503` without sensitive `info` fields to public callers.
10. References:
   - CWE-200 (Information Exposure)
   - OWASP Top 10 2021: A05 (Security Misconfiguration)

---

### F-008 — SMTP TLS Verification Can Be Disabled
1. Vulnerability Name / Title: Optional `rejectUnauthorized: false` allows MITM of SMTP  
2. Category: Cryptography / Transport Security  
3. Severity: **MEDIUM**  
4. CVSS Score: **6.5** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N)  
5. File Path & Line Number (exact):
   - `src/app/api/auth/forgot-password/route.ts:78-88`
6. Description:
   - If `SMTP_ALLOW_INSECURE_TLS=true`, the transporter disables TLS certificate validation, enabling interception of password reset emails and SMTP credentials on hostile networks.
7. Proof of Concept / Evidence:
   - `src/app/api/auth/forgot-password/route.ts:87` sets `tls: { rejectUnauthorized: false }`.
8. Impact:
   - Email content theft, account takeover, SMTP credential exposure.
9. Remediation:
   - Remove insecure toggle in production; only allow in local dev with explicit guard:
     - `if (NODE_ENV !== 'production') { … }`
10. References:
   - CWE-295 (Improper Certificate Validation)

---

### F-009 — Potential Email Header Injection in Admin Mail Send
1. Vulnerability Name / Title: Unvalidated `fromName` / `fromEmail` may enable CRLF header injection  
2. Category: Injection (Header Injection)  
3. Severity: **MEDIUM**  
4. CVSS Score: **6.1** (AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:N)  
5. File Path & Line Number (exact):
   - `src/app/api/admin/mailbox/send/route.ts:21-37`
6. Description:
   - `fromEmail` and `fromName` are accepted from request JSON and interpolated into the `from` string. If not normalized, CRLF can potentially inject additional headers depending on transport behavior.
7. Proof of Concept / Evidence:
   - `src/app/api/admin/mailbox/send/route.ts:124` uses `from: \`"${senderName}" <${senderEmail}>\``.
8. Impact:
   - Spoofed headers, BCC injection, mail relay abuse (depends on nodemailer hardening).
9. Remediation:
   - Disallow caller-controlled sender fields or strictly validate:
     - `fromEmail` must match a safe allowlist domain.
     - Reject any `\\r`/`\\n` in header fields.
10. References:
   - CWE-93 (Improper Neutralization of CRLF Sequences)

---

### F-010 — Missing Content Security Policy (CSP)
1. Vulnerability Name / Title: No CSP to mitigate XSS impact  
2. Category: Security Headers  
3. Severity: **MEDIUM**  
4. CVSS Score: N/A  
5. File Path & Line Number (exact):
   - `src/middleware.ts:1` (security headers set, but no CSP)
   - `netlify.toml:1` (headers set, but no CSP)
6. Description:
   - Without a CSP, any successful XSS has a higher impact (script execution, data exfil).
7. Proof of Concept / Evidence:
   - `src/middleware.ts` sets multiple headers but does not set `Content-Security-Policy`.
8. Impact:
   - XSS becomes easier to weaponize.
9. Remediation:
   - Start with a report-only CSP, then enforce. Typical Next.js baseline (adjust for analytics/CDNs):
     - `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none';`
10. References:
   - OWASP Secure Headers Project

---

### F-011 — Dependency & Supply Chain Risk (npm audit)
1. Vulnerability Name / Title: Known vulnerable dependencies in lockfile  
2. Category: Dependency / Supply Chain Security  
3. Severity: **CRITICAL**  
4. CVSS Score: N/A (varies per advisory)  
5. File Path & Line Number (exact):
   - `package.json:1`
   - `package-lock.json:1`
   - `security-audit/npm-audit.json:1`
6. Description:
   - `npm audit` reports `total=35` vulnerable packages: `critical=2`, `high=27`, `moderate=5`, `low=1`. See `security-audit/npm-audit-summary.json` for parsed details.
7. Proof of Concept / Evidence:
   - Critical examples from audit:
     - `basic-ftp` (path traversal) — fix available.
     - `fast-xml-parser` (DoS) — fix available.
     - `next` (DoS) — fix available (`next@16.2.4` suggested by audit).
     - `nodemailer` (SMTP command injection) — fix available (`nodemailer@8.0.6` suggested by audit).
8. Impact:
   - Remote DoS, injection primitives, transitive supply chain exposure.
9. Remediation:
   - Triage by reachability (prod vs dev, server vs client) and upgrade with lockfile updates:
     - `npm audit fix` (review changes)
     - For breaking upgrades, pin and migrate intentionally.
10. References:
   - OWASP Top 10 2021: A06 (Vulnerable and Outdated Components)
   - OSV / GitHub Security Advisories

---

### F-012 — GitHub Actions Hardening Gaps (Action Pinning + Secret Scope)
1. Vulnerability Name / Title: CI supply chain hardening gaps in workflows  
2. Category: CI/CD Pipeline Security  
3. Severity: **MEDIUM**  
4. CVSS Score: N/A  
5. File Path & Line Number (exact):
   - `.github/workflows/coding-agent.yml:1`
6. Description:
   - Third-party actions are referenced by mutable tags (`@v4`) rather than commit SHAs.
   - Secrets are set at workflow `env:` scope, making them available to all jobs/steps (increased blast radius).
7. Proof of Concept / Evidence:
   - `.github/workflows/coding-agent.yml:15-24` sets multiple secrets globally in `env:`.
8. Impact:
   - Compromised action/tag update could exfiltrate secrets; overbroad secret scope increases damage.
9. Remediation:
   - Pin actions to commit SHA.
   - Scope secrets to the minimal job/step needing them.
   - Add environment protections for deploy steps (approvals).
10. References:
   - GitHub Actions security hardening guidance
   - CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)

---

### F-013 — Repository Hygiene: Tracked `.netlify/` and Missing Ignore Patterns
1. Vulnerability Name / Title: Generated Netlify state committed; missing `.gitignore` patterns for sensitive local artifacts  
2. Category: Secrets & Credential Exposure / Supply Chain  
3. Severity: **HIGH**  
4. CVSS Score: N/A  
5. File Path & Line Number (exact):
   - `.gitignore:1`
   - `.netlify/state.json:1`
6. Description:
   - `git ls-files` shows **~29k tracked files under `.netlify/`** (generated deploy state, vendored deps). This increases attack surface and the chance of committing sensitive build artifacts.
   - `.gitignore` does not currently ignore `.netlify/`, `.wwebjs_auth/`, `.wwebjs_cache/`, `.codex-*.log`, `security-audit/`.
7. Proof of Concept / Evidence:
   - `.netlify/state.json` exists and is tracked; `.netlify/` contains generated handler bundles and dependency copies.
8. Impact:
   - Accidental leak of build artifacts, internal paths, deployment metadata; increased repo size; harder reviews.
9. Remediation:
   - Remove `.netlify/` from git tracking and add to `.gitignore`.
   - Add ignore patterns for WhatsApp auth/cache and local tool logs.
10. References:
   - OWASP Top 10 2021: A05 (Security Misconfiguration)

---

## RISK MATRIX (Likelihood × Impact)

| Finding | Likelihood | Impact | Risk |
|---|---:|---:|---:|
| F-001 Hardcoded service_role key | High | High | **Critical** |
| F-002 Unauth Netlify Functions | High | High | **Critical** |
| F-003 Contact API upload + PII leak | High | High | **Critical** |
| F-004 Public scraper (DoS/SSRF) | High | Medium | High |
| F-005 Stored XSS | Medium | High | High |
| F-006 Share secret fallback | Medium | Medium | Medium |
| F-007 Health info leak | High | Low | Medium |
| F-008 Insecure SMTP TLS toggle | Medium | Medium | Medium |
| F-009 Email header injection risk | Low | Medium | Medium |
| F-010 Missing CSP | Medium | Medium | Medium |
| F-011 Vulnerable deps | Medium | High | High |
| F-012 Workflow hardening gaps | Medium | Medium | Medium |
| F-013 Tracked `.netlify/` | Medium | Medium | Medium |

---

## REMEDIATION ROADMAP (Quick Wins → Long-Term)

Quick wins (hours)
1. Rotate Supabase secrets (JWT secret / service role keys) + revoke exposed tokens (F-001).
2. Block public access to `/.netlify/functions/*` (auth gateway or shared secret) (F-002).
3. Remove `GET` from `src/app/api/contact/route.ts` or protect it (F-003).
4. Disable/lock down `src/app/api/sales/generate-leads/route.ts` behind auth (F-004).

Medium term (days)
5. Add HTML sanitization + remove unsafe rendering patterns (F-005) + add CSP (F-010).
6. Replace share secret fallback with dedicated required secret (F-006).
7. Harden email sending: header validation + upgrade nodemailer per audit (F-009, F-011).

Long term (weeks)
8. Full dependency upgrade plan (Next.js, transitive vulns), add automated SCA in CI (F-011).
9. CI hardening: pin actions by SHA, restrict secret scope, add environment approvals (F-012).
10. Repo hygiene: remove `.netlify/` from git history, add ignore patterns, enforce pre-commit secret scanning (F-013).

---

## ONGOING SECURITY HYGIENE CHECKLIST

- Secrets
  - Enable secret scanning (GitHub) + pre-commit hooks (gitleaks/trufflehog).
  - Keep service-role keys out of local `.env` when possible; use managed secrets.
- AuthZ
  - Keep the `src/middleware.ts` protections; add equivalent protection for `/.netlify/functions/*`.
  - Enforce least-privilege DB access: anon client + RLS for public endpoints.
- Web
  - Implement CSP (start report-only), sanitize any HTML rendering, avoid `dangerouslySetInnerHTML`.
  - Add rate limiting (contact form, password reset, AI endpoints, scrapers).
- Supply chain
  - Run SCA on every push; review `npm audit` deltas; pin critical actions by SHA.
- Monitoring
  - Log auth failures, admin actions, bulk exports; alert on spikes in function invocations and email sends.

---

## ARTIFACTS

- Raw scan matches: `security-audit/raw-matches.json`
- Repo inventory: `security-audit/inventory.json`
- npm audit output: `security-audit/npm-audit.json`
- npm audit parsed summary: `security-audit/npm-audit-summary.json`

