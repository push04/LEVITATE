'use client';

import { motion } from 'framer-motion';

interface TeamMemberProps {
    name: string;
    title: string;
    role: string;
    tagline: string;
    initials: string;
    colorHex: string;
    photo?: string;
    index?: number;
}

function hashColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 45%, 35%)`;
}

export default function TeamMember({ name, title, role, tagline, initials, colorHex, photo, index = 0 }: TeamMemberProps) {
    return (
        <motion.article
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="group flex flex-col overflow-hidden rounded-[20px] md:rounded-[28px] border border-[var(--border)] bg-white/55 shadow-[0_12px_40px_rgba(0,0,0,0.05)] backdrop-blur transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
        >
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--background)]">
                {photo ? (
                    <img src={photo} alt={name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${colorHex}, ${hashColor(name)})` }}
                    >
                        <span className="text-5xl md:text-6xl font-headline text-white/90 tracking-wider">{initials}</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0B]/35 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                    <div className="inline-flex max-w-full rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80 backdrop-blur">
                        {role}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 flex-col justify-between gap-4 md:gap-6 p-4 md:p-5">
                <div>
                    <h3 className="font-body text-base md:text-lg font-medium text-[var(--foreground)] mb-1">{name}</h3>
                    <p className="font-label uppercase tracking-[0.12em] text-[10px] text-[#C8A96E] mb-2 md:mb-3">{title}</p>
                    <p className="font-body text-xs md:text-sm text-[var(--muted)] leading-relaxed">{tagline}</p>
                </div>

                <div className="border-t border-[var(--border)] pt-3 md:pt-4 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    {role}
                </div>
            </div>
        </motion.article>
    );
}
