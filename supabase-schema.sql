-- ============================================
-- LEVITATE LABS - COMPLETE SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LEADS TABLE - Contact Form Submissions
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    service_category TEXT NOT NULL,
    budget TEXT,
    message TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Closed')),
    ai_analysis TEXT,
    ai_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ============================================
-- SERVICES TABLE - All Service Offerings
-- ============================================
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('web', 'mechanical', 'growth', 'creative')),
    price TEXT NOT NULL,
    price_unit TEXT DEFAULT 'fixed',
    short_description TEXT,
    long_description TEXT,
    features JSONB DEFAULT '[]',
    benefits JSONB DEFAULT '[]',
    process_steps JSONB DEFAULT '[]',
    faq JSONB DEFAULT '[]',
    deliverables TEXT[],
    timeline TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);

-- ============================================
-- TEAM MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    role_tagline TEXT,
    bio TEXT,
    skills TEXT[],
    avatar_url TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CASE STUDIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS case_studies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    url TEXT,
    description TEXT,
    long_description TEXT,
    client_name TEXT,
    industry TEXT,
    tech_stack JSONB DEFAULT '[]',
    highlights TEXT[],
    metrics JSONB DEFAULT '[]',
    images TEXT[],
    testimonial TEXT,
    testimonial_author TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TESTIMONIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_title TEXT,
    company TEXT,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    avatar_url TEXT,
    service_category TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BLOG POSTS TABLE (for future use)
-- ============================================
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT,
    cover_image TEXT,
    author_id UUID REFERENCES team_members(id),
    category TEXT,
    tags TEXT[],
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI CHAT HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history(session_id);

-- ============================================
-- ADMIN SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username TEXT NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_session_token ON admin_sessions(session_token);

-- ============================================
-- SITE SETTINGS TABLE (CMS Lite)
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INSERT DEFAULT SERVICES DATA
-- ============================================

-- Web Development Services
INSERT INTO services (slug, name, category, price, price_unit, short_description, long_description, features, benefits, process_steps, faq, deliverables, timeline) VALUES

('static-development', 'Static Development', 'web', '₹3,000', 'fixed',
'Fast, optimized static websites built with modern technologies.',
'Transform your online presence with lightning-fast static websites. We use cutting-edge technologies like Next.js, Astro, and Hugo to create websites that load in milliseconds. Perfect for portfolios, landing pages, and documentation sites. Our static sites are inherently secure, require minimal hosting costs, and deliver exceptional user experiences across all devices.',
'["Lightning-fast page loads (<1s)", "Mobile-first responsive design", "SEO optimized structure", "Modern CSS animations", "Contact form integration", "Analytics setup", "SSL certificate included"]',
'["99.9% uptime guarantee", "Zero database vulnerabilities", "Minimal hosting costs (often free)", "Perfect Lighthouse scores", "Better Google rankings", "Instant global CDN delivery"]',
'[{"step": 1, "title": "Discovery", "description": "Understanding your brand, goals, and target audience"}, {"step": 2, "title": "Design", "description": "Creating wireframes and visual mockups"}, {"step": 3, "title": "Development", "description": "Building with modern frameworks"}, {"step": 4, "title": "Testing", "description": "Cross-browser and device testing"}, {"step": 5, "title": "Launch", "description": "Deployment and DNS configuration"}]',
'[{"q": "What is a static website?", "a": "A static website serves pre-built HTML files, making it extremely fast and secure compared to traditional dynamic sites."}, {"q": "Can I update content myself?", "a": "Yes! We can integrate a headless CMS like Contentful or Sanity for easy content updates."}, {"q": "Where will my site be hosted?", "a": "We deploy to Netlify, Vercel, or Cloudflare for global CDN coverage and automatic HTTPS."}]',
ARRAY['5-10 page responsive website', 'Source code ownership', 'Deployment to hosting', '30 days free support', 'Basic SEO setup'],
'5-7 business days'),

('full-stack-app', 'Full Stack Application', 'web', '₹9,000', 'starting',
'Complete web applications with frontend, backend, and database.',
'Build powerful, scalable web applications that handle complex business logic. Our full-stack solutions combine beautiful React/Next.js frontends with robust Node.js/Python backends and PostgreSQL/MongoDB databases. Whether you need a customer portal, internal tool, or SaaS prototype, we architect applications that grow with your business.',
'["Custom authentication system", "RESTful or GraphQL APIs", "Real-time features (WebSockets)", "Role-based access control", "Database design & optimization", "Admin dashboard", "Third-party integrations", "Automated testing"]',
'["Scalable architecture", "Secure user management", "Data-driven decisions", "Automated workflows", "Reduced manual operations", "Custom business logic"]',
'[{"step": 1, "title": "Requirements Analysis", "description": "Deep dive into your business processes and needs"}, {"step": 2, "title": "Architecture Design", "description": "Database schema, API design, and tech stack selection"}, {"step": 3, "title": "Sprint Development", "description": "Agile development with weekly demos"}, {"step": 4, "title": "Integration Testing", "description": "Comprehensive testing of all features"}, {"step": 5, "title": "Deployment & Training", "description": "Production deployment and user training"}]',
'[{"q": "What technologies do you use?", "a": "We primarily use Next.js, Node.js, PostgreSQL/Supabase, and deploy to AWS/Vercel. We adapt based on project needs."}, {"q": "How do you handle security?", "a": "We implement industry-standard security: HTTPS, input validation, SQL injection prevention, CSRF protection, and secure authentication."}, {"q": "Can you integrate with existing systems?", "a": "Absolutely! We specialize in API integrations with payment gateways, CRMs, ERPs, and other business tools."}]',
ARRAY['Custom web application', 'API documentation', 'Database setup', 'Admin panel', 'User authentication', 'Deployment setup', '60 days support'],
'3-6 weeks'),

