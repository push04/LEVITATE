import { timingSafeEqual } from 'node:crypto'

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a)
  const bb = Buffer.from(b)
  if (aa.length !== bb.length) return false
  return timingSafeEqual(aa, bb)
}

function getBearerToken(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const [scheme, token] = auth.split(' ')
  if (scheme?.toLowerCase() !== 'bearer') return null
  return (token || '').trim() || null
}

export function requireInternalAuth(req: Request) {
  const expected = (process.env.INTERNAL_FUNCTION_TOKEN || '').trim()
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      return new Response('Misconfigured', { status: 500 })
    }
    return null
  }

  const provided =
    getBearerToken(req) ||
    (req.headers.get('x-internal-token') || '').trim() ||
    (req.headers.get('x-internal-function-token') || '').trim() ||
    null

  if (!provided) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!safeEqual(provided, expected)) {
    return new Response('Unauthorized', { status: 401 })
  }

  return null
}

