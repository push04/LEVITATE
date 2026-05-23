export type DemoLeadStatus = 'Found' | 'Contacted' | 'Responded' | 'Proposal Sent' | 'Converted';

export type DemoLead = {
  id: string;
  businessName: string;
  city: string;
  category: string;
  phone: string;
  leadScore: number; // 1-10
  status: DemoLeadStatus;
};

export const DEMO_LEADS: DemoLead[] = [
  { id: 'L-001', businessName: 'Shreeji Dental Care', city: 'Vadodara', category: 'Clinic', phone: '+91 98980 12011', leadScore: 9, status: 'Found' },
  { id: 'L-002', businessName: 'Surat Spice Kitchen', city: 'Surat', category: 'Restaurant', phone: '+91 99099 44102', leadScore: 8, status: 'Contacted' },
  { id: 'L-003', businessName: 'Nadiad Coaching Hub', city: 'Nadiad', category: 'Coaching Centre', phone: '+91 78785 23019', leadScore: 7, status: 'Responded' },
  { id: 'L-004', businessName: 'Rajkot Property Desk', city: 'Rajkot', category: 'Real Estate', phone: '+91 97262 50144', leadScore: 6, status: 'Proposal Sent' },
  { id: 'L-005', businessName: 'Anand Wellness Clinic', city: 'Anand', category: 'Clinic', phone: '+91 88662 11490', leadScore: 10, status: 'Converted' },
  { id: 'L-006', businessName: 'Navsari Tiffin Point', city: 'Navsari', category: 'Restaurant', phone: '+91 95102 77423', leadScore: 5, status: 'Found' },
  { id: 'L-007', businessName: 'Bhavnagar Tuition Studio', city: 'Bhavnagar', category: 'Coaching Centre', phone: '+91 94277 88301', leadScore: 6, status: 'Contacted' },
  { id: 'L-008', businessName: 'Gandhinagar Skin Clinic', city: 'Gandhinagar', category: 'Clinic', phone: '+91 99799 10233', leadScore: 8, status: 'Responded' },
  { id: 'L-009', businessName: 'Junagadh Cafe Corner', city: 'Junagadh', category: 'Restaurant', phone: '+91 90169 55008', leadScore: 4, status: 'Found' },
  { id: 'L-010', businessName: 'Vapi Realty & Co.', city: 'Vapi', category: 'Real Estate', phone: '+91 98252 77140', leadScore: 7, status: 'Contacted' },
  { id: 'L-011', businessName: 'Valsad Kids Coaching', city: 'Valsad', category: 'Coaching Centre', phone: '+91 90990 11378', leadScore: 6, status: 'Responded' },
  { id: 'L-012', businessName: 'Bharuch Ortho Clinic', city: 'Bharuch', category: 'Clinic', phone: '+91 98795 40126', leadScore: 9, status: 'Proposal Sent' },
  { id: 'L-013', businessName: 'Mehsana Meal Box', city: 'Mehsana', category: 'Restaurant', phone: '+91 81410 22049', leadScore: 5, status: 'Found' },
  { id: 'L-014', businessName: 'Porbandar Fitness Studio', city: 'Porbandar', category: 'Gym', phone: '+91 97245 88319', leadScore: 7, status: 'Contacted' },
  { id: 'L-015', businessName: 'Jamnagar CA & Advisory', city: 'Jamnagar', category: 'CA/Accountant', phone: '+91 98241 22061', leadScore: 8, status: 'Responded' },
  { id: 'L-016', businessName: 'Palanpur Eye Clinic', city: 'Palanpur', category: 'Clinic', phone: '+91 94286 00813', leadScore: 6, status: 'Found' },
  { id: 'L-017', businessName: 'Ahmedabad Coaching Central', city: 'Ahmedabad', category: 'Coaching Centre', phone: '+91 98790 50155', leadScore: 9, status: 'Proposal Sent' },
  { id: 'L-018', businessName: 'Gandhidham Dine & Deliver', city: 'Gandhidham', category: 'Restaurant', phone: '+91 90330 66211', leadScore: 7, status: 'Responded' },
  { id: 'L-019', businessName: 'Morbi Tiles Realty', city: 'Morbi', category: 'Real Estate', phone: '+91 94273 12090', leadScore: 5, status: 'Found' },
  { id: 'L-020', businessName: 'Patan Learning Academy', city: 'Patan', category: 'Coaching Centre', phone: '+91 97233 45107', leadScore: 6, status: 'Contacted' },
];

