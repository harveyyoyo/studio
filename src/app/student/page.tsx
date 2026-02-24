'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, HistoryItem } from '@/lib/types';
import {
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
  onDone: () => void
}) {
  const router = useRouter();
  const { redeemCoupon, schoolId } = useAppContext();
  const firestore = useFirestore();
  const { toast } = useToast();

  const studentDocRef = useMemoFirebase(() => schoolId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null, [firestore, schoolId, studentId]);
  const { data: student, isLoading: studentLoading } = useDoc<Student>(studentDocRef);

  const [couponCode, setCouponCode] = useState('');
  const [logoutTimer, setLogoutTimer] = useState(60);
  const [animatedValue, setAnimatedValue] = useState<number | null>(null);
  const animationKey = useRef(0);
  const playSound = useArcadeSound();

  const { settings } = useSettings();
  const isGraphic = settings.graphicMode === 'graphics';

  const [showRedeem, setShowRedeem] = useState(true);

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [logoutPasscode, setLogoutPasscode] = useState('');

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

  const resetTimer = useCallback(() => setLogoutTimer(60), []);

  useEffect(() => {
    const handleDone = () => onDone();
    if (logoutTimer <= 0) {
      handleDone();
      return;
    }
    const intervalId = setInterval(() => setLogoutTimer((prev) => prev - 1), 1000);
    return () => clearInterval(intervalId);
  }, [logoutTimer, onDone]);

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

  const handleLogoutConfirm = useCallback(async () => {
    if (!schoolId) return;
    try {
      const schoolDocRef = doc(firestore, 'schools', schoolId);
      const schoolSnap = await getDoc(schoolDocRef);
      if (schoolSnap.exists() && schoolSnap.data().passcode === logoutPasscode) {
        onDone();
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
      } else {
        playSound('error');
        toast({ variant: 'destructive', title: 'Incorrect Passcode', description: 'The passcode you entered is incorrect.' });
      }
    } catch {
      playSound('error');
      toast({ variant: 'destructive', title: 'Error', description: 'Could not verify passcode.' });
    }
    setLogoutPasscode('');
    setIsLogoutDialogOpen(false);
  }, [schoolId, firestore, logoutPasscode, onDone, playSound, toast]);

  if (studentLoading || !student || !schoolId) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>
  }

  return (
    <div className={`space-y-8 relative max-w-6xl mx-auto px-4 ${isGraphic ? 'animate-in fade-in duration-500' : ''}`}>
      {/* Graphic Elements */}
      {isGraphic && (
        <div className="absolute -top-12 right-0 w-32 h-32 opacity-20 pointer-events-none z-0">
          <Star className="w-full h-full text-amber-400 fill-amber-400 animate-pulse" />
        </div>
      )}

      {/* Hero Welcome Section */}
      <Card className={`overflow-hidden border-none shadow-xl ${isGraphic ? 'bg-gradient-to-br from-indigo-100/50 to-indigo-50/30 dark:from-indigo-950/40 dark:to-slate-900/40' : 'bg-[#a3a8d4] dark:bg-slate-800'}`}>
        <CardContent className="p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-2 text-center md:text-left">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Welcome back,</p>
            <h2 className="text-4xl md:text-6xl font-black text-slate-800 dark:text-white">{student.firstName} {student.lastName}</h2>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Current Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl md:text-8xl font-black text-slate-800 dark:text-white leading-none">
                {student.points.toLocaleString()}
              </span>
              <span className="text-2xl md:text-3xl font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">pts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Left Section: Redeem Coupon */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-black flex items-center gap-3 text-slate-800 dark:text-white">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  Redeem Coupon Code
                </CardTitle>
                <div className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest border border-amber-100 dark:border-amber-800 animate-pulse">
                  Auto-logout in {logoutTimer}s
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-14">
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
                        placeholder="Scan or type barcode now..."
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
                <div key={animationKey.current} className="mt-8 p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 animate-bounce-short flex items-center justify-center gap-4 shadow-xl shadow-emerald-200/20">
                  <Star className="w-8 h-8 fill-emerald-400 text-emerald-500" />
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">+{animatedValue} PTS</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Eligible Rewards - Bottom Wide Section */}
          <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Award className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-slate-800 dark:text-white">Eligible Rewards</CardTitle>
                  <CardDescription className="text-xs font-medium dark:text-slate-400">You have enough points for these items! Go to the Prize Shop to redeem them.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { name: 'Sticker Pack', cost: 50, icon: '😊', color: 'bg-indigo-50/50 dark:bg-indigo-900/20' },
                  { name: 'Homework Pass', cost: 100, icon: '📝', color: 'bg-indigo-50/50 dark:bg-indigo-900/20' },
                  { name: 'Eraser Collection', cost: 25, icon: '🧹', color: 'bg-indigo-50/50 dark:bg-indigo-900/20' },
                ].map((reward) => (
                  <div key={reward.name} className={`${reward.color} p-6 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all flex flex-col items-center text-center gap-3 bg-white/40 dark:bg-slate-800/40 shadow-sm hover:shadow-md hover:-translate-y-1 transform duration-300`}>
                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-2 shadow-inner">
                      <span className="text-3xl">{reward.icon}</span>
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{reward.name}</p>
                    <Badge variant="secondary" className="font-black text-[10px] tracking-widest rounded-lg px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
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
          <CardHeader className="pb-4 border-b border-slate-50 dark:border-slate-800">
            <CardTitle className="text-lg font-black flex items-center gap-3 text-slate-800 dark:text-white">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <ChevronRight className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pt-6">
            <StudentActivityList schoolId={schoolId} studentId={student.id} />
          </CardContent>
          <div className="p-6 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <Button variant="outline" onClick={() => setIsLogoutDialogOpen(true)} className="w-full h-12 font-black uppercase tracking-widest border-2 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center justify-center gap-2">
              <LogOut className="h-4 w-4" /> Log Out Now
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        {/* ... dialog content ... */}
        <DialogContent className="sm:max-w-md rounded-2xl shadow-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-800">Exit Kiosk?</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              To protect student privacy, a passcode is required to exit the student kiosk.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Label htmlFor="logout-passcode-unified" className="font-black text-slate-700 uppercase tracking-widest text-[10px] ml-1">School Passcode</Label>
            <Input
              id="logout-passcode-unified"
              type="password"
              className="mt-2 text-2xl rounded-2xl h-16 border-2 border-slate-200 bg-slate-50 focus-visible:ring-primary font-mono tracking-widest text-center shadow-inner"
              value={logoutPasscode}
              onChange={(e) => setLogoutPasscode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogoutConfirm()}
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-3 sm:justify-between">
            <Button variant="ghost" className="rounded-xl flex-1 h-12 font-bold text-slate-500" onClick={() => { setIsLogoutDialogOpen(false); setLogoutPasscode(''); }}>Cancel</Button>
            <Button onClick={handleLogoutConfirm} className="rounded-xl flex-1 h-12 bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-200">Confirm Exit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StudentLoginPage() {
  const { loginState, isInitialized, schoolId } = useAppContext();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const { settings } = useSettings();
  const isGraphic = settings.graphicMode === 'graphics';

  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [nfcId, setNfcId] = useState('');
  const nfcInputRef = useRef<HTMLInputElement>(null);
  const [loginTab, setLoginTab] = useState('nfc');
  const [hasCameraPermission, setHasCameraPermission] = useState(true);

  const { videoRef, hasCameraPermission: hookHasPermission } = useBarcodeScanner(
    loginTab === 'camera' && !activeStudentId,
    (code) => handleNfcSubmit(code),
    (err) => {
      setHasCameraPermission(false);
      if (loginTab === 'camera') setLoginTab('nfc');
      toast({ variant: 'destructive', title: 'Camera Error', description: err });
    }
  );

  useEffect(() => { setHasCameraPermission(hookHasPermission); }, [hookHasPermission]);

  useEffect(() => {
    if (isInitialized && loginState !== 'school') {
      router.replace('/');
    }
  }, [isInitialized, loginState, router]);

  useEffect(() => {
    if (!activeStudentId && loginTab === 'nfc') {
      setTimeout(() => nfcInputRef.current?.focus(), 100);
    }
  }, [activeStudentId, loginTab]);

  const handleNfcSubmit = useCallback(async (scannedId?: string) => {
    const rawId = scannedId || nfcId;
    if (!rawId || !schoolId) return;
    const idToSubmit = rawId.trim();

    try {
      let finalStudentId: string | null = null;

      const { getDocs, where, collection, query } = await import('firebase/firestore');
      const studentsRef = collection(firestore, 'schools', schoolId, 'students');

      // 1. Primary lookup: Query by nfcId (string)
      const qStr = query(studentsRef, where('nfcId', '==', idToSubmit));
      const querySnap = await getDocs(qStr);

      if (!querySnap.empty) {
        finalStudentId = querySnap.docs[0].id;
      } else {
        // 2. If input looks like a number, try nfcId stored as number (e.g. 100)
        const asNum = /^\d+$/.test(idToSubmit) ? parseInt(idToSubmit, 10) : NaN;
        if (!Number.isNaN(asNum)) {
          const qNum = query(studentsRef, where('nfcId', '==', asNum));
          const numSnap = await getDocs(qNum);
          if (!numSnap.empty) {
            finalStudentId = numSnap.docs[0].id;
          }
        }
      }

      if (finalStudentId == null) {
        // 3. Fallback: Try direct lookup by document ID
        const studentSnap = await getDoc(doc(firestore, 'schools', schoolId, 'students', idToSubmit));
        if (studentSnap.exists()) {
          finalStudentId = studentSnap.id;
        }
      }

      if (finalStudentId) {
        playSound('login');
        setActiveStudentId(finalStudentId);
      } else {
        playSound('error');
        toast({ variant: 'destructive', title: 'Student Not Found', description: 'The provided ID does not match any student.' });
      }
    } catch (error) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Error', description: 'Could not look up student.' });
    }
    setNfcId('');
  }, [firestore, schoolId, nfcId, playSound, toast]);

  const handleDone = useCallback(() => {
    setActiveStudentId(null);
    setNfcId('');
    setLoginTab('nfc');
  }, []);

  if (!isInitialized || loginState !== 'school') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-slate-200 rounded-2xl animate-pulse mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Initialising Kiosk...</p>
      </div>
    );
  }

  if (activeStudentId) {
    return (
      <ErrorBoundary name="StudentDashboard">
        <StudentDashboardInner studentId={activeStudentId} onDone={handleDone} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary name="StudentLoginPage">
      <TooltipProvider>
        <div className={`flex flex-col items-center justify-center min-h-[80vh] py-10 px-4 font-sans ${isGraphic ? 'animate-in fade-in zoom-in-95 duration-500' : ''}`}>
          <div className={`w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden relative ${isGraphic ? 'ring-8 ring-primary/5' : ''}`}>
            {/* Mascot Decoration for Graphic Mode */}
            {isGraphic && (
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
            )}

            <div className={`p-8 text-center relative z-10 ${isGraphic ? 'bg-primary/5 border-b border-primary/10' : 'bg-slate-50 border-b'}`}>
              <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-lg transform rotate-3 transition-transform hover:rotate-0 ${isGraphic ? 'bg-primary text-white scale-110' : 'bg-slate-800 text-white'}`}>
                <GraduationCap className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Student Kiosk</h1>
              <p className="text-muted-foreground font-bold text-sm mt-2 tracking-wide">TAP CARD OR SCAN TO UNLOCK</p>
            </div>

            <div className="p-8">
              <Tabs defaultValue="nfc" className="w-full" value={loginTab} onValueChange={setLoginTab}>
                <TabsList className="grid w-full grid-cols-3 bg-slate-100/50 p-1.5 rounded-2xl mb-8">
                  <TabsTrigger value="nfc" onClick={() => nfcInputRef.current?.focus()} className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                    <Nfc className="mr-2 h-4 w-4" /> Card
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                    <Type className="mr-2 h-4 w-4" /> Type
                  </TabsTrigger>
                  <TabsTrigger value="camera" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                    <Camera className="mr-2 h-4 w-4" /> Scan
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="nfc" className="text-center">
                  <div className="py-12 space-y-8">
                    <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                      <div className={`absolute inset-0 rounded-full animate-ping opacity-25 ${isGraphic ? 'bg-primary' : 'bg-slate-400'}`}></div>
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 relative z-10 shadow-xl transition-all ${isGraphic ? 'bg-white border-primary text-primary' : 'bg-white border-slate-800 text-slate-800'}`}>
                        <Nfc className="w-12 h-12" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-slate-800 font-black text-lg">System Ready</p>
                      <p className="text-muted-foreground text-sm font-medium">Please place your card on the reader</p>
                    </div>
                    <Input
                      ref={nfcInputRef}
                      type="text"
                      className="absolute -top-[9999px] -left-[9999px]"
                      value={nfcId}
                      onChange={(e) => setNfcId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNfcSubmit()}
                      autoFocus
                    />
                  </div>
                </TabsContent>

                <TabsContent value="manual">
                  <div className="space-y-6 py-4">
                    <div className="space-y-3">
                      <Label htmlFor="manual-nfcId-unified" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Student ID Code</Label>
                      <Input
                        id="manual-nfcId-unified"
                        className="h-16 rounded-2xl text-2xl font-mono text-center border-2 border-slate-200 bg-slate-50 focus-visible:ring-primary shadow-inner"
                        value={nfcId}
                        onChange={(e) => setNfcId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNfcSubmit()}
                        placeholder="e.g. 100"
                        autoFocus
                      />
                    </div>
                    <Button onClick={() => handleNfcSubmit()} className={`w-full h-16 rounded-2xl font-black text-lg uppercase tracking-widest shadow-lg transition-all active:scale-95 ${isGraphic ? 'bg-primary hover:bg-primary/90' : 'bg-slate-800 hover:bg-slate-700'}`}>
                      Login
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="camera">
                  <div className="py-4 space-y-6">
                    <div className="relative border-4 border-slate-100 rounded-[2rem] overflow-hidden shadow-2xl bg-black">
                      <video ref={videoRef} className="w-full aspect-square object-cover" playsInline muted />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-3/4 h-3/4 border-2 border-white/30 rounded-[1.5rem] border-dashed animate-pulse" />
                      </div>
                      {!hasCameraPermission && (
                        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                          <Camera className="w-12 h-12 text-red-400 mb-4" />
                          <p className="text-white font-bold">Camera access required</p>
                          <p className="text-white/60 text-xs mt-2">Please enable camera in settings</p>
                        </div>
                      )}
                    </div>
                    <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">Position barcode within the frame</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="bg-slate-50 p-6 border-t flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <p className="text-muted-foreground">Connected: <span className="text-slate-800">{schoolId}</span></p>
              <Link href="/portal" className="text-primary hover:underline flex items-center gap-1 group">
                Exit Kiosk <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
