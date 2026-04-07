# 🚀 LEVITATE LABS — FULLY AUTOMATED AI AGENCY SYSTEM
## Claude Code Master Build Guide

> **Mission:** Build a 100% automated web agency that finds clients, closes deals, delivers websites, collects payment, and reports everything — with zero human intervention. Runs entirely on levitatelabs.online (Netlify).

RAZORPAY LIVE KEY ID: rzp_live_SaEfFKDaHzO1GC
LIVE KEY SECRET: meosbens1OTErAivTWU0hAjf
---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema (Supabase)](#database-schema)
5. [Environment Variables](#environment-variables)
6. [Agent Architecture](#agent-architecture)
7. [Agent Reward System](#agent-reward-system)
8. [Netlify Functions — All Agents](#netlify-functions)
9. [GitHub Actions Pipelines](#github-actions-pipelines)
10. [24/7 Admin Dashboard](#admin-dashboard)
11. [Lead Finding System](#lead-finding-system)
12. [Outreach & Closing System](#outreach-and-closing)
13. [Delivery Pipeline](#delivery-pipeline)
14. [Payment System](#payment-system)
15. [Notification System](#notification-system)
16. [Reliability & Self-Healing](#reliability)
17. [Build Order](#build-order)
18. [API Reference](#api-reference)

---

## 1. SYSTEM OVERVIEW {#system-overview}

### What This System Does (End to End)

```
6:00 AM  → BizDev Agent wakes up, scans Google Maps + LinkedIn + JustDial
           Finds 20 businesses with no website in Vadodara/Surat/Ahmedabad
           Scores each lead 1-10. Top 10 stored in Supabase.

6:30 AM  → Outreach Agent reads hot leads from Supabase
           Researches each business (Instagram, JustDial, Google)
           Claude writes hyper-personalized WhatsApp message per lead
           Messages sent via WhatsApp Business API

ANYTIME  → Lead replies on WhatsApp
           Discovery Agent takes over conversation automatically
           Qualifies budget, timeline, requirements
           If good fit → Proposal Agent generates PDF proposal
           Razorpay payment link included. Client pays ₹4,000 advance.

PAYMENT  → Razorpay webhook fires to Netlify
           Architect Agent reads spec, designs system
           GitHub Action triggers: Coder → Reviewer → Tester → Debugger
           Complete website built, tested, deployed in <6 hours

DELIVERY → Deployer pushes to clientname.levitatelabs.online
           Client Update Agent sends WhatsApp with preview link
           Client approves → final invoice sent → payment collected
           Handover document sent automatically

8:00 AM  → Reporter Agent sends YOU a WhatsApp digest:
           "3 new leads, 1 proposal sent, 1 project completed, ₹8,000 received"

ALWAYS   → Dashboard at levitatelabs.online/admin shows everything live
```

### The Agent Reward System

Every agent earns "credits" for successful work. Credits are tracked in Supabase. Agents with high credit scores get priority scheduling and more API budget. This creates a self-optimizing system where the best-performing agent configurations survive and improve.

---

## 2. TECH STACK {#tech-stack}

```
LAYER                  TOOL                           COST
──────────────────────────────────────────────────────────────
Frontend               Next.js 14 (App Router)        ₹0
Hosting                Netlify (existing)              ₹0
Database               Supabase (PostgreSQL)           ₹0
File Storage           Supabase Storage                ₹0
Realtime Updates       Supabase Realtime               ₹0
Scheduled Functions    Netlify Scheduled Functions     ₹0
Background Functions   Netlify Background Functions    ₹0
Long Jobs (30+ min)    GitHub Actions                  ₹0
AI Inference (Primary) Groq API (free tier)            ₹0
AI Inference (Backup)  Claude API via Anthropic        pay-per-use
Code Generation        Aider CLI                       ₹0
Web Scraping           Apify (free tier)               ₹0
Maps/Places            Google Maps API (free tier)     ₹0
Email                  Resend (3000/month free)        ₹0
WhatsApp               WhatsApp Business API (Meta)    ₹0
Payments               Razorpay                        % per txn
PDF Generation         Puppeteer / html-pdf            ₹0
Testing                Playwright                      ₹0
Monitoring             Netlify Analytics               ₹0
Uptime                 UptimeRobot (free)              ₹0
──────────────────────────────────────────────────────────────
MONTHLY FIXED COST                                     ₹0
```

### AI Model Strategy

```javascript
// Priority order for inference calls
const AI_PROVIDERS = [
  {
    name: 'groq',
    model: 'llama-3.3-70b-versatile', // free, fast
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
    dailyLimit: 14400,
    used: 0
  },
  {
    name: 'anthropic',
    model: 'claude-haiku-4-5-20251001', // cheapest Claude, for overflow
    baseURL: 'https://api.anthropic.com/v1',
    apiKey: process.env.ANTHROPIC_API_KEY,
    dailyLimit: 999999,
    used: 0
  }
]
// Auto-switches to next provider when limit hit
```

---

## 3. PROJECT STRUCTURE {#project-structure}

```
levitate-labs/
│
├── app/                              # Next.js App Router
│   ├── page.tsx                      # Public homepage (levitatelabs.online)
│   ├── services/page.tsx             # Services page
│   ├── contact/page.tsx              # Contact form → Supabase leads
│   ├── admin/                        # 🔒 Password protected dashboard
│   │   ├── layout.tsx                # Auth wrapper
│   │   ├── page.tsx                  # Main dashboard (24/7 overview)
│   │   ├── leads/page.tsx            # Lead pipeline view
│   │   ├── projects/page.tsx         # Active projects
│   │   ├── agents/page.tsx           # Agent performance + rewards
│   │   ├── revenue/page.tsx          # Revenue tracking
│   │   └── logs/page.tsx             # Full agent activity logs
│   └── api/
│       ├── webhook/
│       │   ├── razorpay/route.ts     # Payment webhook
│       │   ├── whatsapp/route.ts     # Incoming WhatsApp messages
│       │   └── github/route.ts       # GitHub Actions callbacks
│       └── admin/
│           ├── stats/route.ts        # Dashboard data API
│           ├── leads/route.ts        # Lead management API
│           └── agents/route.ts       # Agent control API
│
├── netlify/functions/                # All automated agents live here
│   ├── reporter.mts                  # 📅 Daily 8AM - Morning digest to you
│   ├── bizdev.mts                    # 📅 Daily 6AM - Find new leads
│   ├── outreach.mts                  # 📅 Daily 9AM - Send messages to leads
│   ├── followup.mts                  # 📅 Daily 10AM - Follow up on no-replies
│   ├── client-update.mts             # 📅 Every 2 days - Progress updates
│   ├── invoice-check.mts             # 📅 Daily 9AM - Chase unpaid invoices
│   ├── retention.mts                 # 📅 Weekly Sunday - Re-engage past clients
│   ├── kaggle-watchdog.mts           # 📅 Every 30min - Keep GPU alive
│   ├── supabase-heartbeat.mts        # 📅 Every 5 days - Prevent DB pause
│   ├── agent-evaluator.mts           # 📅 Weekly - Score agents, distribute rewards
│   ├── discovery-bg.mts              # 🔄 Background - Qualify inbound leads
│   ├── proposal-bg.mts               # 🔄 Background - Generate + send proposals
│   ├── contract-bg.mts               # 🔄 Background - Send contracts
│   ├── onboarding-bg.mts             # 🔄 Background - Onboard new clients
│   └── webhook-handler.mts           # ⚡ Instant - Handle all webhooks
│
├── .github/workflows/
│   ├── coding-agent.yml              # Main coding pipeline
│   ├── architect-agent.yml           # Project architecture design
│   ├── tester-agent.yml              # Run all tests
│   ├── debugger-agent.yml            # Fix failing tests
│   ├── deployer-agent.yml            # Deploy client sites
│   └── supabase-ping.yml             # Keep Supabase alive
│
├── lib/
│   ├── agents/
│   │   ├── base-agent.ts             # Base agent class with reward tracking
│   │   ├── bizdev-agent.ts           # Lead finding logic
│   │   ├── outreach-agent.ts         # Message writing + sending
│   │   ├── discovery-agent.ts        # Lead qualification conversation
│   │   ├── proposal-agent.ts         # Proposal generation
│   │   ├── architect-agent.ts        # Tech architecture decisions
│   │   ├── coder-agent.ts            # Code generation via Aider
│   │   ├── reviewer-agent.ts         # Code review
│   │   ├── tester-agent.ts           # Test writing + running
│   │   ├── debugger-agent.ts         # Bug fixing
│   │   ├── deployer-agent.ts         # Deployment
│   │   ├── invoice-agent.ts          # Invoice + payment
│   │   ├── retention-agent.ts        # Re-engagement
│   │   └── reporter-agent.ts         # Daily summaries
│   ├── ai/
│   │   ├── router.ts                 # Smart AI provider router
│   │   ├── groq.ts                   # Groq client
│   │   └── anthropic.ts              # Anthropic client
│   ├── supabase/
│   │   ├── client.ts                 # Supabase client
│   │   ├── leads.ts                  # Lead CRUD operations
│   │   ├── projects.ts               # Project CRUD
│   │   ├── agents.ts                 # Agent logs + rewards
│   │   └── tasks.ts                  # Task queue operations
│   ├── whatsapp/
│   │   ├── client.ts                 # WhatsApp Business API
│   │   ├── templates.ts              # Message templates
│   │   └── parser.ts                 # Parse incoming messages
│   ├── scrapers/
│   │   ├── google-maps.ts            # Find businesses without websites
│   │   ├── justdial.ts               # JustDial scraper
│   │   ├── linkedin.ts               # LinkedIn post scraper
│   │   └── instagram.ts              # Instagram business scraper
│   ├── pdf/
│   │   ├── proposal.ts               # Generate proposal PDFs
│   │   ├── invoice.ts                # Generate GST invoices
│   │   └── handover.ts               # Project handover docs
│   └── payments/
│       └── razorpay.ts               # Razorpay integration
│
├── templates/
│   ├── proposal.html                 # Proposal HTML template
│   ├── invoice.html                  # GST invoice template
│   ├── contract.md                   # Contract markdown template
│   ├── welcome-email.html            # Client welcome email
│   └── handover.html                 # Project handover template
│
├── config/
│   ├── rate-card.json                # Your pricing (edit once)
│   ├── services.json                 # Services you offer
│   ├── agent-prompts.json            # All agent system prompts
│   └── lead-scoring.json             # Lead scoring weights
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql    # Full DB schema
```

---

## 4. DATABASE SCHEMA {#database-schema}

Create this in Supabase SQL editor. Run as one migration.

```sql
-- ============================================================
-- LEVITATE LABS — COMPLETE DATABASE SCHEMA
-- Run in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- LEADS TABLE
-- Every potential client found by BizDev Agent
-- ============================================================
CREATE TABLE leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Business Info
  business_name TEXT NOT NULL,
  owner_name TEXT,
  category TEXT, -- restaurant, clinic, coaching, retail, etc.
  city TEXT,
  
  -- Contact
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  instagram_handle TEXT,
  facebook_url TEXT,
  justdial_url TEXT,
  google_maps_url TEXT,
  
  -- Current Web Presence
  has_website BOOLEAN DEFAULT FALSE,
  current_website TEXT,
  website_quality_score INTEGER, -- 1-10, 10 = terrible = good lead
  
  -- Lead Scoring
  score INTEGER DEFAULT 0, -- 1-10
  score_reasons JSONB DEFAULT '[]',
  
  -- Source
  source TEXT, -- google_maps | justdial | linkedin | instagram | referral | inbound
  source_url TEXT,
  source_data JSONB DEFAULT '{}', -- raw data from scraper
  
  -- Outreach Status
  status TEXT DEFAULT 'new',
  -- new → contacted → replied → qualified → proposal_sent → 
  -- negotiating → won → lost → archived
  
  outreach_count INTEGER DEFAULT 0,
  last_outreach_at TIMESTAMPTZ,
  first_reply_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  
  -- Qualification
  qualified BOOLEAN,
  budget_range TEXT, -- low (<5k) | mid (5-15k) | high (>15k)
  timeline TEXT,
  requirements TEXT,
  disqualify_reason TEXT,
  
  -- Conversation
  conversation_history JSONB DEFAULT '[]',
  -- [{role: 'agent'|'client', message: '...', timestamp: '...'}]
  
  -- Assignment
  assigned_agent TEXT DEFAULT 'discovery',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTS TABLE
-- Leads that converted to paying clients
-- ============================================================
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  
  -- Identity
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT NOT NULL,
  city TEXT,
  
  -- Business Details
  business_type TEXT,
  industry TEXT,
  instagram_handle TEXT,
  
  -- Financials
  total_paid DECIMAL(10,2) DEFAULT 0,
  total_billed DECIMAL(10,2) DEFAULT 0,
  outstanding DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active', -- active | completed | churned | vip
  
  -- Assets received
  logo_url TEXT,
  brand_colors JSONB,
  content_received BOOLEAN DEFAULT FALSE,
  domain_access BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECTS TABLE
-- One per client engagement
-- ============================================================
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  lead_id UUID REFERENCES leads(id),
  
  -- Project Identity
  name TEXT NOT NULL,
  slug TEXT UNIQUE, -- used for staging URL: slug.levitatelabs.online
  
  -- Scope
  type TEXT, -- landing_page | business_website | ecommerce | webapp | custom
  pages TEXT[], -- ['home', 'about', 'services', 'contact']
  features TEXT[], -- ['contact_form', 'payment', 'booking', 'gallery']
  tech_stack TEXT DEFAULT 'nextjs', -- nextjs | wordpress | html
  requirements TEXT,
  
  -- Design
  color_scheme JSONB,
  style TEXT, -- modern | classic | minimal | bold
  reference_sites TEXT[],
  
  -- Status
  status TEXT DEFAULT 'pending',
  -- pending → advance_paid → architected → coding → review →
  -- testing → debugging → staging → client_review → 
  -- revision → production → delivered → closed
  
  current_agent TEXT, -- which agent is working on it right now
  
  -- Git
  github_repo TEXT,
  github_branch TEXT DEFAULT 'main',
  staging_url TEXT,
  production_url TEXT,
  
  -- Timeline
  started_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Financials
  quoted_price DECIMAL(10,2),
  advance_amount DECIMAL(10,2),
  advance_paid_at TIMESTAMPTZ,
  final_amount DECIMAL(10,2),
  final_paid_at TIMESTAMPTZ,
  
  -- Quality
  lighthouse_score INTEGER,
  test_pass_rate DECIMAL(5,2),
  client_satisfaction INTEGER, -- 1-5
  
  -- Revision tracking
  revision_count INTEGER DEFAULT 0,
  max_revisions INTEGER DEFAULT 3,
  
  -- Architecture (set by Architect Agent)
  architecture JSONB DEFAULT '{}',
  -- {pages: [], components: [], apis: [], database: null}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASKS TABLE — The Agent Task Queue
-- This IS the message queue. No Redis needed.
-- ============================================================
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  client_id UUID REFERENCES clients(id),
  lead_id UUID REFERENCES leads(id),
  
  -- Task Identity
  type TEXT NOT NULL,
  -- architect | code_feature | review_code | write_tests | run_tests |
  -- debug | deploy_staging | deploy_production | send_proposal |
  -- send_contract | send_invoice | send_update | follow_up
  
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 5, -- 1=urgent, 10=low
  
  -- Status
  status TEXT DEFAULT 'pending',
  -- pending → claimed → in_progress → done → failed → escalated
  
  -- Assignment
  assigned_agent TEXT,
  claimed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Retry
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  
  -- Context (what the agent needs to do the task)
  context JSONB DEFAULT '{}',
  
  -- Result (what the agent produced)
  result JSONB DEFAULT '{}',
  
  -- Dependencies
  depends_on UUID[], -- task IDs that must complete first
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROPOSALS TABLE
-- ============================================================
CREATE TABLE proposals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  project_id UUID REFERENCES projects(id),
  
  -- Content
  title TEXT,
  scope TEXT,
  deliverables TEXT[],
  timeline_days INTEGER,
  
  -- Pricing
  total_price DECIMAL(10,2),
  advance_amount DECIMAL(10,2),
  final_amount DECIMAL(10,2),
  
  -- Files
  pdf_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft',
  -- draft → sent → viewed → accepted → rejected → expired
  
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  
  -- Razorpay
  payment_link TEXT,
  payment_link_id TEXT,
  
  follow_up_count INTEGER DEFAULT 0,
  last_follow_up_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICES TABLE
-- ============================================================
CREATE TABLE invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE,
  project_id UUID REFERENCES projects(id),
  client_id UUID REFERENCES clients(id),
  
  -- Type
  type TEXT DEFAULT 'final', -- advance | milestone | final
  
  -- Amounts
  subtotal DECIMAL(10,2),
  gst_rate DECIMAL(4,2) DEFAULT 18.00,
  gst_amount DECIMAL(10,2),
  total DECIMAL(10,2),
  
  -- Status
  status TEXT DEFAULT 'draft',
  -- draft → sent → viewed → paid → overdue | cancelled
  
  due_date TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Razorpay
  razorpay_payment_link TEXT,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  
  -- Follow ups
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  
  -- PDF
  pdf_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AGENT_LOGS TABLE
-- Every single thing every agent does
-- ============================================================
CREATE TABLE agent_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Which agent
  agent_name TEXT NOT NULL,
  agent_version TEXT DEFAULT '1.0',
  
  -- What it did
  action TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id),
  project_id UUID REFERENCES projects(id),
  lead_id UUID REFERENCES leads(id),
  
  -- Input/Output
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  
  -- Performance
  status TEXT DEFAULT 'success', -- success | failure | partial
  duration_ms INTEGER,
  tokens_used INTEGER DEFAULT 0,
  ai_provider TEXT, -- groq | anthropic | gemma
  ai_cost_usd DECIMAL(8,6) DEFAULT 0,
  
  -- Error details
  error TEXT,
  error_stack TEXT,
  
  -- Reward
  credits_earned INTEGER DEFAULT 0,
  credits_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AGENT_REWARDS TABLE
-- The agent economy — credits per agent
-- ============================================================
CREATE TABLE agent_rewards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agent_name TEXT UNIQUE NOT NULL,
  
  -- Credits (the reward currency)
  total_credits_earned INTEGER DEFAULT 0,
  total_credits_spent INTEGER DEFAULT 0,
  current_balance INTEGER DEFAULT 100, -- start with 100 credits
  
  -- Performance Stats
  total_tasks_completed INTEGER DEFAULT 0,
  total_tasks_failed INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  average_duration_ms INTEGER DEFAULT 0,
  
  -- Revenue Attribution
  revenue_generated DECIMAL(10,2) DEFAULT 0, -- money this agent helped earn
  
  -- Privileges (unlocked by high credit balance)
  api_budget_multiplier DECIMAL(3,2) DEFAULT 1.0,
  -- 1.0 = normal, 1.5 = 50% more API calls allowed, 2.0 = double
  priority_level INTEGER DEFAULT 5, -- 1=highest, 10=lowest
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_suspended BOOLEAN DEFAULT FALSE,
  suspension_reason TEXT,
  
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial agent records
INSERT INTO agent_rewards (agent_name, current_balance) VALUES
  ('bizdev', 100),
  ('outreach', 100),
  ('discovery', 100),
  ('proposal', 100),
  ('contract', 100),
  ('onboarding', 100),
  ('architect', 100),
  ('coder', 100),
  ('reviewer', 100),
  ('tester', 100),
  ('debugger', 100),
  ('deployer', 100),
  ('client_update', 100),
  ('invoice', 100),
  ('retention', 100),
  ('reporter', 100);

-- ============================================================
-- MESSAGES TABLE
-- All WhatsApp conversations stored here
-- ============================================================
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Parties
  lead_id UUID REFERENCES leads(id),
  client_id UUID REFERENCES clients(id),
  
  -- Message
  direction TEXT NOT NULL, -- inbound | outbound
  channel TEXT DEFAULT 'whatsapp', -- whatsapp | email | sms
  content TEXT NOT NULL,
  
  -- WhatsApp specific
  whatsapp_message_id TEXT,
  whatsapp_status TEXT, -- sent | delivered | read | failed
  
  -- Who sent (outbound)
  sent_by_agent TEXT,
  
  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  intent TEXT, -- reply_interested | ask_price | objection | approval | etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REVENUE TABLE
-- Track all money flowing in
-- ============================================================
CREATE TABLE revenue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  project_id UUID REFERENCES projects(id),
  client_id UUID REFERENCES clients(id),
  invoice_id UUID REFERENCES invoices(id),
  
  amount DECIMAL(10,2) NOT NULL,
  type TEXT, -- advance | milestone | final | retainer | bonus
  
  -- Payment details
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  payment_method TEXT,
  
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SYSTEM CONFIG TABLE
-- Runtime configuration — agents read from here
-- ============================================================
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_config (key, value, description) VALUES
  ('rate_card', '{
    "landing_page": {"min": 3000, "max": 6000, "days": 3},
    "business_website": {"min": 6000, "max": 15000, "days": 7},
    "ecommerce": {"min": 15000, "max": 40000, "days": 14},
    "webapp": {"min": 20000, "max": 80000, "days": 21},
    "retainer_monthly": {"min": 1500, "max": 3000, "days": 30}
  }', 'Service pricing in INR'),
  
  ('lead_scoring_weights', '{
    "no_website": 4,
    "bad_website": 2,
    "active_instagram": 1,
    "food_category": 1,
    "local_business": 1,
    "replied_to_posts": 1,
    "growing_followers": 1
  }', 'Lead scoring criteria'),
  
  ('outreach_limits', '{
    "daily_max": 20,
    "follow_up_day3": true,
    "follow_up_day7": true,
    "max_follow_ups": 2
  }', 'Outreach limits to avoid spam'),
  
  ('agent_credit_rewards', '{
    "lead_found": 5,
    "lead_qualified": 20,
    "proposal_sent": 15,
    "proposal_accepted": 50,
    "project_delivered": 100,
    "payment_collected": 75,
    "client_satisfied_5star": 50,
    "task_failed": -10,
    "escalation_caused": -20,
    "bug_found_own": 10,
    "bug_fixed": 25
  }', 'Credits awarded per action'),
  
  ('ai_budget', '{
    "daily_groq_calls": 1000,
    "daily_anthropic_calls": 100,
    "max_tokens_per_call": 4000
  }', 'AI API budget limits');

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score ON leads(score DESC);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_scheduled ON tasks(scheduled_for);
CREATE INDEX idx_tasks_agent ON tasks(assigned_agent);
CREATE INDEX idx_agent_logs_agent ON agent_logs(agent_name);
CREATE INDEX idx_agent_logs_created ON agent_logs(created_at DESC);
CREATE INDEX idx_messages_lead ON messages(lead_id);
CREATE INDEX idx_revenue_received ON revenue(received_at DESC);

-- ============================================================
-- REALTIME (enable for dashboard live updates)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE revenue;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================
-- AUTO-UPDATE timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_agent_rewards_updated_at BEFORE UPDATE ON agent_rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 5. ENVIRONMENT VARIABLES {#environment-variables}

Create `.env.local` for development. Add all to Netlify Environment Variables for production.

```bash
# ============================================================
# SUPABASE
# ============================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ============================================================
# AI PROVIDERS
# ============================================================
GROQ_API_KEY=gsk_your_groq_key           # Free: 14400 req/day
ANTHROPIC_API_KEY=sk-ant-your-key        # Paid fallback

# ============================================================
# WHATSAPP BUSINESS API (Meta)
# ============================================================
WHATSAPP_ACCESS_TOKEN=your-permanent-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-ba-id
WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token
YOUR_WHATSAPP_NUMBER=919999999999        # Your personal number for alerts

# ============================================================
# PAYMENTS
# ============================================================
RAZORPAY_KEY_ID=rzp_live_your_key
RAZORPAY_KEY_SECRET=your-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# ============================================================
# EMAIL
# ============================================================
RESEND_API_KEY=re_your_key
FROM_EMAIL=hello@levitatelabs.online
FROM_NAME=Levitate Labs

# ============================================================
# SCRAPING
# ============================================================
APIFY_API_TOKEN=apify_api_your-token
GOOGLE_MAPS_API_KEY=AIza-your-key

# ============================================================
# GITHUB (for triggering Actions from Netlify)
# ============================================================
GITHUB_TOKEN=ghp_your-token
GITHUB_ORG=your-github-username
GITHUB_CODING_REPO=levitate-labs-coding

# ============================================================
# ADMIN DASHBOARD
# ============================================================
ADMIN_PASSWORD=your-strong-password-here
ADMIN_SECRET=your-jwt-secret-32-chars-min

# ============================================================
# BUSINESS CONFIG
# ============================================================
BUSINESS_NAME=Levitate Labs
BUSINESS_OWNER=Pushpal
BUSINESS_PHONE=919999999999
BUSINESS_EMAIL=hello@levitatelabs.online
BUSINESS_GSTIN=your-gstin-if-registered
BUSINESS_ADDRESS=GSV Campus, Vadodara, Gujarat

# ============================================================
# NETLIFY
# ============================================================
NETLIFY_SITE_ID=your-site-id
NETLIFY_AUTH_TOKEN=your-netlify-token

# ============================================================
# UPTIME ROBOT
# ============================================================
UPTIMEROBOT_API_KEY=ur-your-key
```

---

## 6. AGENT ARCHITECTURE {#agent-architecture}

### Base Agent Class

```typescript
// lib/agents/base-agent.ts

export abstract class BaseAgent {
  name: string
  version: string = '1.0'
  
  constructor(name: string) {
    this.name = name
  }
  
  // Every agent MUST implement this
  abstract execute(context: AgentContext): Promise<AgentResult>
  
  // Log to Supabase + earn/lose credits
  async log(action: string, input: any, output: any, status: 'success' | 'failure', durationMs: number, creditsEarned: number = 0) {
    await supabase.from('agent_logs').insert({
      agent_name: this.name,
      action,
      input,
      output,
      status,
      duration_ms: durationMs,
      credits_earned: creditsEarned
    })
    
    if (creditsEarned !== 0) {
      await this.updateCredits(creditsEarned, action)
    }
  }
  
  async updateCredits(amount: number, reason: string) {
    await supabase.rpc('update_agent_credits', {
      p_agent_name: this.name,
      p_amount: amount,
      p_reason: reason
    })
  }
  
  // Check if agent has enough credits to run
  async canRun(): Promise<boolean> {
    const { data } = await supabase
      .from('agent_rewards')
      .select('current_balance, is_suspended')
      .eq('agent_name', this.name)
      .single()
    
    if (data?.is_suspended) return false
    return (data?.current_balance ?? 0) > 0
  }
  
  // Call AI — auto-routes to Groq or Anthropic
  async callAI(systemPrompt: string, userMessage: string, maxTokens: number = 2000): Promise<string> {
    return await aiRouter.call({
      system: systemPrompt,
      user: userMessage,
      maxTokens,
      agentName: this.name
    })
  }
}
```

---

## 7. AGENT REWARD SYSTEM {#agent-reward-system}

### Credit Economy Rules

```typescript
// config/agent-rewards.ts

export const CREDIT_EVENTS = {
  // EARNING events (positive)
  LEAD_FOUND_AND_SCORED: 5,           // BizDev finds a valid lead
  LEAD_QUALIFIED: 20,                  // Discovery qualifies a lead
  PROPOSAL_SENT: 15,                   // Proposal agent sends proposal
  PROPOSAL_ACCEPTED: 50,              // Client says yes
  CONTRACT_SIGNED: 30,                 // Contract executed
  ADVANCE_PAYMENT_RECEIVED: 75,        // Money in account
  FEATURE_CODED_CLEANLY: 10,           // Coder passes review first try
  ALL_TESTS_PASSED: 25,                // Tester: all green
  BUG_FIXED_FAST: 15,                  // Debugger fixes in 1 attempt
  PROJECT_DELIVERED: 100,              // Full project delivered
  FINAL_PAYMENT_RECEIVED: 75,          // Money in account
  CLIENT_5_STAR: 50,                   // Client rates 5 stars
  RETENTION_UPSELL: 40,                // Retention agent gets new project
  
  // LOSING events (negative)
  TASK_FAILED: -10,                    // Any agent fails a task
  MAX_RETRIES_REACHED: -25,            // Task needed escalation
  CODE_REVIEW_FAILED: -5,              // Reviewer rejects code
  TEST_FAILURE_CAUSED_BY_BAD_CODE: -10,// Coder wrote bad code
  CLIENT_COMPLAINT: -30,               // Client unhappy
  PAYMENT_CHASED_3_TIMES: -5,          // Invoice not paid (bad qualification)
  PROPOSAL_REJECTED: -5,               // Proposal didn't convert
}

// Privilege thresholds
export const CREDIT_PRIVILEGES = {
  0: { multiplier: 0.5, priority: 10, status: 'probation' },
  50: { multiplier: 0.75, priority: 8, status: 'normal' },
  100: { multiplier: 1.0, priority: 5, status: 'normal' },
  200: { multiplier: 1.25, priority: 3, status: 'performing' },
  500: { multiplier: 1.5, priority: 1, status: 'elite' },
  1000: { multiplier: 2.0, priority: 0, status: 'legendary' }
}
```

### Weekly Agent Evaluation (Netlify Scheduled Function)

```typescript
// netlify/functions/agent-evaluator.mts
// Runs every Sunday at 11 PM

export default async () => {
  const agents = await supabase.from('agent_rewards').select('*')
  
  for (const agent of agents.data) {
    const weeklyLogs = await getWeeklyLogs(agent.agent_name)
    
    const stats = {
      tasksCompleted: weeklyLogs.filter(l => l.status === 'success').length,
      tasksFailed: weeklyLogs.filter(l => l.status === 'failure').length,
      successRate: calculateSuccessRate(weeklyLogs),
      revenueGenerated: await getRevenueAttribution(agent.agent_name),
      creditsEarned: weeklyLogs.reduce((sum, l) => sum + l.credits_earned, 0)
    }
    
    // Bonus credits for consistent performance
    let bonusCredits = 0
    if (stats.successRate > 95) bonusCredits += 50  // Perfect week bonus
    if (stats.successRate > 80) bonusCredits += 20  // Good week bonus
    if (stats.revenueGenerated > 10000) bonusCredits += 100 // Revenue bonus
    
    // Penalty for terrible performance
    if (stats.successRate < 50) bonusCredits -= 30
    if (stats.tasksFailed > 10) bonusCredits -= 50
    
    // Update privileges based on new balance
    const newBalance = agent.current_balance + bonusCredits
    const privileges = getPrivileges(newBalance)
    
    await supabase.from('agent_rewards').update({
      current_balance: newBalance,
      total_credits_earned: agent.total_credits_earned + Math.max(0, bonusCredits),
      success_rate: stats.successRate,
      api_budget_multiplier: privileges.multiplier,
      priority_level: privileges.priority
    }).eq('agent_name', agent.agent_name)
    
    // Suspend agents below 0 credits
    if (newBalance <= 0) {
      await suspendAgent(agent.agent_name, 'Credit balance depleted')
      await notifyYou(`⚠️ Agent ${agent.agent_name} suspended. Balance: ${newBalance}`)
    }
    
    // Celebrate elite agents
    if (privileges.status === 'elite' || privileges.status === 'legendary') {
      await notifyYou(`🏆 Agent ${agent.agent_name} achieved ${privileges.status} status!`)
    }
  }
}
```

---

## 8. NETLIFY FUNCTIONS — ALL AGENTS {#netlify-functions}

### 8.1 Reporter Agent — Daily 8 AM

```typescript
// netlify/functions/reporter.mts
import type { Config } from "@netlify/functions"

export default async () => {
  const [leads, projects, revenue, agentStats] = await Promise.all([
    getYesterdayLeads(),
    getActiveProjects(),
    getYesterdayRevenue(),
    getAgentPerformance()
  ])
  
  const summary = await callAI(`
    You are the reporting agent for Levitate Labs, a web agency.
    Create a WhatsApp morning briefing for the owner Pushpal.
    Be concise, use emojis, highlight money received and any issues.
    Format for WhatsApp (no markdown).
  `, JSON.stringify({ leads, projects, revenue, agentStats }))
  
  await sendWhatsApp(process.env.YOUR_WHATSAPP_NUMBER, summary)
  await logAgent('reporter', 'daily_report', {}, { summary }, 'success', 0, 2)
}

export const config: Config = {
  schedule: "30 2 * * *"  // 8 AM IST = 2:30 AM UTC
}
```

### 8.2 BizDev Agent — Daily 6 AM

```typescript
// netlify/functions/bizdev.mts
import type { Config } from "@netlify/functions"

export default async () => {
  const canRun = await agentCanRun('bizdev')
  if (!canRun) return
  
  const config = await getConfig('outreach_limits')
  const todayCount = await getTodayLeadCount()
  if (todayCount >= config.daily_max) return

  const leads = []
  
  // Source 1: Google Maps — businesses without websites
  const mapLeads = await scrapeGoogleMaps([
    'restaurant Vadodara no website',
    'coaching centre Surat',
    'clinic Ahmedabad',
    'shop Vadodara'
  ])
  leads.push(...mapLeads)
  
  // Source 2: JustDial — no website filter
  const justDialLeads = await scrapeJustDial('Vadodara', ['Food', 'Education', 'Health'])
  leads.push(...justDialLeads)
  
  // Source 3: LinkedIn posts about needing websites
  const linkedinLeads = await scrapeLinkedIn([
    'need a website india',
    'looking for web developer india',
    'building my startup website india'
  ])
  leads.push(...linkedinLeads)
  
  // Score all leads
  for (const lead of leads) {
    const score = await scoreLead(lead)
    if (score >= 6) {  // Only save hot leads
      await saveLead({ ...lead, score, source: 'bizdev_agent' })
      await awardCredits('bizdev', CREDIT_EVENTS.LEAD_FOUND_AND_SCORED, `Found ${lead.business_name}`)
    }
  }
  
  await logAgent('bizdev', 'daily_scan', {}, { found: leads.length, saved: leads.filter(l => l.score >= 6).length }, 'success')
}

export const config: Config = {
  schedule: "30 0 * * *"  // 6 AM IST = 12:30 AM UTC
}
```

### 8.3 Outreach Agent — Daily 9 AM

```typescript
// netlify/functions/outreach.mts
import type { Config } from "@netlify/functions"

export default async () => {
  // Get hot leads not yet contacted
  const hotLeads = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'new')
    .gte('score', 6)
    .is('last_outreach_at', null)
    .order('score', { ascending: false })
    .limit(10)
  
  for (const lead of hotLeads.data) {
    // Research the business first
    const research = await researchBusiness(lead)
    
    // Write personalized message
    const message = await callAI(`
      You are a friendly web developer from Vadodara named Pushpal.
      Write a WhatsApp message to this business owner.
      
      RULES:
      - Reference ONE specific thing about their business you noticed
      - Point out ONE specific problem they have (no website, can't be found on Google, etc.)
      - Offer to fix it in 5-7 days
      - Sound like a real person, NOT a template
      - Use Hinglish naturally (mix of Hindi and English)
      - Under 120 words
      - End with a question that's easy to answer
      - NEVER mention "AI" or "automated"
      - Sign off as "Pushpal from Levitate Labs"
      
      Business Info: ${JSON.stringify(research)}
    `, '')
    
    // Send via WhatsApp
    const sent = await sendWhatsApp(lead.whatsapp, message)
    
    if (sent) {
      await supabase.from('leads').update({
        status: 'contacted',
        outreach_count: lead.outreach_count + 1,
        last_outreach_at: new Date().toISOString()
      }).eq('id', lead.id)
      
      await saveMessage(lead.id, 'outbound', message, 'outreach')
      
      // Small delay between messages (not spam)
      await sleep(Math.random() * 120000 + 60000) // 1-3 minutes
    }
  }
}

export const config: Config = {
  schedule: "30 3 * * *"  // 9 AM IST
}
```

### 8.4 Follow Up Agent — Daily 10 AM

```typescript
// netlify/functions/followup.mts
import type { Config } from "@netlify/functions"

export default async () => {
  const now = new Date()
  
  // Day 3 follow-up: contacted but no reply
  const day3Leads = await getLeadsForFollowUp(3, 0)
  
  for (const lead of day3Leads) {
    const message = await callAI(`
      Write a follow-up WhatsApp message. This is the 2nd message.
      Previous message was about: ${lead.last_message_summary}
      Try a different angle this time.
      Offer something valuable (free website audit, quick fix, etc.)
      Keep it under 80 words. Hinglish. Friendly, not pushy.
    `, '')
    
    await sendFollowUp(lead, message, 'day3')
  }
  
  // Day 7 follow-up: final attempt
  const day7Leads = await getLeadsForFollowUp(7, 1)
  
  for (const lead of day7Leads) {
    const message = await callAI(`
      Write a final WhatsApp message. This is the last one.
      Make it about a time-sensitive offer or a completely different value prop.
      If no reply after this, we stop (we respect their time).
      Under 60 words. Light and easy.
    `, '')
    
    await sendFollowUp(lead, message, 'day7')
    await updateLeadStatus(lead.id, 'archived', 'No response after 3 attempts')
  }
}

export const config: Config = {
  schedule: "30 4 * * *"  // 10 AM IST
}
```

### 8.5 Discovery Agent (Background Function)

```typescript
// netlify/functions/discovery-bg.mts
// Triggered by WhatsApp webhook when lead replies

export default async (req: Request) => {
  const { leadId, incomingMessage } = await req.json()
  
  const lead = await getLead(leadId)
  const history = lead.conversation_history || []
  
  // Add incoming message to history
  history.push({ role: 'client', message: incomingMessage, timestamp: new Date() })
  
  // Determine conversation stage
  const stage = await determineStage(history)
  
  // Generate appropriate response
  const response = await callAI(`
    You are a discovery agent for Levitate Labs web agency.
    You're having a WhatsApp conversation with a potential client.
    
    Your goal: Qualify this lead by finding out:
    1. What kind of website/service they need
    2. Their rough budget (don't ask directly — gauge from context)
    3. Their timeline
    4. Their business details
    
    Conversation stage: ${stage}
    Conversation so far: ${JSON.stringify(history)}
    
    RULES:
    - Sound like a friendly human (Pushpal from Levitate Labs)
    - One question at a time
    - If they seem ready, mention we can send a proposal
    - If budget is clearly too low (<2000), politely decline
    - Use Hinglish naturally
    - Short messages only (under 100 words)
    - NEVER mention AI or automation
    
    Incoming message: "${incomingMessage}"
    
    Respond with JSON: { reply: "...", stage: "...", qualified: true|false|null, qualification_data: {} }
  `, '')
  
  const parsed = JSON.parse(response)
  
  // Send reply
  await sendWhatsApp(lead.whatsapp, parsed.reply)
  history.push({ role: 'agent', message: parsed.reply, timestamp: new Date() })
  
  // Update lead
  await supabase.from('leads').update({
    conversation_history: history,
    last_message_at: new Date().toISOString()
  }).eq('id', leadId)
  
  // If qualified → trigger Proposal Agent
  if (parsed.qualified === true) {
    await awardCredits('discovery', CREDIT_EVENTS.LEAD_QUALIFIED)
    await updateLeadStatus(leadId, 'qualified', parsed.qualification_data)
    await triggerProposalAgent(leadId, parsed.qualification_data)
  }
  
  // If disqualified → archive gracefully
  if (parsed.qualified === false) {
    await updateLeadStatus(leadId, 'lost', 'Disqualified: ' + parsed.qualification_data.reason)
    await sendWhatsApp(lead.whatsapp, `Thank you for your time! 🙏 If you ever need web services in the future, we're here. Best of luck! 🚀`)
  }
}
```

### 8.6 Proposal Agent (Background Function)

```typescript
// netlify/functions/proposal-bg.mts

export default async (req: Request) => {
  const { leadId, qualificationData } = await req.json()
  
  const lead = await getLead(leadId)
  const rateCard = await getConfig('rate_card')
  
  // Generate proposal content with AI
  const proposalContent = await callAI(`
    Create a professional website proposal for this client.
    
    Client: ${lead.business_name}
    Their needs: ${JSON.stringify(qualificationData)}
    Our rate card: ${JSON.stringify(rateCard)}
    
    Generate:
    1. Project title
    2. What we'll build (specific pages and features for THEIR business)
    3. Timeline in days
    4. Total price (choose appropriate package from rate card)
    5. Advance amount (50%)
    6. Why they need this (specific to their business)
    7. What makes us different
    
    Return as JSON matching ProposalContent interface.
    Price should be COMPETITIVE but fair. For a small local business, lean toward lower end.
  `, '')
  
  const proposal = JSON.parse(proposalContent)
  
  // Generate PDF
  const pdfBuffer = await generateProposalPDF(proposal, lead)
  
  // Upload to Supabase Storage
  const pdfUrl = await uploadPDF(pdfBuffer, `proposals/${leadId}-${Date.now()}.pdf`)
  
  // Create Razorpay payment link for advance
  const paymentLink = await createRazorpayLink({
    amount: proposal.advance_amount * 100, // paise
    description: `Advance payment for ${proposal.title}`,
    name: lead.owner_name,
    contact: lead.whatsapp
  })
  
  // Save proposal to DB
  const savedProposal = await supabase.from('proposals').insert({
    lead_id: leadId,
    title: proposal.title,
    scope: proposal.scope,
    deliverables: proposal.deliverables,
    timeline_days: proposal.timeline_days,
    total_price: proposal.total_price,
    advance_amount: proposal.advance_amount,
    final_amount: proposal.final_amount,
    pdf_url: pdfUrl,
    payment_link: paymentLink.short_url,
    payment_link_id: paymentLink.id,
    status: 'draft',
    expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  }).select().single()
  
  // Send via WhatsApp
  const message = `Hi ${lead.owner_name}! 🎉

Here's your custom proposal for ${lead.business_name}:

📋 *${proposal.title}*
🗓️ Timeline: ${proposal.timeline_days} days
💰 Total: ₹${proposal.total_price.toLocaleString('en-IN')}

📄 View full proposal: ${pdfUrl}

To proceed, pay ₹${proposal.advance_amount.toLocaleString('en-IN')} advance here:
💳 ${paymentLink.short_url}

Questions? Just reply here! 🙏`
  
  await sendWhatsApp(lead.whatsapp, message)
  
  await updateProposalStatus(savedProposal.data.id, 'sent')
  await updateLeadStatus(leadId, 'proposal_sent')
  await awardCredits('proposal', CREDIT_EVENTS.PROPOSAL_SENT)
}
```

### 8.7 Webhook Handler (Instant)

```typescript
// netlify/functions/webhook-handler.mts
// Handles: Razorpay payments, WhatsApp messages, GitHub callbacks

export default async (req: Request) => {
  const url = new URL(req.url)
  const path = url.pathname
  
  // ── RAZORPAY PAYMENT WEBHOOK ──────────────────────────────
  if (path.includes('/razorpay')) {
    const signature = req.headers.get('x-razorpay-signature')
    const body = await req.text()
    
    if (!verifyRazorpaySignature(body, signature)) {
      return new Response('Invalid signature', { status: 401 })
    }
    
    const event = JSON.parse(body)
    
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity
      
      // Find which proposal this payment is for
      const proposal = await findProposalByPaymentLink(payment.description)
      
      if (proposal) {
        // Mark proposal as accepted
        await updateProposalStatus(proposal.id, 'accepted')
        await updateLeadStatus(proposal.lead_id, 'won')
        
        // Create client record
        const client = await createClient(proposal.lead_id)
        
        // Create project record
        const project = await createProject(client.id, proposal)
        
        // Record revenue
        await recordRevenue(project.id, client.id, payment.amount / 100, 'advance')
        
        // Award credits
        await awardCredits('proposal', CREDIT_EVENTS.PROPOSAL_ACCEPTED)
        await awardCredits('bizdev', CREDIT_EVENTS.ADVANCE_PAYMENT_RECEIVED * 0.3) // BizDev gets partial credit
        await awardCredits('discovery', CREDIT_EVENTS.ADVANCE_PAYMENT_RECEIVED * 0.3)
        
        // Trigger onboarding
        await triggerBackgroundFunction('onboarding-bg', { projectId: project.id })
        
        // Trigger coding pipeline via GitHub Actions
        await triggerGitHubAction('coding-agent', {
          project_id: project.id,
          project_name: project.name,
          requirements: project.requirements
        })
        
        // Notify you
        await sendWhatsApp(process.env.YOUR_WHATSAPP_NUMBER, 
          `💰 PAYMENT RECEIVED!\n${client.business_name}\n₹${payment.amount/100}\n\nCoding pipeline started! 🚀`)
      }
    }
    
    return new Response('OK', { status: 200 })
  }
  
  // ── WHATSAPP INCOMING MESSAGE ─────────────────────────────
  if (path.includes('/whatsapp')) {
    if (req.method === 'GET') {
      // Webhook verification
      const params = url.searchParams
      const challenge = params.get('hub.challenge')
      const token = params.get('hub.verify_token')
      if (token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 })
      }
    }
    
    if (req.method === 'POST') {
      const body = await req.json()
      const message = extractWhatsAppMessage(body)
      
      if (!message) return new Response('OK', { status: 200 })
      
      // Save message to DB
      const lead = await findLeadByPhone(message.from)
      if (lead) {
        await saveMessage(lead.id, 'inbound', message.text)
        
        // Trigger discovery agent (background, non-blocking)
        await triggerBackgroundFunction('discovery-bg', {
          leadId: lead.id,
          incomingMessage: message.text
        })
      }
      
      return new Response('OK', { status: 200 })
    }
  }
}
```

### 8.8 Invoice & Payment Chase Agent

```typescript
// netlify/functions/invoice-check.mts
// Runs daily at 9 AM

export default async () => {
  // Find overdue invoices
  const overdueInvoices = await supabase
    .from('invoices')
    .select('*, clients(*), projects(*)')
    .eq('status', 'sent')
    .lt('due_date', new Date().toISOString())
  
  for (const invoice of overdueInvoices.data) {
    const daysPastDue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000)
    
    let message = ''
    
    if (daysPastDue === 3 && invoice.reminder_count === 0) {
      message = `Hi ${invoice.clients.owner_name}! 😊 Just a friendly reminder — invoice #${invoice.invoice_number} of ₹${invoice.total} was due 3 days ago. Pay here: ${invoice.razorpay_payment_link} 🙏`
    } else if (daysPastDue === 7 && invoice.reminder_count === 1) {
      message = `Hi ${invoice.clients.owner_name}, following up on the pending payment of ₹${invoice.total} for your website project. Could you let me know the status? Payment link: ${invoice.razorpay_payment_link}`
    } else if (daysPastDue === 14 && invoice.reminder_count === 2) {
      message = `Hi ${invoice.clients.owner_name}, this is our final reminder for ₹${invoice.total} payment. Please process at your earliest convenience: ${invoice.razorpay_payment_link}. If there's any issue, please reply here.`
    } else if (daysPastDue >= 21 && invoice.reminder_count >= 3) {
      // Escalate to Pushpal
      await sendWhatsApp(process.env.YOUR_WHATSAPP_NUMBER,
        `⚠️ ESCALATION: Invoice #${invoice.invoice_number} unpaid 21+ days\nClient: ${invoice.clients.business_name}\nAmount: ₹${invoice.total}\nPhone: ${invoice.clients.whatsapp}\nPlease handle personally.`)
      await awardCredits('invoice', -5, 'Long overdue invoice')
      continue
    }
    
    if (message) {
      await sendWhatsApp(invoice.clients.whatsapp, message)
      await supabase.from('invoices').update({
        reminder_count: invoice.reminder_count + 1,
        last_reminder_at: new Date().toISOString()
      }).eq('id', invoice.id)
    }
  }
}

export const config: Config = {
  schedule: "30 3 * * *"  // 9 AM IST
}
```

### 8.9 Retention Agent — Weekly Sundays

```typescript
// netlify/functions/retention.mts

export default async () => {
  const clients = await supabase
    .from('clients')
    .select('*, projects(*)')
    .eq('status', 'active')
  
  for (const client of clients.data) {
    const completedProjects = client.projects.filter(p => p.status === 'delivered')
    if (!completedProjects.length) continue
    
    const lastProject = completedProjects.sort((a, b) => 
      new Date(b.delivered_at).getTime() - new Date(a.delivered_at).getTime()
    )[0]
    
    const daysSinceDelivery = Math.floor(
      (Date.now() - new Date(lastProject.delivered_at).getTime()) / 86400000
    )
    
    // 30-day check-in
    if (daysSinceDelivery === 30) {
      const message = await callAI(`
        Write a WhatsApp check-in message for a satisfied client.
        Client: ${client.business_name}, ${client.owner_name}
        We built: ${lastProject.type} website ${daysSinceDelivery} days ago
        
        Goals:
        1. Ask how the website is performing
        2. Offer 1 free tweak if needed
        3. Mention we offer monthly maintenance (₹1500/month)
        Keep it short, warm, Hinglish. NOT salesy.
      `, '')
      
      await sendWhatsApp(client.whatsapp, message)
    }
    
    // 3-month upsell
    if (daysSinceDelivery === 90) {
      const message = await callAI(`
        Write a WhatsApp message to a happy client we worked with 3 months ago.
        Offer: "We can now do SEO optimization for your site — get found on Google."
        Price: ₹3000 one-time
        Keep it casual, Hinglish, not pushy.
        End with a soft yes/no question.
      `, '')
      
      await sendWhatsApp(client.whatsapp, message)
    }
    
    // 6-month annual maintenance upsell
    if (daysSinceDelivery === 180) {
      const message = `Hi ${client.owner_name}! 👋 It's been 6 months since we launched your website! Hope it's bringing in good business. 🙏\n\nWe're offering an annual maintenance plan — security updates, speed optimization, content updates, and priority support — for just ₹1499/month.\n\nInterested? 😊`
      await sendWhatsApp(client.whatsapp, message)
      await awardCredits('retention', CREDIT_EVENTS.LEAD_FOUND_AND_SCORED)
    }
  }
}

export const config: Config = {
  schedule: "0 16 * * 0"  // Sunday 9:30 PM IST
}
```

---

## 9. GITHUB ACTIONS PIPELINES {#github-actions-pipelines}

### 9.1 Main Coding Pipeline

```yaml
# .github/workflows/coding-agent.yml
name: 🤖 Coding Agent Pipeline

on:
  repository_dispatch:
    types: [new-coding-task]
  schedule:
    - cron: '30 16 * * *'  # 10 PM IST nightly

jobs:
  architect:
    name: 🏗️ Architect Agent
    runs-on: ubuntu-latest
    outputs:
      project_id: ${{ steps.arch.outputs.project_id }}
      architecture: ${{ steps.arch.outputs.architecture }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - id: arch
        name: Run Architect Agent
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          PROJECT_ID: ${{ github.event.client_payload.project_id }}
        run: |
          node scripts/agents/architect.js
  
  code:
    name: 💻 Coder Agent
    needs: architect
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python (for Aider)
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install Aider
        run: pip install aider-chat
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Create client repo
        env:
          GITHUB_TOKEN: ${{ secrets.GH_PAT }}
          PROJECT_ID: ${{ needs.architect.outputs.project_id }}
        run: node scripts/agents/create-repo.js
      
      - name: Run Coder Agent (Aider)
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          OPENAI_API_BASE: https://api.groq.com/openai/v1
          OPENAI_API_KEY: ${{ secrets.GROQ_API_KEY }}
          PROJECT_ID: ${{ needs.architect.outputs.project_id }}
        run: node scripts/agents/coder.js
      
      - name: Commit and push
        run: |
          cd client-repo
          git config user.email "agents@levitatelabs.online"
          git config user.name "Levitate Labs Agent"
          git add .
          git commit -m "feat: automated implementation by coder agent"
          git push
  
  review:
    name: 🔍 Reviewer Agent
    needs: code
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      - name: Run Reviewer Agent
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          PROJECT_ID: ${{ needs.architect.outputs.project_id }}
        run: node scripts/agents/reviewer.js
  
  test:
    name: 🧪 Tester Agent
    needs: review
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Playwright
        run: |
          npm ci
          npx playwright install --with-deps
      
      - name: Run Tester Agent
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          PROJECT_ID: ${{ needs.architect.outputs.project_id }}
        run: node scripts/agents/tester.js
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-results
          path: test-results/
  
  debug:
    name: 🐛 Debugger Agent
    needs: test
    if: failure()
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      - name: Run Debugger Agent
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          PROJECT_ID: ${{ needs.architect.outputs.project_id }}
        run: node scripts/agents/debugger.js
      
      - name: Re-run tests after fix
        run: node scripts/agents/tester.js
  
  deploy:
    name: 🚀 Deployer Agent
    needs: test
    if: success()
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Netlify CLI
        run: npm install -g netlify-cli
      
      - name: Deploy to staging
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          PROJECT_ID: ${{ needs.architect.outputs.project_id }}
        run: node scripts/agents/deployer.js staging
      
      - name: Notify client via WhatsApp
        env:
          WHATSAPP_ACCESS_TOKEN: ${{ secrets.WHATSAPP_ACCESS_TOKEN }}
          PROJECT_ID: ${{ needs.architect.outputs.project_id }}
        run: node scripts/agents/notify-client.js staging
```

---

## 10. 24/7 ADMIN DASHBOARD {#admin-dashboard}

### Dashboard Architecture

The dashboard lives at `levitatelabs.online/admin` and shows everything in real-time using Supabase Realtime subscriptions. It auto-refreshes. You can see every agent, every lead, every rupee — live.

```typescript
// app/admin/page.tsx
// Main dashboard — the control center

'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<AgentLog[]>([])
  const [activeProjects, setActiveProjects] = useState<Project[]>([])
  const [hotLeads, setHotLeads] = useState<Lead[]>([])
  const [agentStatus, setAgentStatus] = useState<AgentReward[]>([])
  const [revenue, setRevenue] = useState<RevenueStats>()
  
  useEffect(() => {
    const supabase = createClient()
    
    // Load initial data
    loadDashboardData()
    
    // Real-time subscriptions — dashboard updates live
    const channels: RealtimeChannel[] = [
      supabase.channel('agent_logs').on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'agent_logs' },
        (payload) => {
          setRecentActivity(prev => [payload.new as AgentLog, ...prev.slice(0, 49)])
        }
      ).subscribe(),
      
      supabase.channel('leads').on('postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => loadHotLeads()
      ).subscribe(),
      
      supabase.channel('projects').on('postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => loadActiveProjects()
      ).subscribe(),
      
      supabase.channel('revenue').on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'revenue' },
        (payload) => {
          const newRevenue = payload.new as Revenue
          setStats(prev => prev ? {
            ...prev,
            todayRevenue: prev.todayRevenue + newRevenue.amount,
            totalRevenue: prev.totalRevenue + newRevenue.amount
          } : null)
          // Flash celebration effect
          triggerPaymentCelebration(newRevenue.amount)
        }
      ).subscribe()
    ]
    
    return () => { channels.forEach(c => supabase.removeChannel(c)) }
  }, [])
  
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      
      {/* TOP BAR */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Levitate Labs HQ</h1>
          <p className="text-gray-400 text-sm">
            All systems {stats?.systemHealth === 'green' ? '🟢 operational' : '🔴 attention needed'}
            {' · '}{new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
          </p>
        </div>
        <AgentStatusBadges agents={agentStatus} />
      </header>
      
      {/* REVENUE STRIP — always visible */}
      <RevenueStrip
        today={stats?.todayRevenue}
        thisMonth={stats?.monthRevenue}
        total={stats?.totalRevenue}
        pending={stats?.pendingRevenue}
      />
      
      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-6 mt-6">
        
        {/* PIPELINE FUNNEL — col 1-4 */}
        <div className="col-span-4">
          <PipelineCard
            leads={stats?.leadsFound}
            contacted={stats?.leadsContacted}
            qualified={stats?.leadsQualified}
            proposalSent={stats?.proposalsSent}
            won={stats?.dealsWon}
            lost={stats?.dealsLost}
          />
        </div>
        
        {/* ACTIVE PROJECTS — col 5-8 */}
        <div className="col-span-4">
          <ActiveProjectsCard projects={activeProjects} />
        </div>
        
        {/* AGENT PERFORMANCE — col 9-12 */}
        <div className="col-span-4">
          <AgentLeaderboard agents={agentStatus} />
        </div>
        
        {/* LIVE AGENT ACTIVITY FEED — col 1-6 */}
        <div className="col-span-6">
          <LiveActivityFeed logs={recentActivity} />
        </div>
        
        {/* HOT LEADS TODAY — col 7-12 */}
        <div className="col-span-6">
          <HotLeadsCard leads={hotLeads} />
        </div>
        
        {/* TASK QUEUE — col 1-6 */}
        <div className="col-span-6">
          <TaskQueueCard />
        </div>
        
        {/* REVENUE CHART — col 7-12 */}
        <div className="col-span-6">
          <RevenueChart />
        </div>
        
      </div>
      
      {/* ESCALATIONS PANEL — appears when something needs attention */}
      <EscalationsPanel />
      
    </div>
  )
}
```

### Key Dashboard Components

```typescript
// components/dashboard/LiveActivityFeed.tsx
// Real-time feed of everything agents are doing

export function LiveActivityFeed({ logs }: { logs: AgentLog[] }) {
  return (
    <Card title="🤖 Live Agent Activity">
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {logs.map(log => (
          <div key={log.id} className={`flex items-start gap-3 p-3 rounded-lg text-sm
            ${log.status === 'success' ? 'bg-green-950' : 'bg-red-950'}`}>
            <AgentIcon agent={log.agent_name} />
            <div>
              <span className="font-medium text-white">{log.agent_name}</span>
              <span className="text-gray-400 mx-2">→</span>
              <span className="text-gray-300">{log.action}</span>
              {log.credits_earned !== 0 && (
                <span className={`ml-2 text-xs px-1 rounded ${log.credits_earned > 0 ? 'bg-green-800' : 'bg-red-800'}`}>
                  {log.credits_earned > 0 ? '+' : ''}{log.credits_earned} cr
                </span>
              )}
              <div className="text-gray-500 text-xs mt-1">
                {formatTimeAgo(log.created_at)} · {log.duration_ms}ms · {log.ai_provider}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// components/dashboard/AgentLeaderboard.tsx
// Shows each agent's credit balance and performance

export function AgentLeaderboard({ agents }: { agents: AgentReward[] }) {
  const sorted = [...agents].sort((a, b) => b.current_balance - a.current_balance)
  
  return (
    <Card title="🏆 Agent Leaderboard">
      <div className="space-y-2">
        {sorted.map((agent, index) => (
          <div key={agent.agent_name} className="flex items-center gap-3">
            <span className="text-gray-500 w-6">#{index + 1}</span>
            <AgentIcon agent={agent.agent_name} size="sm" />
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium capitalize">{agent.agent_name}</span>
                <span className="text-sm text-yellow-400">{agent.current_balance} cr</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-500">
                <span>✅ {agent.success_rate}%</span>
                <span>💰 ₹{agent.revenue_generated}</span>
                <span className={agent.is_suspended ? 'text-red-400' : 'text-green-400'}>
                  {agent.is_suspended ? '⛔ suspended' : '● active'}
                </span>
              </div>
              <div className="mt-1 h-1 bg-gray-800 rounded">
                <div 
                  className="h-1 rounded bg-gradient-to-r from-blue-500 to-purple-500"
                  style={{ width: `${Math.min(100, agent.current_balance / 10)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// components/dashboard/EscalationsPanel.tsx
// Pops up when agents need human decision

export function EscalationsPanel() {
  const [escalations, setEscalations] = useState([])
  
  // Fetch unresolved escalations
  useEffect(() => {
    const supabase = createClient()
    supabase.from('tasks')
      .select('*, projects(*), leads(*)')
      .eq('status', 'escalated')
      .order('created_at', { ascending: false })
      .then(({ data }) => setEscalations(data || []))
  }, [])
  
  if (!escalations.length) return null
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-red-900 border border-red-500 rounded-xl p-4 max-w-sm shadow-2xl">
        <h3 className="font-bold text-red-300 mb-3">
          ⚠️ {escalations.length} Escalation{escalations.length > 1 ? 's' : ''} Need Attention
        </h3>
        {escalations.slice(0, 3).map(esc => (
          <div key={esc.id} className="mb-2 p-2 bg-red-950 rounded">
            <p className="text-sm font-medium">{esc.title}</p>
            <p className="text-xs text-gray-400">{esc.last_error}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => resolveEscalation(esc.id, 'retry')}
                className="text-xs bg-blue-700 px-2 py-1 rounded">Retry</button>
              <button onClick={() => resolveEscalation(esc.id, 'skip')}
                className="text-xs bg-gray-700 px-2 py-1 rounded">Skip</button>
              <button onClick={() => resolveEscalation(esc.id, 'handle')}
                className="text-xs bg-green-700 px-2 py-1 rounded">I'll Handle</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 11. LEAD FINDING SYSTEM {#lead-finding-system}

### Google Maps Scraper

```typescript
// lib/scrapers/google-maps.ts

export async function scrapeGoogleMaps(queries: string[]): Promise<RawLead[]> {
  const leads: RawLead[] = []
  
  for (const query of queries) {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    )
    const data = await response.json()
    
    for (const place of data.results) {
      // Get place details to check for website
      const details = await getPlaceDetails(place.place_id)
      
      // GOLD: businesses with no website
      if (!details.website) {
        leads.push({
          business_name: place.name,
          phone: details.formatted_phone_number,
          city: extractCity(details.formatted_address),
          google_maps_url: `https://maps.google.com/?cid=${place.place_id}`,
          category: details.types?.[0],
          source: 'google_maps',
          source_data: { place_id: place.place_id, rating: place.rating, review_count: place.user_ratings_total },
          has_website: false,
          score_bonus: 4  // No website = hot lead
        })
      }
    }
    
    await sleep(1000) // Respect rate limits
  }
  
  return leads
}
```

### Lead Scorer

```typescript
// lib/agents/bizdev-agent.ts

export async function scoreLead(lead: RawLead): Promise<number> {
  const weights = await getConfig('lead_scoring_weights')
  let score = 0
  
  if (!lead.has_website) score += weights.no_website          // +4
  if (lead.website_quality_score < 4) score += weights.bad_website  // +2
  if (lead.has_instagram) score += weights.active_instagram   // +1
  if (['restaurant', 'clinic', 'coaching'].includes(lead.category)) score += 1 // High-need categories
  if (lead.has_phone) score += 1                              // Can contact them
  
  // AI-assisted scoring for edge cases
  if (score >= 4) {
    const aiScore = await callAI(`
      Score this business lead 1-10 for needing a website.
      10 = desperately needs one, 1 = already sorted.
      Return only a number.
      Lead: ${JSON.stringify(lead)}
    `, '')
    score = Math.round((score + parseInt(aiScore)) / 2)
  }
  
  return Math.min(10, score)
}
```

---

## 12. OUTREACH AND CLOSING {#outreach-and-closing}

### WhatsApp Client

```typescript
// lib/whatsapp/client.ts

export async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace('+', '').replace(/\s/g, ''),
          type: 'text',
          text: { body: message }
        })
      }
    )
    
    const data = await response.json()
    return !data.error
  } catch (error) {
    console.error('WhatsApp send failed:', error)
    return false
  }
}
```

---

## 13. DELIVERY PIPELINE {#delivery-pipeline}

### Project Website Templates

The Coder Agent uses these prompts to generate complete websites:

```typescript
// config/agent-prompts.json (excerpt)

{
  "coder": {
    "system": "You are an expert Next.js developer. You write clean, production-ready code. You ALWAYS complete the full implementation — never leave TODOs or placeholders. Every page must be fully functional.",
    
    "website_types": {
      "restaurant": {
        "pages": ["home", "menu", "about", "contact", "order"],
        "must_have": ["WhatsApp order button", "Google Maps embed", "photo gallery", "opening hours"],
        "style": "warm, appetizing colors, large food photos"
      },
      "coaching": {
        "pages": ["home", "courses", "about", "testimonials", "contact", "enroll"],
        "must_have": ["enrollment form", "course cards", "teacher profile", "success stories"],
        "style": "professional, trust-building, clean"
      },
      "clinic": {
        "pages": ["home", "services", "doctors", "book-appointment", "contact"],
        "must_have": ["appointment booking form", "doctor profiles", "services list", "emergency contact"],
        "style": "clean, medical, trustworthy, calming blues"
      },
      "retail": {
        "pages": ["home", "products", "about", "contact"],
        "must_have": ["WhatsApp chat button", "product catalog", "store location", "business hours"],
        "style": "vibrant, commercial, product-focused"
      }
    }
  }
}
```

### Automated Testing Template

```typescript
// scripts/agents/tester.js
// Generates and runs Playwright tests for client site

const TESTS_TEMPLATE = `
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.STAGING_URL

test('Homepage loads correctly', async ({ page }) => {
  await page.goto(BASE_URL)
  await expect(page).toHaveTitle(/.+/)
  await expect(page.locator('h1')).toBeVisible()
})

test('Contact form submits', async ({ page }) => {
  await page.goto(BASE_URL + '/contact')
  await page.fill('[name="name"]', 'Test User')
  await page.fill('[name="phone"]', '9876543210')
  await page.fill('[name="message"]', 'Test message')
  await page.click('[type="submit"]')
  await expect(page.locator('.success-message')).toBeVisible()
})

test('Mobile responsive', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(BASE_URL)
  await expect(page.locator('nav')).toBeVisible()
})

test('Page speed acceptable', async ({ page }) => {
  await page.goto(BASE_URL)
  const performance = await page.evaluate(() => JSON.stringify(performance.timing))
  const timing = JSON.parse(performance)
  const loadTime = timing.loadEventEnd - timing.navigationStart
  expect(loadTime).toBeLessThan(5000) // Under 5 seconds
})

test('All links work', async ({ page }) => {
  await page.goto(BASE_URL)
  const links = await page.locator('a[href]').all()
  for (const link of links) {
    const href = await link.getAttribute('href')
    if (href && !href.startsWith('mailto') && !href.startsWith('tel') && !href.startsWith('#')) {
      const response = await page.goto(href)
      expect(response?.status()).toBeLessThan(400)
      await page.goto(BASE_URL)
    }
  }
})
`
```

---

## 14. PAYMENT SYSTEM {#payment-system}

### Razorpay Integration

```typescript
// lib/payments/razorpay.ts

export async function createPaymentLink(params: {
  amount: number,      // in INR
  description: string,
  name: string,
  contact: string,
  referenceId: string  // proposal/invoice ID
}): Promise<RazorpayLink> {
  const response = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: params.amount * 100,  // convert to paise
      currency: 'INR',
      description: params.description,
      customer: {
        name: params.name,
        contact: params.contact
      },
      notify: { sms: true, email: false },
      reminder_enable: true,
      reference_id: params.referenceId,
      expire_by: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      callback_url: `https://levitatelabs.online/api/webhook/razorpay`,
      callback_method: 'get'
    })
  })
  
  return response.json()
}
```

---

## 15. NOTIFICATION SYSTEM {#notification-system}

### Notification Router

```typescript
// lib/notifications.ts

export async function notifyYou(message: string, priority: 'low' | 'normal' | 'urgent' = 'normal') {
  // Always send to WhatsApp
  await sendWhatsApp(process.env.YOUR_WHATSAPP_NUMBER, message)
  
  // For urgent: also send email
  if (priority === 'urgent') {
    await sendEmail({
      to: process.env.BUSINESS_EMAIL,
      subject: '🚨 Levitate Labs Alert',
      html: `<p>${message}</p>`
    })
  }
}

// Pre-built notification messages
export const NOTIFICATIONS = {
  newPayment: (client: string, amount: number) =>
    `💰 PAYMENT RECEIVED!\n${client} paid ₹${amount.toLocaleString('en-IN')}\n\nGreat work agents! 🤖`,
    
  projectDelivered: (client: string, project: string) =>
    `✅ PROJECT DELIVERED!\n${project} for ${client}\nClient notified. Awaiting approval.`,
    
  newLead: (business: string, score: number) =>
    `🎯 Hot lead found!\n${business}\nScore: ${score}/10\nOutreach scheduled for tomorrow.`,
    
  escalation: (agent: string, task: string, error: string) =>
    `⚠️ ESCALATION NEEDED\nAgent: ${agent}\nTask: ${task}\nError: ${error}\nCheck dashboard.`,
    
  agentSuspended: (agent: string, reason: string) =>
    `🤖 Agent ${agent} suspended\nReason: ${reason}\nCheck /admin/agents`
}
```

---

## 16. RELIABILITY & SELF-HEALING {#reliability}

### Supabase Heartbeat

```typescript
// netlify/functions/supabase-heartbeat.mts
// Prevents Supabase free tier from pausing

export default async () => {
  await supabase.from('system_config').select('key').limit(1)
  // That's it. Just needs any DB activity every 5 days.
}

export const config: Config = {
  schedule: "0 12 */5 * *"  // Every 5 days at noon
}
```

### Health Check Endpoint

```typescript
// app/api/health/route.ts
// UptimeRobot pings this every 5 minutes

export async function GET() {
  const checks = await Promise.all([
    checkSupabase(),
    checkGroqAPI(),
    checkWhatsApp(),
    checkRazorpay()
  ])
  
  const allHealthy = checks.every(c => c.healthy)
  
  return Response.json({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks
  }, { status: allHealthy ? 200 : 503 })
}
```

### Task Retry Logic

```typescript
// lib/supabase/tasks.ts

export async function claimTask(agentName: string, taskType: string) {
  // Atomic claim — prevents two agents taking same task
  const { data } = await supabase.rpc('claim_task', {
    p_agent_name: agentName,
    p_task_type: taskType
  })
  return data
}

export async function failTask(taskId: string, error: string) {
  const task = await getTask(taskId)
  
  if (task.attempt_count >= task.max_attempts) {
    // Escalate
    await supabase.from('tasks').update({
      status: 'escalated',
      last_error: error
    }).eq('id', taskId)
    
    await notifyYou(NOTIFICATIONS.escalation(task.assigned_agent, task.title, error), 'urgent')
    await awardCredits(task.assigned_agent, -20, 'Max retries reached — escalated')
  } else {
    // Retry with exponential backoff
    const retryAfter = new Date(Date.now() + Math.pow(2, task.attempt_count) * 60000)
    await supabase.from('tasks').update({
      status: 'pending',
      attempt_count: task.attempt_count + 1,
      scheduled_for: retryAfter.toISOString(),
      last_error: error,
      assigned_agent: null,
      claimed_at: null
    }).eq('id', taskId)
    
    await awardCredits(task.assigned_agent, -10, 'Task failed — retrying')
  }
}
```

---

## 17. BUILD ORDER {#build-order}

Follow this exactly. Do not skip steps. Each step must work before moving to next.

### Day 1 — Foundation
```
□ Create Supabase project, run full schema migration
□ Add all environment variables to Netlify
□ Create netlify/functions/ folder structure
□ Build lib/supabase/client.ts
□ Build lib/ai/router.ts (Groq primary)
□ Test: call Groq API and log to Supabase agent_logs
□ Deploy to Netlify and verify functions load
```

### Day 2 — Money Flow
```
□ Set up Razorpay account
□ Build lib/payments/razorpay.ts
□ Build app/api/webhook/razorpay/route.ts
□ Set up WhatsApp Business API (Meta Business Manager)
□ Build lib/whatsapp/client.ts
□ Test: create fake payment → webhook fires → WhatsApp notification to you
□ This is the most important flow. Do not proceed until this works perfectly.
```

### Day 3 — Reporter Agent
```
□ Build netlify/functions/reporter.mts
□ Test manually first (trigger via curl)
□ Connect to cron schedule
□ Get your first 8 AM WhatsApp digest
□ Build basic admin dashboard skeleton at /admin
□ Add auth (simple password check is fine to start)
```

### Day 4 — Lead Finding
```
□ Get Google Maps API key
□ Build lib/scrapers/google-maps.ts
□ Build lib/agents/bizdev-agent.ts (scoring logic)
□ Build netlify/functions/bizdev.mts
□ Test: run manually, check Supabase leads table fills up
□ Build leads view in dashboard
```

### Day 5 — Outreach
```
□ Build lib/agents/outreach-agent.ts
□ Build netlify/functions/outreach.mts
□ TEST WITH YOUR OWN NUMBER FIRST
□ Send yourself a fake outreach message
□ Verify it sounds human and personalized
□ Only then enable for real leads
```

### Day 6–7 — Discovery + Proposal
```
□ Build app/api/webhook/whatsapp/route.ts (incoming messages)
□ Build netlify/functions/discovery-bg.mts
□ Build lib/pdf/proposal.ts (PDF generation)
□ Build netlify/functions/proposal-bg.mts
□ End-to-end test: fake lead → reply → proposal generated → PDF sent
```

### Week 2 — Coding Pipeline
```
□ Set up GitHub Actions repository
□ Write architect.js, coder.js, reviewer.js scripts
□ Install Aider, configure with Groq
□ Write tester.js (Playwright)
□ Write debugger.js
□ Write deployer.js (Netlify CLI)
□ End-to-end test: drop fake project → full pipeline → deployed website
```

### Week 2–3 — Full Dashboard
```
□ Build RevenueStrip component
□ Build LiveActivityFeed (real-time)
□ Build AgentLeaderboard
□ Build ActiveProjectsCard
□ Build TaskQueueCard
□ Build EscalationsPanel
□ Connect all Supabase Realtime subscriptions
□ Build /admin/leads, /admin/projects, /admin/agents, /admin/revenue pages
```

### Week 3 — Polish
```
□ Build retention agent
□ Build invoice chase agent
□ Build contract generation
□ Add agent reward evaluation (weekly cron)
□ Wire UptimeRobot monitoring
□ Add Supabase heartbeat
□ Full system test — fake client from lead to invoice paid
```

---

## 18. API REFERENCE {#api-reference}

### Internal API Endpoints

```
POST /api/webhook/razorpay        Razorpay payment events
POST /api/webhook/whatsapp        Incoming WhatsApp messages
GET  /api/webhook/whatsapp        WhatsApp webhook verification
POST /api/webhook/github          GitHub Actions callbacks

GET  /api/admin/stats             Dashboard statistics
GET  /api/admin/leads             Lead list with filters
GET  /api/admin/projects          Project list
GET  /api/admin/agents            Agent performance data
POST /api/admin/agents/suspend    Suspend/unsuspend agent
POST /api/admin/tasks/retry       Retry failed task
POST /api/admin/escalations/resolve Resolve escalation

GET  /api/health                  System health check (for UptimeRobot)
```

### Supabase RPC Functions

```sql
-- Claim a task atomically (prevents race conditions)
CREATE OR REPLACE FUNCTION claim_task(p_agent_name TEXT, p_task_type TEXT)
RETURNS tasks AS $$
DECLARE task_row tasks;
BEGIN
  SELECT * INTO task_row FROM tasks
  WHERE status = 'pending' AND type = p_task_type
    AND scheduled_for <= NOW() AND assigned_agent IS NULL
  ORDER BY priority ASC, created_at ASC
  LIMIT 1 FOR UPDATE SKIP LOCKED;
  
  IF FOUND THEN
    UPDATE tasks SET status = 'claimed', assigned_agent = p_agent_name,
      claimed_at = NOW() WHERE id = task_row.id;
  END IF;
  RETURN task_row;
END;
$$ LANGUAGE plpgsql;

-- Update agent credits
CREATE OR REPLACE FUNCTION update_agent_credits(p_agent_name TEXT, p_amount INT, p_reason TEXT)
RETURNS void AS $$
BEGIN
  UPDATE agent_rewards SET
    current_balance = current_balance + p_amount,
    total_credits_earned = CASE WHEN p_amount > 0 THEN total_credits_earned + p_amount ELSE total_credits_earned END,
    updated_at = NOW()
  WHERE agent_name = p_agent_name;
END;
$$ LANGUAGE plpgsql;
```

---

## FINAL NOTES FOR CLAUDE CODE

1. **Build in order.** The payment flow (Day 2) must work before anything else matters.

2. **Test with yourself first.** Before sending any WhatsApp to real leads, test every outreach message by sending it to your own number. The message must sound 100% human.

3. **The outreach message is the most important thing.** All the infrastructure in the world doesn't matter if the first WhatsApp to a lead sounds like a bot. The research step in the outreach agent is non-negotiable.

4. **Never touch main branch.** Coder agent always works on feature branches. Auto-merge only after all tests green.

5. **Escalation is not failure.** The system is designed to escalate gracefully. Pushpal gets a WhatsApp when something genuinely needs human judgment. Everything else is automated.

6. **The agent reward system is real.** Implement it properly. Agents that consistently fail should be suspended and re-evaluated. This creates a self-improving system.

7. **Dashboard must be live.** All dashboard data must update in real-time via Supabase Realtime. Pushpal should be able to open the dashboard and see exactly what's happening right now, not 5 minutes ago.

8. **Revenue first.** Every build decision should prioritize the money flow. Lead → WhatsApp → Proposal → Payment → Build → Deliver → Invoice. This loop is the business.

---

*Built for Levitate Labs — levitatelabs.online*  
*Stack: Next.js 14 + Netlify + Supabase + Groq + GitHub Actions*  
*Total monthly infrastructure cost: ₹0*