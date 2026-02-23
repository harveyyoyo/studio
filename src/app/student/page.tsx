
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useArcadeSound } from '@/hooks/useArcadeSound';

import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, HistoryItem } from '@/lib/types';
import {
  Nfc,
  Type,
  ScanLine,
  History,
  Gift,
  LogOut,
  ShoppingBag,
  ArrowLeft,
  Camera,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import DynamicIcon from '@/components/DynamicIcon';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

function StudentActivityList({ schoolId, studentId }: { schoolId: string; studentId: string }) {
    const firestore = useFirestore();
    const activitiesQuery = useMemoFirebase(() => (
        query(
        collection(firestore, `schools/${schoolId}/students/${studentId}/activities`),
        orderBy('date', 'desc'),
        limit(100)
        )
    ), [firestore, schoolId, studentId]);
    const { data: history, isLoading } = useCollection<HistoryItem>(activitiesQuery);

    if (isLoading) {
        return <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
    }

    return (
        <ScrollArea className="h-[30rem] w-full pr-2">
            <ul className="space-y-3">
            {history && history.length > 0 ? (
                history.map((item, index) => (
                    <li
                    key={index}
                    className="flex justify-between items-center text-sm p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border"
                    >
                    <div>
                        <p className="font-medium">{item.desc}</p>
                        <p className="text-xs text-muted-foreground">
                        {format(new Date(item.date), 'MMM d, yyyy, h:mm a')}
                        </p>
                    </div>
                    <Badge
                        variant={item.amount >= 0 ? 'default' : 'destructive'}
                        className={`font-bold ${item.amount >= 0 ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700' : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700'}`}
                    >
                        {item.amount > 0 ? `+${item.amount}` : item.amount}
                    </Badge>
                    </li>
                ))
            ) : (
                <p className="text-center text-muted-foreground italic py-4">
                No transaction history yet.
                </p>
            )}
            </ul>
        </ScrollArea>
    );
}

// Student Dashboard component
function StudentDashboard({
  studentId,
  onDone,
}: {
  studentId: string;
  onDone: () => void
}) {
  const { redeemCoupon, schoolId } = useAppContext();
  const firestore = useFirestore();
  const { toast } = useToast();

  const studentDocRef = useMemoFirebase(() => schoolId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null, [firestore, schoolId, studentId]);
  const { data: student, isLoading: studentLoading } = useDoc<Student>(studentDocRef);
  
  const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
  const { data: prizes, isLoading: prizesLoading } = useCollection<Prize>(prizesQuery);

  const [couponCode, setCouponCode] = useState('');
  const [logoutTimer, setLogoutTimer] = useState(10);
  const [animatedValue, setAnimatedValue] = useState<number | null>(null);
  const animationKey = useRef(0);
  const playSound = useArcadeSound();

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [logoutPasscode, setLogoutPasscode] = useState('');
  
  const [activeTab, setActiveTab] = useState('manual');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);

  const resetTimer = useCallback(() => setLogoutTimer(10), []);

  useEffect(() => {
    const handleDone = () => onDone();
    if (logoutTimer <= 0) {
      handleDone();
      return;
    }

    const intervalId = setInterval(() => {
      setLogoutTimer((prev) => prev - 1);
    }, 1000);

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
        toast({
            title: 'Coupon Redeemed!',
            description: `You gained ${result.value} points.`,
        });
        animationKey.current += 1;
        setAnimatedValue(result.value || null);
        setTimeout(() => setAnimatedValue(null), 1500);
    } else {
        playSound('error');
        toast({
            variant: 'destructive',
            title: 'Redemption Failed',
            description: result.message,
        });
    }

    setCouponCode('');
  }, [couponCode, resetTimer, redeemCoupon, student, toast, playSound]);
  
  useEffect(() => {
    if (activeTab !== 'camera') {
      return;
    }

    let stream: MediaStream;
    const codeReader = new BrowserMultiFormatReader();

    const startCameraAndScan = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setHasCameraPermission(true);
          
          codeReader.decodeFromVideoElement(videoRef.current, (result, error) => {
            if (result) {
              handleRedeemCoupon(result.getText());
            }
            if (error && error.name !== 'NotFoundException') {
              console.error('Coupon scan error:', error);
            }
          }).catch(err => console.error("Decode error", err));
        }
      } catch (error) {
        console.error('Camera setup failed:', error);
        setHasCameraPermission(false);
        if (activeTab === 'camera') setActiveTab('manual');
        toast({
          variant: 'destructive',
          title: 'Camera Error',
          description: 'Could not access the camera. Please check permissions.',
        });
      }
    };

    startCameraAndScan();

    return () => {
      codeReader.reset();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeTab, handleRedeemCoupon, toast, setActiveTab]);
  
  const handleLogoutConfirm = () => {
    if (logoutPasscode === '1234') {
        onDone();
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } else {
        playSound('error');
        toast({
            variant: 'destructive',
            title: 'Incorrect Passcode',
            description: 'The passcode you entered is incorrect.',
        });
    }
    setLogoutPasscode('');
    setIsLogoutDialogOpen(false);
  };
  
  if (studentLoading || prizesLoading || !student || !schoolId) {
      return <p>Loading...</p> // Add a proper skeleton later
  }

  const eligibleRewards = prizes?.filter(r => r.inStock && student.points >= r.points) || [];

  return (
    <TooltipProvider>
      <div className="relative animate-in fade-in-50 bg-gradient-to-br from-primary/10 via-background to-accent/20 dark:from-primary/20 dark:via-background dark:to-accent/30 p-2 md:p-4 rounded-xl overflow-hidden">
        
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-none shadow-lg overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-32 h-32 text-primary-foreground/20">
                <Gift size={128} strokeWidth={1} />
            </div>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <CardDescription className="text-primary-foreground/80">Welcome back,</CardDescription>
                <CardTitle className="font-headline text-3xl sm:text-4xl">
                  {student.firstName} {student.lastName}
                </CardTitle>
              </div>
              <div className="text-left sm:text-right">
                 <CardDescription className="text-primary-foreground/80">Current Balance</CardDescription>
                 <p className="text-4xl sm:text-5xl font-bold">
                  {student.points.toLocaleString()}{' '}
                  <span className="text-2xl sm:text-3xl font-normal">pts</span>
                </p>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ScanLine /> Redeem Coupon Code
                  </CardTitle>
                   <div className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">
                    Auto-logout in {logoutTimer}s
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">
                            <Type className="mr-2 h-4 w-4" /> Manual / USB
                        </TabsTrigger>
                        <TabsTrigger value="camera">
                            <Camera className="mr-2 h-4 w-4" /> Webcam Scan
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="manual" className="pt-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Scan or type barcode now..."
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          onKeyPress={(e) => e.key === 'Enter' && handleRedeemCoupon()}
                          autoFocus
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button onClick={() => handleRedeemCoupon()}>Redeem</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Submit a coupon code to add points to your account.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TabsContent>
                    <TabsContent value="camera" className="pt-4 space-y-4">
                        <div className="relative">
                            <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" playsInline autoPlay muted />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-2/3 h-1/3 border-4 border-red-500/50 rounded-lg" />
                            </div>
                        </div>
                        {!hasCameraPermission && (
                            <Alert variant="destructive">
                                <Camera className="h-4 w-4" />
                                <AlertTitle>Camera Access Denied</AlertTitle>
                                <AlertDescription>
                                    Please allow camera access to use this feature.
                                </AlertDescription>
                            </Alert>
                        )}
                        <p className="text-sm text-muted-foreground text-center">Position the coupon's barcode inside the red box.</p>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <ShoppingBag /> Eligible Rewards
                  </CardTitle>
                  <CardDescription>You have enough points for these items! Go to the Prize Shop to redeem them.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {eligibleRewards.length > 0 ? eligibleRewards.map((reward) => (
                    <Card key={reward.id} className="p-4 flex flex-col items-center justify-between text-center bg-background/50 dark:bg-card/50">
                        <div className="p-4 bg-accent rounded-full mb-3 text-primary">
                          <DynamicIcon name={reward.icon} className="w-8 h-8" />
                        </div>
                        <p className="font-bold text-lg">{reward.name}</p>
                        <Badge variant="secondary" className="mt-3 text-base font-bold">{reward.points.toLocaleString()} pts</Badge>
                    </Card>
                  )) : (
                    <p className="text-center text-muted-foreground italic md:col-span-3 py-4">Keep earning points to unlock rewards!</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History /> Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <StudentActivityList schoolId={schoolId} studentId={student.id} />
                  <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <DialogTrigger asChild>
                              <Button variant="ghost" className="w-full mt-4 text-red-500 hover:bg-red-50 hover:text-red-600">
                                <LogOut className="mr-2"/> Log Out Now
                              </Button>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Exit the student kiosk. A passcode is required.</p>
                        </TooltipContent>
                      </Tooltip>
                      <DialogContent>
                          <DialogHeader>
                              <DialogTitle>Enter Passcode to Exit</DialogTitle>
                              <DialogDescription>
                                  To protect student privacy, a passcode is required to exit the student kiosk.
                              </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                              <Label htmlFor="logout-passcode">Passcode</Label>
                              <Input
                                  id="logout-passcode"
                                  type="password"
                                  value={logoutPasscode}
                                  onChange={(e) => setLogoutPasscode(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && handleLogoutConfirm()}
                                  autoFocus
                              />
                          </div>
                          <DialogFooter>
                              <Button variant="secondary" onClick={() => {
                                  setIsLogoutDialogOpen(false);
                                  setLogoutPasscode('');
                              }}>Cancel</Button>
                              <Button onClick={handleLogoutConfirm}>Confirm & Log Out</Button>
                          </DialogFooter>
                      </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {animatedValue !== null && (
          <div key={animationKey.current} className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <div className="text-8xl font-bold text-green-500 animate-fly-up">
                  +{animatedValue}
              </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Main Student Login component
export default function StudentLoginPage() {
  const { loginState, isInitialized, schoolId } = useAppContext();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const playSound = useArcadeSound();

  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [nfcId, setNfcId] = useState('');
  const nfcInputRef = useRef<HTMLInputElement>(null);

  const [loginTab, setLoginTab] = useState('nfc');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);

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
    const idToSubmit = scannedId || nfcId;
    if(!idToSubmit || !schoolId) return;

    const studentRef = doc(firestore, 'schools', schoolId, 'students', idToSubmit);
    try {
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        playSound('login');
        setActiveStudentId(studentSnap.id);
      } else {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Student Not Found',
          description: 'The provided ID does not match any student.',
        });
      }
    } catch (error) {
       playSound('error');
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not look up student.',
      });
    }

    setNfcId('');
  }, [firestore, schoolId, nfcId, playSound, toast]);


  useEffect(() => {
    if (loginTab !== 'camera' || activeStudentId) {
      return;
    }
    
    let stream: MediaStream;
    const codeReader = new BrowserMultiFormatReader();

    const startCameraAndScan = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setHasCameraPermission(true);

          codeReader.decodeFromVideoElement(videoRef.current, (result, error) => {
            if (result) {
              handleNfcSubmit(result.getText());
            }
            if (error && error.name !== 'NotFoundException') {
              console.error('Login scan error:', error);
            }
          }).catch(err => console.error("Decode error", err));
        }
      } catch (err: any) {
        console.error("Login camera initialization error:", err);
        setHasCameraPermission(false);
        if(loginTab === 'camera') setLoginTab('nfc');
        toast({
            variant: 'destructive',
            title: 'Camera Error',
            description: 'Could not access the camera. Please check permissions.',
        });
      }
    };
    
    startCameraAndScan();

    return () => {
      codeReader.reset();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [loginTab, activeStudentId, handleNfcSubmit, toast, setLoginTab]);


  const handleDone = useCallback(() => {
    setActiveStudentId(null);
    setNfcId('');
    setLoginTab('nfc');
  }, []);

  if (!isInitialized || loginState !== 'school') {
    return <p>Loading...</p>;
  }

  if (activeStudentId) {
    return <StudentDashboard studentId={activeStudentId} onDone={handleDone} />;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center justify-center py-10">
        <Card className="w-full max-w-md border-t-4 border-primary">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold font-headline">
              Student Kiosk
            </CardTitle>
            <CardDescription>Check your points and redeem coupons.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="nfc" className="w-full" value={loginTab} onValueChange={setLoginTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="nfc" onClick={() => nfcInputRef.current?.focus()}>
                  <Nfc className="mr-2 h-4 w-4" /> Card
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Type className="mr-2 h-4 w-4" /> Manual
                </TabsTrigger>
                 <TabsTrigger value="camera">
                  <Camera className="mr-2 h-4 w-4" /> Scan ID
                </TabsTrigger>
              </TabsList>
              <TabsContent value="nfc" className="text-center">
                <div className="py-8 space-y-4">
                  <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/50 dark:border-primary/40 animate-pulse"></div>
                    <Nfc className="w-16 h-16 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    Tap card or scan barcode...
                  </p>
                  <Input
                    ref={nfcInputRef}
                    type="text"
                    className="absolute -top-[9999px] -left-[9999px]"
                    value={nfcId}
                    onChange={(e) => setNfcId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleNfcSubmit()}
                    autoFocus
                  />
                </div>
              </TabsContent>
              <TabsContent value="manual">
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="manual-nfcId">Student ID</Label>
                    <Input
                      id="manual-nfcId"
                      value={nfcId}
                      onChange={(e) => setNfcId(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleNfcSubmit()}
                      placeholder="Enter student ID"
                    />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => handleNfcSubmit()} className="w-full">
                        Login
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Log in with the student ID to view your dashboard.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TabsContent>
               <TabsContent value="camera">
                <div className="py-8 space-y-4">
                    <div className="relative">
                        <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" playsInline autoPlay muted />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-2/3 h-1/3 border-4 border-primary/50 rounded-lg" />
                        </div>
                    </div>
                     {!hasCameraPermission && (
                        <Alert variant="destructive">
                            <Camera className="h-4 w-4" />
                            <AlertTitle>Camera Access Required</AlertTitle>
                            <AlertDescription>
                            Please allow camera access to use this feature.
                            </AlertDescription>
                        </Alert>
                    )}
                    <p className="text-muted-foreground">
                      Position your ID card's barcode inside the box.
                    </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="text-center mt-6">
              <p className="text-xs text-muted-foreground">
                Connected to <span className="font-bold">{schoolId}</span>
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="link" className="text-xs h-auto p-0">
                    <Link href="/portal"><ArrowLeft className="mr-2 h-4"/> Back to Portal Selection</Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Return to the main portal selection screen.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
