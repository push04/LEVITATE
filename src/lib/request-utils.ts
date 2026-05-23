export function getClientIp(req: Pick<Request, 'headers'>) {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = req.headers.get('x-real-ip') || req.headers.get('x-client-ip')
  return (realIp || 'unknown').trim() || 'unknown'
}

export function isHeaderSafeValue(value: string) {
  return !/[\r\n]/.test(value)
}
