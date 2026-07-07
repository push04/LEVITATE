import { NextRequest, NextResponse } from 'next/server';
import { findActiveInvite, markInviteRedeemed, marketPulseTrialStatus } from '@/lib/demo-invite';

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

  const wasAlreadyRedeemed = Boolean(invite.first_redeemed_at);
  await markInviteRedeemed(invite);

  const trial = invite.tool === 'market_pulse' ? marketPulseTrialStatus(invite) : null;

  return NextResponse.json({
    valid: true,
    code: invite.code,
    businessName: invite.business_name,
    contactName: invite.contact_name,
    tool: invite.tool,
    maxTries: invite.max_tries,
    trial: trial
      ? {
          // On first-ever redemption the clock just started - report the
          // full window rather than a stale pre-redemption computation.
          active: wasAlreadyRedeemed ? trial.active : true,
          daysRemaining: wasAlreadyRedeemed ? trial.daysRemaining : (invite.trial_days ?? 3),
        }
      : null,
  });
}
