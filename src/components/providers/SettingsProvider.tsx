'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface Settings {
    graphicMode: 'classic' | 'graphics';
    displayMode: 'web' | 'app';
    soundEnabled: boolean;
    language: string;
    darkMode: boolean;
}

interface SettingsContextType {
    settings: Settings;
    updateSettings: (updates: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
    graphicMode: 'graphics',
    displayMode: 'web',
    soundEnabled: true,
    language: 'English',
    darkMode: false,
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('arcade_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.graphicMode === 'arcade') {
                    parsed.graphicMode = 'graphics';
                }
                setSettings({ ...defaultSettings, ...parsed });
            } catch (e) {
                // ignore parsing errors
            }
        }
        setIsLoaded(true);
    }, []);

    const updateSettings = (updates: Partial<Settings>) => {
        setSettings((prev) => {
            const next = { ...prev, ...updates };
            localStorage.setItem('arcade_settings', JSON.stringify(next));

            // Dispatch a custom event so non-react code or other tabs can listen if needed
            window.dispatchEvent(new Event('settings-updated'));

            return next;
        });
    };

    // Apply dark class to document root
    useEffect(() => {
        if (!isLoaded) return;
        const root = document.documentElement;
        if (settings.darkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [settings.darkMode, isLoaded]);

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
    return ctx;
}
