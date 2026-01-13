'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface FormData {
    name: string;
    email: string;
    service_category: string;
    budget: string;
    message: string;
}

const serviceOptions = [
    { value: 'web', label: 'Web Development' },
    { value: 'mechanical', label: 'Mechanical Engineering' },
    { value: 'growth', label: 'Growth Marketing' },
    { value: 'creative', label: 'Creative Services' },
];

const budgetOptions = [
    { value: 'under-5k', label: 'Under ₹5,000' },
    { value: '5k-15k', label: '₹5,000 - ₹15,000' },
    { value: '15k-50k', label: '₹15,000 - ₹50,000' },
    { value: 'above-50k', label: 'Above ₹50,000' },
];

export default function Contact() {
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        service_category: '',
        budget: '',
        message: '',
    });
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [terminalHistory, setTerminalHistory] = useState<string[]>([
        '> Initializing Levitate Labs terminal...',
        '> Connection established.',
        '> Ready to receive your project details.',
    ]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addToTerminal = (message: string) => {
        setTerminalHistory(prev => [...prev, message]);
    };

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Don't log every keystroke - only log on blur for text fields
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Check file type (PDF or CAD files)
            const allowedTypes = ['application/pdf', '.dwg', '.dxf', '.step', '.stp', '.iges'];
            const isValidType = allowedTypes.some(type =>
                selectedFile.type.includes(type) || selectedFile.name.endsWith(type)
            );

            if (selectedFile.size > 10 * 1024 * 1024) {
                addToTerminal('> ERROR: File size exceeds 10MB limit');
                return;
            }

            setFile(selectedFile);
            addToTerminal(`> File attached: ${selectedFile.name}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        addToTerminal('> Transmitting project data...');

        try {
            const submitData = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                submitData.append(key, value);
            });
            if (file) {
                submitData.append('file', file);
            }

            const response = await fetch('/api/contact', {
                method: 'POST',
                body: submitData,
            });

            if (response.ok) {
                addToTerminal('> SUCCESS: Project inquiry submitted!');
                addToTerminal('> Our team will contact you within 24 hours.');
                setSubmitStatus('success');
                setFormData({
                    name: '',
                    email: '',
                    service_category: '',
                    budget: '',
                    message: '',
                });
                setFile(null);
            } else {
                throw new Error('Submission failed');
            }
        } catch (error) {
            addToTerminal('> ERROR: Failed to submit. Please try again.');
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section id="contact" className="py-24 relative overflow-hidden">
            {/* Background */}
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
                        Let's <span className="gradient-text">Talk</span>
                    </h2>
                    <p className="text-[var(--muted)] max-w-2xl mx-auto">
                        Got a project in mind? Fill out the form and we'll get back to you within 24 hours. No spam, just real conversations.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Terminal Display */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="terminal h-[500px] overflow-hidden flex flex-col"
                    >
                        {/* Terminal Header */}
                        <div className="flex items-center gap-2 pb-4 border-b border-dark-border mb-4">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="ml-4 text-gray-500 text-sm">levitate@terminal</span>
                        </div>

                        {/* Terminal Content */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1 text-sm">
                            <AnimatePresence>
                                {terminalHistory.map((line, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`${line.includes('ERROR')
                                            ? 'text-red-400'
                                            : line.includes('SUCCESS')
                                                ? 'text-green-400'
                                                : 'text-gray-400'
                                            }`}
                                    >
                                        {line}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Terminal Prompt */}
                        <div className="pt-4 border-t border-dark-border flex items-center gap-2">
                            <span className="text-cobalt">root@levitate:~$</span>
                            <span className="text-gray-400">type idea...</span>
                            <motion.span
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="w-2 h-4 bg-green-400"
                            />
                        </div>
                    </motion.div>

                    {/* Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="glass-card p-8"
                    >
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    onBlur={(e) => e.target.value && addToTerminal(`> Contact: ${e.target.value}`)}
                                    className="w-full px-4 py-3 rounded-xl bg-[var(--secondary)] border border-[var(--border)]
                           focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20
                           outline-none transition-all"
                                    placeholder="John Doe"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    onBlur={(e) => e.target.value && addToTerminal(`> Email: ${e.target.value}`)}
                                    className="w-full px-4 py-3 rounded-xl bg-[var(--secondary)] border border-[var(--border)]
                           focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20
                           outline-none transition-all"
                                    placeholder="john@example.com"
                                />
                            </div>

                            {/* Service Category */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Service Category</label>
                                <select
                                    required
                                    value={formData.service_category}
                                    onChange={(e) => {
                                        handleInputChange('service_category', e.target.value);
                                        if (e.target.value) {
                                            const label = serviceOptions.find(o => o.value === e.target.value)?.label;
                                            addToTerminal(`> Service: ${label}`);
                                        }
                                    }}
                                    className="w-full px-4 py-3 rounded-xl bg-[var(--secondary)] border border-[var(--border)]
                           focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20
                           outline-none transition-all"
                                >
                                    <option value="">Select a service</option>
                                    {serviceOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Budget */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Budget Range</label>
                                <select
                                    required
                                    value={formData.budget}
                                    onChange={(e) => {
                                        handleInputChange('budget', e.target.value);
                                        if (e.target.value) {
                                            const label = budgetOptions.find(o => o.value === e.target.value)?.label;
                                            addToTerminal(`> Budget: ${label}`);
                                        }
                                    }}
                                    className="w-full px-4 py-3 rounded-xl bg-[var(--secondary)] border border-[var(--border)]
                           focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20
                           outline-none transition-all"
                                >
                                    <option value="">Select budget range</option>
                                    {budgetOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Project Details</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.message}
                                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                    onBlur={(e) => e.target.value && addToTerminal(`> Message: ${e.target.value.substring(0, 50)}...`)}
                                    className="w-full px-4 py-3 rounded-xl bg-[var(--secondary)] border border-[var(--border)]
                           focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20
                           outline-none transition-all resize-none"
                                    placeholder="Tell us about your project..."
                                />
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Attach File (Optional - PDF, CAD)
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.dwg,.dxf,.step,.stp,.iges"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <div className="flex items-center gap-4">
                                    <motion.button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed 
                             border-[var(--border)] hover:border-[var(--primary)] transition-colors"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                        <span className="text-sm">Choose File</span>
                                    </motion.button>
                                    {file && (
                                        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                                            <span>{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFile(null);
                                                    addToTerminal('> File removed');
                                                }}
                                                className="p-1 hover:text-red-400"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                disabled={isSubmitting}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Transmitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Submit Project
                                    </>
                                )}
                            </motion.button>

                            {/* Status Message */}
                            <AnimatePresence>
                                {submitStatus !== 'idle' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className={`flex items-center gap-2 p-4 rounded-xl ${submitStatus === 'success'
                                            ? 'bg-green-500/10 text-green-400'
                                            : 'bg-red-500/10 text-red-400'
                                            }`}
                                    >
                                        {submitStatus === 'success' ? (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                Project submitted! We&apos;ll be in touch soon.
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="w-5 h-5" />
                                                Something went wrong. Please try again.
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
