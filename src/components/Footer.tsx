'use client';

import { motion } from 'framer-motion';
import { Zap, Github, Linkedin, Twitter, Mail, MessageCircle } from 'lucide-react';
import Link from 'next/link';

const footerLinks = {
    services: [
        { name: 'Web Development', href: '#services' },
        { name: 'Mechanical Engineering', href: '#services' },
        { name: 'Growth Marketing', href: '#services' },
        { name: 'Creative Services', href: '#services' },
    ],
    company: [
        { name: 'About Us', href: '#team' },
        { name: 'Case Studies', href: '#case-studies' },
        { name: 'Careers', href: '#contact' },
        { name: 'Contact', href: '#contact' },
    ],
};

const socialLinks = [
    { icon: MessageCircle, href: 'https://wa.me/916299549112', label: 'WhatsApp' },
    { icon: Mail, href: 'mailto:pushpal.sanyal_btech24@gsv.ac.in', label: 'Email' },
    { icon: Linkedin, href: 'https://www.linkedin.com/in/pushpalgsv/', label: 'LinkedIn' },
    { icon: Twitter, href: 'https://x.com/PushpalSanyal', label: 'X (Twitter)' },
    { icon: Github, href: 'https://github.com/push04/', label: 'GitHub' },
];

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative bg-[var(--surface)] border-t border-[var(--border)]">
            {/* Grid Background */}
            <div className="absolute inset-0 grid-bg opacity-50" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand Column */}
                    <div className="lg:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <motion.div
                                whileHover={{ rotate: 180 }}
                                transition={{ duration: 0.5 }}
                                className="p-2 rounded-lg bg-[var(--primary)]"
                            >
                                <Zap className="w-5 h-5 text-white" />
                            </motion.div>
                            <span className="text-xl font-bold font-heading">
                                <span className="text-[var(--foreground)]">Levitate</span>
                                <span className="text-[var(--primary)]">Labs</span>
                            </span>
                        </Link>
                        <p className="text-[var(--muted)] text-sm mb-6">
                            Websites, CAD, marketing, design—all under one roof. We keep things simple so you get results faster.
                        </p>
                        {/* Social Links */}
                        <div className="flex gap-4">
                            {socialLinks.map((social) => (
                                <motion.a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="p-2 rounded-lg bg-[var(--secondary)] hover:bg-[var(--primary)] 
                           hover:text-white transition-colors duration-300"
                                    aria-label={social.label}
                                >
                                    <social.icon className="w-5 h-5" />
                                </motion.a>
                            ))}
                        </div>
                    </div>

                    {/* Services Column */}
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-heading">Services</h3>
                        <ul className="space-y-3">
                            {footerLinks.services.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-[var(--muted)] hover:text-[var(--primary)] 
                             transition-colors duration-300 text-sm"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Column */}
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-heading">Company</h3>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-[var(--muted)] hover:text-[var(--primary)] 
                             transition-colors duration-300 text-sm"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Terminal CTA Column */}
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-heading">Quick Contact</h3>
                        <div className="terminal text-sm">
                            <div className="flex items-center gap-2 text-green-400 mb-2">
                                <span className="text-[var(--primary)]">root@levitate:~$</span>
                            </div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="flex items-center gap-1"
                            >
                                <span className="text-gray-400">type idea...</span>
                                <span className="w-2 h-4 bg-green-400 animate-pulse" />
                            </motion.div>
                            <Link
                                href="#contact"
                                className="block mt-4 text-[var(--primary)] hover:underline"
                            >
                                → Launch full terminal
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 pt-8 border-t border-[var(--border)] 
                      flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[var(--muted)] text-sm">
                        © {currentYear} Levitate Labs. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm text-[var(--muted)]">
                        <Link href="#" className="hover:text-[var(--primary)] transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="#" className="hover:text-[var(--primary)] transition-colors">
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
