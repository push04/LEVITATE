'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Globe, Wrench, TrendingUp, Palette, ChevronRight } from 'lucide-react';
import ServiceRecommender from '@/components/ServiceRecommender';

type ServiceCategory = 'all' | 'web' | 'mechanical' | 'growth' | 'creative';

interface Service {
    name: string;
    slug: string;
    price: string;
    category: ServiceCategory;
    description: string;
}

const services: Service[] = [
    // Web Development
    { name: 'Static Development', slug: 'static-development', price: '₹9,000', category: 'web', description: 'Lightning-fast static websites built with Next.js or Astro. Perfect for landing pages and portfolios. Optimized for Google Core Web Vitals with <1s load times.' },
    { name: 'Full Stack App', slug: 'full-stack-app', price: '₹12,000', category: 'web', description: 'Scalable web applications with React frontend and Node.js backend. Includes secure authentication, database design, and custom admin dashboards for your business.' },
    { name: 'CMS Integration', slug: 'cms-integration', price: '₹8,000', category: 'web', description: 'Headless CMS solutions using Strapi or Sanity. Manage your content easily without code. Perfect for blogs, news sites, and marketing teams.' },
    { name: 'E-commerce', slug: 'ecommerce', price: '₹15,000', category: 'web', description: 'Custom online stores with secure payment gateways (Razorpay/Stripe). Includes inventory management, order tracking, and optimized checkout flows for higher conversions.' },
    { name: 'SaaS MVP', slug: 'saas-mvp', price: '₹30,000', category: 'web', description: 'Launch your startup idea in weeks, not months. Includes user onboarding, subscription billing, and scalable architecture ready for investors.' },

    // Mechanical Engineering
    { name: '2D Drafting', slug: '2d-drafting', price: '₹800/hour', category: 'mechanical', description: 'Professional 2D CAD technical drawings using AutoCAD. Manufacturing-ready DWG files with precise dimensions, GD&T tolerances, and industry-standard annotations.' },
    { name: '3D Modeling', slug: '3d-modeling', price: '₹3,000/part', category: 'mechanical', description: 'High-fidelity 3D CAD modeling in SolidWorks and Fusion 360. Parametric designs optimized for CNC machining, injection molding, or 3D printing.' },
    { name: 'Rendering', slug: 'rendering', price: '₹7,500', category: 'mechanical', description: 'Photorealistic 4K product renders for marketing. Studio lighting setups and textured environments to showcase your products before they are manufactured.' },
    { name: 'FEA Simulation', slug: 'fea-simulation', price: '₹8,000', category: 'mechanical', description: 'Physics-based validation using Finite Element Analysis. Test for stress, thermal expansion, and fatigue to identify failure points before prototyping.' },
    { name: 'STL Prep', slug: 'stl-prep', price: '₹1,800/part', category: 'mechanical', description: 'File optimization for 3D printing. We repair meshes, fix non-manifold edges, and generate custom support structures for successful prints.' },

    // Growth Marketing
    { name: 'Tech SEO', slug: 'tech-seo', price: '₹3,000', category: 'growth', description: 'Deep technical SEO audits to boost rankings. We optimize core web vitals, fix crawl errors, and implement schema markup for better organic visibility.' },
    { name: 'Automation', slug: 'automation', price: '₹4,000', category: 'growth', description: 'Automated email workflows and lead nurturing funnels. Engage customers 24/7 with behavioral triggers that drive conversions on autopilot.' },
    { name: 'Ads Setup', slug: 'ads-setup', price: '₹2,500', category: 'growth', description: 'High-ROI PPC campaigns on Google and Meta. Expert audience targeting, keyword strategy, and creative setup to generate immediate traffic.' },
    { name: 'Social Management', slug: 'social-management', price: '₹4,500/mo', category: 'growth', description: 'Complete social media handling. Content creation, scheduling, and community engagement to grow your brand presence on LinkedIn and Instagram.' },
    { name: 'Market Research', slug: 'market-research', price: '₹2,500', category: 'growth', description: 'In-depth competitive analysis and customer insights. Data-driven reports on pricing strategies and market gaps to inform your business decisions.' },

    // Creative Services
    { name: 'Graphic Design', slug: 'graphic-design', price: '₹400', category: 'creative', description: 'Eye-catching visuals for digital and print. Social media graphics, brochures, and marketing collateral designed to communicate your brand message effectively.' },
    { name: 'Logo/Identity', slug: 'logo-identity', price: '₹1,800', category: 'creative', description: 'Distinctive brand identity systems. Memorable logo design, color palettes, and typography guidelines to build a cohesive professional image.' },
    { name: 'Copywriting', slug: 'copywriting', price: '₹1,000/page', category: 'creative', description: 'Persuasive copy that converts visitors into customers. SEO-optimized content for websites, landing pages, emails, and advertisements.' },
    { name: 'Pitch Decks', slug: 'pitch-decks', price: '₹2,500', category: 'creative', description: 'Investor-ready presentation decks. Compelling storytelling combined with data visualization to help you secure funding for your venture.' },
    { name: 'Video Edit', slug: 'video-editing', price: '₹1,500/min', category: 'creative', description: 'Professional video editing for Reels and YouTube. Color grading, sound mixing, and motion graphics to make your content stand out.' },
];

