
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useFunctions, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { SchoolGate } from '@/components/SchoolGate';
import { httpsCallable } from 'firebase/functions';
import { lookupStudentId } from '@/lib/db';
import { StudentScanner } from '@/components/StudentScanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, HistoryItem, Achievement } from '@/lib/types';
import DynamicIcon from '@/components/DynamicIcon';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Nfc,
  Type,
  Camera,
  Star,
  BookOpen,
  Award,
  FlaskConical,
  Home,
  Wallet,
  Trophy,
  User,
  LogOut,
  ChevronRight,
  GraduationCap,
  Settings,
  Lock,
  Unlock,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Helper } from '@/components/ui/helper';

function StudentActivityList({ schoolId, studentId }: { schoolId: string; studentId: string }) {
  const firestore = useFirestore();
  const activitiesQuery = useMemoFirebase(() => (
    query(
      collection(firestore, `schools/${schoolId}/students/${studentId}/activities`),
      orderBy('date', 'desc'),
      limit(20)
    )
  ), [firestore, schoolId, studentId]);
  const { data: history, isLoading } = useCollection<HistoryItem>(activitiesQuery);

  if (isLoading) {
    return <div className="space-y-3 p-4">Loading history...</div>
  }

  return (
    <ScrollArea className="h-48 w-full pr-4">
      <ul className="space-y-3">
        {history && history.length > 0 ? (
          history.map((item, index) => (
            <li
              key={index}
              className="flex justify-between items-center text-sm py-2 border-b border-border last:border-b-0"
            >
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-200">{item.desc}</p>
              </div>
              <div className="flex items-center gap-3 min-h-[44px] min-w-[44px] items-center justify-end">
                <span className="text-xs text-slate-500">{item.amount > 0 ? `+${item.amount}` : item.amount} pts</span>
                <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <ChevronRight size={16} />
                </div>
              </div>
            </li>
          ))
        ) : (
          <p className="text-center text-muted-foreground italic py-4 text-sm">
            No transaction history yet.
          </p>
        )}
      </ul>
    </ScrollArea>
  );
}

