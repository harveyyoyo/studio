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

export default function Header() {
  const pathname = usePathname();
  const { loginState, schoolId, isInitialized, syncStatus, logout } = useAppContext();
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname === '/') {
    return null;
  }

  const getTitle = () => {
    if (loginState === 'developer') return 'Developer Mode';
    if (loginState === 'school') return 'School Reward System';
    return 'School Reward System';
  }

  const getSubTitle = () => {
    switch (loginState) {
      case 'developer':
        return <span className="font-code text-destructive">Developer Mode</span>;
      case 'school':
        return <span className="font-code text-primary/80">{schoolId}</span>;
      default:
        return 'School Points System';
    }
  }

  if (settings.displayMode === 'app') {
    return (
      <>
        {/* Floating settings button */}
        <div className="fixed top-4 right-4 z-[100] no-print">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-1">
            <SettingsModal />
          </div>
        </div>
        {/* Bottom nav bar for app mode */}
        {loginState === 'school' && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-[100] no-print">
            <div className="max-w-lg mx-auto flex justify-around items-center">
              <Link href="/portal" className="flex flex-col items-center text-slate-500 hover:text-slate-800 transition-colors px-2 py-1">
                <Home className="w-5 h-5" />
                <span className="text-[10px] font-bold mt-0.5">Home</span>
              </Link>
              <Link href="/student" className="flex flex-col items-center text-slate-500 hover:text-slate-800 transition-colors px-2 py-1">
                <GraduationCap className="w-5 h-5" />
                <span className="text-[10px] font-bold mt-0.5">Student</span>
              </Link>
              <Link href="/teacher" className="flex flex-col items-center text-slate-500 hover:text-slate-800 transition-colors px-2 py-1">
                <Printer className="w-5 h-5" />
                <span className="text-[10px] font-bold mt-0.5">Teacher</span>
              </Link>
              <Link href="/prize" className="flex flex-col items-center text-slate-500 hover:text-slate-800 transition-colors px-2 py-1">
                <Gift className="w-5 h-5" />
                <span className="text-[10px] font-bold mt-0.5">Prizes</span>
              </Link>
              <Link href="/admin" className="flex flex-col items-center text-slate-500 hover:text-slate-800 transition-colors px-2 py-1">
                <UserCog className="w-5 h-5" />
                <span className="text-[10px] font-bold mt-0.5">Admin</span>
              </Link>
              <Link href="/halloffame" className="flex flex-col items-center text-slate-500 hover:text-slate-800 transition-colors px-2 py-1">
                <Trophy className="w-5 h-5" />
                <span className="text-[10px] font-bold mt-0.5">Hall of Fame</span>
              </Link>
            </div>
          </nav>
        )}
      </>
    );
  }

  const isGraphic = settings.graphicMode === 'graphics';

  return (
    <header className={`no-print w-full max-w-6xl bg-card rounded-2xl p-4 md:p-6 mb-6 flex justify-between items-center border-b-4 border-primary shadow-lg relative overflow-hidden ${isGraphic ? 'animate-in fade-in duration-500 shadow-primary/20' : ''}`}>

      <div className="font-headline absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0 whitespace-nowrap text-3xl sm:text-5xl md:text-8xl font-black text-slate-200 dark:text-slate-800 uppercase tracking-widest italic select-none hidden sm:block opacity-20">
        {schoolId?.replace(/_/g, '') || 'SCHOOLABC'}
      </div>

      <Link href="/" className="flex items-center gap-3 relative z-10 group">
        <div className={`bg-primary text-primary-foreground p-2 rounded-lg shadow-md group-hover:scale-110 transition-transform ${isGraphic ? 'ring-4 ring-primary/20' : ''}`}>
          <Trophy className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground leading-none font-headline">
            {getTitle()}
          </h1>
        </div>
      </Link>

      {isInitialized && (
        <div className="flex gap-2 items-center relative z-20">
          <SettingsModal />
          {loginState === 'school' && (
            <>
              <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1 text-xs font-bold text-muted-foreground bg-background/50">
                {syncStatus === 'synced' && <><Zap className="w-3 h-3 text-green-500" /><span>Live Sync</span></>}
                {syncStatus === 'syncing' && <><Zap className="w-3 h-3 text-yellow-500 animate-pulse" /><span>Syncing...</span></>}
                {syncStatus === 'offline' && <><CloudOff className="w-3 h-3 text-slate-500" /><span>Offline</span></>}
                {syncStatus === 'error' && <><AlertTriangle className="w-3 h-3 text-red-500" /><span>Sync Error</span></>}
              </Button>
              <Button asChild>
                <Link href="/portal"><Home className="mr-2" /> Home</Link>
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
