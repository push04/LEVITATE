'use client';

import { useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import ProgressBar from './ProgressBar';
import Step0_Intro from './Step0_Intro';
import Step1_QualificationChat from './Step1_QualificationChat';
import Step2_ServiceSelection from './Step2_ServiceSelection';
import Step3_ContactForm from './Step3_ContactForm';
import Step4_Confirmation from './Step4_Confirmation';
import {
  type WizardState,
  type WizardAction,
  type QualificationMessage,
  type ContactDetails,
  type LeadTier,
} from '@/lib/types/intake';

const VALID_TIERS: LeadTier[] = ['hot', 'warm', 'cold'];

const initialState: WizardState = {
  step: 0,
  qualificationMessages: [],
  qualificationComplete: false,
  recommendedSlugs: [],
  selectedSlugs: [],
  leadScore: null,
  leadTier: null,
  aiRecommendationReason: '',
  contactDetails: { businessName: '', contactName: '', email: '', phone: '', website: '', referral: '' },
  aiConfirmationMessage: '',
  aiNextStepsMessage: '',
  aiQualificationSummary: '',
  aiProposalSnippet: '',
  isSubmitting: false,
  submitError: null,
  submittedLeadId: null,
};

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, qualificationMessages: [...state.qualificationMessages, action.payload] };
    case 'SET_QUALIFICATION_COMPLETE':
      return { ...state, qualificationComplete: true };
    case 'SET_RECOMMENDATIONS':
      return {
        ...state,
        recommendedSlugs: action.payload.recommendedSlugs,
        selectedSlugs: action.payload.recommendedSlugs,
        leadScore: action.payload.leadScore,
        leadTier: action.payload.leadTier,
        aiRecommendationReason: action.payload.reason,
      };
    case 'TOGGLE_SERVICE': {
      const slug = action.payload;
      return {
        ...state,
        selectedSlugs: state.selectedSlugs.includes(slug)
          ? state.selectedSlugs.filter(s => s !== slug)
          : [...state.selectedSlugs, slug],
      };
    }
    case 'SET_CONTACT_FIELD':
      return { ...state, contactDetails: { ...state.contactDetails, [action.payload.field]: action.payload.value } };
    case 'SET_AI_CONFIRMATION':
      return {
        ...state,
        aiConfirmationMessage: action.payload.confirmationMessage,
        aiNextStepsMessage: action.payload.nextStepsMessage,
        aiQualificationSummary: action.payload.qualificationSummary,
      };
    case 'SET_PROPOSAL_SNIPPET':
      return { ...state, aiProposalSnippet: action.payload };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    case 'SET_SUBMIT_ERROR':
      return { ...state, submitError: action.payload };
    case 'SET_SUBMITTED':
      return { ...state, submittedLeadId: action.payload, isSubmitting: false };
    default:
      return state;
  }
}

interface Props {
  refToken?: string | null;
}

