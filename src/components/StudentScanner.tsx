
'use client';

import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { Nfc, Type, Camera, GraduationCap, Lock, Unlock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import { lookupStudentId } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StudentScannerProps {
    onStudentFound: (studentId: string) => void;
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    isActive?: boolean;
    isLocked: boolean;
    setIsLocked: (locked: boolean) => void;
    onUnlockRequest: () => void;
}

export function StudentScanner({
    onStudentFound,
    title = "Student Identification",
    description = "TAP CARD OR SCAN TO UNLOCK",
    icon = <GraduationCap className="w-8 h-8" />,
    isActive = true,
    isLocked,
    setIsLocked,
    onUnlockRequest,
}: StudentScannerProps) {
    const { schoolId } = useAppContext();
    const firestore = useFirestore();
    const { toast } = useToast();
    const playSound = useArcadeSound();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';

    const [nfcId, setNfcId] = useState('');
    const nfcInputRef = useRef<HTMLInputElement>(null);
    const [loginTab, setLoginTab] = useState('nfc');
    const [hasCameraPermission, setHasCameraPermission] = useState(true);

    const handleLookup = useCallback(async (rawId: string) => {
        if (!rawId?.trim() || !schoolId) return;

        try {
            const finalStudentId = await lookupStudentId(firestore, schoolId, rawId.trim());
            if (finalStudentId) {
                playSound('login');
                onStudentFound(finalStudentId);
            } else {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Student Not Found',
                    description: 'The provided ID does not match any student.'
                });
            }
        } catch (error) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not look up student.'
            });
        }
        setNfcId('');
    }, [firestore, schoolId, playSound, onStudentFound, toast]);

    const { videoRef, hasCameraPermission: hookHasPermission } = useBarcodeScanner(
        isActive && loginTab === 'camera',
        (code) => handleLookup(code),
        (err) => {
            setHasCameraPermission(false);
            if (loginTab === 'camera') setLoginTab('nfc');
            toast({ variant: 'destructive', title: 'Camera Error', description: err });
        }
    );

    useEffect(() => { setHasCameraPermission(hookHasPermission); }, [hookHasPermission]);

    useEffect(() => {
        if (isActive && loginTab === 'nfc') {
            const timer = setTimeout(() => nfcInputRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [isActive, loginTab]);

    return (
        <div className={cn(
            "w-full max-w-sm rounded-3xl overflow-hidden relative",
            isGraphic ? 'bg-card/5 backdrop-blur-2xl border border-border shadow-2xl shadow-primary/10' : 'bg-white shadow-2xl border border-slate-100'
        )}>
            {/* Mascot Decoration for Graphic Mode */}
            {isGraphic && (
                <div className="absolute -top-8 -left-8 w-24 h-24 bg-chart-3/10 rounded-full blur-3xl pointer-events-none" />
            )}

            <div className={cn(
                "p-6 text-center relative z-10",
                isGraphic ? 'border-b border-border' : 'bg-slate-50 border-b'
            )}>
                <div className="absolute top-3 right-3">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full"
                                onClick={() => {
                                    if (isLocked) {
                                        onUnlockRequest();
                                    } else {
                                        setIsLocked(true);
                                    }
                                }}
                            >
                                {isLocked ? <Lock className="w-4 h-4 text-red-500" /> : <Unlock className="w-4 h-4 text-green-500" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isLocked ? 'Kiosk is locked. Click to unlock with passcode.' : 'Lock kiosk to prevent auto-logout.'}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
                <div className={cn(
                    "w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 transition-transform hover:rotate-0",
                    isGraphic ? 'bg-primary text-primary-foreground animate-pulse-glow' : 'bg-primary/10'
                )}>
                    {icon}
                </div>
                <h1 className={cn("text-2xl font-black uppercase tracking-tighter", isGraphic ? 'text-foreground graphic-text-glow' : 'text-slate-800')}>{title}</h1>
                <p className="font-bold text-xs mt-1.5 tracking-wide text-muted-foreground">{description}</p>
            </div>

            <div className="p-6">
                <Tabs defaultValue="nfc" className="w-full" value={loginTab} onValueChange={setLoginTab}>
                    <TabsList className={cn("grid w-full grid-cols-3 p-1 rounded-xl mb-6", isGraphic ? 'bg-foreground/5' : 'bg-slate-100/50')}>
                        <TabsTrigger value="nfc" onClick={() => nfcInputRef.current?.focus()} className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                            <Nfc className="mr-2 h-4 w-4" /> Card
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                            <Type className="mr-2 h-4 w-4" /> Type
                        </TabsTrigger>
                        <TabsTrigger value="camera" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                            <Camera className="mr-2 h-4 w-4" /> Scan
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="nfc" className="text-center">
                        <div className="py-12 space-y-8">
                            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                                <div className={cn("absolute inset-0 rounded-full animate-ping opacity-25", isGraphic ? 'bg-primary' : 'bg-slate-400')}></div>
                                <div className={cn("w-24 h-24 rounded-full flex items-center justify-center border-4 relative z-10 shadow-xl transition-all", isGraphic ? 'bg-background border-primary text-primary' : 'bg-white border-slate-800 text-slate-800')}>
                                    <Nfc className="w-12 h-12" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className={cn("font-black text-lg", isGraphic ? 'text-foreground' : 'text-slate-800')}>System Ready</p>
                                <p className="text-muted-foreground text-sm font-medium">Please place your card on the reader</p>
                            </div>
                            <Input
                                ref={nfcInputRef}
                                type="text"
                                className="absolute -top-[9999px] -left-[9999px]"
                                value={nfcId}
                                onChange={(e) => setNfcId(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleLookup(nfcId)}
                                autoFocus
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="manual">
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Student ID Code</Label>
                                <Input
                                    className={cn(
                                        "h-14 rounded-xl text-xl font-mono text-center border-2 shadow-inner focus-visible:ring-primary",
                                        isGraphic ? 'bg-foreground/5 border-border text-foreground' : 'border-slate-200 bg-slate-50'
                                    )}
                                    value={nfcId}
                                    onChange={(e) => setNfcId(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLookup(nfcId)}
                                    placeholder="try 100 as sample"
                                    autoFocus
                                />
                                <p className="text-xs text-muted-foreground">Use the ID on your student card or ask a teacher.</p>
                            </div>
                            <Button onClick={() => handleLookup(nfcId)} className={cn("w-full h-14 rounded-xl font-black text-base uppercase tracking-widest shadow-lg transition-all active:scale-95 text-primary-foreground", isGraphic ? 'bg-primary hover:bg-primary/90' : 'bg-slate-800 hover:bg-slate-700')}>
                                Identify Student
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="camera">
                        <div className="py-2 space-y-4">
                            <div className="relative border-2 border-border rounded-xl overflow-hidden shadow-xl bg-black">
                                <video ref={videoRef as RefObject<HTMLVideoElement>} className="w-full aspect-square object-cover" playsInline muted />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-3/4 h-3/4 border-2 border-white/30 rounded-[1.5rem] border-dashed animate-pulse" />
                                </div>
                                {!hasCameraPermission && (
                                    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                                        <Camera className="w-12 h-12 text-destructive mb-4" />
                                        <p className="text-foreground font-bold">Camera access required</p>
                                        <p className="text-muted-foreground text-xs mt-2">Please enable camera in settings</p>
                                    </div>
                                )}
                            </div>
                            <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">Position barcode within the frame</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
