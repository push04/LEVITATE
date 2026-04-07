'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Search, User, MoreVertical, Phone, Video,
    Hash, Paperclip, Smile, Check, CheckCheck, ChevronLeft,
    Image as ImageIcon, FileText, X, Download, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, isToday, isYesterday } from 'date-fns';
import confetti from 'canvas-confetti';

// Types
interface Profile {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
    status: string;
    last_seen?: string;
}

interface Attachment {
    type: 'image' | 'file';
    url: string;
    name: string;
    size: number;
}

interface Message {
    id: string;
    content: string;
    sender_id: string;
    recipient_id?: string;
    channel_id?: string;
    created_at: string;
    profiles?: Profile | null;
    status?: 'sending' | 'sent' | 'read'; // Local state
    attachments?: Attachment[];
}

export default function ChatPage() {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [users, setUsers] = useState<Profile[]>([]);
    const [activeChat, setActiveChat] = useState<Profile | 'general' | null>('general');
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showSidebar, setShowSidebar] = useState(true); // Mobile toggle
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // -- Initialization --
    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            setCurrentUser(session.user);

            // Fetch users
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', session.user.id)
                .order('full_name');

            if (profiles) setUsers(profiles);
            setIsLoading(false);
        };
        init();
    }, []);

    const [isMobile, setIsMobile] = useState(false);

    // -- Window Resize Handler (Client Only) --
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setShowSidebar(true);
            }
        };

        // Set initial value
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // When activeChat changes, on mobile, hide sidebar
    useEffect(() => {
        if (isMobile && activeChat) {
            setShowSidebar(false);
        }
    }, [activeChat, isMobile]);

    // -- Fetch Messages --
    useEffect(() => {
        if (!currentUser) return;

        const fetchMessages = async () => {
            let query = supabase
                .from('messages')
                .select('*, profiles:sender_id(*)')
                .order('created_at', { ascending: true });

            if (activeChat === 'general') {
                query = query.is('recipient_id', null);
            } else if (typeof activeChat === 'object' && activeChat) {
                query = query.or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},recipient_id.eq.${currentUser.id})`);
            }

            const { data } = await query;
            if (data) setMessages(data);
            // Initial scroll to bottom
            setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
        };

        fetchMessages();

        // Subscription
        const channel = supabase
            .channel('chat_room')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                async (payload) => {
                    const newMsg = payload.new as Message;

                    // Logic to determine if this message belongs to the current view
                    const isRelevant =
                        (activeChat === 'general' && !newMsg.recipient_id) ||
                        (typeof activeChat === 'object' && activeChat && (
                            (newMsg.sender_id === currentUser.id && newMsg.recipient_id === activeChat.id) ||
                            (newMsg.sender_id === activeChat.id && newMsg.recipient_id === currentUser.id)
                        ));

                    if (isRelevant) {
                        // Fetch sender profile if missing
                        const { data: senderProfile } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', newMsg.sender_id)
                            .single();

                        const msgWithProfile = { ...newMsg, profiles: senderProfile || null };

                        setMessages(prev => {
                            if (prev.some(m => m.id === newMsg.id)) return prev;
                            const updated = [...prev, msgWithProfile];
                            return updated;
                        });

                        // Smart Scroll:
                        // If I sent it, scroll.
                        // If I am at the bottom, scroll.
                        // If I am scrolled up, don't scroll (show toast maybe).
                        const container = scrollContainerRef.current;
                        const isAtBottom = container ? (container.scrollHeight - container.scrollTop <= container.clientHeight + 100) : true;

                        if (newMsg.sender_id === currentUser.id || isAtBottom) {
                            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [activeChat, currentUser]);

    // -- Actions --
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && attachments.length === 0) || !currentUser) return;

        const content = newMessage.trim();
        const filesToUpload = [...attachments];

        // Clear UI immediately
        setNewMessage('');
        setAttachments([]);

        // Optimistic UI
        const tempId = 'temp-' + Date.now();
        const optimisticMsg: Message = {
            id: tempId,
            content: content || (filesToUpload.length ? 'Sent an attachment' : ''),
            sender_id: currentUser.id,
            created_at: new Date().toISOString(),
            status: 'sending',
            profiles: {
                id: currentUser.id,
                full_name: 'You',
                avatar_url: '',
                role: 'employee',
                status: 'active'
            },
            attachments: filesToUpload.map(f => ({
                type: f.type.startsWith('image/') ? 'image' : 'file',
                url: URL.createObjectURL(f), // Temporary blob URL
                name: f.name,
                size: f.size
            }))
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        // Upload Files
        const uploadedAttachments: Attachment[] = [];
        for (const file of filesToUpload) {
            const fileName = `${Date.now()}-${file.name}`;
            const { data, error } = await supabase.storage.from('vault').upload(fileName, file);

            if (data && !error) {
                const { data: { publicUrl } } = supabase.storage.from('vault').getPublicUrl(fileName);
                uploadedAttachments.push({
                    type: file.type.startsWith('image/') ? 'image' : 'file',
                    url: publicUrl,
                    name: file.name,
                    size: file.size
                });
            } else {
                console.error('Upload failed for', file.name, error);
            }
        }

        // Prepare Payload
        const msgData: any = {
            content: content,
            sender_id: currentUser.id,
            attachments: uploadedAttachments // Stores as JSONB
        };

        if (activeChat === 'general') {
            msgData.channel_id = 'general';
        } else {
            msgData.recipient_id = (activeChat as Profile).id;
            msgData.is_dm = true;
        }

        const { data, error } = await supabase.from('messages').insert(msgData).select().single();

        if (error) {
            console.error('Send error:', error);
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sending' /* failed logic? */ } : m)); // simplistic error handling
            alert("Failed to send message: " + error.message);
        } else {
            // Replace temp message with real one
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, ...data, status: 'sent', attachments: uploadedAttachments } : m));

            // Confetti if it's the first message or something fun? Nah, maybe just sound.
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(prev => [...prev, ...Array.from(e.target.files || [])]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // -- Render Helpers --
    const filteredUsers = users.filter(u =>
        (u.full_name?.toLowerCase() || '').includes(userSearch.toLowerCase()) ||
        (u.role?.toLowerCase() || '').includes(userSearch.toLowerCase())
    );

    const groupedMessages = useMemo(() => {
        const groups: { date: string; msgs: Message[] }[] = [];
        messages.forEach(msg => {
            const date = new Date(msg.created_at);
            let dateStr = format(date, 'MMMM d, yyyy');
            if (isToday(date)) dateStr = 'Today';
            if (isYesterday(date)) dateStr = 'Yesterday';

            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.date === dateStr) {
                lastGroup.msgs.push(msg);
            } else {
                groups.push({ date: dateStr, msgs: [msg] });
            }
        });
        return groups;
    }, [messages]);

    return (
        <div className="h-[calc(100vh-100px)] flex gap-0 md:gap-6 overflow-hidden relative">
            {/* Sidebar (User List) */}
            <AnimatePresence mode="wait">
                {(showSidebar || !isMobile) && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`${!showSidebar ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col glass-card shrink-0 border-r-0 h-full absolute md:relative z-20 md:z-auto bg-[var(--background)]/95 backdrop-blur-xl md:bg-transparent`}
                    >
                        <div className="p-4 border-b border-[var(--border)]">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-lg">Messages</h2>
                                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                                    <span className="text-xs font-bold">{users.length + 1}</span>
                                </div>
                            </div>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                                <input
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    placeholder="Search people..."
                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--secondary)] border-transparent border focus:border-[var(--primary)] text-sm outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                            {/* General Channel */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setActiveChat('general')}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeChat === 'general'
                                    ? 'bg-gradient-to-r from-[var(--primary)] to-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'hover:bg-[var(--secondary)] text-[var(--foreground)]'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeChat === 'general' ? 'bg-white/20' : 'bg-[var(--secondary)]'}`}>
                                    <Hash className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-sm">General</p>
                                    <p className={`text-xs ${activeChat === 'general' ? 'text-white/70' : 'text-[var(--muted)]'}`}>Team Announcements</p>
                                </div>
                            </motion.button>

                            <div className="my-4 flex items-center gap-2 px-2">
                                <div className="h-px bg-[var(--border)] flex-1" />
                                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Direct Messages</span>
                                <div className="h-px bg-[var(--border)] flex-1" />
                            </div>

                            <div className="space-y-1">
                                {filteredUsers.map(user => (
                                    <motion.button
                                        key={user.id}
                                        whileHover={{ x: 4 }}
                                        onClick={() => setActiveChat(user)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${(activeChat as Profile)?.id === user.id
                                            ? 'bg-[var(--secondary)] border border-[var(--primary)]/30 shadow-sm'
                                            : 'hover:bg-[var(--secondary)]/50'
                                            }`}
                                    >
                                        <div className="relative">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm select-none ${(activeChat as Profile)?.id === user.id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--secondary)] text-[var(--muted)]'
                                                }`}>
                                                {user.full_name?.[0]}
                                            </div>
                                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--surface)] ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        </div>
                                        <div className="text-left overflow-hidden flex-1">
                                            <p className="font-medium text-sm truncate text-[var(--foreground)]">{user.full_name}</p>
                                            <p className="text-xs truncate text-[var(--muted)] capitalize">
                                                {user.role}
                                            </p>
                                            {/* Could show last message preview here */}
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col glass-card overflow-hidden shadow-2xl relative transition-all duration-300 ${showSidebar && isMobile ? 'translate-x-[110%]' : 'translate-x-0'}`}>
                {/* Header */}
                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]/50 backdrop-blur-md z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        {/* Mobile Back Button */}
                        <button
                            onClick={() => setShowSidebar(true)}
                            className="md:hidden p-2 -ml-2 hover:bg-[var(--secondary)] rounded-full transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>

                        {activeChat === 'general' ? (
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Hash className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                        ) : activeChat ? (
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/20">
                                {(activeChat as Profile).full_name?.[0]}
                            </div>
                        ) : null}
                        <div>
                            <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
                                {activeChat === 'general' ? 'General Channel' : (activeChat as Profile)?.full_name}
                                {activeChat !== 'general' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                            </h3>
                            <p className="text-xs md:text-sm text-[var(--muted)] truncate max-w-[150px] md:max-w-xs">
                                {activeChat === 'general' ? 'Company-wide announcements & chatter' : `${(activeChat as Profile)?.role} • Active Now`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 bg-[var(--secondary)]/50 p-1 rounded-lg">
                        <button className="p-2 hover:bg-[var(--surface)] rounded-md transition-colors text-[var(--muted)] hover:text-[var(--primary)] hidden md:block">
                            <Phone className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-[var(--surface)] rounded-md transition-colors text-[var(--muted)] hover:text-[var(--primary)] hidden md:block">
                            <Video className="w-5 h-5" />
                        </button>
                        <div className="w-px h-6 bg-[var(--border)] mx-1 hidden md:block" />
                        <button className="p-2 hover:bg-[var(--surface)] rounded-md transition-colors text-[var(--muted)] hover:text-[var(--primary)]">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-[var(--surface)]/30 scroll-smooth"
                >
                    {groupedMessages.map((group, groupIdx) => (
                        <div key={groupIdx} className="space-y-6">
                            {/* Date Separator */}
                            <div className="flex items-center justify-center sticky top-0 z-10">
                                <span className="px-4 py-1 rounded-full bg-[var(--surface)]/80 backdrop-blur text-[10px] font-bold text-[var(--muted)] tracking-wider uppercase border border-[var(--border)] shadow-sm">
                                    {group.date}
                                </span>
                            </div>

                            {/* Message Group */}
                            <div className="space-y-1">
                                {group.msgs.map((msg, msgIdx) => {
                                    const isMe = msg.sender_id === currentUser?.id;
                                    const showAvatar = msgIdx === 0 || group.msgs[msgIdx - 1].sender_id !== msg.sender_id;
                                    const isLast = msgIdx === group.msgs.length - 1 || group.msgs[msgIdx + 1].sender_id !== msg.sender_id;

                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            key={msg.id}
                                            className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                                        >
                                            {/* Avatar */}
                                            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-md
                                                ${!showAvatar ? 'invisible' : ''}
                                                ${isMe ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'}
                                            `}>
                                                {msg.profiles?.full_name?.[0] || '?'}
                                            </div>

                                            {/* Content */}
                                            <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                {showAvatar && !isMe && (
                                                    <span className="text-xs text-[var(--muted)] ml-1 mb-1 font-medium">{msg.profiles?.full_name}</span>
                                                )}

                                                <div className={`px-4 py-3 text-sm shadow-sm relative group transition-all hover:shadow-md
                                                    ${isMe
                                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm'
                                                        : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] rounded-2xl rounded-tl-sm'
                                                    }
                                                `}>
                                                    {/* Attachments */}
                                                    {msg.attachments && msg.attachments.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {msg.attachments.map((att, i) => (
                                                                <a
                                                                    key={i}
                                                                    href={att.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={`block overflow-hidden rounded-lg border ${isMe ? 'border-white/20' : 'border-[var(--border)]'}`}
                                                                >
                                                                    {att.type === 'image' ? (
                                                                        <img src={att.url} alt={att.name} className="max-w-[200px] max-h-[200px] object-cover" />
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 p-2 bg-black/10">
                                                                            <FileText className="w-4 h-4" />
                                                                            <span className="text-xs underline truncate max-w-[150px]">{att.name}</span>
                                                                        </div>
                                                                    )}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {msg.content}

                                                    {isMe && (
                                                        <span className="ml-2 inline-flex items-center opacity-70 align-bottom">
                                                            {msg.status === 'sending' ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <CheckCheck className="w-3 h-3" />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Timestamp */}
                                                {(isLast || showAvatar) && (
                                                    <span className={`text-[10px] text-[var(--muted)] mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'text-right' : 'text-left'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} className="h-1" />
                </div>

                {/* Input Area */}
                <div className="p-3 md:p-4 bg-[var(--surface)]/80 backdrop-blur-md border-t border-[var(--border)] shrink-0 z-20">

                    {/* Attachments Preview */}
                    {attachments.length > 0 && (
                        <div className="flex gap-2 pb-3 overflow-x-auto custom-scrollbar">
                            {attachments.map((file, i) => (
                                <div key={i} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-[var(--border)] group">
                                    {file.type.startsWith('image/') ? (
                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-[var(--secondary)] flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-[var(--muted)]" />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => removeAttachment(i)}
                                        className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <form onSubmit={sendMessage} className="flex items-end gap-2 md:gap-3 max-w-4xl mx-auto">
                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 md:p-3 rounded-xl hover:bg-[var(--secondary)] text-[var(--muted)] transition-colors shrink-0"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>

                        <div className="flex-1 bg-[var(--secondary)] rounded-2xl border border-[var(--border)] focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:border-transparent transition-all flex items-end px-4 py-2">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage(e);
                                    }
                                }}
                                placeholder="Type a message..."
                                className="flex-1 bg-transparent border-none outline-none py-2 max-h-32 min-h-[40px] resize-none text-sm custom-scrollbar"
                                rows={1}
                            />
                            <button type="button" className="ml-2 mb-2 text-[var(--muted)] hover:text-[var(--foreground)]">
                                <Smile className="w-5 h-5" />
                            </button>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="submit"
                            disabled={(!newMessage.trim() && attachments.length === 0)}
                            className={`p-3 rounded-xl shadow-lg transition-all shrink-0 ${newMessage.trim() || attachments.length > 0
                                ? 'bg-gradient-to-r from-[var(--primary)] to-blue-600 text-white shadow-blue-500/25'
                                : 'bg-[var(--secondary)] text-[var(--muted)]'
                                }`}
                        >
                            <Send className="w-5 h-5" />
                        </motion.button>
                    </form>
                </div>
            </div>
        </div>
    );
}
