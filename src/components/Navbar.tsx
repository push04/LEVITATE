'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

const navLinks = [
    { name: 'Home', href: '/#home' },
    { name: 'Services', href: '/#services' },
    { name: 'Case Studies', href: '/#case-studies' },
    { name: 'Team', href: '/#team' },
    { name: 'Contact', href: '/#contact' },
];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleMenu = () => setIsOpen(!isOpen);

    const closeMenu = () => setIsOpen(false);

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? 'bg-[var(--background)]/80 backdrop-blur-lg shadow-lg'
                : 'bg-transparent'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 relative z-50">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group" onClick={closeMenu}>
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

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-[var(--foreground)]/70 hover:text-[var(--primary)] 
                         transition-colors duration-300 font-medium cursor-pointer"
                            >
                                {link.name}
                            </Link>
                        ))}
                        <ThemeToggle />
                        <Link
                            href="/admin"
                            className="btn-primary text-sm"
                        >
                            Admin
                        </Link>
                    </div>

                    {/* Mobile Menu Button - High Z-Index & Interactive */}
                    <div className="flex md:hidden items-center gap-4">
                        <ThemeToggle />
                        <button
                            onClick={toggleMenu}
                            className="p-2 rounded-lg bg-[var(--secondary)] cursor-pointer hover:bg-[var(--border)] transition-colors active:scale-95 touch-manipulation"
                            aria-label="Toggle Menu"
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: "tween", duration: 0.3 }}
                        className="md:hidden fixed inset-0 top-[64px] z-40 bg-[var(--background)]/95 backdrop-blur-xl border-t border-[var(--border)] overflow-y-auto"
                    >
                        <div className="flex flex-col p-6 space-y-4">
                            {navLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.href}
                                    onClick={(e) => {
                                        // Allow default navigation to hash
                                        closeMenu();
                                    }}
                                    className="block w-full text-left px-4 py-4 rounded-xl text-lg font-medium
                                             text-[var(--foreground)] hover:bg-[var(--secondary)] 
                                             hover:text-[var(--primary)] transition-all duration-200 cursor-pointer"
                                >
                                    {link.name}
                                </a>
                            ))}
                            <div className="pt-4 border-t border-[var(--border)]">
                                <Link
                                    href="/admin"
                                    onClick={closeMenu}
                                    className="block w-full text-center btn-primary py-4 text-lg"
                                >
                                    Admin Dashboard
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