function StudentDashboardInner({
  studentId,
  onDone,
}: {
  studentId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const { redeemCoupon, schoolId, isKioskLocked } = useAppContext();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { toast } = useToast();

  const studentDocRef = useMemoFirebase(() => schoolId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null, [firestore, schoolId, studentId]);
  const { data: student, isLoading: studentLoading } = useDoc<Student>(studentDocRef);

  const achievementsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'achievements') : null, [firestore, schoolId]);
  const { data: achievements, isLoading: achievementsLoading } = useCollection<Achievement>(achievementsQuery);

  const [couponCode, setCouponCode] = useState('');
  const [logoutTimer, setLogoutTimer] = useState(10);
  const [animatedValue, setAnimatedValue] = useState<number | null>(null);
  const animationKey = useRef(0);
  const playSound = useArcadeSound();

  const { settings } = useSettings();
  const isGraphic = settings.graphicMode === 'graphics';

  const [showRedeem, setShowRedeem] = useState(true);

  const [activeTab, setActiveTab] = useState('manual');
  const [hasCameraPermission, setHasCameraPermission] = useState(true);

  const { videoRef, hasCameraPermission: hookHasPermission } = useBarcodeScanner(
    activeTab === 'camera' && showRedeem,
    (code) => handleRedeemCoupon(code),
    (err) => {
      setHasCameraPermission(false);
      if (activeTab === 'camera') setActiveTab('manual');
      toast({ variant: 'destructive', title: 'Camera Error', description: err });
    }
  );

  useEffect(() => {
    setHasCameraPermission(hookHasPermission);
  }, [hookHasPermission]);

  const resetTimer = useCallback(() => {
    if (!isKioskLocked) {
        setLogoutTimer(10);
    }
  }, [isKioskLocked]);

  useEffect(() => {
    if (isKioskLocked) return;
    if (logoutTimer <= 0) {
      onDone();
      return;
    }
    const timerId = setTimeout(() => {
      setLogoutTimer(logoutTimer - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [logoutTimer, onDone, isKioskLocked]);

  const handleRedeemCoupon = useCallback(async (codeToRedeem?: string) => {
    if (!student) return;
    const code = (codeToRedeem || couponCode).toUpperCase();
    if (!code) return;
    resetTimer();

    const result = await redeemCoupon(student.id, code);

    if (result.success) {
      playSound('redeem');
      toast({ title: 'Coupon Redeemed!', description: `You gained ${result.value} points.` });
      animationKey.current += 1;
      setAnimatedValue(result.value || null);
      setTimeout(() => { setAnimatedValue(null); setShowRedeem(false); }, 1500);
    } else {
      playSound('error');
      toast({ variant: 'destructive', title: 'Redemption Failed', description: result.message });
    }
    setCouponCode('');
  }, [couponCode, resetTimer, redeemCoupon, student, toast, playSound]);

  if (studentLoading || !student || !schoolId) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>
  }

  return (
    <TooltipProvider>
    <div className={`space-y-6 relative max-w-5xl mx-auto px-4 ${isGraphic ? 'animate-in fade-in duration-500' : ''}`}>
      {/* Graphic Elements */}
      {isGraphic && (
        <div className="absolute -top-12 right-0 w-32 h-32 opacity-20 pointer-events-none z-0">
          <Star className="w-full h-full text-amber-400 fill-amber-400 animate-pulse" />
        </div>
      )}

      {/* Hero Welcome Section */}
      <Card className={`overflow-hidden border-none shadow-xl ${isGraphic ? 'bg-gradient-to-br from-indigo-100/50 to-indigo-50/30 dark:from-indigo-950/40 dark:to-slate-900/40' : 'bg-[#a3a8d4] dark:bg-slate-800'}`}>
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center md:text-left">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Welcome back,</p>
            <h2 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-white">{student.firstName} {student.lastName}</h2>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-0.5">Current Balance</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl md:text-7xl font-black text-slate-800 dark:text-white leading-none">
                {student.points.toLocaleString()}
              </span>
              <span className="text-xl md:text-2xl font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">pts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Left Section: Content */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
              <Helper content="Enter a coupon code to add points to your account. You can type it in manually or use the camera to scan a QR code.">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-black flex items-center gap-2 text-slate-800 dark:text-white">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    Redeem Coupon Code
                  </CardTitle>
                  <div className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors",
                      isKioskLocked
                          ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800"
                          : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800"
                  )}>
                      <span>{isKioskLocked ? 'Kiosk Locked • ' : ''}Auto-logout in {logoutTimer}s</span>
                  </div>
                </div>
              </Helper>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-12">
                  <TabsTrigger value="manual" className="text-xs font-bold rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm flex items-center gap-2">
                    <Type className="w-4 h-4" /> Manual / USB
                  </TabsTrigger>
                  <TabsTrigger value="camera" className="text-xs font-bold rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Webcam Scan
                  </TabsTrigger>
                </TabsList>

                {activeTab === 'manual' ? (
                  <div className="space-y-6">
                    <div className="flex gap-3">
                      <Input
                        placeholder="Enter coupon code..."
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleRedeemCoupon()}
                        className="font-mono text-left tracking-widest h-14 border-2 focus-visible:ring-indigo-500 rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:border-slate-800"
                        autoFocus
                      />
                      <Button onClick={() => handleRedeemCoupon()} className="h-14 px-10 font-black rounded-xl shadow-lg bg-[#8b91c8] hover:bg-[#7a80b7] text-white transition-all active:scale-95 uppercase tracking-widest">
                        Redeem
                      </Button>
                    </div>
                     <p className="text-xs text-center text-muted-foreground pt-2">
                        Hint: Available coupon codes can be viewed in the Admin panel.
                    </p>
                  </div>
                ) : (
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border-4 border-slate-100 dark:border-slate-800 shadow-inner">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-3/4 h-3/2 border-2 border-white/40 rounded-2xl border-dashed animate-pulse" />
                    </div>
                  </div>
                )}
              </Tabs>

              {animatedValue !== null && (
                <div key={animationKey.current} className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 animate-bounce-short flex items-center justify-center gap-3 shadow-lg shadow-emerald-200/20">
                  <Star className="w-6 h-6 fill-emerald-400 text-emerald-500" />
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">+{animatedValue} PTS</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Eligible Rewards - Bottom Wide Section */}
          <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <Helper content="These are prizes you currently have enough points to redeem. Go to the Prize Shop to make a purchase.">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Award className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-slate-800 dark:text-white">Eligible Rewards</CardTitle>
                    <CardDescription className="text-xs font-medium dark:text-slate-400">You have enough points for these items! Go to the Prize Shop to redeem them.</CardDescription>
                  </div>
                </div>
              </Helper>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { name: 'Sticker Pack', cost: 50, icon: '😊', color: 'bg-indigo-50/50 dark:bg-indigo-900/20' },
                  { name: 'Homework Pass', cost: 100, icon: '📝', color: 'bg-indigo-50/50 dark:bg-indigo-900/20' },
                  { name: 'Eraser Collection', cost: 25, icon: '🧹', color: 'bg-indigo-50/50 dark:bg-indigo-900/20' },
                ].map((reward) => (
                  <div key={reward.name} className={`${reward.color} p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-all flex flex-col items-center text-center gap-2 bg-white/40 dark:bg-slate-800/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transform duration-300`}>
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shadow-inner">
                      <span className="text-2xl">{reward.icon}</span>
                    </div>
                    <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">{reward.name}</p>
                    <Badge variant="secondary" className="font-black text-[9px] tracking-widest rounded-md px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {reward.cost} PTS
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Section: Activity */}
        <Card className="lg:col-span-1 border-none shadow-lg bg-white dark:bg-slate-900 flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
            <Helper content="A log of your most recent point transactions, including coupons redeemed and prizes purchased.">
                <CardTitle className="text-base font-black flex items-center gap-2 text-slate-800 dark:text-white">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  Activity
                </CardTitle>
            </Helper>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            <StudentActivityList schoolId={schoolId} studentId={student.id} />
          </CardContent>
          <div className="p-4 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <Button variant="outline" onClick={onDone} className="w-full h-11 font-black uppercase tracking-widest border-2 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
              <LogOut className="h-4 w-4" /> Log Out Now
            </Button>
          </div>
        </Card>
      </div>
    </div>
    </TooltipProvider>
  );
}

export default function StudentLoginPage() {
  const { loginState, isInitialized, schoolId, isKioskLocked, setIsKioskLocked } = useAppContext();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const { settings } = useSettings();
  const isGraphic = settings.graphicMode === 'graphics';
  const functions = useFunctions();

  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [logoutPasscode, setLogoutPasscode] = useState('');
  const [isUnlockDialogOpen, setIsUnlockDialogOpen] = useState(false);
  const [unlockPasscode, setUnlockPasscode] = useState('');

  const handleDone = useCallback(() => {
    setActiveStudentId(null);
  }, []);

  const handleConfirmLogout = useCallback(async () => {
    if (!schoolId) return;
    try {
      const verify = httpsCallable(functions, 'verifySchoolPasscode');
      await verify({ schoolId, passcode: logoutPasscode });
      playSound('swoosh');

      if (activeStudentId) {
        // Logging out from student dashboard, go back to scanner
        setActiveStudentId(null);
        toast({ title: "Logged Out", description: "Returning to kiosk home." });
      } else {
        // Exiting from scanner page, go back to main portal
        router.push('/portal');
      }

    } catch (e) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Incorrect Passcode',
        description: 'The passcode you entered is incorrect.',
      });
    } finally {
      setLogoutPasscode('');
      setIsLogoutDialogOpen(false);
    }
  }, [schoolId, functions, logoutPasscode, activeStudentId, playSound, router, toast]);

  const handleUnlockRequest = () => {
    setIsUnlockDialogOpen(true);
  };

  const handleConfirmUnlock = useCallback(async () => {
    if (!schoolId) return;
    try {
      const verify = httpsCallable(functions, 'verifySchoolPasscode');
      await verify({ schoolId, passcode: unlockPasscode });
      playSound('swoosh');
      setIsKioskLocked(false);
      toast({ title: "Kiosk Unlocked" });
    } catch (e) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Incorrect Passcode',
        description: 'The passcode you entered is incorrect.',
      });
    } finally {
      setUnlockPasscode('');
      setIsUnlockDialogOpen(false);
    }
  }, [schoolId, functions, unlockPasscode, playSound, toast, setIsKioskLocked]);

  useEffect(() => {
    // This effect hijacks the home buttons in the header when the kiosk is locked.
    const homeButtons = document.querySelectorAll('[data-home-button="true"]');
    if (homeButtons.length === 0) return;

    const handleClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      setIsLogoutDialogOpen(true);
    };

    if (isKioskLocked) {
      homeButtons.forEach(button => {
        button.setAttribute('aria-disabled', 'true');
        button.addEventListener('click', handleClick, true); // Use capture phase
      });
    }

    return () => {
      homeButtons.forEach(button => {
        button.removeAttribute('aria-disabled');
        button.removeEventListener('click', handleClick, true);
      });
    };
  }, [isKioskLocked, setIsLogoutDialogOpen]);

  useEffect(() => {
    // This effect traps the browser's back button when the kiosk is locked.
    if (isKioskLocked) {
      window.history.pushState({ locked: true }, '');

      const handlePopState = (event: PopStateEvent) => {
        if (isKioskLocked) {
          window.history.pushState({ locked: true }, '');
          setIsLogoutDialogOpen(true);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
}, [isKioskLocked, setIsLogoutDialogOpen]);

useEffect(() => {
    if (isKioskLocked) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // This is the standard way to trigger the confirmation prompt.
        // Modern browsers will show their own generic message, not this custom one.
        e.preventDefault();
        e.returnValue = 'Are you sure you want to exit? The kiosk is locked.';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isKioskLocked]);


  if (!isInitialized || loginState !== 'school') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-slate-200 rounded-2xl animate-pulse mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Initialising Kiosk...</p>
      </div>
    );
  }

  if (activeStudentId) {
    return (
      <ErrorBoundary name="StudentDashboard">
        <SchoolGate>
          <StudentDashboardInner
            studentId={activeStudentId}
            onDone={handleDone}
          />
        </SchoolGate>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary name="StudentLoginPage">
      <TooltipProvider>
        <div className={`flex flex-col items-center justify-center min-h-[80vh] py-8 px-4 font-sans ${isGraphic ? 'animate-in fade-in zoom-in-95 duration-500' : ''}`}>
          <StudentScanner
            onStudentFound={setActiveStudentId}
            title="Student Kiosk"
            isLocked={isKioskLocked}
            setIsLocked={setIsKioskLocked}
            onUnlockRequest={handleUnlockRequest}
          />
          <div className="w-full max-w-sm mt-4 bg-slate-50 p-4 rounded-2xl border flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <p className="text-muted-foreground">School: <span className="text-slate-800">{schoolId?.replace(/_/g, ' ')}</span></p>
            {isKioskLocked ? (
              <span className="text-red-500 flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>
            ) : (
              <span className="text-green-600 flex items-center gap-1"><Unlock className="w-3 h-3" /> Unlocked</span>
            )}
          </div>
        </div>
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl shadow-2xl border-none">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-800">Exit Kiosk?</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-sm">
                To protect student privacy, a passcode is required to exit the student kiosk.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="logout-passcode-unified" className="font-black text-slate-700 uppercase tracking-widest text-[10px] ml-1">School Passcode</Label>
              <Input
                id="logout-passcode-unified"
                type="password"
                className="mt-2 text-xl rounded-xl h-14 border-2 border-slate-200 bg-slate-50 focus-visible:ring-primary font-mono tracking-widest text-center shadow-inner"
                value={logoutPasscode}
                onChange={(e) => setLogoutPasscode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmLogout()}
                autoFocus
              />
            </div>
            <DialogFooter className="flex gap-2 sm:justify-between">
              <Button variant="ghost" className="rounded-xl flex-1 h-11 font-bold text-slate-500 text-sm" onClick={() => { setIsLogoutDialogOpen(false); setLogoutPasscode(''); }}>Cancel</Button>
              <Button onClick={handleConfirmLogout} className="rounded-xl flex-1 h-11 bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-200">Confirm Exit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isUnlockDialogOpen} onOpenChange={setIsUnlockDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl shadow-2xl border-none">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-800">Unlock Kiosk?</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-sm">
                Enter the school passcode to unlock the kiosk.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="unlock-passcode" className="font-black text-slate-700 uppercase tracking-widest text-[10px] ml-1">School Passcode</Label>
              <Input
                id="unlock-passcode"
                type="password"
                className="mt-2 text-xl rounded-xl h-14 border-2 border-slate-200 bg-slate-50 focus-visible:ring-primary font-mono tracking-widest text-center shadow-inner"
                value={unlockPasscode}
                onChange={(e) => setUnlockPasscode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmUnlock()}
                autoFocus
              />
            </div>
            <DialogFooter className="flex gap-2 sm:justify-between">
              <Button variant="ghost" className="rounded-xl flex-1 h-11 font-bold text-slate-500 text-sm" onClick={() => { setIsUnlockDialogOpen(false); setUnlockPasscode(''); }}>Cancel</Button>
              <Button onClick={handleConfirmUnlock} className="rounded-xl flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-bold text-sm">Confirm Unlock</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
