
import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/AppProvider";
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { FirebaseClientProvider } from '@/firebase';
import { ErrorBoundary } from '@/components/ErrorBoundary';


export const viewport: Viewport = {
  themeColor: "#13a58d",
};

export const metadata: Metadata = {
  title: "levelUp EDU",
  description: "LevelUp rewards hub",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "levelUp EDU",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
      <body className="font-body antialiased" suppressHydrationWarning>
        <ErrorBoundary name="RootFirebaseProvider">
          <FirebaseClientProvider>
            <AppProvider>
              <div
                id="screen-view"
                className="flex min-h-screen flex-col items-center p-2 pb-20 sm:p-4 sm:pb-20"
              >
                <Header />
                <main id="app" className="w-full max-w-6xl relative z-10">
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
