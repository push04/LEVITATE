'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

type ServiceCategory = 'web' | 'mechanical' | 'growth' | 'creative';

interface Service {
    name: string;
    slug: string;
    price: string;
    category: ServiceCategory;
    description: string;
}

const services: Service[] = [
    { name: 'Static Development', slug: 'static-development', price: 'FROM Rs. 3K', category: 'web', description: 'Lightning-fast, secure, and bespoke digital platforms.' },
    { name: 'E-commerce', slug: 'ecommerce', price: 'FROM Rs. 12K', category: 'web', description: 'Online stores that turn visitors into buyers.' },
    { name: 'Full Stack Applications', slug: 'full-stack-app', price: 'FROM Rs. 9K', category: 'web', description: 'Complex bespoke software with intuitive user interfaces.' },

    { name: '3D CAD Modeling', slug: '3d-modeling', price: 'FROM Rs. 2K', category: 'mechanical', description: 'High-fidelity parametric modeling for manufacturing.' },
    { name: 'FEA Simulation', slug: 'fea-simulation', price: 'FROM Rs. 4K', category: 'mechanical', description: 'Physics-based simulation to validate mechanical designs.' },
    { name: '3D Rendering', slug: 'rendering', price: 'FROM Rs. 1.5K', category: 'mechanical', description: 'Photorealistic imagery for pre-manufacturing marketing.' },

    { name: 'Technical SEO', slug: 'tech-seo', price: 'FROM Rs. 3K', category: 'growth', description: 'We get your business found on Google.' },
    { name: 'Marketing Automation', slug: 'automation', price: 'FROM Rs. 4K', category: 'growth', description: 'Data-driven workflows to scale customer engagement.' },
    { name: 'Social Management', slug: 'social-management', price: 'FROM Rs. 4.5K', category: 'growth', description: 'Strategic community building and brand aesthetics.' },

    { name: 'Graphic Design', slug: 'graphic-design', price: 'FROM Rs. 2K', category: 'creative', description: 'Logos, brand identity, and design that looks professional.' },
    { name: 'Brand Identity', slug: 'logo-identity', price: 'FROM Rs. 8K', category: 'creative', description: 'Complete branding focused on robust narrative identity.' },
    { name: 'Video Editing', slug: 'video-editing', price: 'FROM Rs. 3K', category: 'creative', description: 'Scroll-stopping video content for your brand.' },
];


const categoryNames: Record<ServiceCategory, string> = {
    web: 'WEB',
    mechanical: 'MECHANICAL',
    growth: 'GROWTH',
    creative: 'CREATIVE',
};

export default function Services() {
    return (
        <section id="services" className="py-16 md:py-32 relative bg-[var(--background)]">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-12 w-full">
                <motion.header
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-12 md:mb-32"
                >
                    <h2 className="font-headline text-[clamp(1.25rem,5vw,2rem)] md:text-9xl tracking-[-0.02em] leading-[0.9] text-[var(--foreground)]">Our craft.</h2>
                    <p className="font-body text-[var(--muted)] text-sm md:text-xl mt-4 md:mt-8 max-w-2xl font-light tracking-wide">
                        We get your business found on Google. Scroll-stopping video content for your brand. Logos, brand identity, and design that looks professional. Online stores that turn visitors into buyers.
                    </p>
                </motion.header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 lg:gap-x-24 gap-y-16 md:gap-y-32">
                    {(Object.keys(categoryNames) as ServiceCategory[]).map((cat, catIndex) => (
                        <motion.section 
                            key={cat} 
                            className="group"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: catIndex * 0.1 }}
                        >
                            <div className="border-t border-[var(--border)] pt-4 md:pt-6 mb-8 md:mb-12">
                                <h3 className="font-label uppercase tracking-[0.2em] text-sm text-[#C8A96E]">
                                    {categoryNames[cat]}
                                </h3>
                            </div>
                            <div className="flex flex-col gap-6 md:gap-8">
                                {services.filter(s => s.category === cat).map((service) => (
                                    <Link key={service.slug} href={`/services/${service.slug}`} className="block">
                                        <div className="flex justify-between items-start group/item hover:bg-surface-container-low/30 -mx-4 p-4 transition-colors duration-500 rounded-lg">
                                            <div className="flex-grow pr-4 md:pr-8 transition-transform duration-500 group-hover/item:translate-x-4">
                                                <h4 className="font-headline text-xl md:text-3xl mb-2 text-[var(--foreground)]">{service.name}</h4>
                                                <p className="font-body text-xs md:text-sm text-[var(--muted)] font-light">{service.description}</p>
                                            </div>
                                            <span className="font-body text-xs md:text-sm text-[var(--muted)] font-medium whitespace-nowrap mt-2">{service.price}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </motion.section>
                    ))}
                </div>
            </div>
        </section>
    );
}
