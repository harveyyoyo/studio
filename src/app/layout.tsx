import type { Metadata } from "next";
import { AppProvider } from "@/components/AppProvider";
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import {
  ClientProvider,
} from '@/firebase';


export const metadata: Metadata = {
  title: "Arcade Rewards Hub",
  description: "A school points and rewards system.",
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
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,900&family=Source+Code+Pro:wght@400;600&family=Libre+Barcode+39+Text&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-body antialiased">
        <ClientProvider>
          <AppProvider>
            <div
              id="screen-view"
              className="flex min-h-screen flex-col items-center p-4"
            >
              <Header />
              <main id="app" className="w-full max-w-6xl relative z-10">
                {children}
              </main>
            </div>
            <Toaster />
          </AppProvider>
        </ClientProvider>
      </body>
    </html>
  );
}
