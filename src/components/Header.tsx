'use client';
import { Trophy, WifiOff, TerminalSquare, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { useAppContext } from './AppProvider';
import Link from 'next/link';

export default function Header() {
  const { schoolId, isInitialized } = useAppContext();

  return (
    <header className="no-print w-full max-w-6xl bg-card rounded-2xl p-4 md:p-6 mb-6 flex justify-between items-center border-b-4 border-primary shadow-lg relative overflow-hidden">
      {schoolId && (
        <div
          className="font-headline absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0 whitespace-nowrap text-5xl md:text-8xl font-black text-slate-100 dark:text-slate-800/50 uppercase tracking-widest italic select-none"
        >
          {schoolId.replace(/_/g, ' ')}
        </div>
      )}

      <div className="flex items-center gap-3 relative z-10">
        <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-md">
          <Trophy className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground leading-none font-headline">
            Reward Arcade
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            School Points System{' '}
            {schoolId && (
              <span className="text-primary/80 ml-1 font-code">{schoolId}</span>
            )}
          </p>
        </div>
      </div>

      {isInitialized && schoolId && (
        <div className="flex gap-2 items-center relative z-20">
          {/* <Button variant="ghost" size="icon" className="text-muted-foreground" title="Developer Mode">
            <TerminalSquare className="w-5 h-5" />
          </Button> */}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-1 text-xs font-bold text-muted-foreground bg-background/50"
          >
            {/* This is a placeholder, as cloud sync is not fully implemented */}
            <Zap className="w-3 h-3 text-green-500" />
            <span>Live Sync</span>
          </Button>

          <Button asChild variant="ghost" className="font-bold">
            <Link href="/">Home</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
