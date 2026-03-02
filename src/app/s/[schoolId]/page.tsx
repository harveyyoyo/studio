
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, Star, Gamepad2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SchoolLoginPage() {
    const { schoolId } = useParams<{ schoolId: string }>();
    const router = useRouter();
    const { login, loginState, isInitialized } = useAppContext();
    const { firestore } = useFirebase();
    const { settings } = useSettings();
    const playSound = useArcadeSound();
    const { toast } = useToast();
    const isGraphic = settings.graphicMode === 'graphics';

    const [schoolName, setSchoolName] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isInitialized) return;

        if (loginState === 'school') {
            router.replace('/portal');
            return;
        }

        if (!firestore || !schoolId) return;

        let cancelled = false;
        (async () => {
            try {
                const snap = await getDoc(doc(firestore, 'schools', schoolId));
                if (cancelled) return;
                if (snap.exists()) {
                    setSchoolName(snap.data().name || schoolId);
                } else {
                    setNotFound(true);
                }
            } catch {
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isInitialized, firestore, schoolId, loginState, router]);

    const handleLogin = async () => {
        if (!passcode) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Please enter the passcode.' });
            return;
        }
        const success = await login('school', { schoolId, passcode });
        if (success) {
            playSound('login');
            router.push('/portal');
        } else {
            playSound('error');
            toast({ variant: 'destructive', title: 'Invalid passcode.' });
            setPasscode('');
        }
    };

    if (loading || !isInitialized) {
        return (
            <div className={cn(
                "min-h-screen flex flex-col items-center justify-center gap-4 font-sans",
                isGraphic ? 'bg-background text-foreground' : 'bg-background text-muted-foreground'
            )}>
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="font-medium text-sm">Loading&hellip;</p>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className={cn(
                "min-h-screen flex flex-col items-center justify-center gap-6 px-6 font-sans",
                isGraphic ? 'bg-background text-foreground' : 'bg-background text-foreground'
            )}>
                <div className={cn(
                    "w-full max-w-sm rounded-2xl p-8 text-center border",
                    isGraphic ? 'bg-card/10 backdrop-blur-xl border-border' : 'bg-card border-border shadow-lg'
                )}>
                    <AlertCircle className={cn("w-12 h-12 mx-auto mb-4", isGraphic ? 'text-destructive' : 'text-red-500')} />
                    <h2 className="text-lg font-bold mb-2">School Not Found</h2>
                    <p className={cn("text-sm mb-6", isGraphic ? 'text-muted-foreground' : 'text-slate-500')}>
                        There is no school with the ID <span className="font-bold font-code">{schoolId}</span>. Please check the link and try again.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className={cn(
                            "w-full h-12 font-bold rounded-xl transition-all",
                            isGraphic ? 'bg-foreground/10 hover:bg-foreground/20 text-foreground' : 'bg-slate-800 hover:bg-slate-700 text-white'
                        )}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen relative overflow-hidden font-sans pb-8 flex flex-col items-center transition-colors duration-500"
        )}>

            {isGraphic && (
                <>
                  <div className="absolute inset-0 z-0 opacity-20">
                    <Sparkles className="absolute top-10 left-10 w-8 h-8 text-chart-1 animate-float" style={{ animationDelay: '0s' }} />
                    <Gamepad2 className="absolute top-32 left-8 w-12 h-12 text-foreground/50 -rotate-12 animate-float" style={{ animationDelay: '1s' }}/>
                    <Sparkles className="absolute top-40 right-16 w-6 h-6 text-chart-5 animate-float" style={{ animationDelay: '2s' }} />
                  </div>
                  <div className="absolute inset-0 z-0 bg-gradient-to-br from-chart-1/10 via-chart-5/10 to-chart-3/10" />
                </>
            )}

            <div className="relative z-10 w-full max-w-md px-6 pt-8 sm:pt-12 flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className={cn(
                    "w-full rounded-[2.5rem] p-8 relative transition-all border",
                    isGraphic ? 'bg-card/50 backdrop-blur-xl border-border shadow-2xl animate-pulse-glow' : 'bg-card border-border shadow-lg'
                )}>

                    <div className="text-center mb-8">
                        <h2 className={cn("text-2xl font-black tracking-tight mb-1", isGraphic ? 'graphic-text-glow' : 'text-slate-800')}>
                            School Passcode
                        </h2>
                        <p className={cn("text-sm text-muted-foreground", isGraphic ? 'text-muted-foreground' : 'text-slate-500')}>
                            Enter your passcode to continue.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="passcode" className={cn("text-[10px] font-black uppercase tracking-widest ml-1", isGraphic ? 'text-muted-foreground' : 'text-slate-400')}>
                                Passcode
                            </Label>
                            <input
                                id="passcode"
                                type="password"
                                autoFocus
                                className={cn("w-full h-14 rounded-xl px-5 focus:outline-none focus:ring-4 transition-all font-mono tracking-[0.5em] text-center", isGraphic ? 'bg-transparent border border-border text-foreground focus:ring-primary/20' : 'bg-slate-50 border-2 border-slate-100 text-slate-800 focus:ring-indigo-100')}
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleLogin}
                                className={cn("w-full h-16 font-black text-lg uppercase tracking-widest rounded-2xl transition-all transform active:scale-95 shadow-xl", isGraphic ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20' : 'bg-slate-800 hover:bg-slate-700 text-white')}
                            >
                                Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