('cms-integration', 'CMS Integration', 'web', '₹5,000', 'fixed',
'Content management systems for easy content updates.',
'Empower your team to manage website content without touching code. We integrate powerful headless CMS platforms like Strapi, Contentful, or Sanity with your website, giving you a user-friendly dashboard to update text, images, and media. Perfect for marketing teams who need to move fast without developer dependencies.',
'["Headless CMS setup", "Content modeling", "Media library management", "Multi-user access", "Preview functionality", "Automated deployments", "Content scheduling"]',
'["Update content without developers", "No waiting for deployments", "Version control for content", "Collaborate with your team", "Schedule future updates", "Maintain brand consistency"]',
'[{"step": 1, "title": "Content Audit", "description": "Analyze existing content and structure needs"}, {"step": 2, "title": "CMS Selection", "description": "Choose the right CMS for your workflow"}, {"step": 3, "title": "Schema Design", "description": "Design content types and relationships"}, {"step": 4, "title": "Integration", "description": "Connect CMS to your website"}, {"step": 5, "title": "Training", "description": "Team training on content management"}]',
'[{"q": "Which CMS do you recommend?", "a": "It depends on your needs. Strapi for self-hosted control, Contentful for enterprise features, Sanity for developer flexibility."}, {"q": "Will my website still be fast?", "a": "Yes! Headless CMS content is fetched at build time, keeping your site lightning fast."}, {"q": "How many users can access the CMS?", "a": "Most plans support unlimited users with role-based permissions."}]',
ARRAY['CMS platform setup', 'Content migration', 'Custom content types', 'User role configuration', 'Team training session', '30 days support'],
'5-10 business days'),

('ecommerce', 'E-commerce Development', 'web', '₹12,000', 'starting',
'Online stores with payment integration and inventory management.',
'Launch your online store with a powerful e-commerce platform tailored to your business. We build custom Shopify stores, WooCommerce solutions, or headless commerce with Next.js and Stripe. Complete with product catalogs, secure payments, inventory management, and order tracking. Start selling online with confidence.',
'["Product catalog management", "Secure payment gateway (Razorpay/Stripe)", "Inventory tracking", "Order management", "Customer accounts", "Discount & coupon system", "Shipping integration", "Email notifications", "Analytics dashboard"]',
'["24/7 sales automation", "Reduced operational costs", "Global customer reach", "Data-driven inventory", "Customer insights", "Scalable infrastructure"]',
'[{"step": 1, "title": "Business Analysis", "description": "Understanding your products, pricing, and logistics"}, {"step": 2, "title": "Platform Selection", "description": "Shopify, WooCommerce, or custom solution"}, {"step": 3, "title": "Store Design", "description": "Custom theme matching your brand"}, {"step": 4, "title": "Product Setup", "description": "Catalog import and configuration"}, {"step": 5, "title": "Payment & Shipping", "description": "Gateway integration and shipping rules"}, {"step": 6, "title": "Testing & Launch", "description": "End-to-end order testing"}]',
'[{"q": "Which payment gateway do you support?", "a": "We integrate Razorpay, Stripe, PayPal, and UPI. We can add any gateway you prefer."}, {"q": "Can I sell physical and digital products?", "a": "Yes! Our stores support physical inventory, digital downloads, and even subscriptions."}, {"q": "What about shipping?", "a": "We integrate with Shiprocket, Delhivery, and custom shipping logic for accurate rates."}]',
ARRAY['Custom e-commerce store', 'Payment gateway setup', 'Product import (up to 100)', 'Shipping configuration', 'Email templates', 'Admin training', '90 days support'],
'4-8 weeks'),

('saas-mvp', 'SaaS MVP Development', 'web', '₹20,000', 'starting',
'Minimum viable product development for SaaS startups.',
'Turn your SaaS idea into reality with our MVP development service. We help startups validate their concepts quickly by building functional prototypes with essential features. Our lean approach focuses on core value propositions, allowing you to gather user feedback and iterate rapidly. Get to market faster and smarter.',
'["User authentication & onboarding", "Subscription billing (Stripe)", "Multi-tenant architecture", "Admin dashboard", "User analytics", "Email automation", "API for integrations", "Mobile-responsive design"]',
'["Validate idea before full investment", "Attract early adopters", "Investor-ready product", "Foundation for scaling", "Real user feedback", "Faster time-to-market"]',
'[{"step": 1, "title": "Ideation Workshop", "description": "Define core features and user stories"}, {"step": 2, "title": "Rapid Prototyping", "description": "Interactive mockups for validation"}, {"step": 3, "title": "MVP Development", "description": "Build core features in 2-week sprints"}, {"step": 4, "title": "Beta Launch", "description": "Soft launch to early adopters"}, {"step": 5, "title": "Iteration", "description": "Improve based on feedback"}]',
'[{"q": "How minimal is an MVP?", "a": "We focus on 3-5 core features that demonstrate your unique value. Enough to validate, not overwhelm."}, {"q": "Can I scale the MVP later?", "a": "Absolutely! We build with scalable architecture so you can add features without rebuilding."}, {"q": "Do you help with investor pitches?", "a": "Yes! We can provide technical documentation and architecture diagrams for investor presentations."}]',
ARRAY['Functional SaaS application', 'User authentication', 'Subscription billing', 'Admin panel', 'Technical documentation', 'Deployment to cloud', '90 days support'],
'6-10 weeks');

