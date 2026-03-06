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
import Logo from './Logo';


export default function Header() {
  const pathname = usePathname();
  const { loginState, schoolId, isInitialized, syncStatus, logout, isAdmin } = useAppContext();
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

  if (isLoginPage || !isInitialized) {
    return null;
  }

  const logoLink = loginState === 'developer' ? '/developer' : '/';


  // --- APP MODE HEADER ---
  if (settings.displayMode === 'app') {
    const navItems = [
      ...(isAdmin ? [{ id: 'admin', href: '/admin', icon: UserCog, label: 'Admin', color: 'destructive' }] : []),
      { id: 'print', href: '/teacher', icon: Printer, label: 'Print', color: 'chart-2' },
      { id: 'redeem', href: '/student', icon: GraduationCap, label: 'Redeem', color: 'chart-1' },
      { id: 'prize', href: '/prize', icon: ShoppingBag, label: 'Shop', color: 'chart-3' },
      { id: 'fame', href: '/halloffame', icon: Trophy, label: 'Fame', color: 'chart-5' },
    ].sort((a, b) => {
        const order = ['admin', 'print', 'redeem', 'prize', 'fame'];
        return order.indexOf(a.id) - order.indexOf(b.id);
    });

    const colorClasses: Record<string, string> = {
        destructive: 'text-destructive',
        'chart-1': 'text-chart-1',
        'chart-2': 'text-chart-2',
        'chart-3': 'text-chart-3',
        'chart-5': 'text-chart-5',
    };

    const hoverColorClasses: Record<string, string> = {
      destructive: 'hover:text-destructive',
      'chart-1': 'hover:text-chart-1',
      'chart-2': 'hover:text-chart-2',
      'chart-3': 'hover:text-chart-3',
      'chart-5': 'hover:text-chart-5',
    };

    return (
      <>
        <header className="no-print w-full flex justify-between items-center relative z-20 px-4 pt-4 pb-4 border-b border-border/10">
            <div className="w-10">
                <Link href={logoLink} data-home-button="true" className="rounded-xl p-2 -m-2 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all active:scale-90 flex items-center justify-center">
                    <Home className="h-5 w-5" />
                </Link>
            </div>
            <div className="flex-1">
                <h1 className="text-3xl font-black uppercase tracking-wider text-primary text-center drop-shadow-md">
                    {schoolName || 'levelUp EDU'}
                </h1>
            </div>

            <div className="w-10 flex justify-end">
                <SettingsModal />
            </div>
        </header>
        
        {loginState === 'school' && (
          <nav className={cn("fixed bottom-0 left-0 right-0 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] z-[100] no-print border-t",
            "bg-background/90 backdrop-blur-md"
          )}>
            <div className="max-w-lg mx-auto flex justify-around items-center">
              {navItems.map(({ href, icon: Icon, label, color }) => {
                const isActive = pathname === href || (href !== '/portal' && pathname.startsWith(href));
                const activeClass = isActive 
                    ? `scale-110 ${colorClasses[color] || 'text-primary'}` 
                    : `text-slate-400 ${hoverColorClasses[color] || 'hover:text-primary'}`;
                return (
                  <Link key={href} href={href} className={cn('flex flex-col items-center transition-all px-3 py-1', activeClass)}>
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
            <Link href={logoLink} className="flex items-center gap-4 group" data-home-button="true">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl text-primary transition-transform group-hover:scale-105">
                    <Logo className="h-8 w-auto" />
                </div>
                <div className="flex flex-col">
                    <span className="text-lg font-black tracking-widest uppercase text-primary">levelUp EDU</span>
                     <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">School Rewards System</span>
                </div>
            </Link>
        </div>

        {/* Center: School Name */}
        {loginState === 'school' && schoolId && (
            <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
                <span className="text-4xl font-black uppercase tracking-wider text-primary drop-shadow-md">{schoolName}</span>
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
                      <Link href={logoLink} data-home-button="true" className="rounded-xl p-3 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all active:scale-90"><Home className="h-6 w-6" /></Link>
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
