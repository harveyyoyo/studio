'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { GraduationCap, Printer, ShoppingBag, UserCog, Trophy, Star, Gift, ArrowRight } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useArcadeSound } from '@/hooks/useArcadeSound';

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
            <div className={`min-h-screen flex flex-col items-center justify-center gap-4 font-sans ${isGraphic ? 'bg-[#0c133a] text-cyan-400' : 'bg-background text-muted-foreground'}`}>
                <p className="font-medium">Just a moment…</p>
                <p className="text-sm">Loading your school.</p>
            </div>
        );
    }

    const portals = [
        { href: '/admin', label: 'Admin Portal', desc: 'Manage all school data and settings.', icon: UserCog, color: 'destructive' },
        { href: '/student', label: 'Redeem Coupons / Kiosk', desc: 'Scan student ID to redeem coupons or check points.', icon: GraduationCap, color: 'chart-1' },
        { href: '/prize', label: 'Prize Shop', desc: 'Redeem your points for awesome prizes.', icon: ShoppingBag, color: 'chart-3' },
        { href: '/teacher', label: 'Print Coupons', desc: 'Log in as a teacher to generate and print coupon sheets.', icon: Printer, color: 'chart-2' },
        { href: '/halloffame', label: 'Hall of Fame', desc: 'View the top student point earners.', icon: Trophy, color: 'chart-5' },
    ];

    const colorMap: Record<string, { bg: string; border: string; glow: string; text: string; iconBg: string }> = {
        'chart-1': { bg: 'from-blue-600/20 to-blue-900/40', border: 'border-blue-500/40', glow: 'shadow-blue-500/20', text: 'text-blue-400', iconBg: 'bg-blue-100' },
        'chart-2': { bg: 'from-purple-600/20 to-purple-900/40', border: 'border-purple-500/40', glow: 'shadow-purple-500/20', text: 'text-purple-400', iconBg: 'bg-purple-100' },
        'chart-3': { bg: 'from-amber-600/20 to-amber-900/40', border: 'border-amber-400/40', glow: 'shadow-amber-400/20', text: 'text-amber-400', iconBg: 'bg-amber-100' },
        'destructive': { bg: 'from-red-600/20 to-red-900/40', border: 'border-red-500/40', glow: 'shadow-red-500/20', text: 'text-red-400', iconBg: 'bg-red-100' },
        'chart-5': { bg: 'from-orange-600/20 to-orange-900/40', border: 'border-orange-400/40', glow: 'shadow-orange-400/20', text: 'text-orange-400', iconBg: 'bg-orange-100' },
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
        <div className={`min-h-screen transition-colors duration-500 relative overflow-hidden font-sans ${settings.displayMode === 'app' ? 'pb-24' : 'pb-8'} ${isGraphic ? 'bg-[#0c133a] text-white' : 'bg-background text-foreground'}`}>

            {/* Graphic Decoration */}
            {isGraphic && (
                <>
                    <div className="absolute top-[-10%] left-[-15%] w-[50%] h-[30%] bg-blue-600/15 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[30%] bg-purple-600/15 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute top-[30%] right-[10%] w-[30%] h-[20%] bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
                </>
            )}

            <div className="relative z-10 max-w-4xl mx-auto pt-8 pb-4 px-6 space-y-6 animate-in fade-in duration-500">

                {/* Portal Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {portals.map((p) => {
                    const Icon = p.icon;
                    const gc = colorMap[p.color];

                    return (
                        <Link key={p.href} href={p.href} className="block group" onClick={() => playSound('click')}>
                        <Card className={`h-full min-h-[200px] sm:min-h-[220px] border-t-4 transition-all transform group-hover:-translate-y-1 group-hover:shadow-2xl overflow-hidden relative ${isGraphic
                                ? `bg-gradient-to-br ${gc.bg} backdrop-blur-md ${gc.border} ${gc.glow} border-t-transparent`
                                : `bg-white border-slate-200 shadow-sm ${borderTopClass[p.color] ?? ''}`
                            }`}>
                                    {/* Decorative Elements for Graphic Mode */}
                                    {isGraphic && (
                                        <div className="absolute -top-4 -right-4 w-12 h-12 opacity-5">
                                            <Star className="w-full h-full fill-current" />
                                        </div>
                                    )}

                                    <CardHeader className="space-y-3 pt-5 pb-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 min-h-[44px] min-w-[44px] ${isGraphic ? 'bg-white/10 border border-white/10' : `${gc.iconBg} ${iconTextClassic[p.color] ?? ''}`
                                            }`}>
                                            <Icon className={`w-8 h-8 ${isGraphic ? gc.text : (iconTextClassic[p.color] ?? '')}`} />
                                        </div>
                                        <div>
                                            <CardTitle className={`text-lg font-black tracking-tight ${isGraphic ? 'text-white' : 'text-slate-800'}`}>
                                                {p.label}
                                            </CardTitle>
                                            <CardDescription className={`text-xs font-medium mt-1 leading-relaxed ${isGraphic ? 'text-white/50' : 'text-slate-500'}`}>
                                                {p.desc}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>

                                    <div className={`absolute bottom-3 right-4 transition-all opacity-0 group-hover:opacity-100 ${isGraphic ? 'text-white/30' : 'text-slate-300'}`}>
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
