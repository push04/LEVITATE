/**
 * PDF Proposal Generator — Levitate Labs
 * Generates professional PDF proposals using Puppeteer
 */

export interface ProposalContent {
  title: string
  client_name: string
  business_name: string
  scope: string
  deliverables: string[]
  timeline_days: number
  total_price: number
  advance_amount: number
  final_amount: number
  why_they_need_this: string
  our_process: string[]
  payment_link?: string
}

export function generateProposalHTML(proposal: ProposalContent): string {
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const expiryDate = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 40px; }
  .logo { font-size: 28px; font-weight: 800; letter-spacing: -1px; }
  .logo span { color: #4f9cf9; }
  .tagline { color: #94a3b8; margin-top: 4px; font-size: 13px; }
  .proposal-badge { background: #4f9cf9; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; margin-top: 20px; }
  .hero { padding: 40px; border-bottom: 2px solid #f1f5f9; }
  .hero h1 { font-size: 28px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; }
  .hero p { color: #64748b; font-size: 15px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 30px 40px; background: #f8fafc; }
  .meta-item label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
  .meta-item p { font-size: 15px; font-weight: 600; color: #1a1a2e; margin-top: 2px; }
  .section { padding: 30px 40px; border-bottom: 1px solid #f1f5f9; }
  .section h2 { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .section h2::before { content: ''; width: 4px; height: 20px; background: #4f9cf9; border-radius: 2px; }
  .deliverables { list-style: none; }
  .deliverables li { padding: 8px 0; display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #334155; }
  .deliverables li::before { content: '✓'; color: #22c55e; font-weight: 700; flex-shrink: 0; }
  .pricing-box { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; border-radius: 16px; padding: 30px; }
  .pricing-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .pricing-row:last-child { border-bottom: none; font-size: 18px; font-weight: 700; padding-top: 16px; }
  .pricing-row span:first-child { color: #94a3b8; }
  .pricing-row span:last-child { color: white; }
  .cta-box { background: #4f9cf9; color: white; padding: 24px; border-radius: 12px; margin: 30px 40px; text-align: center; }
  .cta-box h3 { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
  .cta-box p { font-size: 13px; opacity: 0.9; margin-bottom: 16px; }
  .cta-link { background: white; color: #4f9cf9; padding: 10px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; }
  .process-steps { counter-reset: step; }
  .process-step { counter-increment: step; display: flex; gap: 16px; padding: 12px 0; }
  .step-num { width: 28px; height: 28px; background: #4f9cf9; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
  .step-num::before { content: counter(step); }
  .footer { padding: 24px 40px; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>

<div class="header">
  <div class="logo">Levitate<span>Labs</span></div>
  <div class="tagline">AI-Powered Web Development · levitatelabs.online</div>
  <div class="proposal-badge">📋 WEBSITE PROPOSAL</div>
</div>

<div class="hero">
  <p style="color:#4f9cf9; font-size:13px; font-weight:600; margin-bottom:8px;">PREPARED FOR</p>
  <h1>${proposal.business_name}</h1>
  <p>Attn: ${proposal.client_name} · ${date}</p>
</div>

<div class="meta-grid">
  <div class="meta-item">
    <label>Project</label>
    <p>${proposal.title}</p>
  </div>
  <div class="meta-item">
    <label>Timeline</label>
    <p>${proposal.timeline_days} Business Days</p>
  </div>
  <div class="meta-item">
    <label>Valid Until</label>
    <p>${expiryDate}</p>
  </div>
  <div class="meta-item">
    <label>Advance Required</label>
    <p>₹${proposal.advance_amount.toLocaleString('en-IN')} (50%)</p>
  </div>
</div>

<div class="section">
  <h2>Why You Need This</h2>
  <p style="color:#334155; line-height:1.7; font-size:14px;">${proposal.why_they_need_this}</p>
</div>

<div class="section">
  <h2>What We'll Build</h2>
  <p style="color:#64748b; font-size:13px; margin-bottom:16px;">${proposal.scope}</p>
  <ul class="deliverables">
    ${proposal.deliverables.map(d => `<li>${d}</li>`).join('')}
  </ul>
</div>

<div class="section">
  <h2>Our Process</h2>
  <div class="process-steps">
    ${proposal.our_process.map(step => `
    <div class="process-step">
      <div class="step-num"></div>
      <p style="font-size:14px; color:#334155; padding-top:4px;">${step}</p>
    </div>`).join('')}
  </div>
</div>

<div class="section">
  <h2>Investment</h2>
  <div class="pricing-box">
    <div class="pricing-row">
      <span>Website Development</span>
      <span>₹${proposal.total_price.toLocaleString('en-IN')}</span>
    </div>
    <div class="pricing-row">
      <span>Advance (to start)</span>
      <span>₹${proposal.advance_amount.toLocaleString('en-IN')}</span>
    </div>
    <div class="pricing-row">
      <span>Balance (on delivery)</span>
      <span>₹${proposal.final_amount.toLocaleString('en-IN')}</span>
    </div>
    <div class="pricing-row">
      <span>Total Investment</span>
      <span>₹${proposal.total_price.toLocaleString('en-IN')}</span>
    </div>
  </div>
</div>

${proposal.payment_link ? `
<div class="cta-box">
  <h3>Ready to Get Started? 🚀</h3>
  <p>Pay the advance to lock in your spot and start building immediately.</p>
  <a class="cta-link" href="${proposal.payment_link}">Pay ₹${proposal.advance_amount.toLocaleString('en-IN')} Now →</a>
</div>` : ''}

<div class="footer">
  <div>
    <strong>Levitate Labs</strong> · hello@levitatelabs.online<br>
    GSV Campus, Vadodara, Gujarat
  </div>
  <div style="text-align:right;">
    This proposal is confidential and expires on ${expiryDate}.<br>
    Questions? Reply on WhatsApp — we respond within 1 hour.
  </div>
</div>

</body>
</html>`
}

export async function generateProposalPDF(proposal: ProposalContent): Promise<Buffer> {
  const html = generateProposalHTML(proposal)

  try {
    // Try with puppeteer-core (already in package.json)
    const chromium = await import('@sparticuz/chromium-min')
    const puppeteer = await import('puppeteer-core')

    const browser = await puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
      ),
      headless: true
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } })
    await browser.close()

    return Buffer.from(pdf)
  } catch {
    // Fallback: return HTML as UTF-8 buffer (client can print-to-PDF)
    return Buffer.from(html, 'utf-8')
  }
}
