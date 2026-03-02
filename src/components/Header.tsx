'use client';
// Force rebuild for hydration sync
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Trophy,
  Zap,
  CloudOff,
  AlertTriangle,
  LogOut,
  Home,
  User,
  GraduationCap,
  Printer,
  ShoppingBag,
  UserCog,
  Settings as SettingsIcon,
  Star,
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
import { Logo } from './Logo';
import { cn } from '@/lib/utils';

export default function Header() {
  const pathname = usePathname();
  const { loginState, schoolId, isInitialized, syncStatus, logout } = useAppContext();
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSchoolLoginPage = pathname.startsWith('/s/');
  const isGraphic = settings.graphicMode === 'graphics';

  if (isSchoolLoginPage) {
    return (
      <header className={cn(
        "no-print w-full max-w-6xl p-4 md:p-6 mb-6 flex justify-center items-center relative"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "overflow-hidden rounded-lg shadow-md",
            isGraphic && 'animate-pulse-glow'
          )}>
            <Logo className="w-10 h-10" />
          </div>
          <h1 className={cn(
            "text-2xl md:text-3xl font-bold leading-none font-headline",
            isGraphic ? 'text-white' : 'text-foreground'
          )}>
            levelUp EDU
          </h1>
        </div>
      </header>
    );
  }

  const getTitle = () => {
    if (loginState === 'developer') return 'Developer Mode';
    return 'levelUp EDU';
  }

  const getSubTitle = () => {
    switch (loginState) {
      case 'developer':
        return <span className="font-code text-destructive">Developer Mode</span>;
      case 'school':
        return <span className="font-code text-primary/80">{schoolId}</span>;
      default:
        return 'LevelUp rewards hub';
    }
  }

  if (settings.displayMode === 'app') {
    const isGraphicApp = settings.graphicMode === 'graphics';
    const navItems = [
      { href: '/portal', icon: Home, label: 'Home' },
      { href: '/student', icon: GraduationCap, label: 'Student' },
      { href: '/teacher', icon: Printer, label: 'Teacher' },
      { href: '/prize', icon: Gift, label: 'Prizes' },
      { href: '/admin', icon: UserCog, label: 'Admin' },
      { href: '/halloffame', icon: Trophy, label: 'Fame' },
    ];
    
    const appTitle = getTitle();

    return (
      <>
        <header className={cn(
          "no-print w-full flex justify-between items-center relative z-20 mb-4",
          isGraphicApp ? 'text-white' : 'text-foreground'
        )}>
            <Link href="/" data-home-button="true" className="flex items-center gap-3 relative z-10 group">
                <div className={cn(
                  "overflow-hidden rounded-lg shadow-md",
                  isGraphicApp && 'animate-pulse-glow'
                )}>
                    <Logo className="w-8 h-8" />
                </div>
                <div>
                  {loginState === 'school' && schoolId ? (
                    <>
                      <h1 className="text-lg font-bold leading-none font-headline">
                        {schoolId.replace(/_/g, ' ')}
                      </h1>
                      <p className={cn(
                        "text-xs font-bold leading-tight",
                        isGraphicApp ? 'text-white/60' : 'text-muted-foreground'
                      )}>{appTitle}</p>
                    </>
                  ) : (
                    <h1 className="text-lg font-bold leading-none font-headline">
                        {appTitle}
                    </h1>
                  )}
                </div>
            </Link>
            <div className="z-[101]">
                <div className={cn(
                  "backdrop-blur-md rounded-xl shadow-lg border p-1",
                  isGraphicApp ? 'bg-white/10 border-white/20' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                )}>
                    <SettingsModal />
                </div>
            </div>
        </header>

        {loginState === 'school' && (
          <nav className={cn(
            "fixed bottom-0 left-0 right-0 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-[100] no-print border-t transition-colors",
            isGraphicApp ? 'bg-[#070b1f]/95 backdrop-blur-md border-white/5' : 'bg-white border-slate-200 shadow-lg'
          )}>
            <div className="max-w-lg mx-auto flex justify-around items-center">
              {navItems.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href || (href !== '/portal' && pathname.startsWith(href));
                const activeClass = isActive
                  ? (isGraphicApp ? 'text-primary graphic-text-glow' : 'text-indigo-600')
                  : (isGraphicApp ? 'text-white/30 hover:text-white' : 'text-slate-400 hover:text-slate-800');
                return (
                  <Link key={href} href={href} className={`flex flex-col items-center transition-colors px-2 py-1 ${activeClass}`} {...(href === '/portal' && { 'data-home-button': 'true' })}>
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold mt-0.5">{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </>
    );
  }

  return (
    <header className={cn(
      "no-print w-full max-w-6xl rounded-2xl p-4 md:p-6 mb-6 flex justify-between items-center relative overflow-hidden",
      isGraphic ? 'bg-slate-900/70 backdrop-blur-lg border border-white/10 shadow-2xl shadow-primary/10' : 'bg-card border-b-4 border-primary shadow-lg'
    )}>

      <div className="font-headline absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0 whitespace-nowrap text-3xl sm:text-5xl md:text-8xl font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest italic select-none hidden sm:block opacity-40">
        {schoolId?.replace(/_/g, '') || 'SCHOOLABC'}
      </div>

      <Link href="/" data-home-button="true" className="flex items-center gap-3 relative z-10 group">
        <div className={cn(
          "overflow-hidden rounded-lg shadow-md group-hover:scale-110 transition-transform",
          isGraphic && 'animate-pulse-glow'
        )}>
          <Logo className="w-10 h-10" />
        </div>
        <div>
            {loginState === 'school' && schoolId ? (
                <>
                    <h1 className={cn(
                        "text-xl md:text-2xl font-bold leading-none font-headline",
                        isGraphic ? 'text-white' : 'text-foreground'
                    )}>
                        {schoolId.replace(/_/g, ' ')}
                    </h1>
                    <p className={cn("text-sm font-bold", isGraphic ? 'text-primary/80' : 'text-muted-foreground')}>
                        {getTitle()}
                    </p>
                </>
            ) : (
                <h1 className={cn(
                    "text-xl md:text-2xl font-bold leading-none font-headline",
                    isGraphic ? 'text-white' : 'text-foreground'
                )}>
                    {getTitle()}
                </h1>
            )}
        </div>
      </Link>

      {isInitialized && (
        <div className="flex gap-2 items-center relative z-20">
          {loginState === 'school' && (
            <>
              <Button variant="outline" size="sm" className={cn(
                "hidden sm:flex items-center gap-1 text-xs font-bold",
                isGraphic ? 'bg-white/5 border-white/10 text-white/60' : 'text-muted-foreground bg-background/50'
              )}>
                {syncStatus === 'synced' && <><Zap className="w-3 h-3 text-green-500" /><span>Live Sync</span></>}
                {syncStatus === 'syncing' && <><Zap className="w-3 h-3 text-yellow-500 animate-pulse" /><span>Syncing...</span></>}
                {syncStatus === 'offline' && <><CloudOff className="w-3 h-3 text-slate-500" /><span>Offline</span></>}
                {syncStatus === 'error' && <><AlertTriangle className="w-3 h-3 text-red-500" /><span>Sync Error</span></>}
              </Button>
              <Button asChild className={isGraphic ? 'bg-white/10 text-white hover:bg-white/20' : ''}>
                <Link href="/portal" data-home-button="true"><Home className="mr-2" /> Home</Link>
              </Button>
            </>
          )}

          {loginState === 'developer' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="font-bold gap-2">
                  <User />
                  {getSubTitle()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Developer Mode</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <SettingsModal />
        </div>
      )}
      <div
        className="absolute bottom-1 right-2 text-[10px] text-muted-foreground/30 font-mono select-none pointer-events-none"
      >
        {mounted ? (process.env.NEXT_PUBLIC_VERSION || 'v1.0.6') : null}
      </div>
    </header>
  );
}
