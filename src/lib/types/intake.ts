export type ServiceCategory =
  | 'social_media'
  | 'marketplace'
  | 'pr'
  | 'lead_gen'
  | 'analytics'
  | 'reputation'
  | 'support';

export type LeadTier = 'hot' | 'warm' | 'cold';
export type WizardStep = 0 | 1 | 2 | 3 | 4;

export interface IntakeService {
  slug: string;
  name: string;
  category: ServiceCategory;
  description: string;
}

export interface QualificationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ContactDetails {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  referral: string;
}

export interface WizardState {
  step: WizardStep;
  qualificationMessages: QualificationMessage[];
  qualificationComplete: boolean;
  recommendedSlugs: string[];
  selectedSlugs: string[];
  leadScore: number | null;
  leadTier: LeadTier | null;
  aiRecommendationReason: string;
  contactDetails: ContactDetails;
  aiConfirmationMessage: string;
  aiNextStepsMessage: string;
  aiQualificationSummary: string;
  aiProposalSnippet: string;
  isSubmitting: boolean;
  submitError: string | null;
  submittedLeadId: string | null;
}

export type WizardAction =
  | { type: 'SET_STEP'; payload: WizardStep }
  | { type: 'ADD_MESSAGE'; payload: QualificationMessage }
  | { type: 'SET_QUALIFICATION_COMPLETE' }
  | { type: 'SET_RECOMMENDATIONS'; payload: { recommendedSlugs: string[]; leadScore: number; leadTier: LeadTier; reason: string } }
  | { type: 'TOGGLE_SERVICE'; payload: string }
  | { type: 'SET_CONTACT_FIELD'; payload: { field: keyof ContactDetails; value: string } }
  | { type: 'SET_AI_CONFIRMATION'; payload: { confirmationMessage: string; nextStepsMessage: string; qualificationSummary: string } }
  | { type: 'SET_PROPOSAL_SNIPPET'; payload: string }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_SUBMIT_ERROR'; payload: string | null }
  | { type: 'SET_SUBMITTED'; payload: string };

export interface IntakeSubmission {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  website: string | null;
  referral: string | null;
  qualification_messages: QualificationMessage[] | null;
  selected_service_slugs: string[] | null;
  recommended_service_slugs: string[] | null;
  ai_qualification_summary: string | null;
  ai_proposal_snippet: string | null;
  ai_lead_score: number | null;
  ai_lead_tier: LeadTier | null;
  ai_recommendation_reason: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}
