'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Wand2, Layout, Palette, Type, Globe, Eye, Download,
  ChevronRight, ChevronLeft, Check, GripVertical, Settings,
  Sparkles, RefreshCw, Copy, ExternalLink, Code, AlignLeft,
  X, Plus, Plug, Monitor, Smartphone, ChevronDown,
} from 'lucide-react'
import {
  TEMPLATES, COLOR_THEMES, FONT_PAIRS,
  type Template, type Section, type ColorTheme, type FontPair,
} from './templates'

type Step = 'template' | 'sections' | 'design' | 'integrations' | 'content' | 'preview'

const STEPS: { id: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'template', label: 'Template', icon: Layout },
  { id: 'sections', label: 'Sections', icon: AlignLeft },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'content', label: 'Content', icon: Type },
  { id: 'preview', label: 'Preview', icon: Eye },
]

const STEP_ORDER: Step[] = ['template', 'sections', 'design', 'integrations', 'content', 'preview']

interface IntegrationsState {
  paymentGateway: string
  whatsapp: { enabled: boolean; phone: string }
  booking: boolean
  googleAnalytics: string
  facebookPixel: string
  instagramFeed: boolean
  tawkto: { enabled: boolean; siteId: string }
  cookieConsent: boolean
  ecommerce: boolean
}

interface SeoState {
  title: string
  description: string
  keywords: string
}

interface AdvancedDesignState {
  borderRadius: number
  shadowIntensity: 'none' | 'subtle' | 'medium' | 'strong'
  spacing: 'compact' | 'normal' | 'spacious'
  animation: 'none' | 'fade' | 'slide' | 'scale'
  customCss: string
}

interface BuilderState {
  template: Template | null
  sections: Section[]
  theme: ColorTheme
  font: FontPair
  businessName: string
  tagline: string
  domain: string
  aiGenerating: boolean
  published: boolean
  integrations: IntegrationsState
  seo: SeoState
  design: AdvancedDesignState
}

const defaultIntegrations: IntegrationsState = {
  paymentGateway: 'none',
  whatsapp: { enabled: false, phone: '' },
  booking: false,
  googleAnalytics: '',
  facebookPixel: '',
  instagramFeed: false,
  tawkto: { enabled: false, siteId: '' },
  cookieConsent: false,
  ecommerce: false,
}

const defaultSeo: SeoState = {
  title: '',
  description: '',
  keywords: '',
}