export default function IntakeWizard({ refToken }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const recommendingRef = useRef(false);
  const summarizingRef = useRef(false);

  // ── Fetch recommendations once qualification is complete ─────────────────
  useEffect(() => {
    if (!state.qualificationComplete || state.step !== 1 || recommendingRef.current) return;
    recommendingRef.current = true;

    const run = async () => {
      setIsAnalyzing(true);
      try {
        const res = await fetch('/api/intake/groq-qualify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: state.qualificationMessages, step: 'recommend' }),
        });
        const data = await res.json();
        const parsed = JSON.parse(data.content || '{}');
        dispatch({
          type: 'SET_RECOMMENDATIONS',
          payload: {
            recommendedSlugs: Array.isArray(parsed.recommended_slugs) ? parsed.recommended_slugs : [],
            leadScore: typeof parsed.lead_score === 'number' ? parsed.lead_score : 50,
            leadTier: VALID_TIERS.includes(parsed.lead_tier) ? parsed.lead_tier : 'warm',
            reason: typeof parsed.reason === 'string' ? parsed.reason : '',
          },
        });
      } catch {
        dispatch({ type: 'SET_RECOMMENDATIONS', payload: { recommendedSlugs: [], leadScore: 50, leadTier: 'warm', reason: '' } });
      } finally {
        setIsAnalyzing(false);
        setTimeout(() => dispatch({ type: 'SET_STEP', payload: 2 }), 400);
      }
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.qualificationComplete]);

  // ── Fetch AI summary when entering Step 4 ────────────────────────────────
  useEffect(() => {
    if (state.step !== 4 || state.aiConfirmationMessage || summarizingRef.current) return;
    summarizingRef.current = true;

    const run = async () => {
      try {
        const res = await fetch('/api/intake/groq-qualify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step: 'summarize',
            messages: state.qualificationMessages,
            selectedServices: state.selectedSlugs,
            businessName: state.contactDetails.businessName,
            contactName: state.contactDetails.contactName,
          }),
        });
        const data = await res.json();
        const parts = (data.content || '').split('|||');
        dispatch({
          type: 'SET_AI_CONFIRMATION',
          payload: {
            confirmationMessage: (parts[0] || '').trim(),
            nextStepsMessage: (parts[1] || '').trim(),
            qualificationSummary: (parts[2] || '').replace('INTERNAL:', '').trim(),
          },
        });
      } catch {
        dispatch({ type: 'SET_AI_CONFIRMATION', payload: { confirmationMessage: '', nextStepsMessage: '', qualificationSummary: '' } });
      }
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step]);

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    dispatch({ type: 'SET_SUBMIT_ERROR', payload: null });

    try {
      sessionStorage.setItem('intake_backup', JSON.stringify(state));
    } catch {}

    try {
      const res = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qualificationMessages: state.qualificationMessages,
          selectedSlugs: state.selectedSlugs,
          recommendedSlugs: state.recommendedSlugs,
          leadScore: state.leadScore,
          leadTier: state.leadTier,
          aiRecommendationReason: state.aiRecommendationReason,
          aiQualificationSummary: state.aiQualificationSummary,
          aiProposalSnippet: state.aiProposalSnippet,
          contactDetails: state.contactDetails,
          refToken: refToken ?? null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch({ type: 'SET_SUBMITTED', payload: data.id });
      } else {
        dispatch({ type: 'SET_SUBMIT_ERROR', payload: data.error || 'Submission failed. Please try again.' });
        dispatch({ type: 'SET_SUBMITTING', payload: false });
      }
    } catch {
      dispatch({ type: 'SET_SUBMIT_ERROR', payload: 'Network error. Please try again.' });
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const addMessage = useCallback((msg: QualificationMessage) => {
    dispatch({ type: 'ADD_MESSAGE', payload: msg });
  }, []);

  const handleQualificationComplete = useCallback(() => {
    dispatch({ type: 'SET_QUALIFICATION_COMPLETE' });
  }, []);

  const toggleService = useCallback((slug: string) => {
    dispatch({ type: 'TOGGLE_SERVICE', payload: slug });
  }, []);

  const setContactField = useCallback((field: keyof ContactDetails, value: string) => {
    dispatch({ type: 'SET_CONTACT_FIELD', payload: { field, value } });
  }, []);

  const stepLabels = ['Info', 'Services', 'Contact', 'Submit'];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar for steps 1-4 */}
      {state.step > 0 && (
        <div className="mb-6">
          <ProgressBar step={state.step} total={4} />
          <div className="flex justify-between mt-1.5">
            {stepLabels.map((label, i) => (
              <span
                key={label}
                className={`text-[11px] font-medium transition-colors ${
                  state.step > i ? 'text-indigo-600' : state.step === i + 1 ? 'text-gray-700' : 'text-gray-300'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <AnimatePresence mode="wait">
          {state.step === 0 && (
            <Step0_Intro onStart={() => dispatch({ type: 'SET_STEP', payload: 1 })} />
          )}
          {state.step === 1 && (
            <Step1_QualificationChat
              messages={state.qualificationMessages}
              onAddMessage={addMessage}
              onQualificationComplete={handleQualificationComplete}
              isAnalyzing={isAnalyzing}
            />
          )}
          {state.step === 2 && (
            <Step2_ServiceSelection
              recommendedSlugs={state.recommendedSlugs}
              selectedSlugs={state.selectedSlugs}
              aiRecommendationReason={state.aiRecommendationReason}
              onToggle={toggleService}
              onNext={() => dispatch({ type: 'SET_STEP', payload: 3 })}
              onBack={() => dispatch({ type: 'SET_STEP', payload: 1 })}
            />
          )}
          {state.step === 3 && (
            <Step3_ContactForm
              contactDetails={state.contactDetails}
              onUpdateField={setContactField}
              onNext={() => dispatch({ type: 'SET_STEP', payload: 4 })}
              onBack={() => dispatch({ type: 'SET_STEP', payload: 2 })}
            />
          )}
          {state.step === 4 && (
            <Step4_Confirmation
              state={state}
              onSubmit={handleSubmit}
              onBack={() => dispatch({ type: 'SET_STEP', payload: 3 })}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
