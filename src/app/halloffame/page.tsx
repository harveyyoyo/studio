
'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { ArrowLeft, Trophy, Crown, Medal, ChevronRight, Settings, Cpu } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Student, Class, Category } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/components/providers/SettingsProvider';
import { cn, getStudentNickname } from '@/lib/utils';
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

function HallOfFameSkeleton() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8 md:p-12 flex flex-col items-center">
            <Skeleton className="h-16 w-64 mb-16 rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-full items-end mb-12">
                <Skeleton className="h-64 w-full rounded-3xl" />
                <Skeleton className="h-80 w-full rounded-3xl" />
                <Skeleton className="h-56 w-full rounded-3xl" />
            </div>
            <div className="w-full max-w-full space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
        </div>
    );
}

export default function HallOfFamePage() {
    const { loginState, isInitialized, schoolId } = useAppContext();
    const firestore = useFirestore();
    const router = useRouter();
    const { settings, updateSettings } = useSettings();
    const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);

    const [sortBy, setSortBy] = useState<string>('lifetimePoints');
    const [scope, setScope] = useState<'all' | string>('all');
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [limit, setLimit] = useState<number>(50);
    const [podiumSize, setPodiumSize] = useState<number>(3);
    const [autoScroll, setAutoScroll] = useState<boolean>(false);
    const [landscapeMode, setLandscapeMode] = useState<boolean>(true);

    // Load persisted settings
    useEffect(() => {
        const saved = localStorage.getItem('hall_of_fame_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.sortBy) setSortBy(parsed.sortBy);
                if (parsed.scope) setScope(parsed.scope);
                if (parsed.limit) setLimit(parsed.limit);
                if (parsed.podiumSize !== undefined) setPodiumSize(parsed.podiumSize);
                if (parsed.autoScroll !== undefined) setAutoScroll(parsed.autoScroll);
                if (parsed.landscapeMode !== undefined) setLandscapeMode(parsed.landscapeMode);
            } catch (e) {
                console.error("Failed to parse persisted Hall of Fame settings", e);
            }
        }
    }, []);

    // Save settings on change
    useEffect(() => {
        const settingsToSave = { sortBy, scope, limit, podiumSize, autoScroll, landscapeMode };
        localStorage.setItem('hall_of_fame_settings', JSON.stringify(settingsToSave));
    }, [sortBy, scope, limit, podiumSize, autoScroll, landscapeMode]);

    useEffect(() => {
        if (isInitialized && !['student', 'teacher', 'admin', 'school'].includes(loginState)) {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);

    const studentsQuery = useMemoFirebase(() =>
        schoolId
            ? query(
                collection(firestore, 'schools', schoolId, 'students'),
                orderBy(sortBy === 'points' ? 'points' : 'lifetimePoints', 'desc'),
                firestoreLimit(200) // Fetch more for client-side category sorting
            )
            : null,
        [firestore, schoolId, sortBy]);
    const { data: allTopStudents, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

    const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

    const categoriesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null, [firestore, schoolId]);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

    const topStudents = useMemo(() => {
        if (!allTopStudents) return [];
        let sorted = [...allTopStudents];

        if (sortBy !== 'points' && sortBy !== 'lifetimePoints') {
            // It's a category sort
            const categoryName = sortBy;
            sorted.sort((a, b) => (b.categoryPoints?.[categoryName] || 0) - (a.categoryPoints?.[categoryName] || 0));
        }

        if (scope === 'all') return sorted.slice(0, limit);
        return sorted.filter(s => s.classId === scope).slice(0, limit);
    }, [allTopStudents, scope, sortBy, limit]);

    const classesMap = useMemo(() => {
        if (!classes) return new Map();
        return new Map(classes.map(c => [c.id, c.name]));
    }, [classes]);

    const getClassName = (classId?: string) => {
        return classId ? classesMap.get(classId) || 'Unassigned' : 'Unassigned';
    };

    const getScopeName = () => {
        if (scope === 'all') return 'Entire School';
        return getClassName(scope);
    }

    const getSortByLabel = () => {
        if (sortBy === 'points') return 'Top Current Earners';
        if (sortBy === 'lifetimePoints') return 'Top Lifetime Earners';
        return `Top Earners in ${sortBy}`;
    }

    const getPointsForStudent = (student: Student) => {
        if (sortBy === 'points') return student.points || 0;
        if (sortBy === 'lifetimePoints') return student.lifetimePoints || 0;
        return student.categoryPoints?.[sortBy] || 0;
    }

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    }

    // Auto-scroll logic
    useEffect(() => {
        if (!autoScroll) return;

        let scrollDirection = 1; // 1 for down, -1 for up
        const scrollSpeed = 0.5; // pixels per frame equivalent-ish
        let lastTime = 0;
        let animationId: number;
        let timeoutId: NodeJS.Timeout;

        const handleScroll = (time: number) => {
            if (!lastTime) lastTime = time;
            const delta = Math.min(time - lastTime, 50); // cap delta to prevent huge jumps
            lastTime = time;

            const scrollStep = (scrollSpeed * delta) / 16; // attempt 1px per 16ms
            window.scrollBy(0, scrollStep * scrollDirection);

            // Check if we hit bottom or top
            const isAtBottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 10;
            const isAtTop = window.scrollY <= 10;

            if (isAtBottom && scrollDirection === 1) {
                // Wait a bit at the bottom before reversing
                timeoutId = setTimeout(() => {
                    scrollDirection = -1;
                    lastTime = 0;
                    animationId = requestAnimationFrame(handleScroll);
                }, 3000);
                return; // stop current animation loop, wait for timeout
            } else if (isAtTop && scrollDirection === -1) {
                // Wait a bit at the top before reversing
                timeoutId = setTimeout(() => {
                    scrollDirection = 1;
                    lastTime = 0;
                    animationId = requestAnimationFrame(handleScroll);
                }, 3000);
                return;
            }

            animationId = requestAnimationFrame(handleScroll);
        };

        animationId = requestAnimationFrame(handleScroll);
        return () => {
            cancelAnimationFrame(animationId);
            clearTimeout(timeoutId);
        };
    }, [autoScroll]);

    // ESC to stop auto-scroll
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setAutoScroll(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isInitialized || !['student', 'teacher', 'admin', 'school'].includes(loginState) || studentsLoading || classesLoading || categoriesLoading) {
        return <HallOfFameSkeleton />;
    }

    const podium = topStudents?.slice(0, podiumSize) || [];
    const others = topStudents?.slice(podiumSize) || [];

    return (
        <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans flex flex-col items-center">
            {/* Noise texture overlay */}
            <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }} />

            {/* Gradient orbs */}
            <motion.div
                animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="pointer-events-none fixed top-20 right-20 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] z-0"
            />
            <motion.div
                animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="pointer-events-none fixed bottom-20 left-20 h-[400px] w-[400px] rounded-full bg-chart-5/5 blur-[120px] z-0"
            />

            <main className={cn(
                "relative z-10 w-full px-4 sm:px-8 pt-8 md:pt-12 transition-all duration-500",
                "max-w-full",
                settings.displayMode === 'app' ? 'pb-24' : 'pb-12'
            )}>
                <Card className="border-t-8 border-chart-5 shadow-2xl bg-card/80 backdrop-blur-md">
                    <CardContent className="p-4 sm:p-6 md:p-8">
                        {/* Header */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="mb-12 md:mb-16"
                        >
                            <div className="flex justify-between items-start">
                                <div className='text-center flex-grow'>
                                    <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-primary font-headline drop-shadow-sm mb-4 flex items-center justify-center gap-4">
                                        <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-chart-5" /> Hall of Fame
                                    </h2>
                                    <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-[0.3em]">
                                        {getScopeName()} &bull; {getSortByLabel()}
                                    </p>
                                </div>
                                <Dialog open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="icon" className="rounded-full flex-shrink-0"><Settings className="w-4 h-4" /></Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Display Options</DialogTitle>
                                            <DialogDescription>
                                                Customize the leaderboard view.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="sort-by">Sort By</Label>
                                                <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                                                    <SelectTrigger id="sort-by"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="lifetimePoints">Lifetime Points</SelectItem>
                                                        <SelectItem value="points">Current Points</SelectItem>
                                                        {categories?.map(c => <SelectItem key={c.id} value={c.name}>{c.name} Points</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="scope">Show</Label>
                                                    <Select value={scope} onValueChange={setScope}>
                                                        <SelectTrigger id="scope"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">Entire School</SelectItem>
                                                            {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="limit">Show Top</Label>
                                                    <Input
                                                        id="limit"
                                                        type="number"
                                                        value={limit}
                                                        onChange={(e) => setLimit(Math.max(1, parseInt(e.target.value) || 1))}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="podium-size">Highlight Top</Label>
                                                    <Input
                                                        id="podium-size"
                                                        type="number"
                                                        value={podiumSize}
                                                        onChange={(e) => setPodiumSize(Math.max(0, Math.min(3, parseInt(e.target.value) || 0)))}
                                                    />
                                                </div>
                                                <div className="flex items-center space-x-2 pt-8">
                                                    <Switch id="auto-scroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
                                                    <Label htmlFor="auto-scroll">Auto-Scroll</Label>
                                                </div>
                                                <div className="flex items-center space-x-2 pt-8">
                                                    <Switch id="landscape-mode" checked={landscapeMode} onCheckedChange={setLandscapeMode} />
                                                    <Label htmlFor="landscape-mode">Landscape Layout</Label>
                                                </div>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={() => setIsOptionsOpen(false)}>Done</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </motion.div>

                        {/* Podium */}
                        {podium.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-12 md:mb-20">
                                {/* 2nd Place */}
                                {podium.length > 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-center md:order-1"
                                    >
                                        <div className="bg-card/40 backdrop-blur-sm border-2 border-slate-200 rounded-3xl p-6 md:p-8 relative h-56 md:h-64 flex flex-col justify-end shadow-lg transition-all hover:shadow-xl hover:-translate-y-1">
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-black text-xl border-4 border-background">2</div>
                                            </div>
                                            <Avatar className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 border-4 border-slate-100 shadow-md">
                                                <AvatarFallback className="bg-secondary text-2xl font-black">{getInitials(podium[1].firstName, podium[1].lastName)}</AvatarFallback>
                                            </Avatar>
                                            <p className="font-black text-foreground text-lg md:text-xl truncate tracking-tight">{getStudentNickname(podium[1])}</p>
                                            <p className="text-primary font-bold text-lg mt-1">{getPointsForStudent(podium[1]).toLocaleString()} pts</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* 1st Place */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className="text-center md:order-2"
                                >
                                    <div className="bg-primary/5 backdrop-blur-md border-4 border-primary/20 rounded-t-[4rem] rounded-b-3xl p-6 md:p-8 relative shadow-2xl h-72 md:h-80 flex flex-col justify-end transition-all hover:-translate-y-2">
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                            <Crown className="w-12 h-12 sm:w-16 sm:h-16 text-chart-5 animate-float drop-shadow-lg" />
                                        </div>
                                        <Avatar className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-4 border-4 border-primary/30 shadow-xl">
                                            <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-black">{getInitials(podium[0].firstName, podium[0].lastName)}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-black text-foreground text-xl md:text-2xl truncate tracking-tighter">{getStudentNickname(podium[0])}</p>
                                        <p className="text-primary font-black text-2xl md:text-3xl mt-1 tracking-tighter">{getPointsForStudent(podium[0]).toLocaleString()} pts</p>
                                    </div>
                                </motion.div>

                                {/* 3rd Place */}
                                {podium.length > 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.6 }}
                                        className="text-center md:order-3"
                                    >
                                        <div className="bg-card/40 backdrop-blur-sm border-2 border-orange-200/50 rounded-3xl p-6 md:p-8 relative h-52 md:h-56 flex flex-col justify-end shadow-lg transition-all hover:shadow-xl hover:-translate-y-1">
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xl border-4 border-background">3</div>
                                            </div>
                                            <Avatar className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 border-4 border-orange-50 shadow-md">
                                                <AvatarFallback className="bg-orange-50 text-xl font-black">{getInitials(podium[2].firstName, podium[2].lastName)}</AvatarFallback>
                                            </Avatar>
                                            <p className="font-black text-foreground text-base md:text-lg truncate tracking-tight">{getStudentNickname(podium[2])}</p>
                                            <p className="text-primary font-bold text-lg mt-1">{getPointsForStudent(podium[2]).toLocaleString()} pts</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* Leaderboard List */}
                        {others.length > 0 && (
                            <div className={cn(
                                "mx-auto",
                                landscapeMode ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full" : "flex flex-col w-full max-w-2xl space-y-3"
                            )}>
                                {!landscapeMode && (
                                    <div className="px-6 pb-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 flex justify-between w-full">
                                        <span>Top Students</span>
                                        <span>Points</span>
                                    </div>
                                )}
                                {others.map((student, index) => (
                                    <motion.div
                                        key={student.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.8 + index * 0.05 }}
                                        onMouseEnter={() => setHoveredIndex(student.id)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                        className={cn(
                                            "group relative flex items-center justify-between bg-card/40 backdrop-blur-sm border-2 border-transparent rounded-2xl px-4 py-3 md:px-6 md:py-4 transition-all hover:bg-card hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5",
                                            landscapeMode ? "w-full" : "w-full"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-black text-muted-foreground/30 w-6">{index + podiumSize + 1}</span>
                                            <Avatar className="w-10 h-10 border-2 border-background">
                                                <AvatarFallback className="bg-secondary text-xs font-bold">{getInitials(student.firstName, student.lastName)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-foreground tracking-tight">{getStudentNickname(student)} {student.lastName}</p>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{getClassName(student.classId)}</p>
                                            </div>
                                        </div>
                                        <div className="text-lg font-black text-primary tracking-tighter">
                                            {getPointsForStudent(student).toLocaleString()}
                                        </div>

                                        {/* Hover Bar Accent */}
                                        <motion.div
                                            initial={false}
                                            animate={{
                                                opacity: hoveredIndex === student.id ? 1 : 0,
                                                scaleY: hoveredIndex === student.id ? 1 : 0.6
                                            }}
                                            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-primary transition-opacity"
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {(!topStudents || topStudents.length === 0) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-muted-foreground font-medium">
                                No students have earned points yet for this view.
                            </motion.div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
