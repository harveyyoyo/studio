'use client';

import { usePathname } from 'next/navigation';
import { AppProvider } from "@/components/AppProvider";
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { FirebaseClientProvider } from '@/firebase';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useEffect } from 'react';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/' || pathname.startsWith('/s/');

  // Unregister service workers to prevent stale cache issues
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>levelUp EDU</title>
        <meta name="description" content="LevelUp rewards hub" />
        <meta name="theme-color" content="#13a58d" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="levelUp EDU" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,900&family=Source+Code+Pro:wght@400;600&family=Libre+Barcode+39&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-body antialiased bg-background text-foreground transition-colors duration-500 min-h-screen" suppressHydrationWarning>
        <ErrorBoundary name="RootFirebaseProvider">
          <FirebaseClientProvider>
            <AppProvider>
              <div className="min-h-screen flex flex-col">
                {!isLoginPage && <Header />}
                <main id="app" className={isLoginPage ? "flex-1" : "flex-1 w-full max-w-7xl mx-auto relative z-10"}>
                  {children}
                </main>
              </div>
              <Toaster />
            </AppProvider>
          </FirebaseClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
