import { NextResponse } from 'next/server'
import { notifyFounder } from '@/lib/email/client'

export async function GET() {
  const success = await notifyFounder(
    'Test Email from Levitate Labs',
    'This is a test email from your Levitate Labs automation system.\n\nIf you receive this, your email notifications are working!\n\nTimestamp: ' + new Date().toISOString()
  )
  
  return NextResponse.json({ success, message: success ? 'Test email sent!' : 'Failed to send email' })
}
