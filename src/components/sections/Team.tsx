'use client';

import { motion } from 'framer-motion';
import { Code, Wrench, TrendingUp, Palette } from 'lucide-react';

interface TeamMember {
    name: string;
    title: string;
    role: string;
    tagline: string;
    stack: string[];
    icon: React.ElementType;
    gradient: string;
}

const team: TeamMember[] = [
    {
        name: 'Pushpal Sanyal',
        title: 'Chief Architect',
        role: 'Web & Apps',
        tagline: 'Turns ideas into working products. Websites, apps, dashboards. If it runs on code, he builds it.',
        stack: ['React', 'Node.js', 'Databases'],
        icon: Code,
        gradient: 'from-cobalt to-blue-400',
    },
    {
        name: 'Mridul Dubey',
        title: 'Head of Mech Eng',
        role: 'CAD & Design',
        tagline: 'From sketch to 3D model to production-ready drawings. Prototypes that actually work.',
        stack: ['SolidWorks', 'AutoCAD', 'FEA'],
        icon: Wrench,
        gradient: 'from-green-500 to-emerald-400',
    },
    {
        name: 'Rishi Singh',
        title: 'Director of Growth',
        role: 'Marketing & SEO',
        tagline: 'Gets your business found online. Ads, funnels, automation—traffic that converts to customers.',
        stack: ['Google Ads', 'SEO', 'Analytics'],
        icon: TrendingUp,
        gradient: 'from-orange to-yellow-400',
    },
    {
        name: 'Shubham Yadav',
        title: 'Creative Director',
        role: 'Design & Brand',
        tagline: 'Makes your brand look premium. Logos, graphics, videos—visuals that people remember.',
        stack: ['Figma', 'After Effects', 'Branding'],
        icon: Palette,
        gradient: 'from-purple-500 to-pink-400',
    },
];

export default function Team() {
    return (
        <section id="team" className="py-24 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 grid-bg opacity-20" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading mb-4">
                        The <span className="gradient-text">Team</span>
                    </h2>
                    <p className="text-[var(--muted)] max-w-2xl mx-auto">
                        We&apos;re a small crew of specialists who actually know what we&apos;re doing. No interns, no outsourcing—just us.
                    </p>
                </motion.div>

                {/* Team Grid - Simple, no horizontal scroll */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {team.map((member, index) => (
                        <motion.div
                            key={member.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <TeamCard member={member} />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function TeamCard({ member }: { member: TeamMember }) {
    return (
        <div className="glass-card p-6 h-full group hover:border-[var(--primary)]/50 transition-colors">
            {/* Icon */}
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${member.gradient} 
                           flex items-center justify-center mb-4 shadow-lg`}>
                <member.icon className="w-7 h-7 text-white" />
            </div>

            {/* Name & Title */}
            <h3 className="text-lg font-bold mb-1">{member.name}</h3>
            <p className="text-[var(--primary)] font-medium text-sm mb-2">{member.title}</p>

            {/* Role */}
            <div className="inline-block px-2 py-1 rounded-full bg-[var(--secondary)] 
                          text-xs font-medium mb-3">
                {member.role}
            </div>

            {/* Description */}
            <p className="text-[var(--muted)] text-sm mb-4 leading-relaxed">
                {member.tagline}
            </p>

            {/* Tech Stack */}
            <div className="flex flex-wrap gap-1">
                {member.stack.map((tech) => (
                    <span
                        key={tech}
                        className="px-2 py-1 rounded bg-[var(--secondary)] text-xs"
                    >
                        {tech}
                    </span>
                ))}
            </div>
        </div>
    );
}
