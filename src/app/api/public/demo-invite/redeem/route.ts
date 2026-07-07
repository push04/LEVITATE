import { NextRequest, NextResponse } from 'next/server';
import { findActiveInvite, markInviteRedeemed } from '@/lib/demo-invite';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code : '';
  if (!code.trim()) {
    return NextResponse.json({ valid: false, error: 'Enter your invite code.' }, { status: 400 });
  }

  const invite = await findActiveInvite(code);
  if (!invite) {
    return NextResponse.json({ valid: false, error: 'That invite code is invalid or has expired.' }, { status: 404 });
  }

  await markInviteRedeemed(invite);

  return NextResponse.json({
    valid: true,
    code: invite.code,
    businessName: invite.business_name,
    contactName: invite.contact_name,
    tool: invite.tool,
    maxTries: invite.max_tries,
  });
}
