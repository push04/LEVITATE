'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

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

// Dashboard/portal routes that should default to dark mode for authenticated users
const DASHBOARD_PATHS = ['/business', '/admin', '/company', '/onboard'];

function isDashboardPath(pathname: string): boolean {
    return DASHBOARD_PATHS.some(path => pathname.startsWith(path));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const initialPathname = useRef(pathname);

    useEffect(() => {
        setMounted(true);
        // Check localStorage for saved theme preference
        const savedTheme = localStorage.getItem('levitate-theme') as Theme | null;
        if (savedTheme) {
            setThemeState(savedTheme);
        } else {
            // Default based on pathname - dark for dashboard, light for unauthenticated
            if (isDashboardPath(initialPathname.current)) {
                setThemeState('dark');
            } else {
                setThemeState('light');
            }
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

    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme: mounted ? theme : 'light', toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    return context;
}