export const DEMO_AGENT_NAMES = [
  'BizDev Agent',
  'Outreach Agent',
  'Proposal Agent',
  'Invoice Agent',
  'Website Agent',
  'Retention Agent',
  'Follow-Up Agent',
  'Discovery Agent',
  'Reporter Agent',
  'Coder Agent',
  'Reviewer Agent',
  'Tester Agent',
  'Debugger Agent',
  'Deployer Agent',
  'Support Agent',
  'Ops Agent',
] as const;

export const DEMO_AGENT_ACTIVITY: string[] = [
  'BizDev Agent found 12 leads in Surat',
  'Outreach Agent drafted 8 WhatsApp messages for hot leads',
  'Discovery Agent scored 20 leads and flagged 4 as high intent',
  'Proposal Agent generated a 4-page proposal for a clinic in Vadodara',
  'Invoice Agent chased 3 pending payments (Week 1 cycle)',
  'Website Agent queued a restaurant website build (24h SLA)',
  'Reporter Agent compiled today’s pipeline digest',
  'Retention Agent scheduled a 30-day check-in for a converted client',
  'Follow-Up Agent detected 2 replies and updated lead statuses',
  'Reviewer Agent validated a deployment checklist (no blockers)',
  'Tester Agent ran smoke checks on a preview URL',
  'Debugger Agent fixed 2 layout regressions from QA notes',
  'Deployer Agent shipped a Netlify deploy for a client site',
  'Support Agent replied to a workspace onboarding question',
  'Ops Agent rotated daily quotas and cleaned old logs',
  'Outreach Agent prepared Hinglish variants for follow-ups',
  'BizDev Agent refreshed Google Maps queries for Anand',
  'Proposal Agent updated pricing table with INR formatting',
  'Website Agent measured delivery time averages (last 7 days)',
  'Invoice Agent generated polite reminders for overdue invoices',
  'Retention Agent attached referral link to check-in template',
  'Discovery Agent tagged leads by vertical: clinic/restaurant/coaching',
  'Reporter Agent posted “what changed today” summary to admin feed',
  'Support Agent created a quick SOP for WhatsApp opt-in',
  'Ops Agent marked one agent as degraded due to API timeout',
  'BizDev Agent found 9 leads in Rajkot',
  'Outreach Agent queued outreach for 5 leads (demo mode)',
  'Proposal Agent generated a brochure PDF draft (demo mode)',
  'Website Agent deployed 1 site to Netlify (demo mode)',
  'Invoice Agent logged “payment promised by Friday” note',
  'Retention Agent drafted a “how to use pipeline” guide',
  'Follow-Up Agent scheduled re-contact for 6 leads',
  'Discovery Agent boosted lead score for “no website + recent reviews”',
  'Reporter Agent summarized MRR trend movement',
  'Coder Agent prepared website content blocks by vertical',
  'Reviewer Agent suggested a copy improvement for CTA clarity',
  'Tester Agent flagged a missing alt attribute (fixed)',
  'Debugger Agent rechecked Core Web Vitals (pass)',
  'Deployer Agent created a deploy preview for review',
  'Ops Agent verified Supabase connection health check',
  'Support Agent updated onboarding FAQ answers',
  'BizDev Agent found 7 leads in Bhavnagar',
  'Outreach Agent drafted 10 messages for coaching centres',
  'Proposal Agent generated 2 proposal variants for comparison',
  'Website Agent updated deployed sites counter',
  'Invoice Agent prepared next Monday chase batch',
  'Retention Agent queued “win-back” template for inactive clients',
  'Reporter Agent published end-of-day snapshot',
];

export const DEMO_MRR_TREND: Array<{ month: string; mrr: number }> = [
  { month: 'Nov', mrr: 0 },
  { month: 'Dec', mrr: 45000 },
  { month: 'Jan', mrr: 120000 },
  { month: 'Feb', mrr: 210000 },
  { month: 'Mar', mrr: 310000 },
  { month: 'Apr', mrr: 420000 },
];

export const DEMO_PIPELINE_COUNTS: Record<DemoLeadStatus, number> = {
  Found: 120,
  Contacted: 78,
  Responded: 34,
  'Proposal Sent': 14,
  Converted: 6,
};

export const DEMO_AGENT_CREDITS: Record<(typeof DEMO_AGENT_NAMES)[number], number> = {
  'BizDev Agent': 96,
  'Outreach Agent': 92,
  'Proposal Agent': 88,
  'Invoice Agent': 81,
  'Website Agent': 90,
  'Retention Agent': 85,
  'Follow-Up Agent': 78,
  'Discovery Agent': 84,
  'Reporter Agent': 75,
  'Coder Agent': 89,
  'Reviewer Agent': 83,
  'Tester Agent': 77,
  'Debugger Agent': 80,
  'Deployer Agent': 86,
  'Support Agent': 72,
  'Ops Agent': 74,
};