-- Mechanical Engineering Services
INSERT INTO services (slug, name, category, price, price_unit, short_description, long_description, features, benefits, process_steps, faq, deliverables, timeline) VALUES

('2d-drafting', '2D Drafting', 'mechanical', '₹1,000', 'per hour',
'Technical drawings and schematics for manufacturing.',
'Transform your concepts into precise technical drawings that manufacturing teams can execute. Our 2D drafting services cover assembly drawings, detail drawings, and shop floor documentation. We follow industry standards (ASME, ISO) to ensure your drawings communicate clearly across borders and production facilities.',
'["Assembly drawings", "Detail/part drawings", "Section views & callouts", "Bill of materials (BOM)", "GD&T annotations", "ISO/ASME compliance", "DXF/DWG file formats"]',
'["Manufacturing-ready documentation", "Clear communication with vendors", "Reduced fabrication errors", "Archivable technical records", "Cost estimation accuracy", "Quality control baseline"]',
'[{"step": 1, "title": "Input Review", "description": "Analyze sketches, models, or specifications"}, {"step": 2, "title": "Drawing Creation", "description": "Create detailed CAD drawings"}, {"step": 3, "title": "Dimensioning", "description": "Add dimensions and tolerances"}, {"step": 4, "title": "Review Cycle", "description": "Client review and revisions"}, {"step": 5, "title": "Final Delivery", "description": "Deliver in required formats"}]',
'[{"q": "What CAD software do you use?", "a": "AutoCAD, DraftSight, and SolidWorks Drawings. We deliver in DWG, DXF, and PDF formats."}, {"q": "Can you work from rough sketches?", "a": "Yes! We can interpret hand sketches, photos, or verbal descriptions to create professional drawings."}, {"q": "Do you include tolerances?", "a": "Absolutely. We apply appropriate GD&T based on manufacturing requirements."}]',
ARRAY['CAD drawing files (DWG/DXF)', 'PDF prints', 'Bill of materials', 'Revision history'],
'1-3 days per drawing'),

('3d-modeling', '3D Modeling', 'mechanical', '₹2,000', 'per part',
'Detailed 3D CAD models for visualization and manufacturing.',
'Create accurate 3D models that serve multiple purposes: visualization, analysis, and manufacturing. Our parametric models in SolidWorks and Fusion 360 can be easily modified for design iterations. Perfect for product development, custom machinery, and mechanical components that need precise geometric definition.',
'["Parametric solid modeling", "Surface modeling", "Assembly creation", "Motion simulation", "Interference checking", "STEP/IGES export", "Rendering-ready models"]',
'["Design visualization before production", "Easy modification and iterations", "FEA/CFD analysis ready", "CNC programming compatible", "3D printing ready", "Marketing material creation"]',
'[{"step": 1, "title": "Reference Collection", "description": "Gather drawings, dimensions, or physical samples"}, {"step": 2, "title": "Base Modeling", "description": "Create core geometry"}, {"step": 3, "title": "Feature Addition", "description": "Add fillets, chamfers, and details"}, {"step": 4, "title": "Assembly", "description": "Combine parts with constraints"}, {"step": 5, "title": "Validation", "description": "Check for errors and interferences"}]',
'[{"q": "What file formats do you deliver?", "a": "Native SolidWorks (.sldprt), STEP, IGES, Parasolid, and STL for 3D printing."}, {"q": "Can you model from physical samples?", "a": "Yes! We can reverse engineer parts from measurements or 3D scans."}, {"q": "Do you create assemblies?", "a": "Yes. We model complete assemblies with proper constraints and motion studies."}]',
ARRAY['3D CAD model files', 'STEP/IGES exports', 'Assembly files', 'Render images'],
'2-5 days per model'),