const categories = [
    { id: 'all' as ServiceCategory, name: 'All Services', icon: null },
    { id: 'web' as ServiceCategory, name: 'Web', icon: Globe },
    { id: 'mechanical' as ServiceCategory, name: 'Mechanical', icon: Wrench },
    { id: 'growth' as ServiceCategory, name: 'Growth', icon: TrendingUp },
    { id: 'creative' as ServiceCategory, name: 'Creative', icon: Palette },
];

const categoryColors: Record<ServiceCategory, string> = {
    all: 'var(--primary)',
    web: '#0047FF',
    mechanical: '#00C853',
    growth: '#FF4800',
    creative: '#9C27B0',
};

export default function Services() {
    const [activeCategory, setActiveCategory] = useState<ServiceCategory>('all');

    const filteredServices = activeCategory === 'all'
        ? services
        : services.filter(s => s.category === activeCategory);

    return (
        <section id="services" className="py-24 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 grid-bg opacity-30" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading mb-4">
                        What We <span className="gradient-text">Do Best</span>
                    </h2>
                    <p className="text-[var(--muted)] max-w-2xl mx-auto">
                        Pick what you need. Websites, engineering, marketing, or design—we handle it all so you can focus on running your business.
                    </p>
                </motion.div>

                {/* AI Service Recommender */}
                <ServiceRecommender />

                {/* Category Filter */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-wrap justify-center gap-3 mb-12"
                >
                    {categories.map((cat) => (
                        <motion.button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 
                        flex items-center gap-2 ${activeCategory === cat.id
                                    ? 'bg-[var(--primary)] text-white shadow-lg'
                                    : 'bg-[var(--secondary)] hover:bg-[var(--border)]'
                                }`}
                        >
                            {cat.icon && <cat.icon className="w-4 h-4" />}
                            {cat.name}
                        </motion.button>
                    ))}
                </motion.div>

                {/* Bento Grid */}
                <motion.div layout className="bento-grid">
                    <AnimatePresence mode="popLayout">
                        {filteredServices.map((service, index) => (
                            <motion.div
                                key={service.name}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <ServiceCard service={service} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mt-16"
                >
                    <p className="text-[var(--muted)] mb-4">Need something custom?</p>
                    <motion.a
                        href="#contact"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn-primary inline-flex items-center gap-2"
                    >
                        Start Your Project
                        <ChevronRight className="w-4 h-4" />
                    </motion.a>
                </motion.div>
            </div>
        </section>
    );
}

function ServiceCard({ service }: { service: Service }) {
    return (
        <Link href={`/services/${service.slug}`}>
            <div className="glass-card p-6 group cursor-pointer h-full hover:border-[var(--primary)]/50 transition-colors">
                <div className="relative z-10">
                    {/* Category Badge */}
                    <div
                        className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 capitalize"
                        style={{
                            backgroundColor: `${categoryColors[service.category]}20`,
                            color: categoryColors[service.category]
                        }}
                    >
                        {service.category}
                    </div>

                    {/* Service Name */}
                    <h3 className="text-lg font-bold mb-2 group-hover:text-[var(--primary)] transition-colors">
                        {service.name}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-[var(--muted)] mb-4">
                        {service.description}
                    </p>

                    {/* Price */}
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold" style={{ color: categoryColors[service.category] }}>
                            {service.price}
                        </span>
                        <div className="p-2 rounded-lg bg-[var(--secondary)] group-hover:bg-[var(--primary)] 
                                      group-hover:text-white transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
