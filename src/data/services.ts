// Service data with detailed content for each service page
export interface ServiceData {
    slug: string;
    name: string;
    category: 'web' | 'mechanical' | 'growth' | 'creative';
    price: string;
    priceUnit: string;
    shortDescription: string;
    longDescription: string;
    features: string[];
    benefits: string[];
    processSteps: { step: number; title: string; description: string }[];
    faq: { q: string; a: string }[];
    deliverables: string[];
    timeline: string;
}

export const services: ServiceData[] = [
    // ============ WEB DEVELOPMENT ============
    {
        slug: 'static-development',
        name: 'Static Development',
        category: 'web',
        price: '₹3,000',
        priceUnit: 'fixed',
        shortDescription: 'Lightning-fast static websites (< 1s load time) built with modern frameworks.',
        longDescription: `### The Speed of Static
        Transform your online presence with **lightning-fast static websites** that dominate search rankings. As a leading **web development agency in India**, we specialize in building high-performance sites using cutting-edge technologies like **Next.js**, **Astro**, and **Hugo**. Unlike traditional dynamic sites that rely on database queries for every page load, our static sites serve pre-built HTML, ensuring instant load times (<1s) and flawless Core Web Vitals.

        ### Why Go Static?
        Speed is the new currency of the web. Google prioritizes fast-loading sites, and users abandon pages that take more than 3 seconds to load. Our **affordable website development** packages deliver enterprise-grade performance at startup-friendly prices. Whether you need a stunning portfolio, a high-converting landing page, or extensive technical documentation, our static solutions offer:
        - **Zero Database Latency**: Content is pre-rendered and served instantly from CDNs.
        - **Unbreakable Security**: No database to hack, no server-side processing to exploit.
        - **Infinite Scalability**: Handle millions of visitors without crashing or needing expensive server upgrades.

        ### SEO & Performance Architecture
        We don't just write code; we engineer digital experiences optimized for visibility. Every static site we build comes with deeply integrated SEO best practices:
        - **Semantic HTML5** structure for accessibility and parsing.
        - **Automated Sitemap & Robots.txt** generation.
        - **Schema Markup (JSON-LD)** to help search engines understand your business entity.
        - **Next-Gen Image Optimization** (WebP/AVIF) for faster rendering.

        ### Perfect For
        Static sites are the ideal solution for **landing pages**, **corporate brochures**, **design portfolios**, **documentation hubs**, and **blogs**. Partner with Levitate Labs to join the Jamstack revolution. We ensure your site looks perfect on every device, from 4K monitors to budget smartphones, giving your users the premium experience they deserve.`,
        features: [
            'Lightning-fast page loads (<1s)',
            'Mobile-first responsive design',
            'SEO optimized structure',
            'Modern CSS animations',
            'Contact form integration',
            'Analytics setup',
            'SSL certificate included'
        ],
        benefits: [
            '99.9% uptime guarantee',
            'Zero database vulnerabilities',
            'Minimal hosting costs (often free)',
            'Perfect Lighthouse scores',
            'Better Google rankings',
            'Instant global CDN delivery'
        ],
        processSteps: [
            { step: 1, title: 'Discovery', description: 'Understanding your brand, goals, and target audience' },
            { step: 2, title: 'Design', description: 'Creating wireframes and visual mockups' },
            { step: 3, title: 'Development', description: 'Building with modern frameworks' },
            { step: 4, title: 'Testing', description: 'Cross-browser and device testing' },
            { step: 5, title: 'Launch', description: 'Deployment and DNS configuration' }
        ],
        faq: [
            { q: 'What is a static website?', a: 'A static website serves pre-built HTML files, making it extremely fast and secure compared to traditional dynamic sites.' },
            { q: 'Can I update content myself?', a: 'Yes! We can integrate a headless CMS like Contentful or Sanity for easy content updates.' },
            { q: 'Where will my site be hosted?', a: 'We deploy to Netlify, Vercel, or Cloudflare for global CDN coverage and automatic HTTPS.' }
        ],
        deliverables: ['5-10 page responsive website', 'Source code ownership', 'Deployment to hosting', '30 days free support', 'Basic SEO setup'],
        timeline: '5-7 business days'
    },
    {
        slug: 'full-stack-app',
        name: 'Full Stack Application',
        category: 'web',
        price: '₹9,000',
        priceUnit: 'starting',
        shortDescription: 'Custom full-stack web applications with React frontend and Node.js/Python backend.',
        longDescription: `### Engineering Business Intelligence
        Build powerful, scalable web applications that serve as the neural network of your digital business. If you are looking for a **full stack developer for hire**, Levitate Labs offers a dedicated team of experts proficient in the **MERN Stack** (MongoDB, Express, React, Node.js), **Python/Django**, and **Next.js**. We don't just build apps; we architect robust digital ecosystems tailored to your unique operational workflows.

        ### Our Technical Stack
        We leverage the latest frameworks to build applications that are secure, scalable, and maintainable:
        - **Frontend Excellence**: React and Vue.js for reactive, buttery-smooth user interfaces.
        - **Backend Power**: Node.js and Python for high-concurrency API handling and data processing.
        - **Database Integrity**: PostgreSQL for relational data and MongoDB for flexible schema needs.
        - **Cloud Native**: Deployed on AWS or Vercel with CI/CD pipelines for zero-downtime updates.

        ### From Idea to IPO
        Our **startup web development** services are designed to scale with you. We understand the agility required in the early stages, which is why we focus on modular architecture. Whether it's a complex **customer portal**, a **custom CRM**, or an internal **data analytics dashboard**, we ensure your application handles data securely and efficiently.

        ### Security First
        We prioritize user experience (UX) without compromising on security. Our solutions include:
        - **Industry-Standard Auth**: OAuth 2.0, JWT, and SSO integrations.
        - **Role-Based Access Control (RBAC)**: Granular permissions for different user levels.
        - **Data Encryption**: AES-256 standards for data at rest and in transit.

        Don't settle for cookie-cutter templates. Get a custom application that gives you a competitive edge. Our full-stack development process includes rigorous automated testing and comprehensive documentation, ensuring your IP is safe and your code is clean.`,
        features: [
            'Custom authentication system',
            'RESTful or GraphQL APIs',
            'Real-time features (WebSockets)',
            'Role-based access control',
            'Database design & optimization',
            'Admin dashboard',
            'Third-party integrations',
            'Automated testing'
        ],
        benefits: [
            'Scalable architecture',
            'Secure user management',
            'Data-driven decisions',
            'Automated workflows',
            'Reduced manual operations',
            'Custom business logic'
        ],
        processSteps: [
            { step: 1, title: 'Requirements Analysis', description: 'Deep dive into your business processes and needs' },
            { step: 2, title: 'Architecture Design', description: 'Database schema, API design, and tech stack selection' },
            { step: 3, title: 'Sprint Development', description: 'Agile development with weekly demos' },
            { step: 4, title: 'Integration Testing', description: 'Comprehensive testing of all features' },
            { step: 5, title: 'Deployment & Training', description: 'Production deployment and user training' }
        ],
        faq: [
            { q: 'What technologies do you use?', a: 'We primarily use Next.js, Node.js, PostgreSQL/Supabase, and deploy to AWS/Vercel. We adapt based on project needs.' },
            { q: 'How do you handle security?', a: 'We implement industry-standard security: HTTPS, input validation, SQL injection prevention, CSRF protection, and secure authentication.' },
            { q: 'Can you integrate with existing systems?', a: 'Absolutely! We specialize in API integrations with payment gateways, CRMs, ERPs, and other business tools.' }
        ],
        deliverables: ['Custom web application', 'API documentation', 'Database setup', 'Admin panel', 'User authentication', 'Deployment setup', '60 days support'],
        timeline: '3-6 weeks'
    },
    {
        slug: 'cms-integration',
        name: 'CMS Integration',
        category: 'web',
        price: '₹5,000',
        priceUnit: 'fixed',
        shortDescription: 'Content management systems for easy content updates.',
        longDescription: `### Empower Your Marketing Team
        In the modern digital landscape, content is king—but only if you can manage it efficiently. Our **CMS Integration** services empower your non-technical team members to manage your website's content without writing a single line of code. We specialize in **Headless CMS** solutions that decouple your content from your frontend, giving you the freedom to publish once and distribute everywhere.

        ### The Headless Advantage
        Traditional CMS platforms like WordPress can be bloated, slow, and insecure. We integrate modern, API-first platforms like **Strapi**, **Contentful**, and **Sanity** with your high-performance frontend (Next.js/React). This "Headless" approach offers:
        - **Blazing Fast Performance**: Content is fetched at build time, not request time.
        - **Omnichannel Content**: Use the same content for your website, mobile app, and newsletters.
        - **Developer Freedom**: We build a custom UI that matches your brand perfectly, not constrained by themes.

        ### Custom Workflows
        We don't just install software; we design content workflows. We configure your CMS to match your internal processes:
        - **Custom Content Types**: Fields specifically designed for your case studies, team members, or products.
        - **Draft & Preview Mode**: See exactly how content will look on the live site before hitting publish.
        - **Role Management**: Give editors write access while restricting publishing rights to managers.

        ### Perfect For Growth
        This solution is perfect for **marketing-led companies**, **news publishers**, and **e-commerce brands** that need to move fast. Say goodbye to waiting for developers to fix a typo. Take control of your digital narrative with a robust, enterprise-grade Content Management System integrated by Levitate Labs.`,
        features: [
            'Headless CMS setup',
            'Content modeling',
            'Media library management',
            'Multi-user access',
            'Preview functionality',
            'Automated deployments',
            'Content scheduling'
        ],
        benefits: [
            'Update content without developers',
            'No waiting for deployments',
            'Version control for content',
            'Collaborate with your team',
            'Schedule future updates',
            'Maintain brand consistency'
        ],
        processSteps: [
            { step: 1, title: 'Content Audit', description: 'Analyze existing content and structure needs' },
            { step: 2, title: 'CMS Selection', description: 'Choose the right CMS for your workflow' },
            { step: 3, title: 'Schema Design', description: 'Design content types and relationships' },
            { step: 4, title: 'Integration', description: 'Connect CMS to your website' },
            { step: 5, title: 'Training', description: 'Team training on content management' }
        ],
        faq: [
            { q: 'Which CMS do you recommend?', a: 'It depends on your needs. Strapi for self-hosted control, Contentful for enterprise features, Sanity for developer flexibility.' },
            { q: 'Will my website still be fast?', a: 'Yes! Headless CMS content is fetched at build time, keeping your site lightning fast.' },
            { q: 'How many users can access the CMS?', a: 'Most plans support unlimited users with role-based permissions.' }
        ],
        deliverables: ['CMS platform setup', 'Content migration', 'Custom content types', 'User role configuration', 'Team training session', '30 days support'],
        timeline: '5-10 business days'
    },
    {
        slug: 'ecommerce',
        name: 'E-commerce Development',
        category: 'web',
        price: '₹12,000',
        priceUnit: 'starting',
        shortDescription: 'Online stores with payment integration and inventory management.',
        longDescription: `### Build Your Digital Empire
        Launch a world-class online store with our comprehensive **E-commerce Development** services. Whether you're a D2C startup or an established retail brand, we build digital storefronts that convert visitors into loyal customers. We specialize in creating custom **Shopify** experiences, flexible **WooCommerce** stores, and ultra-high-performance **Headless Commerce** solutions using Next.js and Stripe.

        ### Feature-Rich Shopping Experiences
        Modern e-commerce is more than just a "Buy" button. We engineer complete shopping ecosystems that include:
        - **Smart Product Catalogs**: Advanced filtering, search, and categorization for effortless navigation.
        - **Frictionless Checkout**: Optimized flows to reduce cart abandonment and increase AOV (Average Order Value).
        - **Secure Payments**: Seamless integration with **Razorpay**, **Stripe**, **PayPal**, and **UPI** for global transaction support.
        - **Inventory Management**: Real-time stock tracking and low-inventory alerts.

        ### Logistics & Operations
        Selling is only half the battle. We integrate the tools you need to fulfill orders efficiently:
        - **Shipping Integration**: Automated label generation and rate calculation with Shiprocket or Delhivery.
        - **Automated Notifications**: Transactional emails for order confirmation, shipping updates, and follow-ups.
        - **Admin Dashboards**: A central command center to view sales, manage customers, and export reports.

        ### Search & Scale
        We build stores that rank. Our development includes technical SEO implementation for product pages, schema markup for "In Stock" rich snippets, and Core Web Vitals optimization. Start selling online with a platform that is secure, scalable, and designed to generate revenue 24/7.`,
        features: [
            'Product catalog management',
            'Secure payment gateway (Razorpay/Stripe)',
            'Inventory tracking',
            'Order management',
            'Customer accounts',
            'Discount & coupon system',
            'Shipping integration',
            'Email notifications',
            'Analytics dashboard'
        ],
        benefits: [
            '24/7 sales automation',
            'Reduced operational costs',
            'Global customer reach',
            'Data-driven inventory',
            'Customer insights',
            'Scalable infrastructure'
        ],
        processSteps: [
            { step: 1, title: 'Business Analysis', description: 'Understanding your products, pricing, and logistics' },
            { step: 2, title: 'Platform Selection', description: 'Shopify, WooCommerce, or custom solution' },
            { step: 3, title: 'Store Design', description: 'Custom theme matching your brand' },
            { step: 4, title: 'Product Setup', description: 'Catalog import and configuration' },
            { step: 5, title: 'Payment & Shipping', description: 'Gateway integration and shipping rules' },
            { step: 6, title: 'Testing & Launch', description: 'End-to-end order testing' }
        ],
        faq: [
            { q: 'Which payment gateway do you support?', a: 'We integrate Razorpay, Stripe, PayPal, and UPI. We can add any gateway you prefer.' },
            { q: 'Can I sell physical and digital products?', a: 'Yes! Our stores support physical inventory, digital downloads, and even subscriptions.' },
            { q: 'What about shipping?', a: 'We integrate with Shiprocket, Delhivery, and custom shipping logic for accurate rates.' }
        ],
        deliverables: ['Custom e-commerce store', 'Payment gateway setup', 'Product import (up to 100)', 'Shipping configuration', 'Email templates', 'Admin training', '90 days support'],
        timeline: '4-8 weeks'
    },
    {
        slug: 'saas-mvp',
        name: 'SaaS MVP Development',
        category: 'web',
        price: '₹20,000',
        priceUnit: 'starting',
        shortDescription: 'Minimum viable product development for SaaS startups.',
        longDescription: `### Validate Fast, Scale Faster
        Turn your SaaS idea into a market-ready reality with our specialized **MVP (Minimum Viable Product) Development services**. In the hyper-competitive world of startups, speed is your greatest asset. We help founders define, build, and launch a lean, functional product that captures the core value proposition without the bloat. Our goal is simple: get you to **Product-Market Fit** before your runway ends.

        ### The MVP Blueprint
        We don't build "cheap" prototypes; we build the **V1 of your future unicorn**. Our MVPs are built on the same scalable architecture we use for enterprise apps, just focused on the critical features:
        - **User Onboarding**: Seamless signup flows with magic links or social auth.
        - **Subscription Engine**: Integrated **Stripe** or **Razorpay** billing for SaaS tiers (Monthly/Yearly/Enterprise).
        - **Multi-Tenancy**: Architecture designed to keep customer data strictly isolated.
        - **Admin Super-Admin**: A hidden dashboard for you to manage users and view growth metrics.

        ### Investor-Ready Code
        As a premier **web development agency**, we know what technical due diligence looks like. We deliver:
        - **Clean, Documented Code**: Written in TypeScript with industry-standard patterns.
        - **Architectural Diagrams**: Visual schematics of your stack for investor pitch decks.
        - **CI/CD Pipelines**: Automated testing and deployment setups from Day 1.

        ### Collaborative Partners
        We work as your technical co-founder. We challenge assumptions, suggest features, and help you pivot based on user feedback. Don't let technical challenges stall your vision. With Levitate Labs, you get a polished, investable product in **weeks, not months**. Start your journey with a team that treats your startup as its own.`,
        features: [
            'User authentication & onboarding',
            'Subscription billing (Stripe)',
            'Multi-tenant architecture',
            'Admin dashboard',
            'User analytics',
            'Email automation',
            'API for integrations',
            'Mobile-responsive design'
        ],
        benefits: [
            'Validate idea before full investment',
            'Attract early adopters',
            'Investor-ready product',
            'Foundation for scaling',
            'Real user feedback',
            'Faster time-to-market'
        ],
        processSteps: [
            { step: 1, title: 'Ideation Workshop', description: 'Define core features and user stories' },
            { step: 2, title: 'Rapid Prototyping', description: 'Interactive mockups for validation' },
            { step: 3, title: 'MVP Development', description: 'Build core features in 2-week sprints' },
            { step: 4, title: 'Beta Launch', description: 'Soft launch to early adopters' },
            { step: 5, title: 'Iteration', description: 'Improve based on feedback' }
        ],
        faq: [
            { q: 'How minimal is an MVP?', a: 'We focus on 3-5 core features that demonstrate your unique value. Enough to validate, not overwhelm.' },
            { q: 'Can I scale the MVP later?', a: 'Absolutely! We build with scalable architecture so you can add features without rebuilding.' },
            { q: 'Do you help with investor pitches?', a: 'Yes! We can provide technical documentation and architecture diagrams for investor presentations.' }
        ],
        deliverables: ['Functional SaaS application', 'User authentication', 'Subscription billing', 'Admin panel', 'Technical documentation', 'Deployment to cloud', '90 days support'],
        timeline: '6-10 weeks'
    },

    // ============ MECHANICAL ENGINEERING ============
    {
        slug: '2d-drafting',
        name: '2D Drafting',
        category: 'mechanical',
        price: '₹1,000',
        priceUnit: 'per hour',
        shortDescription: 'Professional 2D CAD technical drawings in AutoCAD DWG format.',
        longDescription: `### The Language of Precision
        Precision is the non-negotiable language of engineering, and our **2D Drafting Services** speak it fluently. We produce professional, manufacturing-ready **2D CAD technical drawings** and engineering schematics using industry-standard tools like **AutoCAD**. Whether you need to digitize legacy paper blueprints, create detailed shop floor drawings for fabrication, or develop patent illustrations for IP protection, our team delivers accuracy down to the micron.

        ### Standards & Compliance
        A drawing is only as good as its readability. We adhere strictly to global drafting standards to ensure your designs are universally understood by machinists and fabricators anywhere in the world:
        - **GD&T Expertise**: We apply **ASME Y14.5** and **ISO** standards for Geometric Dimensioning and Tolerancing to control form, fit, and function.
        - **BOM Management**: Comprehensive Bills of Materials linked to part numbers and vendors.
        - **Layer Management**: Organized CAD files that are easy for your team to edit and maintain.

        ### From Concept to Shop Floor
        We handle the full spectrum of documentation needs:
        - **Assembly Drawings**: Exploded views showing how parts fit together.
        - **Detail Drawings**: Single-part specifications with all critical dimensions and tolerances.
        - **Fabrication Drawings**: Flat patterns for sheet metal and weldment details.
        - **P&ID**: Piping and Instrumentation Diagrams for process engineering.

        ### Scalable Engineering Team
        Don't let documentation bottlenecks slow your manufacturing line. Outsourcing your drafting needs to Levitate Labs gives you on-demand access to skilled drafters without the overhead of hiring full-time staff. We act as a seamless extension of your engineering department, delivering reliable, high-quality documentation that keeps your projects moving forward on time and on budget.`,
        features: [
            'Assembly drawings',
            'Detail/part drawings',
            'Section views & callouts',
            'Bill of materials (BOM)',
            'GD&T annotations',
            'ISO/ASME compliance',
            'DXF/DWG file formats'
        ],
        benefits: [
            'Manufacturing-ready documentation',
            'Clear communication with vendors',
            'Reduced fabrication errors',
            'Archivable technical records',
            'Cost estimation accuracy',
            'Quality control baseline'
        ],
        processSteps: [
            { step: 1, title: 'Input Review', description: 'Analyze sketches, models, or specifications' },
            { step: 2, title: 'Drawing Creation', description: 'Create detailed CAD drawings' },
            { step: 3, title: 'Dimensioning', description: 'Add dimensions and tolerances' },
            { step: 4, title: 'Review Cycle', description: 'Client review and revisions' },
            { step: 5, title: 'Final Delivery', description: 'Deliver in required formats' }
        ],
        faq: [
            { q: 'What CAD software do you use?', a: 'AutoCAD, DraftSight, and SolidWorks Drawings. We deliver in DWG, DXF, and PDF formats.' },
            { q: 'Can you work from rough sketches?', a: 'Yes! We can interpret hand sketches, photos, or verbal descriptions to create professional drawings.' },
            { q: 'Do you include tolerances?', a: 'Absolutely. We apply appropriate GD&T based on manufacturing requirements.' }
        ],
        deliverables: ['CAD drawing files (DWG/DXF)', 'PDF prints', 'Bill of materials', 'Revision history'],
        timeline: '1-3 days per drawing'
    },
    {
        slug: '3d-modeling',
        name: '3D Modeling',
        category: 'mechanical',
        price: '₹2,000',
        priceUnit: 'per part',
        shortDescription: 'Detailed 3D CAD models using SolidWorks and Fusion 360.',
        longDescription: `### Visualizing the Future
        Bring your product concepts to life with our expert **CAD Design Services**. We specialize in creating high-fidelity **3D CAD models** using industry-leading software like **SolidWorks**, **Catia**, and **fusion 360**. Whether you are developing a sleek consumer electronic device, a heavy industrial machine, or a custom automotive component, our models are built with **Manufacturing Intent** from the very first sketch.

        ### Parametric Power
        We don't just sculpt; we engineer. Our parametric modeling approach ensures that your designs are intelligent, flexible, and scalable:
        - **Design Intent**: Dimensions are driven by logical relationships, so updates propagate automatically without breaking the model.
        - **Assembly Management**: We verify fits, clearances, and tolerances at the assembly level to prevent costly interference issues on the production line.
        - **Complex Geometry**: From ergonomic organic shapes using advanced surfacing to robust mechanical structures.

        ### Manufacturing Ready
        A pretty model is useless if it can't be made. We optimize for:
        - **CNC Machining**: Designing for tool access and standard cutter sizes.
        - **Injection Molding**: Draft angle analysis, wall thickness verification, and rib design.
        - **Sheet Metal**: Bend radius calculations and k-factor implementation.

        ### Universal Compatibility
        We deliver native source files (SLDPRT, F3D) for your archives, as well as neutral formats (STEP, IGES, Parasolid) for universal compatibility with any CAM software or vendor. Partner with Levitate Labs to accelerate your product development cycle. We help you iterate faster, visualize better, and manufacture with absolute confidence.`,
        features: [
            'Parametric solid modeling',
            'Surface modeling',
            'Assembly creation',
            'Motion simulation',
            'Interference checking',
            'STEP/IGES export',
            'Rendering-ready models'
        ],
        benefits: [
            'Design visualization before production',
            'Easy modification and iterations',
            'FEA/CFD analysis ready',
            'CNC programming compatible',
            '3D printing ready',
            'Marketing material creation'
        ],
        processSteps: [
            { step: 1, title: 'Reference Collection', description: 'Gather drawings, dimensions, or physical samples' },
            { step: 2, title: 'Base Modeling', description: 'Create core geometry' },
            { step: 3, title: 'Feature Addition', description: 'Add fillets, chamfers, and details' },
            { step: 4, title: 'Assembly', description: 'Combine parts with constraints' },
            { step: 5, title: 'Validation', description: 'Check for errors and interferences' }
        ],
        faq: [
            { q: 'What file formats do you deliver?', a: 'Native SolidWorks (.sldprt), STEP, IGES, Parasolid, and STL for 3D printing.' },
            { q: 'Can you model from physical samples?', a: 'Yes! We can reverse engineer parts from measurements or 3D scans.' },
            { q: 'Do you create assemblies?', a: 'Yes. We model complete assemblies with proper constraints and motion studies.' }
        ],
        deliverables: ['3D CAD model files', 'STEP/IGES exports', 'Assembly files', 'Render images'],
        timeline: '2-5 days per model'
    },
    {
        slug: 'rendering',
        name: '3D Rendering',
        category: 'mechanical',
        price: '₹1,500',
        priceUnit: 'per image',
        shortDescription: 'Photorealistic product renders for marketing and presentations.',
        longDescription: `### Sell Before You Manufacture
        In the digital age, you don't need a physical product to start selling. Our **3D Rendering Services** create photorealistic imagery that is indistinguishable from professional photography. We help you showcase your products in their best light for **Kickstarter campaigns**, **investor pitch decks**, **Amazon listings**, and **marketing materials**—often before the first prototype is even built.

        ### The Virtual Studio
        We simulate a high-end photography studio inside our software:
        - **Hyper-Realistic Materials**: We meticulously recreate textures like brushed aluminum, soft-touch rubber, rough concrete, and subsurface scattering for plastics.
        - **Lighting Design**: Professional three-point lighting setups, HDRI environments, and dramatic rim lighting to accentuate form.
        - **Camera Optics**: Depth of field, focal length, and bloom effects that mimic real-world camera lenses.

        ### Infinite Flexibility
        Unlike traditional photography, 3D rendering gives you total control:
        - **Colorways**: Instantly see your product in 50 different color combinations.
        - **Cutaways**: Show the internal technology of your product with exploded views or ghosted shells.
        - **Context**: Place your product in a modern living room, a rugged outdoor scene, or a clean medical environment without leaving your desk.

        ### Marketing Acceleration
        Don't wait for the factory to deliver samples. Start your pre-launch marketing weeks or months in advance. Our high-resolution 4K renders give your brand a premium, polished look that builds trust and excitement with your customers.`,
        features: [
            'Photorealistic materials',
            'Studio lighting setups',
            'Environment scenes',
            'Multiple angles',
            'Transparent backgrounds',
            '4K resolution',
            'Post-processing'
        ],
        benefits: [
            'Marketing before manufacturing',
            'Consistent product imagery',
            'Customization visualization',
            'Cost savings vs photography',
            'Perfect every time',
            'Unlimited angles'
        ],
        processSteps: [
            { step: 1, title: 'Model Preparation', description: 'Optimize geometry for rendering' },
            { step: 2, title: 'Material Setup', description: 'Apply realistic textures and finishes' },
            { step: 3, title: 'Lighting Design', description: 'Professional studio or environmental lighting' },
            { step: 4, title: 'Rendering', description: 'High-quality ray-traced output' },
            { step: 5, title: 'Post-Processing', description: 'Color correction and final polish' }
        ],
        faq: [
            { q: 'What resolution do you deliver?', a: 'Standard is 4K (4096x4096). Higher resolutions available for print materials.' },
            { q: 'Can you match our brand colors?', a: 'Yes! We calibrate materials and environments to match your brand guidelines.' },
            { q: 'Do you do animations?', a: 'Yes! We offer product turntables and assembly animations for an additional fee.' }
        ],
        deliverables: ['High-resolution renders (4K)', 'Multiple angles', 'Transparent PNG versions', 'Source files available'],
        timeline: '2-4 days per set'
    },
    {
        slug: 'fea-simulation',
        name: 'FEA Simulation',
        category: 'mechanical',
        price: '₹4,000',
        priceUnit: 'per analysis',
        shortDescription: 'Finite element analysis for structural and thermal validation.',
        longDescription: `### Virtual Prototyping
        Validate your designs and predict performance with physics-based **Finite Element Analysis (FEA)**. We simulate real-world conditions to test how your parts will behave under load, heat, and vibration. By identifying weak points and failure modes digitally, we help you avoid catastrophic field failures and expensive physical prototype iterations.

        ### Comprehensive Simulation Types
        We cover the full range of physics simulations:
        - **Static Stress Analysis**: Determine safety factors under maximum load. identifying yield points.
        - **Thermal Analysis**: Visualize heat distribution, cooling efficiency, and thermal expansion issues in electronics or machinery.
        - **Fatigue Analysis**: Predict the lifespan of parts subjected to cyclic loading (vibration/oscillation).
        - **Non-Linear Analysis**: Simulate complex behaviors like rubber deformation, plastic snap-fits, or drop tests.

        ### Optimization & Value Engineering
        FEA isn't just about finding breaks; it's about optimization. We use simulation data to:
        - **Reduce Weight**: Remove material from low-stress areas to save costs and improve efficiency (Topology Optimization).
        - **Material Selection**: Compare how different materials (Aluminum vs. Steel vs. Carbon Fiber) perform under the same conditions.
        - **Design Validation**: Prove to regulatory bodies or clients that your design meets required safety standards.

        ### Actionable Reports
        We don't just give you a colorful map. We provide detailed engineering reports explaining the boundary conditions, mesh quality, and results, along with actionable recommendations for design improvements.`,
        features: [
            'Static stress analysis',
            'Thermal analysis',
            'Fatigue life prediction',
            'Modal analysis (vibration)',
            'Non-linear simulation',
            'Contact analysis',
            'Factor of safety calculation'
        ],
        benefits: [
            'Catch failures before manufacturing',
            'Optimize material usage',
            'Meet safety standards',
            'Reduce physical prototypes',
            'Data-driven design decisions',
            'Documentation for certification'
        ],
        processSteps: [
            { step: 1, title: 'Model Simplification', description: 'Prepare geometry for meshing' },
            { step: 2, title: 'Material Definition', description: 'Assign material properties' },
            { step: 3, title: 'Boundary Conditions', description: 'Apply loads and constraints' },
            { step: 4, title: 'Mesh & Solve', description: 'Generate mesh and run simulation' },
            { step: 5, title: 'Post-Processing', description: 'Analyze results and create report' }
        ],
        faq: [
            { q: 'What types of analysis do you perform?', a: 'Static, thermal, modal, fatigue, and non-linear analyses using industry-standard solvers.' },
            { q: 'How accurate are simulations?', a: 'Within 5-10% of physical tests when proper inputs are provided. We validate critical cases.' },
            { q: 'What software do you use?', a: 'ANSYS, SolidWorks Simulation, and open-source CalculiX for cost-effective projects.' }
        ],
        deliverables: ['FEA report with results', 'Stress/deformation plots', 'Factor of safety analysis', 'Recommendations', 'Model files'],
        timeline: '3-7 days per analysis'
    },
    {
        slug: 'stl-prep',
        name: 'STL Preparation',
        category: 'mechanical',
        price: '₹800',
        priceUnit: 'per file',
        shortDescription: '3D printing file preparation and optimization.',
        longDescription: `### Print Success, First Time
        3D printing is revolutionary, but "broken meshes" and "failed prints" are frustrating realities. Our **STL Preparation Service** bridges the gap between digital CAD data and physical printed parts. We repair, optimize, and prepare your files to ensure they print successfully on **FDM**, **SLA**, **SLS**, or **MJF** machines.

        ### The Perfect Mesh
        CAD files often contain errors when exported to STL. We fix them all:
        - **Watertight Repair**: Closing non-manifold edges and filling holes to create a solid volume.
        - **Normals Correction**: Ensuring all polygon faces point outward for the slicer to interpret correctly.
        - **Wall Thickness Analysis**: identifying areas that are too thin to print or too fragile to handle.

        ### Optimization for Production
        We go beyond basic repairs to save you money and material:
        - **Hollowing & Infill**: Creating hollow shells with drain holes for resin printing to reduce material cost.
        - **Support Generation**: Designing custom tree supports that are easy to remove and leave minimal scarring on surfaces.
        - **Orientation Strategy**: Positioning parts to maximize strength (layer adhesion) or prioritize surface finish.

        Whether you are a hobbyist needing a single file fixed or a service bureau needing bulk processing, we ensure your digital files are physically manufacturable. Stop wasting plastic and resin on failed prints.`,
        features: [
            'Mesh repair (holes, normals)',
            'Wall thickness validation',
            'Support structure generation',
            'Orientation optimization',
            'Scale verification',
            'Multi-part splitting',
            'Hollowing for resin prints'
        ],
        benefits: [
            'Successful first prints',
            'Material optimization',
            'Reduced print time',
            'Proper structural integrity',
            'Print farm ready',
            'Technology-specific prep'
        ],
        processSteps: [
            { step: 1, title: 'File Analysis', description: 'Check for mesh errors and printability' },
            { step: 2, title: 'Repair', description: 'Fix holes, bad normals, and non-manifold edges' },
            { step: 3, title: 'Optimization', description: 'Orient for strength and minimize supports' },
            { step: 4, title: 'Validation', description: 'Slice and verify in printer software' },
            { step: 5, title: 'Delivery', description: 'Provide print-ready files with instructions' }
        ],
        faq: [
            { q: 'What printers do you support?', a: 'FDM, SLA, SLS, and MJF. We optimize for your specific machine and material.' },
            { q: 'Can you slice the files too?', a: 'Yes! We can provide G-code for popular slicers like Cura, PrusaSlicer, and Formlabs PreForm.' },
            { q: 'Do you offer printing services?', a: 'We can connect you with trusted print bureaus for production runs.' }
        ],
        deliverables: ['Print-ready STL files', 'Print settings recommendations', 'Support structure files', 'Print orientation guide'],
        timeline: '1-2 days per file'
    },

    // ============ GROWTH MARKETING ============
    {
        slug: 'tech-seo',
        name: 'Technical SEO',
        category: 'growth',
        price: '₹3,000',
        priceUnit: 'per audit',
        shortDescription: 'Increase organic traffic through technical SEO and optimizations.',
        longDescription: `### The Technical Foundation of Growth
        Stop guessing why your site isn't ranking and start dominating the search results. Our **Technical SEO Services** focus on the structural and technical foundation of your website. We **increase organic traffic through technical SEO, keyword optimization, and Google Ads management**. Search engines like Google prioritize sites that are fast, secure, and easy to crawl. We ensure your site ticks every one of those boxes.

        ### Deep-Dive Audits
        We don't just run a generic automated tool. We conduct deep manual investigations to identify and fix issues that are holding you back:
        - **Core Web Vitals**: Optimizing LCP, FID, and CLS scores for better user experience and ranking boosts.
        - **Crawlability**: Fixing broken links, optimize 'robots.txt', and XML sitemaps to ensure Google indexes your most important pages.
        - **Mobile-First Indexing**: Verifying that your site performs flawlessly on mobile devices, which is now Google's primary ranking factor.

        ### Structured Data & Semantics
        We speak Google's language. We implement advanced **Schema Markup (JSON-LD)** to help search engines understand your content context. This leads to **Rich Snippets** (star ratings, FAQ boxes, event dates) in search results, which can double your click-through rates even without a ranking change.

        ### Continuous Optimization
        SEO is not a one-time task; it's an ongoing battle for visibility. As part of our **digital marketing** audit, we look for cannibalization issues, duplicate content, and orphaned pages. We optimize your site architecture to pass link equity to your most important transactional pages. For businesses targeting local markets, our specific **SEO services India** strategies ensure you rank for hyper-local queries. Let us tune your website's engine for maximum performance.`,
        features: [
            'Site architecture analysis',
            'Core Web Vitals optimization',
            'Mobile-first audit',
            'Schema markup implementation',
            'XML sitemap optimization',
            'Robots.txt configuration',
            'Canonical tag setup',
            'Page speed optimization'
        ],
        benefits: [
            'Higher search rankings',
            'Improved crawl budget',
            'Better user experience',
            'Mobile traffic growth',
            'Rich snippet eligibility',
            'Competitive advantage'
        ],
        processSteps: [
            { step: 1, title: 'Crawl Analysis', description: 'Comprehensive site crawl with Screaming Frog' },
            { step: 2, title: 'Performance Audit', description: 'Core Web Vitals and page speed testing' },
            { step: 3, title: 'Issue Prioritization', description: 'Rank issues by impact and effort' },
            { step: 4, title: 'Implementation', description: 'Fix critical technical issues' },
            { step: 5, title: 'Monitoring', description: 'Track improvements in Search Console' }
        ],
        faq: [
            { q: 'How long until I see results?', a: 'Technical fixes typically show results in 2-8 weeks as Google recrawls your site.' },
            { q: 'Do you need access to my site?', a: 'We need Search Console access and ideally CMS/hosting access for implementations.' },
            { q: 'Is this a one-time service?', a: 'The audit is one-time, but we recommend quarterly checkups for ongoing health.' }
        ],
        deliverables: ['Technical SEO audit report', 'Prioritized fix recommendations', 'Implementation support', 'Before/after metrics', 'Search Console setup'],
        timeline: '1-2 weeks'
    },
    {
        slug: 'automation',
        name: 'Marketing Automation',
        category: 'growth',
        price: '₹4,000',
        priceUnit: 'per workflow',
        shortDescription: 'Automated marketing workflows and email sequences.',
        longDescription: `### Marketing on Autopilot
        Put your marketing on autopilot with intelligent automation. We design and implement **email sequences**, **lead nurturing funnels**, and **behavioral triggers** that engage customers at the right moment. From welcome series to abandoned cart recovery, our automations work 24/7 to convert leads into customers, ensuring no opportunity slips through the cracks.

        ### Strategic Workflows
        We move beyond basic "newsletter blasts" to create personalized customer journeys:
        - **Lead Nurturing**: Automatically educate prospects who download your whitepaper, warming them up until they are ready to talk to sales.
        - **Customer Onboarding**: Guide new users through your product with a timed sequence of helpful tips and tutorials.
        - **Retention & Reactivation**: Automatically re-engage users who haven't logged in for 30 days or celebrate customer anniversaries.

        ### Tech Stack Integration
        Silos kill efficiency. We integrate your automation platform with your entire tech stack:
        - **CRM Sync**: Push hot leads directly into Salesforce, HubSpot, or Pipedrive for your sales team.
        - **E-commerce Triggers**: Send personalized product recommendations based on past purchase history (Shopify/WooCommerce).
        - **Analytics**: Track open rates, click-throughs, and revenue attribution to measure the exact ROI of every email sent.

        ### Copy That Converts
        Automation is the vehicle; content is the fuel. Our team writes compelling, human-sounding emails that get opened and read. We A/B test subject lines and call-to-actions to continuously improve performance. Save time, reduce manual errors, and scale your personal touch with Levitate Labs.`,
        features: [
            'Email sequence design',
            'Lead scoring setup',
            'Trigger-based automation',
            'CRM integration',
            'A/B testing framework',
            'Analytics & reporting',
            'Multi-channel workflows'
        ],
        benefits: [
            'Consistent lead nurturing',
            'Reduced manual work',
            'Higher conversion rates',
            'Personalized messaging',
            'Scalable customer journey',
            'Measurable ROI'
        ],
        processSteps: [
            { step: 1, title: 'Workflow Mapping', description: 'Design customer journey and touchpoints' },
            { step: 2, title: 'Content Creation', description: 'Write email copy and design templates' },
            { step: 3, title: 'Platform Setup', description: 'Configure automation in your tool' },
            { step: 4, title: 'Testing', description: 'Test all triggers and paths' },
            { step: 5, title: 'Launch & Optimize', description: 'Go live and monitor performance' }
        ],
        faq: [
            { q: 'What tools do you work with?', a: 'Mailchimp, HubSpot, ActiveCampaign, ConvertKit, and custom solutions via Zapier.' },
            { q: 'How many emails per sequence?', a: 'Typically 5-7 emails per workflow, optimized based on your sales cycle.' },
            { q: 'Can you write the copy?', a: 'Yes! Our copywriting team creates compelling email content tailored to your brand voice.' }
        ],
        deliverables: ['Automation workflow documentation', 'Email templates (5-7 per workflow)', 'Platform configuration', 'Performance dashboard', 'Optimization report'],
        timeline: '2-3 weeks per workflow'
    },
    {
        slug: 'ads-setup',
        name: 'Paid Ads Setup',
        category: 'growth',
        price: '₹2,500',
        priceUnit: 'per platform',
        shortDescription: 'Google & Meta ads campaign configuration.',
        longDescription: `### Instant Visibility, Measurable ROI
        Launch performance-driven ad campaigns across **Google** and **Meta (Facebook/Instagram)** platforms. While SEO builds long-term authority, Paid Ads deliver **immediate traffic**. We handle complete setup: audience research, keyword selection, ad copywriting, creative assets, and conversion tracking. Our campaigns are structured for scalability with proper attribution to measure every rupee spent.

        ### Precision Targeting
        We don't spray and pray. We use advanced targeting strategies to reach your ideal customer:
        - **Search Intent (Google)**: Capture users exactly when they are searching for your solution with high-intent keywords.
        - **Demographic & Interest (Meta)**: Target users based on job title, age, location, interests, and behaviors.
        - **Lookalike Audiences**: Find new people who look exactly like your best existing customers.

        ### Creative That Stops the Scroll
        In a crowded feed, your ad needs to stand out. Our creative team designs eye-catching visuals and writes punchy copy that addresses pain points and drives action. We produce multiple variations to A/B test headlines, images, and CTAs.

        ### Conversion Tracking
        Data is our compass. We set up robust tracking (Google Tag Manager, Facebook Pixel/CAPI) to track not just clicks, but **actions**—purchases, form fills, and phone calls. You'll know exactly how much revenue each campaign generates, allowing us to optimize for **Return on Ad Spend (ROAS)**, not just vanity metrics.`,
        features: [
            'Audience research & targeting',
            'Keyword strategy (Google)',
            'Ad copy & creative assets',
            'Conversion pixel setup',
            'Campaign structure design',
            'A/B test framework',
            'Remarketing setup'
        ],
        benefits: [
            'Immediate traffic',
            'Precise targeting',
            'Measurable results',
            'Scalable spend',
            'Competitive presence',
            'Lead generation'
        ],
        processSteps: [
            { step: 1, title: 'Strategy Session', description: 'Define goals, budget, and target audience' },
            { step: 2, title: 'Audience Research', description: 'Build targeting personas and keywords' },
            { step: 3, title: 'Creative Development', description: 'Design ads and write copy' },
            { step: 4, title: 'Campaign Build', description: 'Structure campaigns in ad platform' },
            { step: 5, title: 'Launch & Monitor', description: 'Go live with daily optimization' }
        ],
        faq: [
            { q: 'What\'s the minimum ad budget?', a: 'We recommend at least ₹15,000/month ad spend for meaningful data. We charge separately for management.' },
            { q: 'Do you manage ongoing campaigns?', a: 'Yes! We offer monthly management packages starting at ₹5,000/month.' },
            { q: 'Which platforms do you cover?', a: 'Google Ads (Search, Display, YouTube), Meta (Facebook, Instagram), and LinkedIn Ads.' }
        ],
        deliverables: ['Campaign setup document', 'Ad creatives (5-10 variations)', 'Conversion tracking setup', 'Audience lists', '2-week optimization'],
        timeline: '1-2 weeks'
    },
    {
        slug: 'social-management',
        name: 'Social Media Management',
        category: 'growth',
        price: '₹4,500',
        priceUnit: 'per month',
        shortDescription: 'Complete social media presence management.',
        longDescription: `### Building Your Tribe
        Social media is no longer just a broadcasting channel; it's a community interaction space. Build and maintain a powerful social media presence with our management services. We handle **content creation**, **scheduling**, **community engagement**, and **performance analytics** across your key platforms. Consistent posting, strategic hashtags, and authentic engagement to grow your following organically.

        ### Platform Strategy
        We tailor our approach to where your audience lives:
        - **LinkedIn**: Thought leadership, company culture, and B2B networking.
        - **Instagram**: Visual storytelling, Reels flexibility, and brand aesthetics.
        - **Twitter/X**: Real-time engagement, industry news, and direct customer support.
        - **Facebook**: Community groups and mass-market reach.

        ### Content That Resonates
        We create a balanced content mix that educates, entertains, and sells:
        - **Educational Carousels**: Breaking down complex topics into swipeable value.
        - **Short-Form Video (Reels/Shorts)**: Capitalizing on the highest reach format available today.
        - **User-Generated Content (UGC)**: Sharing customer success stories to build social proof.

        ### Community Management
        We don't just post and ghost. We actively manage your community by responding to comments, answering DMs, and engaging with potential customers. This builds brand loyalty and humanizes your business. With monthly analytics reports, you'll see exactly how your reach and engagement are growing month over month.`,
        features: [
            'Content calendar planning',
            'Post creation (15-20/month)',
            'Hashtag strategy',
            'Community management',
            'Competitor monitoring',
            'Monthly analytics report',
            'Story & Reel creation'
        ],
        benefits: [
            'Consistent brand presence',
            'Growing follower base',
            'Customer engagement',
            'Brand awareness',
            'Social proof',
            'Time savings'
        ],
        processSteps: [
            { step: 1, title: 'Brand Audit', description: 'Analyze current presence and competitors' },
            { step: 2, title: 'Strategy Development', description: 'Define content pillars and posting schedule' },
            { step: 3, title: 'Content Creation', description: 'Design posts, write captions, plan calendar' },
            { step: 4, title: 'Daily Management', description: 'Post, engage, and monitor' },
            { step: 5, title: 'Monthly Review', description: 'Analyze performance and adjust strategy' }
        ],
        faq: [
            { q: 'Which platforms do you manage?', a: 'Instagram, LinkedIn, Twitter/X, and Facebook. We recommend focusing on 2-3 platforms.' },
            { q: 'Do I need to provide content?', a: 'We handle everything, but brand photos/videos from you help. We can also organize photoshoots.' },
            { q: 'How do you handle comments?', a: 'We respond to comments within 24 hours using your brand voice guidelines.' }
        ],
        deliverables: ['Monthly content calendar', '15-20 designed posts', 'Hashtag research', 'Community management', 'Monthly analytics report'],
        timeline: 'Ongoing monthly'
    },
    {
        slug: 'market-research',
        name: 'Market Research',
        category: 'growth',
        price: '₹2,500',
        priceUnit: 'per report',
        shortDescription: 'Competitive analysis and market intelligence.',
        longDescription: `### Decisions Backed by Data
        Stop relying on gut feeling. Make informed decisions with comprehensive **Market Research**. We analyze your competitors, identify market opportunities, and uncover customer insights. Our reports provide actionable intelligence on **pricing strategies**, **feature gaps**, and **positioning opportunities** to help you stand out in crowded markets.

        ### Competitive Intelligence
        Know your enemy to defeat them. We dissect your top 5-10 competitors:
        - **Feature Gap Analysis**: What are they offering that you aren't? What are customers complaining about in their reviews?
        - **Pricing Strategy**: How is the market priced? Are you leaving money on the table or pricing yourself out?
        - **Marketing Channels**: Where are they getting their traffic? Which keywords are they bidding on?

        ### Customer Insights
        We help you understand who your customer actually is, not who you think they are. We use social listening, keyword data, and review mining to identify:
        - **Pain Points**: The specific problems customers are desperate to solve.
        - **Language**: The exact words and phrases customers use to describe their problems (pure gold for copywriting).
        - **Willingness to Pay**: What customers value most in your category.

        ### Strategic Roadmap
        We don't just dump a CSV file on your lap. We synthesize our findings into a strategic presentation with clear recommendations: "Launch feature X," "Target audience Y," "Adjust pricing to Z." Whether you are launching a new product or pivoting an existing one, our research reduces risk and increases your probability of success.`,
        features: [
            'Competitor analysis (5-10 players)',
            'Feature comparison matrix',
            'Pricing analysis',
            'Customer review mining',
            'Market size estimation',
            'Trend identification',
            'SWOT analysis'
        ],
        benefits: [
            'Data-driven decisions',
            'Competitive advantage',
            'Pricing confidence',
            'Feature prioritization',
            'Market opportunity identification',
            'Risk awareness'
        ],
        processSteps: [
            { step: 1, title: 'Scope Definition', description: 'Define competitors and research questions' },
            { step: 2, title: 'Data Collection', description: 'Gather public and private intelligence' },
            { step: 3, title: 'Analysis', description: 'Process data and identify patterns' },
            { step: 4, title: 'Synthesis', description: 'Draw insights and recommendations' },
            { step: 5, title: 'Presentation', description: 'Deliver report with key findings' }
        ],
        faq: [
            { q: 'How many competitors can you analyze?', a: 'Standard reports include 5-10 competitors. Enterprise reports can cover entire industries.' },
            { q: 'What sources do you use?', a: 'Public filings, social media, review sites, job postings, press releases, and more.' },
            { q: 'Can you do customer surveys?', a: 'Yes! We can design and run surveys for primary research at additional cost.' }
        ],
        deliverables: ['Comprehensive research report', 'Competitor comparison matrix', 'Market opportunity slides', 'Strategic recommendations', 'Data spreadsheets'],
        timeline: '1-2 weeks'
    },

    // ============ CREATIVE SERVICES ============
    {
        slug: 'graphic-design',
        name: 'Graphic Design',
        category: 'creative',
        price: '₹400',
        priceUnit: 'per design',
        shortDescription: 'Visual graphics for digital and print.',
        longDescription: `### Design That Communicates
        First impressions are formed in 0.05 seconds. Elevate your visual communication with professional **Graphic Design Services** that captivate your audience instantly. From scroll-stopping social media graphics to high-impact print materials, we create eye-catching designs that align perfectly with your brand voice.

        ### Multi-Medium Expertise
        Every medium has its own rules. We are experts in designing for both digital and physical worlds:
        - **Digital**: Social media posts, web banners, email headers, and display ads optimized for screen resolution and engagement.
        - **Print**: Brochures, flyers, business cards, and packaging designed with print production standards (CMYK, Bleed, Crop Marks) in mind.
        - **Data Visualization**: Turning complex data into beautiful, easy-to-understand **infographics** and charts.

        ### The Design Process
        We don't just "make it pop." We solve communication problems visually:
        1. **Brief Analysis**: Understanding the goal of the piece (Brand Awareness vs. Conversion).
        2. **Concepting**: Sketching rough ideas and layouts.
        3. **Refinement**: Polishing the typography, color balance, and hierarchy.
        4. **Production**: Delivering source files and ready-to-use formats.

        Whether you need a daily stream of social content or a one-off trade show booth design, we deliver agency-quality work with freelance agility.`,
        features: [
            'Social media graphics',
            'Print materials',
            'Infographics',
            'Presentation slides',
            'Marketing collateral',
            'Event materials',
            'Digital ads'
        ],
        benefits: [
            'Professional brand image',
            'Consistent visual identity',
            'Increased engagement',
            'Print-ready files',
            'Quick turnaround',
            'Unlimited revisions (2 rounds)'
        ],
        processSteps: [
            { step: 1, title: 'Brief Review', description: 'Understand requirements and brand guidelines' },
            { step: 2, title: 'Concept Creation', description: 'Design initial concepts' },
            { step: 3, title: 'Feedback', description: 'Client review and input' },
            { step: 4, title: 'Refinement', description: 'Apply revisions' },
            { step: 5, title: 'Delivery', description: 'Multiple format delivery' }
        ],
        faq: [
            { q: 'What file formats do you deliver?', a: 'PNG, JPG, PDF, and source files (AI/PSD). Print files include CMYK and bleed.' },
            { q: 'How many revisions are included?', a: '2 rounds of revisions. Additional rounds at ₹200 per revision.' },
            { q: 'Can you match our brand?', a: 'Yes! Share your brand guidelines and we\'ll ensure consistency.' }
        ],
        deliverables: ['Design files (multiple formats)', 'Source files (AI/PSD)', 'Print-ready versions', '2 revision rounds'],
        timeline: '1-3 days per design'
    },
    {
        slug: 'logo-identity',
        name: 'Logo & Brand Identity',
        category: 'creative',
        price: '₹1,800',
        priceUnit: 'per project',
        shortDescription: 'Brand identity design with logo and guidelines.',
        longDescription: `### More Than Just a Logo
        Your brand is not just a logo; it's the gut feeling people have about your business. We help you define that feeling with comprehensive **Logo & Brand Identity Design**. We create distinctive visual systems that tell your story and create a lasting connection with your customers.

        ### The Identity System
        A logo needs a support system to be effective. We deliver a complete brand kit:
        - **Logo Design**: A timeless, versatile mark that works as well on a billboard as it does on a favicon.
        - **Color Palette**: A psychological selection of primary and secondary colors that evoke the right emotions.
        - **Typography**: Font pairings that balance readability with personality.
        - **Visual Language**: Patterns, icons, and photography styles that extend your brand look.

        ### Brand Guidelines
        Consistency is the key to trust. We provide a **Brand Bible** (Style Guide) that serves as the rulebook for your brand. It defines exactly how to use your logo, how much whitespace to leave, which fonts to use for headers vs. body text, and "Do's and Don'ts" to prevent brand dilution.

        ### Future-Proof Branding
        We design identities that grow with you. Our vector-based approach ensures your assets scale infinitely without quality loss. Whether you're a scrappy startup or an established enterprise rebranding for the modern era, we create identities that stand the test of time.`,
        features: [
            'Logo design (3 concepts)',
            'Color palette',
            'Typography selection',
            'Brand guidelines document',
            'Logo variations (horizontal, stacked)',
            'Social media profile assets',
            'Business card design'
        ],
        benefits: [
            'Memorable brand recognition',
            'Professional credibility',
            'Consistent brand application',
            'Scalable identity system',
            'Designer-independent guidelines',
            'Multi-platform ready'
        ],
        processSteps: [
            { step: 1, title: 'Discovery', description: 'Brand questionnaire and competitor review' },
            { step: 2, title: 'Concept Development', description: 'Create 3 logo concepts' },
            { step: 3, title: 'Selection & Refinement', description: 'Choose direction and refine' },
            { step: 4, title: 'System Development', description: 'Build full identity system' },
            { step: 5, title: 'Guidelines Creation', description: 'Document all brand rules' }
        ],
        faq: [
            { q: 'How many logo concepts do I see?', a: 'We present 3 distinct concepts, then refine your chosen direction.' },
            { q: 'What if I don\'t like any concept?', a: 'We\'ll schedule a call to understand better and create new directions.' },
            { q: 'Can I trademark the logo?', a: 'Yes! We provide vector files and sign over full ownership rights.' }
        ],
        deliverables: ['Logo files (all formats)', 'Brand guidelines PDF', 'Color palette codes', 'Typography specifications', 'Social media assets', 'Business card design'],
        timeline: '2-3 weeks'
    },
    {
        slug: 'copywriting',
        name: 'Copywriting',
        category: 'creative',
        price: '₹1,000',
        priceUnit: 'per page',
        shortDescription: 'Compelling copy that converts visitors to customers.',
        longDescription: `### Words That Sell
        In a world of short attention spans, words matter more than ever. Our **Copywriting Services** transform features into benefits and browsers into buyers. We don't just write "content"; we craft psychological triggers that guide your readers toward a specific action.

        ### The Psychology of Persuasion
        We use proven frameworks like AIDA (Attention, Interest, Desire, Action) and PAS (Problem, Agitation, Solution) to write copy that resonates:
        - **Website Copy**: Headlines that hook, value props that clarify, and About pages that build trust.
        - **Landing Pages**: High-conversion sales letters focused entirely on getting that click or sign-up.
        - **Email Sequences**: Nurture emails that build relationships without sounding salesy.

        ### SEO-Infused Content
        Writing for humans comes first, but robots matter too. We seamlessly weave **SEO keywords** into your copy naturally, so you rank higher without sounding like a machine. We handle meta descriptions, title tags, and alt text to ensure your content is fully optimized.

        ### Your Brand Voice
        Every brand has a personality. Are you authoritative and professional? Witty and playful? Empathetic and warm? We adapt our tone to match your unique brand voice, ensuring consistency across all customer touchpoints. Let us find the right words to tell your story.`,
        features: [
            'Website copy',
            'Landing page copy',
            'Email sequences',
            'Ad copy',
            'Product descriptions',
            'Headlines & taglines',
            'Call-to-action optimization'
        ],
        benefits: [
            'Higher conversion rates',
            'Clearer value proposition',
            'Brand voice consistency',
            'SEO-friendly content',
            'Reduced bounce rates',
            'Persuasive messaging'
        ],
        processSteps: [
            { step: 1, title: 'Research', description: 'Understand audience, competitors, and product' },
            { step: 2, title: 'Outline', description: 'Structure content and key messages' },
            { step: 3, title: 'Draft', description: 'Write compelling first draft' },
            { step: 4, title: 'Review', description: 'Client feedback and revisions' },
            { step: 5, title: 'Polish', description: 'Final editing and delivery' }
        ],
        faq: [
            { q: 'Do you research my industry?', a: 'Yes! We research your competitors, audience, and product before writing.' },
            { q: 'Can you match our brand voice?', a: 'Absolutely. Share examples of content you like and we\'ll match the tone.' },
            { q: 'How long is a \'page\'?', a: 'Approximately 300-500 words. Complex pages may count as multiple pages.' }
        ],
        deliverables: ['Final approved copy', 'SEO keywords integrated', 'Meta descriptions', '2 revision rounds', 'Source document'],
        timeline: '3-5 days per page'
    },
    {
        slug: 'pitch-decks',
        name: 'Pitch Deck Design',
        category: 'creative',
        price: '₹2,500',
        priceUnit: 'per deck',
        shortDescription: 'Investor presentations that win funding.',
        longDescription: `### Fund Your Vision
        You have the vision, the traction, and the team. Now you need the capital. Our **Pitch Deck Design Services** help you tell your story compellingly to investors. We combine narrative storytelling with data visualization to create presentations that clarity your value proposition and create **FOMO (Fear Of Missing Out)**.

        ### Narrative Arc
        Investors see hundreds of decks. Yours needs to stand out. We structure your deck to flow logically:
        1. **The Problem**: A painful, relatable issue.
        2. **The Solution**: Your elegant product.
        3. **The Market**: Why is this a billion-dollar opportunity?
        4. **The Traction**: Proof that it's working.
        5. **The Ask**: What you need to scale.

        ### Data Visualization
        Numbers can be boring. We turn spreadsheets into beautiful charts and graphs that make your growth metrics pop. We create custom iconography and diagrams to explain complex business models or technical architectures simply.

        ### Presentation Design
        We design for the "10-second skim" and the "deep dive." Whether you are presenting live on a stage or emailing the PDF to a VC, our decks are designed to communicate your key points clearly and professionally. Secure the funding you deserve with a deck that matches the ambition of your startup.`,
        features: [
            'Narrative structure',
            'Slide design (15-20 slides)',
            'Data visualization',
            'Icon and graphic creation',
            'Animations (optional)',
            'Speaker notes',
            'Multiple format export'
        ],
        benefits: [
            'Professional first impression',
            'Clear story flow',
            'Memorable visuals',
            'Investor-ready quality',
            'Reusable assets',
            'Confidence in meetings'
        ],
        processSteps: [
            { step: 1, title: 'Story Workshop', description: 'Define narrative arc and key messages' },
            { step: 2, title: 'Content Review', description: 'Organize your content and data' },
            { step: 3, title: 'Design Draft', description: 'Create initial slide designs' },
            { step: 4, title: 'Visualization', description: 'Design charts and infographics' },
            { step: 5, title: 'Final Polish', description: 'Animations and final delivery' }
        ],
        faq: [
            { q: 'How many slides are included?', a: 'Standard decks are 15-20 slides. Longer decks quoted separately.' },
            { q: 'Do you help with content?', a: 'We can advise on structure, but you provide the core content and data.' },
            { q: 'What formats do you deliver?', a: 'PowerPoint, Keynote, Google Slides, and PDF.' }
        ],
        deliverables: ['Pitch deck (15-20 slides)', 'PPTX/Keynote/Google Slides', 'PDF version', 'Editable source files', 'Icon pack used'],
        timeline: '1-2 weeks'
    },
    {
        slug: 'video-editing',
        name: 'Video Editing',
        category: 'creative',
        price: '₹500',
        priceUnit: 'per minute',
        shortDescription: 'Professional video editing for content creators.',
        longDescription: `### content That Captivates
        In the age of TikTok and YouTube, **Video is King**. But raw footage isn't enough. Our **Video Editing Services** transform your rough clips into polished, professional assets that stick in viewers' minds. Whether you are a YouTuber, a course creator, or a brand running ads, we handle the entire post-production workflow so you can focus on filming.

        ### The Editing Suite
        We use industry-standard tools (Premiere Pro, After Effects, DaVinci Resolve) to deliver cinema-quality results:
        - **Narrative Pacing**: We cut the fluff and keep the energy high to maximize watch time and retention.
        - **Sound Design**: Crystal clear dialogue, immersive sound effects (SFX), and royalty-free music selection that sets the perfect mood.
        - **Color Grading**: From correcting white balance to applying cinematic LUTs that define your visual style.

        ### Motion Graphics & Polish
        We add the layers that make a video feel "expensive":
        - **Dynamic Text**: Animated captions (Alex Hormozi style) that keep users reading and watching.
        - **B-Roll Injection**: We access premium stock libraries to fill gaps and visualize concepts.
        - **Branding**: Seamlessly integrating your logo, intros, and outros for brand recall.

        ### Optimization for Platforms
        A video for LinkedIn shouldn't look like a TikTok. We optimize export settings, aspect ratios (9:16 vs 16:9), and pacing for specific platforms. Get ready to scroll-stop your audience with video content that looks better than your competitors.`,
        features: [
            'Footage editing & trimming',
            'Color grading',
            'Sound mixing',
            'Motion graphics',
            'Caption/subtitle creation',
            'Thumbnail design',
            'Format optimization'
        ],
        benefits: [
            'Professional quality content',
            'Consistent video style',
            'Time savings',
            'Multi-platform ready',
            'Better engagement',
            'Brand consistency'
        ],
        processSteps: [
            { step: 1, title: 'Footage Review', description: 'Review raw material and brief' },
            { step: 2, title: 'Rough Cut', description: 'First edit with structure' },
            { step: 3, title: 'Fine Cut', description: 'Timing, transitions, and pacing' },
            { step: 4, title: 'Polish', description: 'Color, sound, and graphics' },
            { step: 5, title: 'Export', description: 'Render for required platforms' }
        ],
        faq: [
            { q: 'What editing software do you use?', a: 'Premiere Pro, DaVinci Resolve, and After Effects for motion graphics.' },
            { q: 'Can you add subtitles?', a: 'Yes! We offer burned-in captions or separate SRT files.' },
            { q: 'What\'s the turnaround?', a: 'Typically 3-5 days for a 5-10 minute video. Rush delivery available.' }
        ],
        deliverables: ['Edited video file', 'Thumbnail design', 'Caption file (SRT)', 'Project files (optional)'],
        timeline: '3-5 days per video'
    }
];

// Helper function to get service by slug
export function getServiceBySlug(slug: string): ServiceData | undefined {
    return services.find(s => s.slug === slug);
}

// Helper function to get services by category
export function getServicesByCategory(category: string): ServiceData[] {
    return services.filter(s => s.category === category);
}

// Category metadata
export const categoryInfo = {
    web: { name: 'Web Development', color: 'from-cobalt to-blue-400', icon: 'Code' },
    mechanical: { name: 'Mechanical Engineering', color: 'from-green-500 to-emerald-400', icon: 'Wrench' },
    growth: { name: 'Growth Marketing', color: 'from-orange to-yellow-400', icon: 'TrendingUp' },
    creative: { name: 'Creative Services', color: 'from-purple-500 to-pink-400', icon: 'Palette' }
};
