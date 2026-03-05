
'use client';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import { Home, Gamepad2, Star, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { cn } from '@/lib/utils';
import { Helper } from '@/components/ui/helper';

export default function LoginPage() {
  const [schoolId, setSchoolId] = useState('');
  const [schoolPasscode, setSchoolPasscode] = useState('');
  const [isDeveloper, setIsDeveloper] = useState(false);
  const { login } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const playSound = useArcadeSound();
  const { settings } = useSettings();
  const isGraphic = settings.graphicMode === 'graphics';

  const handleSchoolLogin = async () => {
    if (!schoolId || !schoolPasscode) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Please enter a School ID and passcode.',
      });
      return;
    }
    const success = await login('school', {
      schoolId: schoolId,
      passcode: schoolPasscode,
    });
    if (success) {
      playSound('login');
      router.push('/portal');
    } else {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid School ID or passcode.',
      });
      setSchoolPasscode('');
    }
  };

  const handleDeveloperLogin = async () => {
    const success = await login('developer', { passcode: schoolPasscode });
    if (success) {
      playSound('login');
      router.push('/developer');
    } else {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Incorrect developer passcode.',
      });
      setSchoolPasscode('');
    }
  };

  const handleSampleLogin = async (id: string) => {
    playSound('click');
    const success = await login('school', {
      schoolId: id,
      passcode: '1234', // All sample schools use this passcode
    });
    if (success) {
      playSound('login');
      router.push('/portal');
    } else {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: `Could not log into sample school '${id}'. It may need to be recreated in the developer portal.`,
      });
    }
  };

  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden font-sans flex flex-col items-center transition-colors duration-500",
      settings.displayMode === 'app' ? 'pb-24' : 'pb-8'
    )}>

      {/* Background Decor - Only for Graphic Mode */}
      {isGraphic && (
        <>
          <div className="absolute inset-0 z-0 opacity-20">
            <Sparkles className="absolute top-10 left-10 w-8 h-8 text-chart-1 animate-float" style={{ animationDelay: '0s' }} />
            <Gamepad2 className="absolute top-32 left-8 w-12 h-12 text-foreground/50 -rotate-12 animate-float" style={{ animationDelay: '1s' }}/>
            <Sparkles className="absolute top-40 right-16 w-6 h-6 text-chart-5 animate-float" style={{ animationDelay: '2s' }} />
            <Gamepad2 className="absolute top-20 right-6 w-10 h-10 text-foreground/50 rotate-12 animate-float" style={{ animationDelay: '3s' }}/>
            <Sparkles className="absolute bottom-40 left-12 w-10 h-10 text-chart-2 animate-float" style={{ animationDelay: '4s' }}/>
            <Gamepad2 className="absolute bottom-32 right-12 w-12 h-12 text-foreground/50 -rotate-12 animate-float" style={{ animationDelay: '5s' }}/>
            <Sparkles className="absolute bottom-20 right-24 w-8 h-8 text-chart-3 animate-float" style={{ animationDelay: '6s' }}/>
          </div>
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-chart-1/10 via-chart-5/10 to-chart-3/10" />
        </>
      )}

      <div className="relative z-10 w-full max-w-md px-6 pt-8 sm:pt-12 flex flex-col items-center animate-in fade-in zoom-in duration-500">

        {/* Login Card - Unified DOM */}
        <div className={cn(
          "w-full rounded-[2.5rem] p-8 relative transition-all border",
          isGraphic ? 'bg-card/50 backdrop-blur-xl border-border shadow-2xl animate-pulse-glow' : 'bg-card border-border shadow-lg'
        )}>

          <div className="text-center mb-8">
            <Helper
              content="Log in to your school's reward system here. If you are a system administrator, use the 'Developer' login."
              side="bottom"
              className="justify-center"
            >
               <h1 className="text-3xl font-bold font-headline text-foreground">
                levelUp EDU
              </h1>
              <p className="text-base text-muted-foreground">
                School Reward System
              </p>
            </Helper>
          </div>

          {!isDeveloper && (
            <div className={cn(
              "mb-8 p-1.5 rounded-2xl border italic",
              isGraphic ? 'bg-foreground/10 border-border/50' : 'bg-slate-100/50 border-slate-100'
            )}>
              <Helper
                content="These sample schools let you explore the app's features without needing real credentials. All data is pre-populated."
                side="bottom"
                className="justify-center"
              >
                <p className={cn(
                  "text-center text-[10px] font-black uppercase tracking-tighter mb-2",
                  isGraphic ? 'text-muted-foreground' : 'text-slate-400'
                )}>Try a demo school</p>
              </Helper>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSampleLogin('schoolabc')}
                  className={cn(
                    "flex-1 font-black text-[10px] uppercase tracking-wider py-3 rounded-xl transition-all active:scale-95 shadow-sm border",
                    isGraphic ? 'bg-blue-600 border-blue-500 hover:bg-blue-500 text-primary-foreground' : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50'
                  )}
                >
                  School ABC
                </button>
                <button
                  onClick={() => handleSampleLogin('yeshiva')}
                  className={cn(
                    "flex-1 font-black text-[10px] uppercase tracking-wider py-3 rounded-xl transition-all active:scale-95 shadow-sm border",
                    isGraphic ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500 text-primary-foreground' : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50'
                  )}
                >
                  Yeshiva
                </button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {!isDeveloper && (
              <div className="space-y-2">
                <Label htmlFor="schoolId" className={cn("text-[10px] font-black uppercase tracking-widest ml-1", isGraphic ? 'text-muted-foreground' : 'text-slate-400')}>School ID</Label>
                <input
                  id="schoolId"
                  className={cn("w-full h-14 rounded-xl px-5 focus:outline-none focus:ring-4 transition-all font-bold", isGraphic ? 'bg-transparent border border-border text-foreground placeholder:text-muted-foreground focus:ring-primary/20' : 'bg-slate-50 border-2 border-slate-100 text-slate-800 placeholder-slate-300 focus:ring-indigo-100')}
                  placeholder="e.g. schoolabc"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value.trim().toLowerCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSchoolLogin()}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="passcode" className={cn("text-[10px] font-black uppercase tracking-widest ml-1", isGraphic ? 'text-muted-foreground' : 'text-slate-400')}>
                {isDeveloper ? 'Developer Passcode' : 'Access Passcode'}
              </Label>
              <input
                id="passcode"
                type="password"
                className={cn("w-full h-14 rounded-xl px-5 focus:outline-none focus:ring-4 transition-all font-mono tracking-[0.5em] text-center", isGraphic ? 'bg-transparent border border-border text-foreground focus:ring-primary/20' : 'bg-slate-50 border-2 border-slate-100 text-slate-800 focus:ring-indigo-100')}
                value={schoolPasscode}
                onChange={(e) => setSchoolPasscode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (isDeveloper ? handleDeveloperLogin() : handleSchoolLogin())}
              />
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={isDeveloper ? handleDeveloperLogin : handleSchoolLogin}
                className={cn(
                  "w-full h-16 font-black text-lg uppercase tracking-widest rounded-2xl transition-all transform active:scale-95 shadow-xl",
                  isGraphic ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20' : 'bg-slate-800 hover:bg-slate-700 text-white'
                )}
              >
                {isDeveloper ? 'Dev Login' : 'School Login'}
              </button>
              <button
                type="button"
                onClick={() => setIsDeveloper(!isDeveloper)}
                className={cn("text-xs font-medium", isGraphic ? 'text-muted-foreground hover:text-foreground' : 'text-slate-500 hover:text-slate-700')}
              >
                {isDeveloper ? '← Return to School Login' : 'Developer? Click here'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Home link bar (app mode only) */}
      {settings.displayMode === 'app' && (
      <div className={cn(
        "fixed bottom-0 left-0 right-0 h-16 flex justify-center items-center px-8 border-t transition-colors",
        isGraphic ? 'bg-background/95 backdrop-blur-md border-border' : 'bg-card border-border'
      )}>
        <Link href="/" className={cn(
          "flex flex-col items-center gap-0.5 transition-colors min-h-[44px] min-w-[44px] justify-center",
          isGraphic ? 'text-primary' : 'text-foreground hover:text-foreground/80'
        )}>
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
        </Link>
      </div>
      )}
    </div>
  );
}
