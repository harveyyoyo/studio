'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { GraduationCap, Printer, ShoppingBag, UserCog, Trophy, Home, User, Star, Gift, ArrowRight } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PortalPage() {
    const { loginState, isInitialized, schoolId } = useAppContext();
    const router = useRouter();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';

    useEffect(() => {
        if (isInitialized && loginState !== 'school') {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);

    if (!isInitialized || loginState !== 'school') {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center gap-4 font-sans ${isGraphic ? 'bg-[#0c133a] text-cyan-400' : 'bg-slate-50 text-slate-500'}`}>
                <p className="font-medium">Just a moment…</p>
                <p className="text-sm">Loading your school.</p>
            </div>
        );
    }

    const portals = [
        { href: '/student', label: 'Student Portal', desc: 'Check points, redeem coupons & prizes', icon: GraduationCap, color: 'chart-1' },
        { href: '/prize', label: 'Prize Shop', desc: 'Redeem your points for awesome prizes.', icon: ShoppingBag, color: 'chart-3' },
        { href: '/teacher', label: 'Teacher Portal', desc: 'Log in as a teacher to generate and print coupon sheets.', icon: Printer, color: 'chart-2' },
        { href: '/admin', label: 'Admin Portal', desc: 'Manage all school data and settings.', icon: UserCog, color: 'destructive' },
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
        <div className={`min-h-screen transition-colors duration-500 relative overflow-hidden font-sans pb-24 ${isGraphic ? 'bg-[#0c133a] text-white' : 'bg-slate-50 text-slate-900'}`}>

            {/* Graphic Decoration */}
            {isGraphic && (
                <>
                    <div className="absolute top-[-10%] left-[-15%] w-[50%] h-[30%] bg-blue-600/15 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[30%] bg-purple-600/15 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute top-[30%] right-[10%] w-[30%] h-[20%] bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
                </>
            )}

            <div className="relative z-10 max-w-4xl mx-auto pt-12 pb-8 px-6 space-y-8 animate-in fade-in duration-500">

                {/* Portal Header */}
                <div className="text-center space-y-2">
                    <p className={`text-xs font-bold uppercase tracking-wider ${isGraphic ? 'text-white/50' : 'text-slate-500'}`}>
                        School: {schoolId?.replace(/_/g, ' ') || 'School Reward System'}
                    </p>
                    <h2 className={`text-3xl font-black tracking-tight ${isGraphic ? 'text-white' : 'text-slate-800'}`}>
                        Welcome to <span className="text-primary">{schoolId?.replace(/_/g, ' ') || 'School Reward System'}</span>
                    </h2>
                    <p className={`text-sm font-medium ${isGraphic ? 'text-white/40' : 'text-slate-500'}`}>
                        Please select your portal to continue.
                    </p>
                </div>

                {/* Portal Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {portals.map((p) => {
                        const Icon = p.icon;
                        const gc = colorMap[p.color];

                        return (
                            <Link key={p.href} href={p.href} className="block group">
                                <Card className={`h-full border-t-4 transition-all transform group-hover:-translate-y-1 group-hover:shadow-2xl overflow-hidden relative ${isGraphic
                                        ? `bg-gradient-to-br ${gc.bg} backdrop-blur-md ${gc.border} ${gc.glow} border-t-transparent`
                                        : `bg-white border-slate-200 shadow-sm ${borderTopClass[p.color] ?? ''}`
                                    }`}>
                                    {/* Decorative Elements for Graphic Mode */}
                                    {isGraphic && (
                                        <div className="absolute -top-4 -right-4 w-12 h-12 opacity-5">
                                            <Star className="w-full h-full fill-current" />
                                        </div>
                                    )}

                                    <CardHeader className="space-y-4">
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

            {/* Persistent Bottom Nav - all portals reachable */}
            <nav className={`fixed bottom-0 left-0 right-0 py-2 z-50 transition-all border-t ${isGraphic ? 'bg-[#070b1f]/95 backdrop-blur-md border-white/5' : 'bg-white border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]'}`}>
                <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-x-3 gap-y-1 items-center px-2">
                    <Link href="/" title="Return to login" className={`flex flex-col items-center transition-colors py-1 ${isGraphic ? 'text-white/30 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}>
                        <Home className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Leave</span>
                    </Link>
                    <div className={`flex flex-col items-center py-1 ${isGraphic ? 'text-primary' : 'text-indigo-600'}`}>
                        <Star className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Portal</span>
                    </div>
                    <Link href="/student" className={`flex flex-col items-center transition-colors py-1 ${isGraphic ? 'text-white/30 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}>
                        <GraduationCap className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Student</span>
                    </Link>
                    <Link href="/teacher" className={`flex flex-col items-center transition-colors py-1 ${isGraphic ? 'text-white/30 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}>
                        <Printer className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Teacher</span>
                    </Link>
                    <Link href="/prize" className={`flex flex-col items-center transition-colors py-1 ${isGraphic ? 'text-white/30 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}>
                        <Gift className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Prizes</span>
                    </Link>
                    <Link href="/admin" className={`flex flex-col items-center transition-colors py-1 ${isGraphic ? 'text-white/30 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}>
                        <UserCog className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Admin</span>
                    </Link>
                    <Link href="/halloffame" className={`flex flex-col items-center transition-colors py-1 ${isGraphic ? 'text-white/30 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}>
                        <Trophy className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Hall of Fame</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}