('rendering', '3D Rendering', 'mechanical', '₹1,500', 'per image',
'Photorealistic product renders for marketing and presentations.',
'Showcase your products before they exist with photorealistic 3D renders. Our visualization services create stunning images for marketing materials, investor presentations, and e-commerce listings. We set up professional lighting, materials, and environments to make your products look their best.',
'["Photorealistic materials", "Studio lighting setups", "Environment scenes", "Multiple angles", "Transparent backgrounds", "4K resolution", "Post-processing"]',
'["Marketing before manufacturing", "Consistent product imagery", "Customization visualization", "Cost savings vs photography", "Perfect every time", "Unlimited angles"]',
'[{"step": 1, "title": "Model Preparation", "description": "Optimize geometry for rendering"}, {"step": 2, "title": "Material Setup", "description": "Apply realistic textures and finishes"}, {"step": 3, "title": "Lighting Design", "description": "Professional studio or environmental lighting"}, {"step": 4, "title": "Rendering", "description": "High-quality ray-traced output"}, {"step": 5, "title": "Post-Processing", "description": "Color correction and final polish"}]',
'[{"q": "What resolution do you deliver?", "a": "Standard is 4K (4096x4096). Higher resolutions available for print materials."}, {"q": "Can you match our brand colors?", "a": "Yes! We calibrate materials and environments to match your brand guidelines."}, {"q": "Do you do animations?", "a": "Yes! We offer product turntables and assembly animations for an additional fee."}]',
ARRAY['High-resolution renders (4K)', 'Multiple angles', 'Transparent PNG versions', 'Source files available'],
'2-4 days per set'),

('fea-simulation', 'FEA Simulation', 'mechanical', '₹4,000', 'per analysis',
'Finite element analysis for structural and thermal validation.',
'Validate your designs before manufacturing with finite element analysis. We simulate real-world conditions to predict stress, deformation, thermal behavior, and fatigue life. Identify weak points, optimize material usage, and ensure your designs meet safety requirements—all digitally before cutting any metal.',
'["Static stress analysis", "Thermal analysis", "Fatigue life prediction", "Modal analysis (vibration)", "Non-linear simulation", "Contact analysis", "Factor of safety calculation"]',
'["Catch failures before manufacturing", "Optimize material usage", "Meet safety standards", "Reduce physical prototypes", "Data-driven design decisions", "Documentation for certification"]',
'[{"step": 1, "title": "Model Simplification", "description": "Prepare geometry for meshing"}, {"step": 2, "title": "Material Definition", "description": "Assign material properties"}, {"step": 3, "title": "Boundary Conditions", "description": "Apply loads and constraints"}, {"step": 4, "title": "Mesh & Solve", "description": "Generate mesh and run simulation"}, {"step": 5, "title": "Post-Processing", "description": "Analyze results and create report"}]',
'[{"q": "What types of analysis do you perform?", "a": "Static, thermal, modal, fatigue, and non-linear analyses using industry-standard solvers."}, {"q": "How accurate are simulations?", "a": "Within 5-10% of physical tests when proper inputs are provided. We validate critical cases."}, {"q": "What software do you use?", "a": "ANSYS, SolidWorks Simulation, and open-source CalculiX for cost-effective projects."}]',
ARRAY['FEA report with results', 'Stress/deformation plots', 'Factor of safety analysis', 'Recommendations', 'Model files'],
'3-7 days per analysis'),

('stl-prep', 'STL Preparation', 'mechanical', '₹800', 'per file',
'3D printing file preparation and optimization.',
'Get your models ready for 3D printing with our STL preparation service. We repair mesh errors, optimize geometry for your specific printer, add support structures, and ensure watertight models. Whether you''re prototyping or producing, we prepare files that print successfully on the first try.',
'["Mesh repair (holes, normals)", "Wall thickness validation", "Support structure generation", "Orientation optimization", "Scale verification", "Multi-part splitting", "Hollowing for resin prints"]',
'["Successful first prints", "Material optimization", "Reduced print time", "Proper structural integrity", "Print farm ready", "Technology-specific prep"]',
'[{"step": 1, "title": "File Analysis", "description": "Check for mesh errors and printability"}, {"step": 2, "title": "Repair", "description": "Fix holes, bad normals, and non-manifold edges"}, {"step": 3, "title": "Optimization", "description": "Orient for strength and minimize supports"}, {"step": 4, "title": "Validation", "description": "Slice and verify in printer software"}, {"step": 5, "title": "Delivery", "description": "Provide print-ready files with instructions"}]',
'[{"q": "What printers do you support?", "a": "FDM, SLA, SLS, and MJF. We optimize for your specific machine and material."}, {"q": "Can you slice the files too?", "a": "Yes! We can provide G-code for popular slicers like Cura, PrusaSlicer, and Formlabs PreForm."}, {"q": "Do you offer printing services?", "a": "We can connect you with trusted print bureaus for production runs."}]',
ARRAY['Print-ready STL files', 'Print settings recommendations', 'Support structure files', 'Print orientation guide'],
'1-2 days per file');

-- Growth Marketing Services
INSERT INTO services (slug, name, category, price, price_unit, short_description, long_description, features, benefits, process_steps, faq, deliverables, timeline) VALUES

