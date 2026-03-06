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
import Logo from './Logo';
import { cn } from '@/lib/utils';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { motion } from "framer-motion";


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
  const schoolName = schoolData?.name || schoolId?.replace(/_/g, ' ');

  const isLoginPage = pathname === '/' || pathname.startsWith('/s/');

  const handleLogout = () => {
    playSound('swoosh');
    logout();
  };

  const getTitle = () => {
    if (loginState === 'developer') return 'Developer Mode';
    return 'levelUp EDU';
  }

  if (isLoginPage) {
    return null;
  }

  // --- APP MODE HEADER ---
  if (settings.displayMode === 'app') {
    return (
      <>
        <header className="no-print w-full flex justify-between items-center relative z-20 px-8 pt-4 pb-0 mb-0">
            <Link href="/" className="flex items-center gap-4 relative z-10 group">
                <div className="overflow-hidden rounded-xl shadow-lg bg-primary h-14 w-14 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Zap className="w-7 h-7 fill-primary-foreground text-primary-foreground" />
                </div>
                <div className="shrink-0">
                  <h1 className="text-lg font-black leading-none uppercase text-primary tracking-wider">
                      {getTitle()}
                  </h1>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">School Reward System</p>
                </div>
            </Link>

            <div className="absolute inset-x-0 text-center pointer-events-none">
                <h2 className="text-6xl font-black text-primary font-headline tracking-tighter px-32 truncate drop-shadow-md">
                    {schoolName}
                </h2>
            </div>

            <div className="z-20 scale-125">
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
      "bg-background/80 backdrop-blur-xl pt-4 pb-2 mb-0" 
    )}>
      <div className="max-w-7xl mx-auto px-8 h-20 flex justify-between items-center relative">
        
        {/* Left: Branding */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-5 shrink-0">
            <Link href="/" className="flex items-center gap-4 group">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-110">
                    <Zap className="h-7 w-7 fill-current" />
                </div>
                <div className="flex flex-col">
                    <span className="text-lg font-black tracking-widest uppercase text-primary">{getTitle()}</span>
                    <span className="text-xs tracking-[0.2em] font-bold uppercase text-muted-foreground mt-0.5">School Reward System</span>
                </div>
            </Link>
        </motion.div>

        {/* Center: School Name (Themed) */}
        {loginState === 'school' && schoolId && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center pointer-events-none hidden lg:flex px-64">
               <h2 className="text-6xl font-black tracking-tighter text-primary font-headline drop-shadow-md truncate">
                  {schoolName}
              </h2>
          </motion.div>
        )}

        {/* Right: Actions */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4 shrink-0">
            {isInitialized && (
                <>
                    {loginState === 'school' && (
                        <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                             <span className="relative flex h-2 w-2">
                                {syncStatus === 'synced' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                                <span className={cn("relative inline-flex h-2 w-2 rounded-full", syncStatus === 'synced' ? "bg-emerald-400" : syncStatus === 'syncing' ? "bg-amber-400 animate-pulse" : "bg-slate-300")} />
                            </span>
                            <span className="text-xs font-black uppercase tracking-widest text-primary/80">{syncStatus}</span>
                        </div>
                    )}
                    <div className="h-8 w-px bg-primary/20" />
                    {loginState === 'developer' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="font-bold gap-2 text-destructive h-12 px-4">
                                  <User className="w-6 h-6" />
                                  <span className="hidden sm:inline">Dev Mode</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Developer Mode</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={handleLogout} className="text-lg py-3 hover:bg-destructive/10 hover:text-destructive"><LogOut className="mr-2 h-6 w-6" /> Log Out</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Link href="/portal" className="rounded-xl p-3 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all active:scale-90"><Home className="h-7 w-7" /></Link>
                    <div className="scale-125">
                        <SettingsModal />
                    </div>
                </>
            )}
        </motion.div>
      </div>
    </header>
  );
}