const defaultAdvancedDesign: AdvancedDesignState = {
  borderRadius: 12,
  shadowIntensity: 'subtle',
  spacing: 'normal',
  animation: 'fade',
  customCss: '',
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${enabled ? 'bg-[#B08D57]' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

const AI_PROGRESS_MESSAGES = [
  'Crafting headlines...',
  'Writing about section...',
  'Building features list...',
  'Polishing CTAs...',
  'Done!',
]

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export default function WebsiteBuilderPage() {
  const [step, setStep] = useState<Step>('template')
  const [state, setState] = useState<BuilderState>({
    template: null,
    sections: [],
    theme: COLOR_THEMES[0],
    font: FONT_PAIRS[0],
    businessName: '',
    tagline: '',
    domain: '',
    aiGenerating: false,
    published: false,
    integrations: defaultIntegrations,
    seo: defaultSeo,
    design: defaultAdvancedDesign,
  })
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiProgressIdx, setAiProgressIdx] = useState(0)
  const [aiSuggestions, setAiSuggestions] = useState<{ theme: ColorTheme; reason: string }[]>([])
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [publishLoading, setPublishLoading] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [sectionDiffs, setSectionDiffs] = useState<Record<string, Record<string, string>>>({})
  const [regenLoading, setRegenLoading] = useState<string | null>(null)
  const [regenError, setRegenError] = useState<Record<string, string>>({})
  const aiProgressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stepIndex = STEP_ORDER.indexOf(step)

  const debouncedState = useDebounce(state, 400)
  const generatedHtml = generatePreviewHtml(debouncedState)

  const selectTemplate = (t: Template) => {
    const suggestedTheme = COLOR_THEMES.find(c => t.suggestedThemes.includes(c.id)) ?? COLOR_THEMES[0]
    setState(s => ({
      ...s,
      template: t,
      sections: t.defaultSections.map(sec => ({ ...sec })),
      theme: suggestedTheme,
      seo: { ...s.seo, title: s.businessName || t.label, description: t.description },
    }))
    setStep('sections')
  }

  const toggleSection = (id: string) => {
    setState(s => ({ ...s, sections: s.sections.map(sec => sec.id === id ? { ...sec, enabled: !sec.enabled } : sec) }))
  }

  const updateSectionContent = (id: string, key: string, value: string) => {
    setState(s => ({
      ...s,
      sections: s.sections.map(sec => sec.id === id ? { ...sec, content: { ...sec.content, [key]: value } } : sec)
    }))
  }

  const startAiProgress = () => {
    setAiProgressIdx(0)
    let idx = 0
    aiProgressRef.current = setInterval(() => {
      idx = Math.min(idx + 1, AI_PROGRESS_MESSAGES.length - 1)
      setAiProgressIdx(idx)
      if (idx === AI_PROGRESS_MESSAGES.length - 1) {
        if (aiProgressRef.current) clearInterval(aiProgressRef.current)
      }
    }, 900)
  }

  const stopAiProgress = () => {
    if (aiProgressRef.current) clearInterval(aiProgressRef.current)
    setAiProgressIdx(AI_PROGRESS_MESSAGES.length - 1)
  }

  const runAiCopy = async () => {
    if (!state.businessName) { setAiError('Enter a business name first (Step 1)'); return }
    setAiLoading(true)
    setAiError('')
    startAiProgress()
    const prevSections: Record<string, Record<string, string>> = {}
    state.sections.filter(s => s.enabled).forEach(sec => {
      prevSections[sec.id] = Object.fromEntries(
        Object.entries(sec.content).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, v as string])
      )
    })
    try {
      const res = await fetch('/api/admin/ai-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: state.businessName,
          template: state.template?.id,
          prompt: aiPrompt,
          sections: state.sections.filter(s => s.enabled).map(s => s.type),
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'AI generation failed')
      if (json.sections) {
        const diffs: Record<string, Record<string, string>> = {}
        setState(s => ({
          ...s,
          sections: s.sections.map(sec => {
            const generated = json.sections[sec.type]
            if (generated && typeof generated === 'object') {
              diffs[sec.id] = prevSections[sec.id] ?? {}
              return { ...sec, content: { ...sec.content, ...generated } }
            }
            return sec
          })
        }))
        setSectionDiffs(diffs)
        // Auto-expand first section to show results
        const firstEnabled = state.sections.find(s => s.enabled)
        if (firstEnabled) setEditingSection(firstEnabled.id)
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI generation failed. Check your GROQ_API_KEY.')
    } finally {
      stopAiProgress()
      setAiLoading(false)
    }
  }

  const runAiRegenSection = async (secId: string) => {
    const sec = state.sections.find(s => s.id === secId)
    if (!sec || !state.businessName) return
    setRegenLoading(secId)
    const prev = Object.fromEntries(
      Object.entries(sec.content).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, v as string])
    )
    try {
      const res = await fetch('/api/admin/ai-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: state.businessName,
          template: state.template?.id,
          prompt: aiPrompt,
          sections: [sec.type],
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Regeneration failed')
      if (json.sections?.[sec.type]) {
        setSectionDiffs(d => ({ ...d, [secId]: prev }))
        setState(s => ({
          ...s,
          sections: s.sections.map(se =>
            se.id === secId ? { ...se, content: { ...se.content, ...json.sections[sec.type] } } : se
          )
        }))
        setRegenError(e => { const n = { ...e }; delete n[secId]; return n })
      }
    } catch (err) {
      setRegenError(e => ({ ...e, [secId]: err instanceof Error ? err.message : 'Regeneration failed' }))
    } finally {
      setRegenLoading(null)
    }
  }

  const runAiTheme = async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/admin/ai-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: state.businessName, template: state.template?.id, prompt: aiPrompt }),
      })
      const json = await res.json()
      if (json.success && json.suggestions) {
        setAiSuggestions(json.suggestions.map((s: { themeId: string; reason: string }) => ({
          theme: COLOR_THEMES.find(t => t.id === s.themeId) ?? COLOR_THEMES[0],
          reason: s.reason,
        })))
      } else {
        const suggestions = (state.template?.suggestedThemes ?? ['espresso', 'ocean', 'forest'])
          .slice(0, 3)
          .map(id => ({ theme: COLOR_THEMES.find(t => t.id === id) ?? COLOR_THEMES[0], reason: `Recommended for ${state.template?.label} businesses` }))
        setAiSuggestions(suggestions)
      }
    } catch {
      const suggestions = (state.template?.suggestedThemes ?? ['espresso', 'ocean']).slice(0, 2)
        .map(id => ({ theme: COLOR_THEMES.find(t => t.id === id) ?? COLOR_THEMES[0], reason: 'Recommended for your business type' }))
      setAiSuggestions(suggestions)
    } finally {
      setAiLoading(false)
    }
  }

  const surpriseMe = useCallback(() => {
    const randomTheme = COLOR_THEMES[Math.floor(Math.random() * COLOR_THEMES.length)]
    const randomFont = FONT_PAIRS[Math.floor(Math.random() * FONT_PAIRS.length)]
    setState(s => ({ ...s, theme: randomTheme, font: randomFont }))
  }, [])

  const publish = async () => {
    setPublishLoading(true)
    try {
      const res = await fetch('/api/admin/website-builder/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: state.businessName,
          domain: state.domain,
          template: state.template?.id,
          sections: state.sections,
          theme: state.theme,
          font: state.font,
          integrations: state.integrations,
          seo: state.seo,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setPublishedUrl(json.url)
        setState(s => ({ ...s, published: true }))
      }
    } catch {
      const slug = state.businessName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      setPublishedUrl(`https://levitatelabs.online/sites/${slug}`)
      setState(s => ({ ...s, published: true }))
    } finally {
      setPublishLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="border-b border-gray-200 bg-white px-4 md:px-8 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#B08D57]" />
            Website Builder
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Build client websites without code</p>
        </div>
        {state.template && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{state.template.emoji} {state.template.label}</span>
            {state.businessName && <span className="text-xs font-medium text-gray-700">— {state.businessName}</span>}
          </div>
        )}
      </div>

      <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => state.template && setStep(s.id)}
              disabled={!state.template && s.id !== 'template'}
              className="flex items-center gap-0 disabled:opacity-40"
            >
              <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                step === s.id ? 'bg-[#f5ede0] text-[#7a5f2a]' :
                stepIndex > i ? 'text-emerald-600' :
                'text-gray-400'
              }`}>
                {stepIndex > i ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-8 py-8">
        <AnimatePresence mode="wait">

          {step === 'template' && (
            <motion.div key="template" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Choose a Template</h2>
              <p className="text-sm text-gray-500 mb-6">Pick the business type that best matches your client's needs</p>

              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Business Name</label>
                    <input
                      value={state.businessName}
                      onChange={e => setState(s => ({ ...s, businessName: e.target.value }))}
                      placeholder="e.g. The Coffee Corner"
                      className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tagline / Short Description</label>
                    <input
                      value={state.tagline}
                      onChange={e => setState(s => ({ ...s, tagline: e.target.value }))}
                      placeholder="e.g. Best coffee in South Mumbai since 2015"
                      className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#B08D57]" />
                    Describe the business (AI will generate copy &amp; suggest design)
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    rows={2}
                    placeholder="e.g. A family-run South Indian filter coffee café in Bangalore, specializing in traditional brewing methods. Cozy, nostalgic vibe. Mostly office workers in 25-45 age group."
                    className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {TEMPLATES.map(t => (
                  <motion.button
                    key={t.id}
                    whileHover={{ y: -2 }}
                    onClick={() => selectTemplate(t)}
                    className="rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-[#B08D57] hover:shadow-md transition-all group"
                  >
                    <div className="text-3xl mb-3">{t.emoji}</div>
                    <p className="font-semibold text-gray-900 group-hover:text-[#7a5f2a]">{t.label}</p>
                    <p className="text-[11px] text-[#B08D57] font-medium mb-2">{t.category}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>
                    <div className="mt-3 flex gap-1">
                      {t.suggestedThemes.slice(0, 3).map(themeId => {
                        const theme = COLOR_THEMES.find(c => c.id === themeId)
                        return theme ? (
                          <div key={themeId} className="flex gap-0.5">
                            {theme.preview.map((c, i) => (
                              <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
                            ))}
                          </div>
                        ) : null
                      })}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'sections' && (
            <motion.div key="sections" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Configure Sections</h2>
                  <p className="text-sm text-gray-500 mt-1">Toggle sections on/off and drag to reorder</p>
                </div>
                <div className="text-sm text-gray-500">
                  {state.sections.filter(s => s.enabled).length} of {state.sections.length} sections active
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Reorder.Group axis="y" values={state.sections} onReorder={sections => setState(s => ({ ...s, sections }))}>
                    <div className="space-y-2">
                      {state.sections.map(sec => (
                        <Reorder.Item key={sec.id} value={sec}>
                          <div className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 cursor-default transition-all ${sec.enabled ? 'border-gray-200 shadow-sm' : 'border-dashed border-gray-200 opacity-50'}`}>
                            <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{sec.label}</p>
                              <p className="text-xs text-gray-400 capitalize">{sec.type}</p>
                            </div>
                            <Toggle enabled={sec.enabled} onChange={() => toggleSection(sec.id)} />
                          </div>
                        </Reorder.Item>
                      ))}
                    </div>
                  </Reorder.Group>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-sm font-semibold text-gray-900 mb-4">Active Sections Preview</p>
                  <div className="space-y-2">
                    {state.sections.filter(s => s.enabled).map((sec, i) => (
                      <div key={sec.id} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5 text-right tabular-nums">{i + 1}</span>
                        <div className="h-8 rounded-lg border border-[#e8d9bc] bg-[#fdf8f1] px-3 flex items-center flex-1">
                          <span className="text-xs text-[#7a5f2a] font-medium">{sec.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button onClick={() => setStep('template')} className="flex items-center gap-2 rounded-[10px] border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep('design')} className="flex items-center gap-2 rounded-[10px] bg-[#B08D57] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9a7a4a] transition-colors">
                  Next: Design <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'design' && (
            <motion.div key="design" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Design System</h2>
              <p className="text-sm text-gray-500 mb-6">Choose colors, fonts, and visual style</p>

              <div className="bg-gradient-to-r from-[#fdf8f1] to-white rounded-xl border border-[#e8d9bc] p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#B08D57]" />
                    <p className="text-sm font-semibold text-[#7a5f2a]">AI Theme Suggestions</p>
                  </div>
                  <button
                    onClick={surpriseMe}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e8d9bc] bg-white px-3 py-1.5 text-xs font-medium text-[#7a5f2a] hover:bg-[#fdf8f1] transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Surprise Me
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">Get AI-recommended color themes based on your business type and description</p>
                <button
                  onClick={runAiTheme}
                  disabled={aiLoading}
                  className="flex items-center gap-2 rounded-lg bg-[#B08D57] px-5 py-2.5 text-sm text-white font-semibold hover:bg-[#9a7a4a] disabled:opacity-50 transition-colors shadow-sm"
                >
                  {aiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Suggest Themes with AI
                </button>
                {aiSuggestions.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {aiSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setState(st => ({ ...st, theme: s.theme }))}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${state.theme.id === s.theme.id ? 'border-[#B08D57] bg-[#fdf8f1]' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      >
                        <div
                          className="rounded-lg mb-2 p-3"
                          style={{ background: `linear-gradient(135deg, ${s.theme.primary}, ${s.theme.secondary})` }}
                        >
                          <div className="text-white text-xs font-bold truncate">{state.businessName || 'Business Name'}</div>
                          <div
                            className="mt-1.5 inline-block rounded px-2 py-0.5 text-[10px] font-bold"
                            style={{ background: s.theme.accent, color: s.theme.primary }}
                          >
                            Get Started
                          </div>
                        </div>
                        <div className="flex gap-1.5 mb-1.5">
                          {s.theme.preview.map((c, j) => <div key={j} className="w-5 h-5 rounded-full" style={{ background: c }} />)}
                        </div>
                        <p className="text-xs font-semibold text-gray-900">{s.theme.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{s.reason}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-3">Color Theme</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {COLOR_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setState(s => ({ ...s, theme }))}
                      className={`rounded-xl border-2 p-3 transition-all ${state.theme.id === theme.id ? 'border-[#B08D57] shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex gap-1.5 mb-2">
                        {theme.preview.map((c, i) => <div key={i} className="w-5 h-5 rounded-full shadow-sm" style={{ background: c }} />)}
                      </div>
                      <p className="text-xs font-medium text-gray-700">{theme.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6 rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-600">Theme Preview</p>
                </div>
                <div style={{ background: state.theme.bg }} className="p-6">
                  <div className="rounded-xl p-5 shadow-sm" style={{ background: state.theme.primary }}>
                    <p className="text-white font-bold text-lg">{state.businessName || 'Your Business Name'}</p>
                    <p className="text-white/70 text-sm mt-1">{state.tagline || 'Your tagline here'}</p>
                    <div className="mt-3 inline-block rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: state.theme.accent, color: state.theme.primary }}>
                      Get Started →
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-3">Custom Colors (Optional)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {([
                    { key: 'primary', label: 'Primary' },
                    { key: 'secondary', label: 'Secondary' },
                    { key: 'accent', label: 'Accent' },
                    { key: 'bg', label: 'Background' },
                  ] as const).map(c => (
                    <div key={c.key}>
                      <label className="block text-xs text-gray-500 mb-1.5">{c.label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={state.theme[c.key]}
                          onChange={e => setState(s => ({ ...s, theme: { ...s.theme, [c.key]: e.target.value } }))}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                        />
                        <input
                          value={state.theme[c.key]}
                          onChange={e => setState(s => ({ ...s, theme: { ...s.theme, [c.key]: e.target.value } }))}
                          className="flex-1 font-mono text-xs rounded-lg border border-gray-200 px-2 py-1.5 focus:outline-none focus:border-[#B08D57]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-3">Typography</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {FONT_PAIRS.map(fp => (
                    <button
                      key={fp.id}
                      onClick={() => setState(s => ({ ...s, font: fp }))}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${state.font.id === fp.id ? 'border-[#B08D57] bg-[#fdf8f1]' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <p className="text-base font-bold text-gray-900" style={{ fontFamily: fp.heading }}>Heading</p>
                      <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: fp.body }}>Body text style</p>
                      <p className="text-[10px] text-[#B08D57] mt-2 font-medium">{fp.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
                <button
                  onClick={() => setAdvancedOpen(o => !o)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[#B08D57]" />
                    <p className="text-sm font-semibold text-gray-900">Advanced Controls</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {advancedOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-5 pb-5 border-t border-gray-100 space-y-5">
                        <div className="pt-4">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Border Radius — {state.design.borderRadius}px</label>
                          <input
                            type="range"
                            min={0}
                            max={24}
                            value={state.design.borderRadius}
                            onChange={e => setState(s => ({ ...s, design: { ...s.design, borderRadius: Number(e.target.value) } }))}
                            className="w-full accent-[#B08D57]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Shadow Intensity</label>
                          <div className="flex gap-2 flex-wrap">
                            {(['none', 'subtle', 'medium', 'strong'] as const).map(v => (
                              <button
                                key={v}
                                onClick={() => setState(s => ({ ...s, design: { ...s.design, shadowIntensity: v } }))}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize border transition-all ${state.design.shadowIntensity === v ? 'bg-[#B08D57] text-white border-[#B08D57]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Section Spacing</label>
                          <div className="flex gap-2 flex-wrap">
                            {(['compact', 'normal', 'spacious'] as const).map(v => (
                              <button
                                key={v}
                                onClick={() => setState(s => ({ ...s, design: { ...s.design, spacing: v } }))}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize border transition-all ${state.design.spacing === v ? 'bg-[#B08D57] text-white border-[#B08D57]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Animation Style</label>
                          <div className="flex gap-2 flex-wrap">
                            {(['none', 'fade', 'slide', 'scale'] as const).map(v => (
                              <button
                                key={v}
                                onClick={() => setState(s => ({ ...s, design: { ...s.design, animation: v } }))}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize border transition-all ${state.design.animation === v ? 'bg-[#B08D57] text-white border-[#B08D57]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Custom CSS</label>
                          <textarea
                            value={state.design.customCss}
                            onChange={e => setState(s => ({ ...s, design: { ...s.design, customCss: e.target.value } }))}
                            rows={4}
                            placeholder=".hero { background: red; }"
                            className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#B08D57] focus:bg-white resize-none"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep('sections')} className="flex items-center gap-2 rounded-[10px] border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep('integrations')} className="flex items-center gap-2 rounded-[10px] bg-[#B08D57] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9a7a4a] transition-colors">
                  Next: Integrations <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'integrations' && (
            <motion.div key="integrations" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Integrations</h2>
              <p className="text-sm text-gray-500 mb-6">Connect payment, analytics, chat, and more</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payments & Commerce</p>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Gateway</label>
                    <select
                      value={state.integrations.paymentGateway}
                      onChange={e => setState(s => ({ ...s, integrations: { ...s.integrations, paymentGateway: e.target.value } }))}
                      className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white"
                    >
                      <option value="none">None</option>
                      <option value="razorpay">Razorpay</option>
                      <option value="cashfree">Cashfree</option>
                      <option value="payu">PayU</option>
                      <option value="paytm">Paytm</option>
                      <option value="stripe">Stripe (India)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-gray-900">eCommerce Mode</p>
                      <p className="text-xs text-gray-400">Adds "Shop Now" button and product grid section</p>
                    </div>
                    <Toggle
                      enabled={state.integrations.ecommerce}
                      onChange={v => setState(s => ({ ...s, integrations: { ...s.integrations, ecommerce: v } }))}
                    />
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Booking System</p>
                      <p className="text-xs text-gray-400">Adds "Book Appointment" button in nav</p>
                    </div>
                    <Toggle
                      enabled={state.integrations.booking}
                      onChange={v => setState(s => ({ ...s, integrations: { ...s.integrations, booking: v } }))}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Analytics & Tracking</p>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Google Analytics ID</label>
                    <input
                      value={state.integrations.googleAnalytics}
                      onChange={e => setState(s => ({ ...s, integrations: { ...s.integrations, googleAnalytics: e.target.value } }))}
                      placeholder="G-XXXXXXXXXX"
                      className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Facebook Pixel ID</label>
                    <input
                      value={state.integrations.facebookPixel}
                      onChange={e => setState(s => ({ ...s, integrations: { ...s.integrations, facebookPixel: e.target.value } }))}
                      placeholder="1234567890123456"
                      className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Cookie Consent Banner</p>
                      <p className="text-xs text-gray-400">GDPR-friendly cookie notice</p>
                    </div>
                    <Toggle
                      enabled={state.integrations.cookieConsent}
                      onChange={v => setState(s => ({ ...s, integrations: { ...s.integrations, cookieConsent: v } }))}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chat & Social</p>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">WhatsApp Chat Widget</p>
                        <p className="text-xs text-gray-400">Floating chat button on all pages</p>
                      </div>
                      <Toggle
                        enabled={state.integrations.whatsapp.enabled}
                        onChange={v => setState(s => ({ ...s, integrations: { ...s.integrations, whatsapp: { ...s.integrations.whatsapp, enabled: v } } }))}
                      />
                    </div>
                    {state.integrations.whatsapp.enabled && (
                      <input
                        value={state.integrations.whatsapp.phone}
                        onChange={e => setState(s => ({ ...s, integrations: { ...s.integrations, whatsapp: { ...s.integrations.whatsapp, phone: e.target.value } } }))}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white"
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Live Chat (Tawk.to)</p>
                        <p className="text-xs text-gray-400">Free live chat for your website</p>
                      </div>
                      <Toggle
                        enabled={state.integrations.tawkto.enabled}
                        onChange={v => setState(s => ({ ...s, integrations: { ...s.integrations, tawkto: { ...s.integrations.tawkto, enabled: v } } }))}
                      />
                    </div>
                    {state.integrations.tawkto.enabled && (
                      <input
                        value={state.integrations.tawkto.siteId}
                        onChange={e => setState(s => ({ ...s, integrations: { ...s.integrations, tawkto: { ...s.integrations.tawkto, siteId: e.target.value } } }))}
                        placeholder="Tawk.to Site ID"
                        className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Instagram Feed</p>
                      <p className="text-xs text-gray-400">Show latest Instagram posts</p>
                    </div>
                    <Toggle
                      enabled={state.integrations.instagramFeed}
                      onChange={v => setState(s => ({ ...s, integrations: { ...s.integrations, instagramFeed: v } }))}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">SEO Settings</p>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Meta Title</label>
                    <input
                      value={state.seo.title}
                      onChange={e => setState(s => ({ ...s, seo: { ...s.seo, title: e.target.value } }))}
                      placeholder={state.businessName || 'Your Business Name'}
                      className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Meta Description</label>
                    <textarea
                      value={state.seo.description}
                      onChange={e => setState(s => ({ ...s, seo: { ...s.seo, description: e.target.value } }))}
                      rows={2}
                      placeholder="Brief description of your business for search engines (150–160 chars)"
                      className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white resize-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">{state.seo.description.length} / 160</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Target Keywords</label>
                    <input
                      value={state.seo.keywords}
                      onChange={e => setState(s => ({ ...s, seo: { ...s.seo, keywords: e.target.value } }))}
                      placeholder="coffee shop bangalore, filter coffee, artisan café"
                      className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Comma-separated</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button onClick={() => setStep('design')} className="flex items-center gap-2 rounded-[10px] border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep('content')} className="flex items-center gap-2 rounded-[10px] bg-[#B08D57] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9a7a4a] transition-colors">
                  Next: Content <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'content' && (
            <motion.div key="content" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Fill Content</h2>
                  <p className="text-sm text-gray-500 mt-1">Edit text for each section, or let AI write it for you</p>
                </div>
              </div>

              <div className="mb-6 rounded-xl border-2 border-[#B08D57] bg-gradient-to-r from-[#fdf8f1] to-white p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Wand2 className="w-5 h-5 text-[#B08D57]" />
                  <p className="text-sm font-bold text-[#7a5f2a]">AI Copywriting</p>
                </div>
                <p className="text-xs text-gray-500 mb-4">Let AI write professional copy for every section of your website</p>
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  rows={2}
                  placeholder="Describe the business, its USP, target customers, tone of voice..."
                  className="w-full rounded-[10px] border border-[#e8d9bc] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57] resize-none mb-3"
                />
                <button
                  onClick={runAiCopy}
                  disabled={aiLoading || !state.businessName}
                  className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-[#B08D57] px-5 py-3 text-sm font-bold text-white hover:bg-[#9a7a4a] disabled:opacity-50 transition-colors shadow-sm"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {AI_PROGRESS_MESSAGES[aiProgressIdx]}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate All Content with AI
                    </>
                  )}
                </button>
                {aiError && (
                  <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                    {aiError}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {state.sections.filter(s => s.enabled).map(sec => (
                    <div key={sec.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
                        <button
                          onClick={() => setEditingSection(editingSection === sec.id ? null : sec.id)}
                          className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
                        >
                          <div className="w-2 h-2 rounded-full bg-[#B08D57]" />
                          <p className="font-medium text-gray-900 text-sm">{sec.label}</p>
                          <span className="text-[10px] text-gray-400 capitalize">{sec.type}</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => runAiRegenSection(sec.id)}
                            disabled={regenLoading === sec.id || !state.businessName}
                            title="Regenerate this section with AI"
                            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                          >
                            {regenLoading === sec.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-[#B08D57]" />}
                            Regenerate
                          </button>
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${editingSection === sec.id ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                      {regenError[sec.id] && (
                        <div className="px-5 py-1.5 bg-red-50 border-b border-red-100 text-[10px] text-red-600">
                          {regenError[sec.id]}
                        </div>
                      )}

                      {sectionDiffs[sec.id] && (
                        <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-100">
                          <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI generated — content updated
                          </p>
                        </div>
                      )}

                      <AnimatePresence>
                        {editingSection === sec.id && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="px-5 pb-5 pt-4 space-y-3">
                              {Object.entries(sec.content).map(([key, val]) => {
                                if (Array.isArray(val)) {
                                  return (
                                    <div key={key}>
                                      <label className="block text-xs font-medium text-gray-600 mb-1.5 capitalize">{key.replace(/_/g, ' ')}</label>
                                      <div className="space-y-1.5">
                                        {val.map((item, i) => (
                                          <div key={i} className="flex gap-2">
                                            <input
                                              value={item}
                                              onChange={e => {
                                                const arr = [...val]
                                                arr[i] = e.target.value
                                                updateSectionContent(sec.id, key, JSON.stringify(arr))
                                              }}
                                              className="flex-1 rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                }
                                const isLong = key === 'body' || key === 'subtext'
                                const prevVal = sectionDiffs[sec.id]?.[key]
                                return (
                                  <div key={key}>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <label className="block text-xs font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}</label>
                                      {prevVal && prevVal !== val && (
                                        <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">AI updated</span>
                                      )}
                                    </div>
                                    {prevVal && prevVal !== val && (
                                      <div className="mb-1.5 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700 line-through opacity-70 select-none">
                                        {prevVal}
                                      </div>
                                    )}
                                    {isLong ? (
                                      <textarea
                                        value={val as string}
                                        onChange={e => updateSectionContent(sec.id, key, e.target.value)}
                                        rows={3}
                                        className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white resize-none"
                                      />
                                    ) : (
                                      <input
                                        value={val as string}
                                        onChange={e => updateSectionContent(sec.id, key, e.target.value)}
                                        className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white"
                                      />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                <div className="hidden xl:block">
                  <div className="sticky top-4">
                    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                        <p className="text-xs font-medium text-gray-600">Live Preview</p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewViewport('desktop')}
                            className={`rounded p-1 transition-colors ${previewViewport === 'desktop' ? 'bg-[#B08D57] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            <Monitor className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPreviewViewport('mobile')}
                            className={`rounded p-1 transition-colors ${previewViewport === 'mobile' ? 'bg-[#B08D57] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className={`overflow-hidden transition-all ${previewViewport === 'mobile' ? 'max-w-[375px] mx-auto border-x border-gray-200' : ''}`}>
                        <div className="h-[640px]">
                          <iframe
                            srcDoc={generatedHtml}
                            className="w-full h-full border-0"
                            title="Live Preview"
                            sandbox="allow-same-origin"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button onClick={() => setStep('integrations')} className="flex items-center gap-2 rounded-[10px] border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep('preview')} className="flex items-center gap-2 rounded-[10px] bg-[#B08D57] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9a7a4a] transition-colors">
                  Preview Site <Eye className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Preview &amp; Publish</h2>
                  <p className="text-sm text-gray-500 mt-1">Review your site and publish when ready</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setStep('content')} className="flex items-center gap-2 rounded-[10px] border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Edit
                  </button>
                  {!publishedUrl ? (
                    <button
                      onClick={publish}
                      disabled={publishLoading}
                      className="flex items-center gap-2 rounded-[10px] bg-[#B08D57] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9a7a4a] disabled:opacity-50 transition-colors"
                    >
                      {publishLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                      {publishLoading ? 'Publishing...' : 'Publish Site'}
                    </button>
                  ) : (
                    <a href={publishedUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 rounded-[10px] bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                      View Live Site
                    </a>
                  )}
                </div>
              </div>

              {publishedUrl && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-6 flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-800">Site Published Successfully!</p>
                    <p className="text-xs text-emerald-700 mt-0.5">{publishedUrl}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(publishedUrl); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000) }}
                    className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-medium"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy URL
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 bg-white rounded border border-gray-200 px-3 py-1 text-xs text-gray-400 text-center font-mono truncate">
                    {publishedUrl ?? `levitatelabs.online/sites/${state.businessName?.toLowerCase().replace(/\s+/g, '-')}`}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewViewport('desktop')}
                      className={`rounded p-1 transition-colors ${previewViewport === 'desktop' ? 'bg-[#B08D57] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPreviewViewport('mobile')}
                      className={`rounded p-1 transition-colors ${previewViewport === 'mobile' ? 'bg-[#B08D57] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className={`h-[600px] overflow-auto transition-all ${previewViewport === 'mobile' ? 'max-w-[375px] mx-auto border-x border-gray-200' : ''}`}>
                  <iframe
                    srcDoc={generatedHtml}
                    className="w-full h-full border-0"
                    title="Website Preview"
                  />
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Code className="w-4 h-4 text-[#B08D57]" />
                    Export HTML
                  </p>
                  <button
                    onClick={() => {
                      const blob = new Blob([generatedHtml], { type: 'text/html' })
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(blob)
                      a.download = `${state.businessName?.replace(/\s+/g, '-') ?? 'website'}.html`
                      a.click()
                    }}
                    className="flex items-center gap-1.5 text-xs rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download HTML
                  </button>
                </div>
                <p className="text-xs text-gray-500">Download a standalone HTML file to host anywhere — Vercel, Netlify, cPanel, or hand to the client directly.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function generatePreviewHtml(state: BuilderState): string {
  const { theme, font, businessName, sections, integrations, seo, design } = state
  const active = sections.filter(s => s.enabled)

  const heroSection = active.find(s => s.type === 'hero')
  const aboutSection = active.find(s => s.type === 'about')
  const featuresSection = active.find(s => s.type === 'features')
  const hoursSection = active.find(s => s.type === 'hours')
  const contactSection = active.find(s => s.type === 'contact')
  const statsSection = active.find(s => s.type === 'stats')
  const testimonialsSection = active.find(s => s.type === 'testimonials')

  const sectionPadding = design.spacing === 'compact' ? '3rem' : design.spacing === 'spacious' ? '7rem' : '5rem'
  const br = design.borderRadius + 'px'
  const shadowMap = {
    none: 'none',
    subtle: '0 2px 8px rgba(0,0,0,0.06)',
    medium: '0 4px 16px rgba(0,0,0,0.12)',
    strong: '0 8px 32px rgba(0,0,0,0.2)',
  }
  const shadow = shadowMap[design.shadowIntensity]

  const animationCss = design.animation !== 'none' ? `
  .animate-on-scroll { opacity: 0; transition: all 0.6s ease; }
  .animate-on-scroll.visible {
    opacity: 1;
    ${design.animation === 'slide' ? 'transform: translateY(0) !important;' : ''}
    ${design.animation === 'scale' ? 'transform: scale(1) !important;' : ''}
  }
  ${design.animation === 'slide' ? '.animate-on-scroll { transform: translateY(30px); }' : ''}
  ${design.animation === 'scale' ? '.animate-on-scroll { transform: scale(0.95); }' : ''}
  ` : ''

  const animationScript = design.animation !== 'none' ? `
  <script>
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.animate-on-scroll').forEach(el => obs.observe(el));
  </script>
  ` : ''

  const gaScript = integrations.googleAnalytics ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${integrations.googleAnalytics}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${integrations.googleAnalytics}');</script>
  ` : ''

  const fbPixelScript = integrations.facebookPixel ? `
  <script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${integrations.facebookPixel}');fbq('track','PageView');</script>
  ` : ''

  const razorpayScript = integrations.paymentGateway === 'razorpay' ? `
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  ` : ''

  const tawkScript = integrations.tawkto.enabled && integrations.tawkto.siteId ? `
  <script>var Tawk_API=Tawk_API||{},Tawk_LoadStart=new Date();(function(){var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];s1.async=true;s1.src='https://embed.tawk.to/${integrations.tawkto.siteId}/default';s1.charset='UTF-8';s1.setAttribute('crossorigin','*');s0.parentNode.insertBefore(s1,s0)})();</script>
  ` : ''

  const whatsappWidget = integrations.whatsapp.enabled && integrations.whatsapp.phone ? `
  <a href="https://wa.me/${integrations.whatsapp.phone.replace(/[^0-9]/g, '')}" target="_blank" rel="noreferrer" style="position:fixed;bottom:24px;right:24px;z-index:9999;width:56px;height:56px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(37,211,102,0.4);text-decoration:none;" aria-label="Chat on WhatsApp">
    <svg width="28" height="28" fill="white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.555 4.1 1.524 5.824L0 24l6.335-1.509A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.374l-.36-.213-3.727.977.995-3.636-.234-.373A9.818 9.818 0 1112 21.818z"/></svg>
  </a>
  ` : ''

  const cookieConsent = integrations.cookieConsent ? `
  <div id="cookie-banner" style="position:fixed;bottom:0;left:0;right:0;z-index:9998;background:rgba(0,0,0,0.9);color:white;padding:1rem 2rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
    <p style="margin:0;font-size:0.875rem;opacity:0.9;">We use cookies to improve your experience on our website. By continuing to browse, you agree to our use of cookies.</p>
    <button onclick="document.getElementById('cookie-banner').style.display='none'" style="background:${theme.accent};color:${theme.primary};border:none;border-radius:8px;padding:0.5rem 1.25rem;font-size:0.875rem;font-weight:600;cursor:pointer;white-space:nowrap;">Accept</button>
  </div>
  ` : ''

  const ecommerceSection = integrations.ecommerce ? `
  <section id="shop" style="background:${theme.bg};padding:${sectionPadding} 2rem;">
    <div style="max-width:1100px;margin:0 auto;" class="animate-on-scroll">
      <h2 style="font-family:${font.heading},system-ui,sans-serif;font-size:clamp(1.5rem,3vw,2.25rem);font-weight:700;color:${theme.primary};margin-bottom:0.5rem;">Shop Our Products</h2>
      <p style="color:${theme.text};opacity:0.65;line-height:1.7;margin-bottom:2rem;">Browse our collection and order directly online</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1.25rem;">
        ${[1,2,3,4].map(i => `
        <div style="background:white;border-radius:${br};padding:1rem;box-shadow:${shadow};border:1px solid ${theme.accent}22;">
          <div style="aspect-ratio:1;background:linear-gradient(135deg,${theme.primary}22,${theme.secondary}22);border-radius:${Math.max(0, design.borderRadius - 4)}px;margin-bottom:0.75rem;"></div>
          <p style="font-weight:600;font-size:0.875rem;color:${theme.primary};margin-bottom:0.25rem;">Product ${i}</p>
          <p style="font-size:0.75rem;color:${theme.text};opacity:0.6;margin-bottom:0.75rem;">Short description</p>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-weight:700;color:${theme.primary};">₹999</span>
            <button style="background:${theme.accent};color:${theme.primary};border:none;border-radius:6px;padding:0.375rem 0.75rem;font-size:0.75rem;font-weight:600;cursor:pointer;">Add to Cart</button>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </section>
  ` : ''

  const metaTags = `
  <title>${seo.title || businessName || 'Your Business'}</title>
  <meta name="description" content="${seo.description || state.tagline || ''}">
  ${seo.keywords ? `<meta name="keywords" content="${seo.keywords}">` : ''}
  <meta property="og:title" content="${seo.title || businessName || 'Your Business'}">
  <meta property="og:description" content="${seo.description || state.tagline || ''}">
  `

  const navExtras = [
    integrations.booking ? `<a href="#contact" class="nav-btn-book">Book Appointment</a>` : '',
    integrations.ecommerce ? `<a href="#shop" class="nav-btn-shop">Shop Now</a>` : '',
  ].filter(Boolean).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${metaTags}
${gaScript}
${fbPixelScript}
${razorpayScript}
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${font.body},system-ui,sans-serif; background: ${theme.bg}; color: ${theme.text}; }
  h1,h2,h3 { font-family: ${font.heading},system-ui,sans-serif; }
  nav { background: ${theme.primary}; padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
  .nav-logo { color: white; font-size: 1.25rem; font-weight: 700; font-family: ${font.heading},system-ui,sans-serif; }
  .nav-links { display: flex; align-items: center; gap: 0; }
  .nav-links a { color: rgba(255,255,255,0.8); text-decoration: none; font-size: 0.875rem; margin-left: 1.5rem; transition: color 0.2s; }
  .nav-links a:hover { color: white; }
  .nav-btn-book, .nav-btn-shop { background: ${theme.accent} !important; color: ${theme.primary} !important; border-radius: 8px !important; padding: 0.5rem 1rem !important; font-weight: 700 !important; font-size: 0.8rem !important; margin-left: 1rem !important; }
  .hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; background: none; border: none; padding: 4px; }
  .hamburger span { width: 22px; height: 2px; background: white; display: block; }
  @media (max-width: 768px) {
    .hamburger { display: flex; }
    .nav-links { display: none; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: ${theme.primary}; padding: 1rem; gap: 0.5rem; }
    .nav-links.open { display: flex; }
    .nav-links a { margin-left: 0; padding: 0.5rem 0; }
  }
  .hero { background: linear-gradient(135deg, ${theme.primary}, ${theme.secondary}); color: white; padding: 6rem 2rem; text-align: center; }
  .hero h1 { font-size: clamp(2rem,5vw,3.5rem); font-weight: 800; line-height: 1.15; margin-bottom: 1.25rem; }
  .hero p { font-size: 1.125rem; opacity: 0.85; max-width: 600px; margin: 0 auto 2rem; line-height: 1.7; }
  .btn { display: inline-block; background: ${theme.accent}; color: ${theme.primary}; padding: 0.875rem 2rem; border-radius: ${br}; font-weight: 700; text-decoration: none; font-size: 0.95rem; transition: opacity 0.2s; }
  .btn:hover { opacity: 0.9; }
  section { padding: ${sectionPadding} 2rem; max-width: 1100px; margin: 0 auto; }
  section h2 { font-size: clamp(1.5rem,3vw,2.25rem); font-weight: 700; margin-bottom: 1rem; color: ${theme.primary}; }
  section p { color: ${theme.text}; opacity: 0.75; line-height: 1.7; max-width: 700px; }
  .features-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 1rem; margin-top: 2rem; }
  .feature-card { background: white; border-radius: ${br}; padding: 1.25rem; border: 1px solid ${theme.accent}22; box-shadow: ${shadow}; }
  .feature-card p { font-weight: 600; color: ${theme.primary}; font-size: 0.9rem; opacity: 1; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(150px,1fr)); gap: 1.5rem; margin-top: 2rem; text-align: center; }
  .stat { background: white; border-radius: ${br}; padding: 1.5rem; border: 1px solid ${theme.accent}33; box-shadow: ${shadow}; }
  .stat p { font-size: 1.25rem; font-weight: 800; color: ${theme.primary}; opacity: 1; }
  .stat span { font-size: 0.8rem; color: ${theme.text}; opacity: 0.6; margin-top: 0.25rem; display: block; }
  .hours-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 2rem; }
  @media (max-width: 600px) { .hours-grid { grid-template-columns: 1fr; } }
  .info-card { background: white; border-radius: ${br}; padding: 1.25rem; border: 1px solid ${theme.accent}22; box-shadow: ${shadow}; }
  .info-card strong { color: ${theme.primary}; display: block; margin-bottom: 0.5rem; font-size: 0.875rem; }
  .info-card p { font-size: 0.875rem; opacity: 0.75; }
  footer { background: ${theme.primary}; color: white; text-align: center; padding: 2rem; margin-top: 2rem; }
  footer p { opacity: 0.7; font-size: 0.875rem; }
  ${animationCss}
  ${design.customCss}
</style>
</head>
<body>
<nav>
  <span class="nav-logo">${businessName || 'Your Business'}</span>
  <button class="hamburger" onclick="document.querySelector('.nav-links').classList.toggle('open')" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>
  <div class="nav-links">
    ${active.filter(s => s.type !== 'hero').slice(0, 5).map(s => `<a href="#${s.id}">${s.label}</a>`).join('')}
    ${navExtras}
  </div>
</nav>

${heroSection ? `
<div class="hero animate-on-scroll">
  <h1>${heroSection.content.headline || 'Welcome'}</h1>
  <p>${heroSection.content.subtext || ''}</p>
  <a href="${heroSection.content.ctaLink || '#contact'}" class="btn">${heroSection.content.cta || 'Get Started'}</a>
  ${integrations.ecommerce ? `<a href="#shop" class="btn" style="margin-left:1rem;background:white;color:${theme.primary};">Shop Now</a>` : ''}
</div>` : ''}

${aboutSection ? `
<section id="about" class="animate-on-scroll">
  <h2>${aboutSection.content.title || 'About Us'}</h2>
  <p>${aboutSection.content.body || ''}</p>
</section>` : ''}

${featuresSection ? `
<section id="features" style="background:white;max-width:100%;padding:${sectionPadding} 2rem;" class="animate-on-scroll">
  <div style="max-width:1100px;margin:0 auto;">
    <h2>${featuresSection.content.title || 'What We Offer'}</h2>
    <div class="features-grid">
      ${(Array.isArray(featuresSection.content.items) ? featuresSection.content.items : []).map(
        (item: string) => `<div class="feature-card"><p>✦ ${item}</p></div>`
      ).join('')}
    </div>
  </div>
</section>` : ''}

${statsSection ? `
<section id="stats" class="animate-on-scroll">
  <div class="stats-grid">
    ${(Array.isArray(statsSection.content.stats) ? statsSection.content.stats : []).map(
      (s: string) => `<div class="stat"><p>${s.split(':')[0] || s}</p><span>${s.split(':')[1] || ''}</span></div>`
    ).join('')}
  </div>
</section>` : ''}

${testimonialsSection ? `
<section id="testimonials" style="background:white;max-width:100%;padding:${sectionPadding} 2rem;" class="animate-on-scroll">
  <div style="max-width:1100px;margin:0 auto;">
    <h2>${testimonialsSection.content.title || 'What Our Customers Say'}</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;margin-top:2rem;">
      ${[1,2,3].map(i => `<div style="background:${theme.bg};border-radius:${br};padding:1.25rem;border:1px solid ${theme.accent}22;box-shadow:${shadow};"><p style="font-style:italic;opacity:0.8;font-size:0.875rem;">"Great service and wonderful experience!"</p><p style="font-weight:600;margin-top:0.75rem;font-size:0.8rem;opacity:1;">— Happy Customer ${i}</p></div>`).join('')}
    </div>
  </div>
</section>` : ''}

${ecommerceSection}

${hoursSection ? `
<section id="hours" class="animate-on-scroll">
  <h2>Hours &amp; Location</h2>
  <div class="hours-grid">
    <div class="info-card"><strong>Weekdays</strong><p>${hoursSection.content.weekdays || ''}</p></div>
    <div class="info-card"><strong>Weekends</strong><p>${hoursSection.content.weekends || ''}</p></div>
    <div class="info-card"><strong>Address</strong><p>${hoursSection.content.address || ''}</p></div>
    <div class="info-card"><strong>Phone</strong><p>${hoursSection.content.phone || ''}</p></div>
  </div>
</section>` : ''}

${contactSection ? `
<section id="contact" style="background:${theme.primary};max-width:100%;padding:${sectionPadding} 2rem;text-align:center;" class="animate-on-scroll">
  <div style="max-width:600px;margin:0 auto;">
    <h2 style="color:white;">${contactSection.content.title || 'Contact Us'}</h2>
    <p style="color:rgba(255,255,255,0.75);margin:1rem 0 2rem;">${contactSection.content.email || ''}</p>
    <a href="mailto:${contactSection.content.email || ''}" class="btn">Send Us a Message</a>
  </div>
</section>` : ''}

<footer>
  <p>© ${new Date().getFullYear()} ${businessName || 'Your Business'} · Built with LevitateOS Website Builder</p>
</footer>

${whatsappWidget}
${cookieConsent}
${tawkScript}
${animationScript}
</body>
</html>`
}
