export const MOCK_RESPONSES: Record<string, string> = {
  'BizDevAgent': '[{"name": "Shanti Sweets", "city": "Surat", "score": 8, "category": "Restaurant"}, {"name": "Patel Clinic", "city": "Vadodara", "score": 6, "category": "Clinic"}]',
  'OutreachAgent': 'Namaste {business_name}! We found your restaurant needs a website. Let us help you get more customers with online ordering.',
  'ProposalAgent': '# Proposal for {business_name}\n\n## Overview\nWe will build your professional website with online menu and WhatsApp ordering.\n\n## Pricing\n₹12,999/month',
  'ReporterAgent': 'Today: Found 12 leads in Surat, sent 8 messages via WhatsApp, 3 proposals generated. Pipeline value: ₹2.4 lakh.',
  'DiscoveryAgent': 'Lead scored: {business_name} - Score: 8/10. Has website: No. Google reviews: 12. Recommended action: Send proposal.',
  'FollowUpAgent': 'Reminder: You have 5 unanswered leads. Follow up now to increase conversion rate.',
  'RetentionAgent': '30-day check-in: How is your pipeline performing? We found 47 leads this month.',
  'InvoiceAgent': 'Friendly reminder: Invoice #123 pending for 15 days. Please make payment to continue services.',
};