('tech-seo', 'Technical SEO', 'growth', '₹3,000', 'per audit',
'Technical search optimization for better rankings.',
'Unlock your website''s search potential with comprehensive technical SEO. We audit your site''s architecture, speed, mobile-friendliness, and crawlability to identify ranking blockers. Our data-driven recommendations improve Core Web Vitals, fix indexation issues, and establish strong technical foundations for organic growth.',
'["Site architecture analysis", "Core Web Vitals optimization", "Mobile-first audit", "Schema markup implementation", "XML sitemap optimization", "Robots.txt configuration", "Canonical tag setup", "Page speed optimization"]',
'["Higher search rankings", "Improved crawl budget", "Better user experience", "Mobile traffic growth", "Rich snippet eligibility", "Competitive advantage"]',
'[{"step": 1, "title": "Crawl Analysis", "description": "Comprehensive site crawl with Screaming Frog"}, {"step": 2, "title": "Performance Audit", "description": "Core Web Vitals and page speed testing"}, {"step": 3, "title": "Issue Prioritization", "description": "Rank issues by impact and effort"}, {"step": 4, "title": "Implementation", "description": "Fix critical technical issues"}, {"step": 5, "title": "Monitoring", "description": "Track improvements in Search Console"}]',
'[{"q": "How long until I see results?", "a": "Technical fixes typically show results in 2-8 weeks as Google recrawls your site."}, {"q": "Do you need access to my site?", "a": "We need Search Console access and ideally CMS/hosting access for implementations."}, {"q": "Is this a one-time service?", "a": "The audit is one-time, but we recommend quarterly checkups for ongoing health."}]',
ARRAY['Technical SEO audit report', 'Prioritized fix recommendations', 'Implementation support', 'Before/after metrics', 'Search Console setup'],
'1-2 weeks'),

('automation', 'Marketing Automation', 'growth', '₹4,000', 'per workflow',
'Automated marketing workflows and email sequences.',
'Put your marketing on autopilot with intelligent automation. We design and implement email sequences, lead nurturing funnels, and behavioral triggers that engage customers at the right moment. From welcome series to abandoned cart recovery, our automations work 24/7 to convert leads into customers.',
'["Email sequence design", "Lead scoring setup", "Trigger-based automation", "CRM integration", "A/B testing framework", "Analytics & reporting", "Multi-channel workflows"]',
'["Consistent lead nurturing", "Reduced manual work", "Higher conversion rates", "Personalized messaging", "Scalable customer journey", "Measurable ROI"]',
'[{"step": 1, "title": "Workflow Mapping", "description": "Design customer journey and touchpoints"}, {"step": 2, "title": "Content Creation", "description": "Write email copy and design templates"}, {"step": 3, "title": "Platform Setup", "description": "Configure automation in your tool"}, {"step": 4, "title": "Testing", "description": "Test all triggers and paths"}, {"step": 5, "title": "Launch & Optimize", "description": "Go live and monitor performance"}]',
'[{"q": "What tools do you work with?", "a": "Mailchimp, HubSpot, ActiveCampaign, ConvertKit, and custom solutions via Zapier."}, {"q": "How many emails per sequence?", "a": "Typically 5-7 emails per workflow, optimized based on your sales cycle."}, {"q": "Can you write the copy?", "a": "Yes! Our copywriting team creates compelling email content tailored to your brand voice."}]',
ARRAY['Automation workflow documentation', 'Email templates (5-7 per workflow)', 'Platform configuration', 'Performance dashboard', 'Optimization report'],
'2-3 weeks per workflow'),

('ads-setup', 'Paid Ads Setup', 'growth', '₹2,500', 'per platform',
'Google & Meta ads campaign configuration.',
'Launch performance-driven ad campaigns across Google and Meta platforms. We handle complete setup: audience research, keyword selection, ad copywriting, creative assets, and conversion tracking. Our campaigns are structured for scalability with proper attribution to measure every rupee spent.',
'["Audience research & targeting", "Keyword strategy (Google)", "Ad copy & creative assets", "Conversion pixel setup", "Campaign structure design", "A/B test framework", "Remarketing setup"]',
'["Immediate traffic", "Precise targeting", "Measurable results", "Scalable spend", "Competitive presence", "Lead generation"]',
'[{"step": 1, "title": "Strategy Session", "description": "Define goals, budget, and target audience"}, {"step": 2, "title": "Audience Research", "description": "Build targeting personas and keywords"}, {"step": 3, "title": "Creative Development", "description": "Design ads and write copy"}, {"step": 4, "title": "Campaign Build", "description": "Structure campaigns in ad platform"}, {"step": 5, "title": "Launch & Monitor", "description": "Go live with daily optimization"}]',
'[{"q": "What''s the minimum ad budget?", "a": "We recommend at least ₹15,000/month ad spend for meaningful data. We charge separately for management."}, {"q": "Do you manage ongoing campaigns?", "a": "Yes! We offer monthly management packages starting at ₹5,000/month."}, {"q": "Which platforms do you cover?", "a": "Google Ads (Search, Display, YouTube), Meta (Facebook, Instagram), and LinkedIn Ads."}]',
ARRAY['Campaign setup document', 'Ad creatives (5-10 variations)', 'Conversion tracking setup', 'Audience lists', '2-week optimization'],
'1-2 weeks'),

