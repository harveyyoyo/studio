
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { GraduationCap, Printer, ShoppingBag, UserCog, Trophy, ChevronRight } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from "framer-motion";

export default function PortalPage() {
    const { loginState, isInitialized, schoolId, isAdmin } = useAppContext();
    const router = useRouter();
    const { settings } = useSettings();
    const playSound = useArcadeSound();
    const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);

    useEffect(() => {
        if (isInitialized && loginState !== 'school') {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);

    if (!isInitialized || loginState !== 'school') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-full h-full bg-primary" />
                </div>
            </div>
        );
    }

    const portals = [
        ...(isAdmin ? [{ id: 'admin', href: '/admin', title: 'Admin Portal', description: 'Manage school data and settings.', icon: UserCog, color: 'destructive' }] : []),
        { id: 'print', href: '/teacher', title: 'Print Coupons', description: 'Generate sheets for teachers.', icon: Printer, color: 'chart-2' },
        { id: 'redeem', href: '/student', title: 'Redeem Coupons', description: 'Scan student ID or check points.', icon: GraduationCap, color: 'chart-1' },
        { id: 'prize', href: '/prize', title: 'Prize Shop', description: 'Spend your points for awesome prizes.', icon: ShoppingBag, color: 'chart-3' },
        { id: 'fame', href: '/halloffame', title: 'Hall of Fame', description: 'View top student point earners.', icon: Trophy, color: 'chart-5' },
    ];

    const graphicColorMap: Record<string, string> = {
        'destructive': 'bg-destructive',
        'chart-1': 'bg-chart-1',
        'chart-2': 'bg-chart-2',
        'chart-3': 'bg-chart-3',
        'chart-5': 'bg-chart-5',
    };

    const textColorClasses: Record<string, string> = {
        'destructive': 'text-destructive',
        'chart-1': 'text-chart-1',
        'chart-2': 'text-chart-2',
        'chart-3': 'text-chart-3',
        'chart-5': 'text-chart-5',
    };

    return (
        <div className={cn("min-h-[calc(100vh-5rem)] bg-background text-foreground relative font-sans flex flex-col items-center pt-12", settings.displayMode === 'app' && 'pb-24')}>
            {/* Noise overlay */}
            <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

            {settings.graphicMode === 'graphics' && (
              <>
                <motion.div
                    animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="pointer-events-none fixed -top-20 -right-20 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] z-0"
                />
                <motion.div
                    animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="pointer-events-none fixed bottom-20 left-20 h-[400px] w-[400px] rounded-full bg-chart-5/10 blur-[120px] z-0"
                />
                <motion.div
                    animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-chart-2/5 blur-[150px] z-0"
                />
              </>
            )}

            <main className="relative z-10 w-full max-w-2xl px-6 flex flex-col justify-start">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10 text-center">
                    <h2 className="text-5xl font-black tracking-tighter text-primary font-headline drop-shadow-sm">Where to?</h2>
                </motion.div>

                <div className="flex flex-col gap-4">
                    {portals.map((area, index) => {
                        const Icon = area.icon;
                        return (
                            <Link key={area.id} href={area.href} onClick={() => playSound('click')} className="block group no-underline">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    onMouseEnter={() => setHoveredIndex(area.id)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className="relative flex w-full items-center justify-between rounded-2xl border-2 border-transparent bg-card/40 backdrop-blur-sm px-8 py-5 text-left transition-all duration-300 hover:bg-card hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                                >
                                    {/* Fixed Vertical Color Bar - Increased visibility when inactive */}
                                    <div className={cn(
                                        "absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-500",
                                        graphicColorMap[area.color],
                                        hoveredIndex === area.id ? "opacity-100" : "opacity-30"
                                    )} />

                                    {/* Left content */}
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-card/70 border-2 border-border/50 shadow-md",
                                            "group-hover:scale-105 group-hover:border-primary/20 group-hover:shadow-lg"
                                        )}>
                                            <Icon className={cn("w-7 h-7", textColorClasses[area.color])} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-card-foreground tracking-tight leading-tight">{area.title}</h3>
                                            <p className="text-sm text-muted-foreground mt-1 font-medium leading-normal">{area.description}</p>
                                        </div>
                                    </div>

                                    {/* Right arrow */}
                                    <motion.div animate={{ x: hoveredIndex === area.id ? 0 : -5, opacity: hoveredIndex === area.id ? 1 : 0 }} transition={{ duration: 0.2 }}>
                                        <ChevronRight className="h-7 w-7 text-muted-foreground" />
                                    </motion.div>

                                    {/* Background Glow - Increased opacity on hover */}
                                    <AnimatePresence>
                                        {hoveredIndex === area.id && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.08 }} exit={{ opacity: 0 }} className={cn("absolute inset-0 rounded-2xl pointer-events-none", graphicColorMap[area.color])} />
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            </Link>
                        )
                    })}
                </div>

                <div className="mt-16 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/20">beta · {process.env.NEXT_PUBLIC_VERSION || 'v1.1.0'}</p>
                </div>
            </main>
        </div>
    );
}
