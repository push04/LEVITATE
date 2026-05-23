'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Zap, User, Bot, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import Link from 'next/link';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export default function AIInterviewPage() {
    // Stage 0: Intro/Details, Stage 1: Chatting, Stage 2: Finished
    const [stage, setStage] = useState<'details' | 'chat' | 'finished'>('details');

    // Application Details
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        portfolio: '',
        department: '', // Added department
    });

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hello! I'm the AI Recruiter for Levitate Labs. I'd love to get to know you. Before we start, what's your name?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

    const scrollToBottom = () => {
        if (shouldAutoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
    };

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // Reduce threshold to 100px to be less aggressive
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShouldAutoScroll(isNearBottom);
    };

    useEffect(() => {
        if (shouldAutoScroll) {
            // Use 'auto' (instant) behavior for streaming updates to prevent jank/jumping
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
    }, [messages, shouldAutoScroll]);


    // Handlers
    const startInterview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.fullName || !formData.email) return;

        // Personalize the first message with an MCQ immediately
        const introMsg = {
            role: 'assistant',
            content: `Hi ${formData.fullName.split(' ')[0]}! Welcome to Levitate Labs. I'm going to test your depth with a few quick questions. First, which track are you applying for? ||| Frontend Engineering ||| Backend / Fullstack ||| UI/UX Design ||| Mechanical Engineering ||| Other`
        } as Message;

        setMessages([introMsg]);
        setStage('chat');
    };

    const sendMessage = async (textOrEvent: FormEvent | string, e?: FormEvent) => {
        if (e) e.preventDefault();

        // Handle both direct string (button click) and form event (input enter)
        let messageText = '';
        if (typeof textOrEvent === 'string') {
            messageText = textOrEvent;
        } else {
            textOrEvent.preventDefault();
            messageText = input;
        }

        if (!messageText.trim() || isLoading) return;

        // CAPTURE DEPARTMENT: If this is the FIRST user message (answering the Intro MCQ)
        if (messages.length === 1 && messages[0].role === 'assistant') {
            setFormData(prev => ({ ...prev, department: messageText }));
        }

        const userMsg = { role: 'user', content: messageText } as Message;
        const newMessages = [...messages, userMsg];

        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        // Force scroll when USER sends
        setShouldAutoScroll(true);
        // setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); // Removed to prevent conflict

        // AUTO-SUBMIT CHECK (Limit to 20 questions = 40 messages approximately, plus system/intro)
        // If we have > 42 messages (Intro + 20 User + 20 AI), stop.
        if (newMessages.length >= 42) {
            // Stop further turns and submit
            setMessages(prev => [...prev, { role: 'assistant', content: "That concludes our interview. Thank you for your time. I'm submitting your responses now." }]);
            setTimeout(() => submitApplication(newMessages), 2000); // Pass latest messages
            return;
        }

        try {
            const response = await fetch('/api/ai/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
            });

            if (!response.body) throw new Error('No response body');

            // Stream handler
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            const assistantMsg = { role: 'assistant', content: '' } as Message;
            let buffer = '';

            // Optimistic add
            setMessages(prev => [...prev, assistantMsg]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Append new chunk to buffer
                buffer += decoder.decode(value, { stream: true });

                // Split by newline to get potential complete messages
                const lines = buffer.split('\n');

                // The last element is potentially incomplete, keep it in buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(trimmedLine.slice(6));
                            const content = data.choices[0]?.delta?.content || '';
                            if (content) {
                                assistantMsg.content += content;
                            }
                        } catch (e) {
                            console.warn('Stream parse error (ignoring):', e);
                        }
                    }
                }

                // Update last message in real-time
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...assistantMsg };
                    return updated;
                });
            }

        } catch (error) {
            console.error('Chat error:', error);
            alert('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const submitApplication = async (finalMessages?: Message[]) => {
        try {
            setIsLoading(true);
            const transcript = finalMessages || messages;
            console.log('Submitting application...', { transcript, formData });

            // 1. Generate AI Summary & Recommendation
            let summary = "AI Summary Pending...";
            let rating = 0;
            try {
                const summaryRes = await fetch('/api/ai/summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transcript }),
                });
                if (summaryRes.ok) {
                    const data = await summaryRes.json();
                    summary = data.summary;
                    rating = data.rating;
                }
            } catch (e) {
                console.error('Failed to generate summary:', e);
            }

            // 2. Insert into Supabase
            const { error } = await supabase.from('career_applications').insert({
                full_name: formData.fullName,
                email: formData.email,
                portfolio_link: formData.portfolio,
                interview_transcript: transcript, // Pass object directly for JSONB
                ai_summary: summary,
                rating: rating, // Save numeric rating
                status: 'new',
                department: formData.department // Persist department
            });

            if (error) {
                console.error('Supabase Error:', error);
                throw error;
            }

            setStage('finished');
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#3b82f6', '#8b5cf6', '#ec4899']
            });

        } catch (error: any) {
            console.error('Submission error:', error);
            alert('Failed to submit application: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85dvh] md:h-[80vh]">

                {/* Header */}
                <div className="bg-[var(--secondary)] p-6 flex items-center justify-between border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                            <Bot className="w-6 h-6 text-[var(--primary)]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Levitate Recruiter AI</h2>
                            <p className="text-xs text-[var(--muted)] flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Online
                            </p>
                        </div>
                    </div>

                    {stage === 'chat' && (
                        <div className="flex items-center gap-4">
                            <div className="bg-[var(--background)] px-3 py-1 rounded-full border border-[var(--border)] text-xs font-bold text-[var(--muted)]">
                                Question {Math.min(Math.floor((messages.length - 1) / 2) + 1, 20)} / 20
                            </div>
                            <button
                                onClick={() => submitApplication()}
                                disabled={messages.length < 5}
                                className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--primary)]/90 transition-colors"
                            >
                                Finish & Submit
                            </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div
                    className="flex-1 overflow-y-auto p-6 relative"
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                >

                    {/* Stage 0: Details Form */}
                    {stage === 'details' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-md mx-auto mt-10 space-y-6"
                        >
                            <div className="text-center">
                                <h3 className="text-2xl font-bold mb-2">Let's get started.</h3>
                                <p className="text-[var(--muted)]">We just need a few details before the interview.</p>
                            </div>
                            <form onSubmit={startInterview} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Portfolio / LinkedIn (Optional)</label>
                                    <input
                                        type="url"
                                        className="w-full p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                        value={formData.portfolio}
                                        onChange={e => setFormData({ ...formData, portfolio: e.target.value })}
                                    />
                                </div>
                                <button type="submit" className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[var(--primary)]/90 transition-all shadow-lg">
                                    Start Interview
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* Stage 1: Chat */}
                    {stage === 'chat' && (
                        <div className="space-y-6">
                            {messages.map((msg, i) => {
                                // Check for MCQ format in Assistant messages
                                const isMCQ = msg.role === 'assistant' && msg.content.includes('|||');
                                const [question, ...options] = isMCQ ? msg.content.split('|||').map(s => s.trim()) : [msg.content];

                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[var(--secondary)]' : 'bg-[var(--primary)]/10 text-[var(--primary)]'}`}>
                                            {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                                        </div>
                                        <div className={`flex flex-col gap-3 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className={`p-4 rounded-2xl ${msg.role === 'user'
                                                ? 'bg-[var(--primary)] text-white rounded-tr-none'
                                                : 'bg-[var(--secondary)] text-[var(--foreground)] rounded-tl-none border border-[var(--border)]'
                                                }`}>
                                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{question}</p>
                                            </div>

                                            {/* Render MCQ Options if they exist and this is the LATEST message */}
                                            {isMCQ && (i === messages.length - 1) && !isLoading && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full mt-2">
                                                    {options.map((opt, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => sendMessage(opt)}
                                                            className="p-3 text-sm text-left border border-[var(--border)] rounded-xl hover:bg-[var(--primary)]/5 hover:border-[var(--primary)] transition-all bg-[var(--surface)] text-[var(--foreground)] font-medium shadow-sm hover:shadow-md active:scale-95"
                                                        >
                                                            <span className="font-bold text-[var(--primary)] mr-2">{String.fromCharCode(65 + idx)}.</span>
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {isLoading && (
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                                        <Bot className="w-5 h-5 text-[var(--primary)]" />
                                    </div>
                                    <div className="flex items-center gap-1 p-4 bg-[var(--secondary)] rounded-2xl rounded-tl-none">
                                        <span className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" />
                                        <span className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <span className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            )}

                            {/* Anchor for auto-scroll */}
                            <div ref={messagesEndRef} />
                        </div>
                    )}

                    {/* Stage 2: Finished */}
                    {stage === 'finished' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center h-full text-center p-8"
                        >
                            <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle className="w-12 h-12" />
                            </div>
                            <h2 className="text-3xl font-bold mb-4">Application Received!</h2>
                            <p className="text-[var(--muted)] max-w-md mb-8">
                                Thank you for chatting with us. Our team (the human ones) will review your interview transcript and get back to you via email shortly.
                            </p>
                            <Link href="/" className="px-8 py-3 bg-[var(--secondary)] text-[var(--foreground)] rounded-xl font-bold hover:bg-[var(--secondary)]/80 transition-colors">
                                Return Home
                            </Link>
                        </motion.div>
                    )}
                </div>

                {/* Input Area */}
                {stage === 'chat' && (
                    <form onSubmit={sendMessage} className="p-4 bg-[var(--background)] border-t border-[var(--border)]">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Type your answer..."
                                autoFocus
                                className="w-full pl-5 pr-14 py-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all shadow-sm"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[var(--primary)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--primary)]/90 transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-center text-[var(--muted)] mt-2">
                            AI can make mistakes. Please verify important information.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
