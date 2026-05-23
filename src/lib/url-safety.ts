import { isIP } from 'node:net'

function isPrivateIpv4(ip: string) {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true

  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  if (a >= 224) return true // multicast/reserved
  return false
}

export function validateSafeHttpUrl(raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, reason: 'invalid_url' as const }
  }

  if (url.username || url.password) return { ok: false, reason: 'userinfo_not_allowed' as const }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, reason: 'invalid_protocol' as const }

  const hostname = url.hostname.toLowerCase()
  if (!hostname) return { ok: false, reason: 'missing_host' as const }

  if (hostname === 'localhost' || hostname.endsWith('.local')) {
    return { ok: false, reason: 'localhost_blocked' as const }
  }

  const ipType = isIP(hostname)
  if (ipType === 4) {
    if (isPrivateIpv4(hostname)) return { ok: false, reason: 'private_ip_blocked' as const }
  } else if (ipType === 6) {
    // block all IPv6 literals (includes loopback/link-local)
    return { ok: false, reason: 'ipv6_blocked' as const }
  }

  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80
  if (![80, 443].includes(port)) return { ok: false, reason: 'port_blocked' as const }

  return { ok: true, url }
}

