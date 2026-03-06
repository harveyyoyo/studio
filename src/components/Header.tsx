'use client';
import { usePathname } from 'next/navigation';
import { doc } from 'firebase/firestore';
import {
  Trophy,
  Zap,
  LogOut,
  Home,
  User,
  GraduationCap,
  Printer,
  ShoppingBag,
  UserCog,
  Gift,
} from 'lucide-react';
import { Button } from './ui/button';
import { useAppContext } from './AppProvider';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SettingsModal } from './ui/SettingsModal';
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';


export default function Header() {
  const pathname = usePathname();
  const { loginState, schoolId, isInitialized, syncStatus, logout } = useAppContext();
  const { settings } = useSettings();
  const playSound = useArcadeSound();
  const firestore = useFirestore();

  const schoolDocRef = useMemoFirebase(() => {
      if (!firestore || !schoolId) return null;
      return doc(firestore, 'schools', schoolId);
  }, [firestore, schoolId]);

  const { data: schoolData } = useDoc<{ name: string }>(schoolDocRef);
  const schoolName = schoolData?.name || schoolId;

  const isLoginPage = pathname === '/' || pathname.startsWith('/s/');

  const handleLogout = () => {
    playSound('swoosh');
    logout();
  };

  if (isLoginPage) {
    return null;
  }

  // --- APP MODE HEADER ---
  if (settings.displayMode === 'app') {
    return (
      <>
        <header className="no-print w-full flex justify-between items-center relative z-20 px-4 pt-4 pb-4 border-b border-border/10">
            <Link href="/" className="flex items-center gap-2 relative z-10 group" data-home-button="true">
                <div className="overflow-hidden rounded-lg shadow-md bg-primary h-8 w-8 flex items-center justify-center">
                    <Zap className="w-4 h-4 fill-primary-foreground text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-sm font-black leading-none uppercase text-primary tracking-wider">
                      levelUp EDU
                  </h1>
                  {loginState === 'school' && schoolId ? (
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                      {schoolName}
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                      School Reward System
                    </p>
                  )}
                </div>
            </Link>

            <div className="z-20">
                <SettingsModal />
            </div>
        </header>
        
        {loginState === 'school' && (
          <nav className="fixed bottom-0 left-0 right-0 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] z-[100] no-print border-t border-slate-200 bg-white/90 backdrop-blur-md">
            <div className="max-w-lg mx-auto flex justify-around items-center">
              {[
                { href: '/portal', icon: Home, label: 'Home' },
                { href: '/student', icon: GraduationCap, label: 'Student' },
                { href: '/teacher', icon: Printer, label: 'Teacher' },
                { href: '/prize', icon: Gift, label: 'Prizes' },
                { href: '/admin', icon: UserCog, label: 'Admin' },
                { href: '/halloffame', icon: Trophy, label: 'Fame' },
              ].map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href || (href !== '/portal' && pathname.startsWith(href));
                const activeClass = isActive ? 'text-primary scale-110' : 'text-slate-400 hover:text-primary/70';
                return (
                  <Link key={href} href={href} className={`flex flex-col items-center transition-all px-3 py-1 ${activeClass}`}>
                    <Icon className="w-6 h-6" />
                    <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </>
    );
  }

  // --- WEB MODE HEADER ---
  return (
    <header className={cn(
      "no-print w-full z-50 transition-colors border-b border-primary/10 sticky top-0",
      "bg-background/80 backdrop-blur-xl" 
    )}>
      <div className="max-w-7xl mx-auto px-8 h-20 flex justify-between items-center">
        {/* Left: Branding */}
        <div className="flex items-center gap-4 shrink-0">
            <Link href="/" className="flex items-center gap-4 group" data-home-button="true">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-105">
                    <Zap className="h-6 w-6 fill-current" />
                </div>
                <div className="flex flex-col">
                    <span className="text-lg font-black tracking-widest uppercase text-primary">levelUp EDU</span>
                    <span className="text-sm font-bold uppercase text-muted-foreground tracking-wider">School Reward System</span>
                </div>
            </Link>
        </div>

        {/* Center: School Name */}
        {loginState === 'school' && schoolId && (
            <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
                <span className="text-3xl font-black text-foreground/80 tracking-widest uppercase">{schoolName}</span>
            </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
            {isInitialized && (
                <>
                    {loginState === 'school' && (
                        <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                             <span className="relative flex h-2 w-2">
                                {syncStatus === 'synced' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                                <span className={cn("relative inline-flex h-2 w-2 rounded-full", syncStatus === 'synced' ? "bg-emerald-400" : syncStatus === 'syncing' ? "bg-amber-400 animate-pulse" : "bg-slate-300")} />
                            </span>
                            <span className="text-xs font-black uppercase tracking-widest text-primary/80">{syncStatus === 'synced' ? 'Live Sync' : syncStatus}</span>
                        </div>
                    )}
                    
                    {loginState === 'developer' ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="font-bold gap-2 text-destructive h-12 px-4 rounded-xl">
                                  <User className="w-5 h-5" />
                                  <span className="hidden sm:inline">Dev Mode</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Developer Mode</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={handleLogout} className="text-base py-2 hover:bg-destructive/10 hover:text-destructive"><LogOut className="mr-2 h-5 w-5" /> Log Out</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                      <Link href="/portal" data-home-button="true" className="rounded-xl p-3 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all active:scale-90"><Home className="h-6 w-6" /></Link>
                    )}

                    <div className="h-8 w-px bg-primary/20" />
                    
                    <SettingsModal />
                </>
            )}
        </div>
      </div>
    </header>
  );
}
