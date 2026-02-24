'use client';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import { Home, Gamepad2, Star } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { SettingsModal } from '@/components/ui/SettingsModal';

export default function LoginPage() {
  const [schoolId, setSchoolId] = useState('');
  const [schoolPasscode, setSchoolPasscode] = useState('');
  const [isDeveloper, setIsDeveloper] = useState(false);
  const { login } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const playSound = useArcadeSound();
  const { settings } = useSettings();
  const isClassic = settings.graphicMode === 'classic';

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

  const isGraphic = settings.graphicMode === 'graphics';

  return (
    <div className={`min-h-screen relative overflow-hidden font-sans pb-24 flex flex-col items-center transition-colors duration-500 ${isGraphic ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-orange-600 text-white' : 'bg-slate-50 text-slate-900'}`}>

      {/* Settings - top right */}
      <div className="fixed top-4 right-4 z-[100] no-print">
        <div className={`rounded-xl shadow-lg border p-1 ${isGraphic ? 'bg-white/10 backdrop-blur-md border-white/20' : 'bg-card border-border'}`}>
          <SettingsModal />
        </div>
      </div>

      {/* Background Decor - Only for Graphic Mode */}
      {isGraphic && (
        <div className="absolute inset-0 z-0 opacity-10">
          <Star className="absolute top-10 left-10 w-8 h-8 text-yellow-300" />
          <Gamepad2 className="absolute top-32 left-8 w-12 h-12 text-white/50 -rotate-12" />
          <Star className="absolute top-40 right-16 w-6 h-6 text-yellow-300" />
          <Gamepad2 className="absolute top-20 right-6 w-10 h-10 text-white/50 rotate-12" />
          <Star className="absolute bottom-40 left-12 w-10 h-10 text-yellow-300" />
          <Gamepad2 className="absolute bottom-32 right-12 w-12 h-12 text-white/50 -rotate-12" />
          <Star className="absolute bottom-20 right-24 w-8 h-8 text-yellow-300" />
        </div>
      )}

      <div className="relative z-10 w-full max-w-md px-6 pt-16 sm:pt-20 flex flex-col items-center animate-in fade-in zoom-in duration-500">

        {/* Login Card - Unified DOM */}
        <div className={`w-full rounded-[2.5rem] p-8 relative transition-all border ${isGraphic ? 'bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl' : 'bg-card border-border shadow-lg'}`}>

          <div className="text-center mb-8">
            <h2 className={`text-xl font-black tracking-widest uppercase mb-1 ${isGraphic ? 'drop-shadow-md' : 'text-slate-800'}`}>
              {isDeveloper ? 'Developer Mode' : 'School Login'}
            </h2>
            <p className={`text-xs font-medium ${isGraphic ? 'text-white/80' : 'text-slate-500'}`}>
              {isDeveloper ? 'Enter system dev passcode.' : 'Enter your school ID and passcode to continue.'}
            </p>
          </div>

          {!isDeveloper && (
            <div className="mb-8 p-1.5 bg-slate-100/50 rounded-2xl border border-slate-100 italic">
              <p className={`text-center text-[10px] font-black uppercase tracking-tighter mb-2 ${isGraphic ? 'text-white/60' : 'text-slate-400'}`}>Try a demo school</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSampleLogin('schoolabc')}
                  className={`flex-1 font-black text-[10px] uppercase tracking-wider py-3 rounded-xl transition-all active:scale-95 shadow-sm border ${isGraphic ? 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white' : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50'}`}
                >
                  School ABC
                </button>
                <button
                  onClick={() => handleSampleLogin('yeshiva')}
                  className={`flex-1 font-black text-[10px] uppercase tracking-wider py-3 rounded-xl transition-all active:scale-95 shadow-sm border ${isGraphic ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500 text-white' : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50'}`}
                >
                  Yeshiva
                </button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {!isDeveloper && (
              <div className="space-y-2">
                <Label htmlFor="schoolId" className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isGraphic ? 'text-white/60' : 'text-slate-400'}`}>School ID</Label>
                <input
                  id="schoolId"
                  className={`w-full h-14 rounded-xl px-5 focus:outline-none focus:ring-4 transition-all font-bold ${isGraphic ? 'bg-white/10 border border-white/10 text-white placeholder-white/20 focus:ring-primary/20' : 'bg-slate-50 border-2 border-slate-100 text-slate-800 placeholder-slate-300 focus:ring-indigo-100'}`}
                  placeholder="e.g. schoolabc"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value.trim().toLowerCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSchoolLogin()}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="passcode" className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isGraphic ? 'text-white/60' : 'text-slate-400'}`}>
                {isDeveloper ? 'Developer Passcode' : 'Access Passcode'}
              </Label>
              <input
                id="passcode"
                type="password"
                className={`w-full h-14 rounded-xl px-5 focus:outline-none focus:ring-4 transition-all font-mono tracking-[0.5em] text-center ${isGraphic ? 'bg-white/10 border border-white/10 text-white focus:ring-primary/20' : 'bg-slate-50 border-2 border-slate-100 text-slate-800 focus:ring-indigo-100'}`}
                value={schoolPasscode}
                onChange={(e) => setSchoolPasscode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (isDeveloper ? handleDeveloperLogin() : handleSchoolLogin())}
              />
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={isDeveloper ? handleDeveloperLogin : handleSchoolLogin}
                className={`w-full h-16 font-black text-lg uppercase tracking-widest rounded-2xl transition-all transform active:scale-95 shadow-xl ${isGraphic ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/20' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
              >
                {isDeveloper ? 'Dev Login' : 'Login'}
              </button>
              <button
                type="button"
                onClick={() => setIsDeveloper(!isDeveloper)}
                className={`text-xs font-medium ${isGraphic ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {isDeveloper ? '← Return to School Login' : 'Developer? Click here'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer - developer toggle (repeated for visibility) */}
        <div className="mt-12 flex flex-col gap-6 text-center">
          <div className={`w-full border-t pt-6 ${isGraphic ? 'border-white/10' : 'border-slate-200'}`} />
          <button
            onClick={() => setIsDeveloper(!isDeveloper)}
            className={`text-xs font-bold uppercase tracking-widest transition-colors border-b-2 pb-1 min-h-[44px] flex items-center justify-center ${isGraphic ? 'text-white/40 hover:text-white border-white/10 hover:border-white' : 'text-slate-400 hover:text-slate-800 border-slate-200 hover:border-slate-800'}`}
          >
            {isDeveloper ? 'Return to School Login' : 'Switch to Developer Login'}
          </button>
        </div>
      </div>

      {/* Home link bar */}
      <div className={`fixed bottom-0 left-0 right-0 h-16 flex justify-center items-center px-8 border-t transition-colors ${isGraphic ? 'bg-white border-white/10' : 'bg-card border-border shadow-lg'}`}>
        <Link href="/" className={`flex flex-col items-center gap-0.5 transition-colors min-h-[44px] min-w-[44px] justify-center ${isGraphic ? 'text-indigo-600 hover:text-indigo-500' : 'text-foreground hover:text-foreground/80'}`}>
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
        </Link>
      </div>
    </div>
  );
}