('social-management', 'Social Media Management', 'growth', '₹4,500', 'per month',
'Complete social media presence management.',
'Build and maintain a powerful social media presence with our management services. We handle content creation, scheduling, community engagement, and performance analytics across your key platforms. Consistent posting, strategic hashtags, and authentic engagement to grow your following organically.',
'["Content calendar planning", "Post creation (15-20/month)", "Hashtag strategy", "Community management", "Competitor monitoring", "Monthly analytics report", "Story & Reel creation"]',
'["Consistent brand presence", "Growing follower base", "Customer engagement", "Brand awareness", "Social proof", "Time savings"]',
'[{"step": 1, "title": "Brand Audit", "description": "Analyze current presence and competitors"}, {"step": 2, "title": "Strategy Development", "description": "Define content pillars and posting schedule"}, {"step": 3, "title": "Content Creation", "description": "Design posts, write captions, plan calendar"}, {"step": 4, "title": "Daily Management", "description": "Post, engage, and monitor"}, {"step": 5, "title": "Monthly Review", "description": "Analyze performance and adjust strategy"}]',
'[{"q": "Which platforms do you manage?", "a": "Instagram, LinkedIn, Twitter/X, and Facebook. We recommend focusing on 2-3 platforms."}, {"q": "Do I need to provide content?", "a": "We handle everything, but brand photos/videos from you help. We can also organize photoshoots."}, {"q": "How do you handle comments?", "a": "We respond to comments within 24 hours using your brand voice guidelines."}]',
ARRAY['Monthly content calendar', '15-20 designed posts', 'Hashtag research', 'Community management', 'Monthly analytics report'],
'Ongoing monthly'),

('market-research', 'Market Research', 'growth', '₹2,500', 'per report',
'Competitive analysis and market intelligence.',
'Make informed decisions with comprehensive market research. We analyze your competitors, identify market opportunities, and uncover customer insights. Our reports provide actionable intelligence on pricing strategies, feature gaps, and positioning opportunities to help you stand out in crowded markets.',
'["Competitor analysis (5-10 players)", "Feature comparison matrix", "Pricing analysis", "Customer review mining", "Market size estimation", "Trend identification", "SWOT analysis"]',
'["Data-driven decisions", "Competitive advantage", "Pricing confidence", "Feature prioritization", "Market opportunity identification", "Risk awareness"]',
'[{"step": 1, "title": "Scope Definition", "description": "Define competitors and research questions"}, {"step": 2, "title": "Data Collection", "description": "Gather public and private intelligence"}, {"step": 3, "title": "Analysis", "description": "Process data and identify patterns"}, {"step": 4, "title": "Synthesis", "description": "Draw insights and recommendations"}, {"step": 5, "title": "Presentation", "description": "Deliver report with key findings"}]',
'[{"q": "How many competitors can you analyze?", "a": "Standard reports include 5-10 competitors. Enterprise reports can cover entire industries."}, {"q": "What sources do you use?", "a": "Public filings, social media, review sites, job postings, press releases, and more."}, {"q": "Can you do customer surveys?", "a": "Yes! We can design and run surveys for primary research at additional cost."}]',
ARRAY['Comprehensive research report', 'Competitor comparison matrix', 'Market opportunity slides', 'Strategic recommendations', 'Data spreadsheets'],
'1-2 weeks');

-- Creative Services
INSERT INTO services (slug, name, category, price, price_unit, short_description, long_description, features, benefits, process_steps, faq, deliverables, timeline) VALUES

('graphic-design', 'Graphic Design', 'creative', '₹400', 'per design',
'Visual graphics for digital and print.',
'Elevate your visual communication with professional graphic design. From social media graphics to print materials, we create eye-catching designs that align with your brand. Every design is crafted for its intended medium—optimized for screens or print production with proper bleed and color profiles.',
'["Social media graphics", "Print materials", "Infographics", "Presentation slides", "Marketing collateral", "Event materials", "Digital ads"]',
'["Professional brand image", "Consistent visual identity", "Increased engagement", "Print-ready files", "Quick turnaround", "Unlimited revisions (2 rounds)"]',
'[{"step": 1, "title": "Brief Review", "description": "Understand requirements and brand guidelines"}, {"step": 2, "title": "Concept Creation", "description": "Design initial concepts"}, {"step": 3, "title": "Feedback", "description": "Client review and input"}, {"step": 4, "title": "Refinement", "description": "Apply revisions"}, {"step": 5, "title": "Delivery", "description": "Multiple format delivery"}]',
'[{"q": "What file formats do you deliver?", "a": "PNG, JPG, PDF, and source files (AI/PSD). Print files include CMYK and bleed."}, {"q": "How many revisions are included?", "a": "2 rounds of revisions. Additional rounds at ₹200 per revision."}, {"q": "Can you match our brand?", "a": "Yes! Share your brand guidelines and we''ll ensure consistency."}]',
ARRAY['Design files (multiple formats)', 'Source files (AI/PSD)', 'Print-ready versions', '2 revision rounds'],
'1-3 days per design'),

