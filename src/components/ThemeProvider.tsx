'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    toggleTheme: () => { },
    setTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check localStorage for saved theme preference
        const savedTheme = localStorage.getItem('levitate-theme') as Theme | null;
        if (savedTheme) {
            setThemeState(savedTheme);
        } else {
            // Default to light mode
            setThemeState('light');
        }
    }, []);

    useEffect(() => {
        if (mounted) {
            // Apply theme class to document
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(theme);
            // Save to localStorage
            localStorage.setItem('levitate-theme', theme);
        }
    }, [theme, mounted]);

    const toggleTheme = () => {
        setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    // Always provide context, just use default theme before mount
    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            <div className={mounted ? '' : 'dark'}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    return context;
}
