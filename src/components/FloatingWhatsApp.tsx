'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

export default function FloatingWhatsApp() {
    return (
        <motion.a
            href="https://wa.me/916299549112"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-[#25D366] text-white 
                       shadow-lg hover:shadow-[#25D366]/50 transition-shadow cursor-pointer
                       flex items-center justify-center"
            title="Chat on WhatsApp"
        >
            <MessageCircle className="w-8 h-8" strokeWidth={2.5} />
            <span className="absolute right-full mr-4 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white 
                           text-sm px-3 py-1 rounded-lg font-medium shadow-md
                           opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap hidden sm:block">
                Chat with us
            </span>
        </motion.a>
    );
}
