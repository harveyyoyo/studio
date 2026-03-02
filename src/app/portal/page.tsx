
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { GraduationCap, Printer, ShoppingBag, UserCog, Trophy, Star, Gift, ArrowRight } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { cn } from '@/lib/utils';
import { Helper } from '@/components/ui/helper';

export default function PortalPage() {
    const { loginState, isInitialized, schoolId } = useAppContext();
    const router = useRouter();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';
    const playSound = useArcadeSound();

    useEffect(() => {
        if (isInitialized && loginState !== 'school') {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);

    if (!isInitialized || loginState !== 'school') {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center gap-4 font-sans ${isGraphic ? 'bg-background text-primary' : 'bg-background text-muted-foreground'}`}>
                <p className="font-medium">Just a moment…</p>
                <p className="text-sm">Loading your school.</p>
            </div>
        );
    }

    const portals = [
        { href: '/admin', label: 'Admin Portal', desc: 'Manage all school data and settings.', icon: UserCog, color: 'destructive', help: 'The Admin Portal is the control center for your school. Here you can add students and teachers, manage prizes and coupon categories, and handle system backups.' },
        { href: '/student', label: 'Redeem Coupons / Kiosk', desc: 'Scan student ID to redeem coupons or check points.', icon: GraduationCap, color: 'chart-1', help: 'This is the main kiosk for students. They can scan their ID card or type their ID to access their account, check their point balance, and redeem coupon codes given by teachers.' },
        { href: '/prize', label: 'Prize Shop', desc: 'Redeem your points for awesome prizes.', icon: ShoppingBag, color: 'chart-3', help: 'Students can use their earned points to redeem prizes here. The shop only shows items that are currently in stock.' },
        { href: '/teacher', label: 'Print Coupons', desc: 'Log in as a teacher to generate and print coupon sheets.', icon: Printer, color: 'chart-2', help: 'Teachers can log in here to generate and print sheets of physical coupons to hand out to students as rewards.' },
        { href: '/halloffame', label: 'Hall of Fame', desc: 'View the top student point earners.', icon: Trophy, color: 'chart-5', help: 'This leaderboard displays the top students based on their lifetime point earnings, showcasing top achievers in the school.' },
    ];

    const colorMap: Record<string, { bg: string; border: string; glow: string; text: string; iconBg: string }> = {
        'chart-1': { bg: 'from-chart-1/20 to-chart-1/5', border: 'border-chart-1/40', glow: 'shadow-chart-1/20', text: 'text-chart-1', iconBg: 'bg-blue-100' },
        'chart-2': { bg: 'from-chart-2/20 to-chart-2/5', border: 'border-chart-2/40', glow: 'shadow-chart-2/20', text: 'text-chart-2', iconBg: 'bg-purple-100' },
        'chart-3': { bg: 'from-chart-3/20 to-chart-3/5', border: 'border-chart-3/40', glow: 'shadow-chart-3/20', text: 'text-chart-3', iconBg: 'bg-amber-100' },
        'destructive': { bg: 'from-destructive/20 to-destructive/5', border: 'border-destructive/40', glow: 'shadow-destructive/20', text: 'text-destructive', iconBg: 'bg-red-100' },
        'chart-5': { bg: 'from-chart-5/20 to-chart-5/5', border: 'border-chart-5/40', glow: 'shadow-chart-5/20', text: 'text-chart-5', iconBg: 'bg-orange-100' },
    };
    const borderTopClass: Record<string, string> = {
        'chart-1': 'border-t-blue-500',
        'chart-2': 'border-t-purple-500',
        'chart-3': 'border-t-amber-500',
        'destructive': 'border-t-red-500',
        'chart-5': 'border-t-orange-500',
    };
    const iconTextClassic: Record<string, string> = {
        'chart-1': 'text-blue-600',
        'chart-2': 'text-purple-600',
        'chart-3': 'text-amber-600',
        'destructive': 'text-red-600',
        'chart-5': 'text-orange-600',
    };

    return (
        <div className={cn(
            "min-h-screen transition-colors duration-500 relative overflow-hidden font-sans",
            settings.displayMode === 'app' ? 'pb-24' : 'pb-8'
        )}>

            {/* Graphic Decoration */}
            {isGraphic && (
                <>
                    <div className="absolute top-[-10%] left-[-15%] w-[50%] h-[30%] bg-chart-1/15 dark:bg-chart-1/15 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[30%] bg-chart-5/15 dark:bg-chart-5/15 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute top-[30%] right-[10%] w-[30%] h-[20%] bg-chart-3/10 dark:bg-chart-3/10 blur-[80px] rounded-full pointer-events-none" />
                </>
            )}

            <div className="relative z-10 max-w-4xl mx-auto pt-8 pb-4 px-6 space-y-6 animate-in fade-in duration-500">
                
                {isGraphic ? (
                    <div className="text-center mb-8">
                        <Helper content="This is the main hub for your school. Each card takes you to a different part of the app with specific functions.">
                            <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase graphic-text-glow">Select Portal</h1>
                        </Helper>
                        <p className="text-sm text-muted-foreground font-bold">{schoolId?.replace(/_/g, ' ')}</p>
                    </div>
                ) : (
                    <div className="mb-6">
                         <Helper content="This is the main hub for your school. Each card takes you to a different part of the app with specific functions.">
                            <h1 className="text-3xl font-bold">Portal</h1>
                         </Helper>
                        <p className="text-muted-foreground">Select an area to continue.</p>
                    </div>
                )}


                {/* Portal Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {portals.map((p) => {
                    const Icon = p.icon;
                    const gc = colorMap[p.color];

                    return (
                        <Link key={p.href} href={p.href} className="block group" onClick={() => playSound('click')}>
                        <Card className={cn(
                            'h-full min-h-[200px] sm:min-h-[220px] transition-all transform group-hover:-translate-y-1 group-hover:shadow-2xl overflow-hidden relative',
                            isGraphic
                                ? `bg-gradient-to-br ${gc.bg} backdrop-blur-md ${gc.border} ${gc.glow} border-t-transparent`
                                : `bg-white border-t-4 border-slate-200 shadow-sm ${borderTopClass[p.color] ?? ''}`
                            )}>
                                    {/* Decorative Elements for Graphic Mode */}
                                    {isGraphic && (
                                        <div className="absolute -top-4 -right-4 w-12 h-12 opacity-5">
                                            <Star className="w-full h-full fill-current" />
                                        </div>
                                    )}

                                    <CardHeader className="space-y-3 pt-5 pb-5">
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 min-h-[44px] min-w-[44px]",
                                            isGraphic ? 'bg-foreground/5 border border-border' : `${gc.iconBg} ${iconTextClassic[p.color] ?? ''}`
                                        )}>
                                            <Icon className={cn("w-8 h-8", isGraphic ? gc.text : (iconTextClassic[p.color] ?? ''))} />
                                        </div>
                                        <div>
                                            <Helper content={p.help} side='top'>
                                                <CardTitle className={cn(
                                                    "text-lg font-black tracking-tight",
                                                    isGraphic ? 'text-foreground' : 'text-slate-800'
                                                )}>
                                                    {p.label}
                                                </CardTitle>
                                            </Helper>
                                            <CardDescription className={cn(
                                                "text-xs font-medium mt-1 leading-relaxed",
                                                isGraphic ? 'text-muted-foreground' : 'text-slate-500'
                                            )}>
                                                {p.desc}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>

                                    <div className={cn("absolute bottom-3 right-4 transition-all opacity-0 group-hover:opacity-100", isGraphic ? 'text-muted-foreground' : 'text-slate-300')}>
                                        <ArrowRight className="w-5 h-5" />
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}
