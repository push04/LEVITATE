'use client';

import React, { createContext, useContext, useEffect } from 'react';

interface ThemeContextType {
    theme: 'light';
    toggleTheme: () => void;
    setTheme: (theme: 'light') => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    toggleTheme: () => {},
    setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('levitate-theme', 'light');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {}, setTheme: () => {} }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