('logo-identity', 'Logo & Brand Identity', 'creative', '₹1,800', 'per project',
'Brand identity design with logo and guidelines.',
'Create a lasting first impression with a memorable brand identity. We design distinctive logos and develop comprehensive brand guidelines covering color palettes, typography, imagery styles, and usage rules. Your brand identity becomes a cohesive system that works across all touchpoints.',
'["Logo design (3 concepts)", "Color palette", "Typography selection", "Brand guidelines document", "Logo variations (horizontal, stacked)", "Social media profile assets", "Business card design"]',
'["Memorable brand recognition", "Professional credibility", "Consistent brand application", "Scalable identity system", "Designer-independent guidelines", "Multi-platform ready"]',
'[{"step": 1, "title": "Discovery", "description": "Brand questionnaire and competitor review"}, {"step": 2, "title": "Concept Development", "description": "Create 3 logo concepts"}, {"step": 3, "title": "Selection & Refinement", "description": "Choose direction and refine"}, {"step": 4, "title": "System Development", "description": "Build full identity system"}, {"step": 5, "title": "Guidelines Creation", "description": "Document all brand rules"}]',
'[{"q": "How many logo concepts do I see?", "a": "We present 3 distinct concepts, then refine your chosen direction."}, {"q": "What if I don''t like any concept?", "a": "We''ll schedule a call to understand better and create new directions."}, {"q": "Can I trademark the logo?", "a": "Yes! We provide vector files and sign over full ownership rights."}]',
ARRAY['Logo files (all formats)', 'Brand guidelines PDF', 'Color palette codes', 'Typography specifications', 'Social media assets', 'Business card design'],
'2-3 weeks'),

('copywriting', 'Copywriting', 'creative', '₹1,000', 'per page',
'Compelling copy that converts visitors to customers.',
'Words that work. Our copywriting transforms features into benefits and browsers into buyers. We write website copy, landing pages, email sequences, and ad copy that speaks to your audience''s desires and objections. Every word is chosen to guide readers toward action.',
'["Website copy", "Landing page copy", "Email sequences", "Ad copy", "Product descriptions", "Headlines & taglines", "Call-to-action optimization"]',
'["Higher conversion rates", "Clearer value proposition", "Brand voice consistency", "SEO-friendly content", "Reduced bounce rates", "Persuasive messaging"]',
'[{"step": 1, "title": "Research", "description": "Understand audience, competitors, and product"}, {"step": 2, "title": "Outline", "description": "Structure content and key messages"}, {"step": 3, "title": "Draft", "description": "Write compelling first draft"}, {"step": 4, "title": "Review", "description": "Client feedback and revisions"}, {"step": 5, "title": "Polish", "description": "Final editing and delivery"}]',
'[{"q": "Do you research my industry?", "a": "Yes! We research your competitors, audience, and product before writing."}, {"q": "Can you match our brand voice?", "a": "Absolutely. Share examples of content you like and we''ll match the tone."}, {"q": "How long is a ''page''?", "a": "Approximately 300-500 words. Complex pages may count as multiple pages."}]',
ARRAY['Final approved copy', 'SEO keywords integrated', 'Meta descriptions', '2 revision rounds', 'Source document'],
'3-5 days per page'),

('pitch-decks', 'Pitch Deck Design', 'creative', '₹2,500', 'per deck',
'Investor presentations that win funding.',
'Tell your story compellingly with a pitch deck designed to win investor attention. We combine narrative storytelling with data visualization to create presentations that clearly communicate your vision, traction, and potential. Professional design that matches the ambition of your startup.',
'["Narrative structure", "Slide design (15-20 slides)", "Data visualization", "Icon and graphic creation", "Animations (optional)", "Speaker notes", "Multiple format export"]',
'["Professional first impression", "Clear story flow", "Memorable visuals", "Investor-ready quality", "Reusable assets", "Confidence in meetings"]',
'[{"step": 1, "title": "Story Workshop", "description": "Define narrative arc and key messages"}, {"step": 2, "title": "Content Review", "description": "Organize your content and data"}, {"step": 3, "title": "Design Draft", "description": "Create initial slide designs"}, {"step": 4, "title": "Visualization", "description": "Design charts and infographics"}, {"step": 5, "title": "Final Polish", "description": "Animations and final delivery"}]',
'[{"q": "How many slides are included?", "a": "Standard decks are 15-20 slides. Longer decks quoted separately."}, {"q": "Do you help with content?", "a": "We can advise on structure, but you provide the core content and data."}, {"q": "What formats do you deliver?", "a": "PowerPoint, Keynote, Google Slides, and PDF."}]',
ARRAY['Pitch deck (15-20 slides)', 'PPTX/Keynote/Google Slides', 'PDF version', 'Editable source files', 'Icon pack used'],
'1-2 weeks'),

('video-editing', 'Video Editing', 'creative', '₹500', 'per minute',
'Professional video editing for content creators.',
'Transform raw footage into polished content that captivates audiences. We edit YouTube videos, social media reels, promotional content, and presentations. Color grading, sound mixing, motion graphics, and captions—everything needed to make your videos stand out in crowded feeds.',
'["Footage editing & trimming", "Color grading", "Sound mixing", "Motion graphics", "Caption/subtitle creation", "Thumbnail design", "Format optimization"]',
'["Professional quality content", "Consistent video style", "Time savings", "Multi-platform ready", "Better engagement", "Brand consistency"]',
'[{"step": 1, "title": "Footage Review", "description": "Review raw material and brief"}, {"step": 2, "title": "Rough Cut", "description": "First edit with structure"}, {"step": 3, "title": "Fine Cut", "description": "Timing, transitions, and pacing"}, {"step": 4, "title": "Polish", "description": "Color, sound, and graphics"}, {"step": 5, "title": "Export", "description": "Render for required platforms"}]',
'[{"q": "What editing software do you use?", "a": "Premiere Pro, DaVinci Resolve, and After Effects for motion graphics."}, {"q": "Can you add subtitles?", "a": "Yes! We offer burned-in captions or separate SRT files."}, {"q": "What''s the turnaround?", "a": "Typically 3-5 days for a 5-10 minute video. Rush delivery available."}]',
ARRAY['Edited video file', 'Thumbnail design', 'Caption file (SRT)', 'Project files (optional)'],
'3-5 days per video');

