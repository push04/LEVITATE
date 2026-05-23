import { createHmac, timingSafeEqual } from 'node:crypto'
import { ensureWorkspaceSlug } from '@/lib/onboarding'

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://levitatelabs.online').replace(/\/$/, '')
}

function getShareSecret() {
  const secret = process.env.SHARE_SIGNING_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SHARE_SIGNING_SECRET or NEXTAUTH_SECRET must be set in production');
    }
    return 'levitate-local-share-secret';
  }

  return secret;
}

export function resolveWorkspaceSlug(companyName: string, workspaceUrl?: string | null) {
  if (workspaceUrl) {
    try {
      const parsed = new URL(workspaceUrl)
      const firstPathSegment = parsed.pathname.split('/').filter(Boolean)[0]
      if (firstPathSegment) {
        return firstPathSegment
      }
    } catch {
      // Ignore invalid URLs and derive a slug from the company name instead.
    }
  }

  return ensureWorkspaceSlug(companyName || 'business')
}

export function buildSharedReportBacklinkUrl(input: {
  companyName: string
  shareToken: string
  workspaceUrl?: string | null
}) {
  const slug = resolveWorkspaceSlug(input.companyName, input.workspaceUrl)
  return `${getBaseUrl()}/${slug}/report/${input.shareToken}`
}

export function createLegalNoticeShareToken(noticeId: string) {
  const encodedId = Buffer.from(noticeId, 'utf8').toString('base64url')
  const signature = createHmac('sha256', getShareSecret())
    .update(`legal-notice:${noticeId}`)
    .digest('base64url')

  return `${encodedId}.${signature}`
}

export function resolveLegalNoticeIdFromShareToken(token: string) {
  const [encodedId, providedSignature] = token.split('.')
  if (!encodedId || !providedSignature) {
    return null
  }

  try {
    const noticeId = Buffer.from(encodedId, 'base64url').toString('utf8')
    const expectedSignature = createHmac('sha256', getShareSecret())
      .update(`legal-notice:${noticeId}`)
      .digest('base64url')

    const providedBuffer = Buffer.from(providedSignature)
    const expectedBuffer = Buffer.from(expectedSignature)
    if (providedBuffer.length !== expectedBuffer.length) {
      return null
    }

    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null
    }

    return noticeId
  } catch {
    return null
  }
}

export function buildSharedLegalNoticeBacklinkUrl(input: {
  companyName: string
  shareToken: string
  workspaceUrl?: string | null
}) {
  const slug = resolveWorkspaceSlug(input.companyName, input.workspaceUrl)
  return `${getBaseUrl()}/${slug}/legal/${input.shareToken}`
}
