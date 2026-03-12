
'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

interface LayoutClientWrapperProps {
    children: React.ReactNode;
}

export default function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/' || pathname.startsWith('/s/');

    // Unregister service workers to prevent stale cache issues
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function (registrations) {
                for (let registration of registrations) {
                    registration.unregister();
                }
            });
        }
    }, []);

    return (
        <TooltipProvider>
            <div className="min-h-screen flex flex-col">
                {!isLoginPage && <Header />}
                <main id="screen-view" className={isLoginPage ? "flex-1" : "flex-1 w-full max-w-7xl mx-auto relative z-10"}>
                    {children}
                </main>
            </div>
            <Toaster />
        </TooltipProvider>
    );
}
