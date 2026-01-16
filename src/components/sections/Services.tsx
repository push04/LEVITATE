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
    { name: 'Static Development', slug: 'static-development', price: '₹3,000', category: 'web', description: 'Fast, optimized static websites' },
    { name: 'Full Stack App', slug: 'full-stack-app', price: '₹9,000', category: 'web', description: 'Complete web applications with backend' },
    { name: 'CMS Integration', slug: 'cms-integration', price: '₹5,000', category: 'web', description: 'Content management systems' },
    { name: 'E-commerce', slug: 'ecommerce', price: '₹12,000', category: 'web', description: 'Online stores with payment integration' },
    { name: 'SaaS MVP', slug: 'saas-mvp', price: '₹20,000', category: 'web', description: 'Minimum viable product development' },

    // Mechanical Engineering
    { name: '2D Drafting', slug: '2d-drafting', price: '₹1,000/hr', category: 'mechanical', description: 'Technical drawings and schematics' },
    { name: '3D Modeling', slug: '3d-modeling', price: '₹2,000/part', category: 'mechanical', description: 'Detailed 3D CAD models' },
    { name: 'Rendering', slug: 'rendering', price: '₹1,500', category: 'mechanical', description: 'Photorealistic product renders' },
    { name: 'FEA Simulation', slug: 'fea-simulation', price: '₹4,000', category: 'mechanical', description: 'Finite element analysis' },
    { name: 'STL Prep', slug: 'stl-prep', price: '₹800', category: 'mechanical', description: '3D printing file preparation' },

    // Growth Marketing
    { name: 'Tech SEO', slug: 'tech-seo', price: '₹3,000', category: 'growth', description: 'Technical search optimization' },
    { name: 'Automation', slug: 'automation', price: '₹4,000', category: 'growth', description: 'Marketing automation setup' },
    { name: 'Ads Setup', slug: 'ads-setup', price: '₹2,500', category: 'growth', description: 'PPC campaign configuration' },
    { name: 'Social Management', slug: 'social-management', price: '₹4,500/mo', category: 'growth', description: 'Social media management' },
    { name: 'Market Research', slug: 'market-research', price: '₹2,500', category: 'growth', description: 'Competitive analysis' },

    // Creative Services
    { name: 'Graphic Design', slug: 'graphic-design', price: '₹400', category: 'creative', description: 'Visual graphics and assets' },
    { name: 'Logo/Identity', slug: 'logo-identity', price: '₹1,800', category: 'creative', description: 'Brand identity design' },
    { name: 'Copywriting', slug: 'copywriting', price: '₹1,000/pg', category: 'creative', description: 'Compelling copy and content' },
    { name: 'Pitch Decks', slug: 'pitch-decks', price: '₹2,500', category: 'creative', description: 'Investor presentation design' },
    { name: 'Video Edit', slug: 'video-editing', price: '₹500', category: 'creative', description: 'Professional video editing' },
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
                        Let&apos;s Talk
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
