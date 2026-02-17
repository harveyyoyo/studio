'use client';
import {
  Trophy,
  Zap,
  CloudOff,
  AlertTriangle,
  LogOut,
  Home,
  User,
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

export default function Header() {
  const { loginState, schoolId, isInitialized, syncStatus, logout } = useAppContext();

  const getTitle = () => {
    if (loginState === 'developer') return 'Developer Mode';
    if (loginState === 'school' && schoolId) return schoolId.replace(/_/g, ' ');
    return 'Reward Arcade';
  }

  const getSubTitle = () => {
    switch(loginState) {
        case 'developer':
            return <span className="font-code text-pink-500">Developer Mode</span>;
        case 'school':
             return <span className="font-code text-primary/80">{schoolId}</span>;
        default:
            return 'School Points System';
    }
  }

  return (
    <header className="no-print w-full max-w-6xl bg-card rounded-2xl p-4 md:p-6 mb-6 flex justify-between items-center border-b-4 border-primary shadow-lg relative overflow-hidden">
      
      <div className="font-headline absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0 whitespace-nowrap text-5xl md:text-8xl font-black text-slate-300/70 dark:text-slate-700/70 uppercase tracking-widest italic select-none">
          {getTitle()}
      </div>

      <Link href="/" className="flex items-center gap-3 relative z-10 group">
        <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-md group-hover:scale-110 transition-transform">
          <Trophy className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground leading-none font-headline">
            Reward Arcade
          </h1>
        </div>
      </Link>

      {isInitialized && (
        <div className="flex gap-2 items-center relative z-20">
          
          {loginState === 'school' && (
             <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1 text-xs font-bold text-muted-foreground bg-background/50">
              {syncStatus === 'synced' && <><Zap className="w-3 h-3 text-green-500" /><span>Live Sync</span></>}
              {syncStatus === 'syncing' && <><Zap className="w-3 h-3 text-yellow-500 animate-pulse" /><span>Syncing...</span></>}
              {syncStatus === 'offline' && <><CloudOff className="w-3 h-3 text-slate-500" /><span>Offline</span></>}
              {syncStatus === 'error' && <><AlertTriangle className="w-3 h-3 text-red-500" /><span>Sync Error</span></>}
            </Button>
          )}

          {loginState !== 'loggedOut' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="font-bold gap-2">
                    <User />
                    {getSubTitle()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                    {loginState === 'school' ? `School: ${schoolId}` : 'Developer Mode'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {loginState === 'school' && (
                  <DropdownMenuItem asChild>
                    <Link href="/portal"><Home className="mr-2" /> Home</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </header>
  );
}