-- ============================================
-- INSERT TEAM MEMBERS DATA
-- ============================================
INSERT INTO team_members (name, title, role_tagline, bio, skills, display_order) VALUES
('Pushpal Sanyal', 'Chief Architect', 'The Code Logic', 'Building the digital backbone of Levitate Labs with expertise in full-stack development and system architecture.', ARRAY['React', 'Node.js', 'Serverless', 'Database Design', 'System Architecture'], 1),
('Mridul Dubey', 'Head of Mech Eng', 'The Structural Precision', 'Engineering excellence in every dimension. Specializing in CAD, simulations, and manufacturing optimization.', ARRAY['SolidWorks', 'AutoCAD', 'FEA Simulation', 'Product Design', '3D Printing'], 2),
('Rishi Singh', 'Dir. Growth', 'The Engine', 'Fueling exponential growth through data-driven marketing and automation strategies.', ARRAY['Marketing Automation', 'SEO', 'Paid Ads', 'Analytics', 'Growth Hacking'], 3),
('Shubham Yadav', 'Creative Dir.', 'The Visual Soul', 'Crafting visual experiences that resonate. From brand identity to motion graphics.', ARRAY['UI/UX Design', 'Brand Identity', 'Figma', 'Motion Design', 'Video Production'], 4);

-- ============================================
-- INSERT CASE STUDIES DATA
-- ============================================
INSERT INTO case_studies (name, slug, url, description, tech_stack, highlights, metrics, is_featured, display_order) VALUES
('Stootap.com', 'stootap', 'https://stootap.com', 'Enterprise-grade platform with serverless architecture and robust security.', 
'[{"name": "AWS Lambda", "type": "backend"}, {"name": "MongoDB", "type": "database"}, {"name": "RBAC Security", "type": "security"}]',
ARRAY['Serverless backend for infinite scalability', 'NoSQL database optimized for high throughput', 'Role-based access control for enterprise security'],
'[{"label": "Latency", "value": "<100ms"}, {"label": "Uptime", "value": "99.9%"}, {"label": "Users", "value": "10K+"}]',
true, 1),
('Zenjaura.in', 'zenjaura', 'https://zenjaura.in', 'Premium WordPress website with custom theme and optimized performance.',
'[{"name": "WordPress", "type": "cms"}, {"name": "Core Web Vitals", "type": "performance"}, {"name": "Custom Theme", "type": "frontend"}]',
ARRAY['Custom WordPress theme for unique brand identity', 'Optimized Core Web Vitals for fast loading', 'SEO-friendly structure with schema markup'],
'[{"label": "LCP", "value": "<2.5s"}, {"label": "CLS", "value": "<0.1"}, {"label": "SEO Score", "value": "98"}]',
true, 2);

-- ============================================
-- INSERT DEFAULT SITE SETTINGS
-- ============================================
INSERT INTO site_settings (key, value, description) VALUES
('company_name', '"Levitate Labs"', 'Company display name'),
('company_email', '"hello@levitatelabs.com"', 'Contact email'),
('company_phone', '"+91 98765 43210"', 'Contact phone'),
('social_links', '{"github": "https://github.com/levitatelabs", "linkedin": "https://linkedin.com/company/levitatelabs", "twitter": "https://twitter.com/levitatelabs"}', 'Social media links'),
('hero_stats', '[{"value": "50+", "label": "Projects"}, {"value": "4", "label": "Disciplines"}, {"value": "100%", "label": "Dedication"}]', 'Hero section statistics');

-- ============================================
-- CREATE ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Public read access for services, team, case studies
CREATE POLICY "Public can read services" ON services FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read team" ON team_members FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read case studies" ON case_studies FOR SELECT USING (true);
CREATE POLICY "Public can read testimonials" ON testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read settings" ON site_settings FOR SELECT USING (true);

-- Anyone can insert leads (contact form)
CREATE POLICY "Anyone can create leads" ON leads FOR INSERT WITH CHECK (true);

-- ============================================
-- CREATE STORAGE BUCKET
-- ============================================
-- Run this in Supabase Dashboard > Storage > Create New Bucket
-- Bucket name: client-assets
-- Public bucket: Yes

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Your Levitate Labs Supabase database is now ready.
-- 
-- Tables created:
-- - leads (contact form submissions)
-- - services (20 services with detailed content)
-- - team_members (4 team members)
-- - case_studies (2 case studies)
-- - testimonials (future use)
-- - blog_posts (future use)
-- - chat_history (AI chat)
-- - admin_sessions (admin auth)
-- - site_settings (CMS lite)
--
-- Don't forget to create the 'client-assets' storage bucket!
-- ============================================
