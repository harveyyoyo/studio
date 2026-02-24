'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft, Trophy, Star, Crown, Medal } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Student, Class } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

function HallOfFameSkeleton() {
    return (
        <div className="space-y-6">
            <Card className="bg-card border-b-4 border-amber-400 dark:border-amber-500 p-6 shadow-lg">
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-9 w-36" />
                </div>
                <div className="mt-4 pt-4 border-t">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-10 w-64" />
                </div>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center items-end pt-8">
                <div className="md:order-2">
                    <Skeleton className="h-72 w-full rounded-lg" />
                </div>
                <div className="md:order-1">
                    <Skeleton className="h-64 w-full rounded-lg" />
                </div>
                <div className="md:order-3">
                    <Skeleton className="h-56 w-full rounded-lg" />
                </div>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </CardContent>
            </Card>
        </div>
    );
}

export default function HallOfFamePage() {
    const { loginState, isInitialized, schoolId } = useAppContext();
    const firestore = useFirestore();
    const router = useRouter();
    const { settings } = useSettings();
    const isClassic = settings.graphicMode === 'classic';

    useEffect(() => {
        if (isInitialized && loginState !== 'school') {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);

    const studentsQuery = useMemoFirebase(() =>
        schoolId
            ? query(
                collection(firestore, 'schools', schoolId, 'students'),
                orderBy('lifetimePoints', 'desc'),
                limit(50)
            )
            : null,
        [firestore, schoolId]);
    const { data: topStudents, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

    const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

    const classesMap = useMemoFirebase(() => {
        if (!classes) return new Map();
        return new Map(classes.map(c => [c.id, c.name]));
    }, [classes]);

    const getClassName = (classId?: string) => {
        return classId ? classesMap.get(classId) || 'Unassigned' : 'Unassigned';
    };

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    }

    if (!isInitialized || loginState !== 'school' || studentsLoading || classesLoading) {
        return <HallOfFameSkeleton />;
    }

    const podium = topStudents?.slice(0, 3) || [];
    const others = topStudents?.slice(3) || [];

    return (
        <div className={`${isClassic ? '' : 'min-h-screen bg-[#0c133a] pb-20'}`}>
            {isClassic ? (
                /* ===== CLASSIC MODE ===== */
                <div className="space-y-6">
                    <Card className="bg-card border-b-4 border-amber-400 dark:border-amber-500 p-6 shadow-lg">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">School: {schoolId?.replace(/_/g, ' ')}</p>
                                <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
                                    <Trophy className="text-amber-500" /> Hall of Fame
                                </h2>
                                <CardDescription>Top all-time point earners</CardDescription>
                            </div>
                            <Button asChild variant="secondary" size="sm">
                                <Link href="/portal"><ArrowLeft className="mr-2 h-4 w-4" /> Back to portal</Link>
                            </Button>
                        </div>
                        <div className="mt-4 pt-4 border-t">
                            <CardDescription>
                                This leaderboard shows the top 50 students based on the total points they have ever earned.
                            </CardDescription>
                        </div>
                    </Card>

                    {podium.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center items-end pt-8">
                            {/* 1st Place */}
                            <div className="md:order-2">
                                <Card className="relative p-6 md:p-8 border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30">
                                    <div className="absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 bg-amber-400 dark:bg-amber-500 text-white font-bold rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center text-2xl md:text-3xl"><Trophy /></div>
                                    <Avatar className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 border-4 border-amber-400 dark:border-amber-500">
                                        <AvatarFallback className="text-3xl md:text-4xl bg-secondary">{getInitials(podium[0].firstName, podium[0].lastName)}</AvatarFallback>
                                    </Avatar>
                                    <p className="font-bold text-xl md:text-2xl truncate">{podium[0].firstName} {podium[0].lastName}</p>
                                    <p className="text-muted-foreground">{getClassName(podium[0].classId)}</p>
                                    <p className="text-3xl md:text-4xl font-bold text-primary mt-2">{(podium[0].lifetimePoints || 0).toLocaleString()} pts</p>
                                    <div className="mt-4 border-t pt-4">
                                        <p className="text-xs font-bold text-muted-foreground mb-2">Top Categories</p>
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {podium[0].categoryPoints && Object.keys(podium[0].categoryPoints).length > 0 ? (
                                                Object.entries(podium[0].categoryPoints).sort(([, a], [, b]) => b - a).slice(0, 3).map(([category, points]) => (
                                                    <Badge key={category} variant="secondary" className="font-normal text-xs">
                                                        {category}: <span className="font-bold ml-1">{points}</span>
                                                    </Badge>
                                                ))
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic">No categories</p>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* 2nd Place */}
                            {podium.length > 1 && (
                                <div className="md:order-1">
                                    <Card className="relative p-6 border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-300 dark:bg-slate-600 text-white font-bold rounded-full w-12 h-12 flex items-center justify-center text-xl">2</div>
                                        <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-slate-300 dark:border-slate-600">
                                            <AvatarFallback className="text-3xl bg-secondary">{getInitials(podium[1].firstName, podium[1].lastName)}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-bold text-xl truncate">{podium[1].firstName} {podium[1].lastName}</p>
                                        <p className="text-muted-foreground text-sm">{getClassName(podium[1].classId)}</p>
                                        <p className="text-2xl font-bold text-primary mt-2">{(podium[1].lifetimePoints || 0).toLocaleString()} pts</p>
                                        <div className="mt-3 border-t pt-3">
                                            <p className="text-xs font-bold text-muted-foreground mb-2">Top Categories</p>
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {podium[1].categoryPoints && Object.keys(podium[1].categoryPoints).length > 0 ? (
                                                    Object.entries(podium[1].categoryPoints).sort(([, a], [, b]) => b - a).slice(0, 3).map(([category, points]) => (
                                                        <Badge key={category} variant="secondary" className="font-normal text-xs">
                                                            {category}: <span className="font-bold ml-1">{points}</span>
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">No categories</p>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* 3rd Place */}
                            {podium.length > 2 && (
                                <div className="md:order-3">
                                    <Card className="relative p-4 border-2 border-orange-400/50 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
                                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-orange-400/80 dark:bg-orange-700 text-white font-bold rounded-full w-10 h-10 flex items-center justify-center text-lg">3</div>
                                        <Avatar className="w-20 h-20 mx-auto mb-3 border-4 border-orange-400/50 dark:border-orange-700">
                                            <AvatarFallback className="text-2xl bg-secondary">{getInitials(podium[2].firstName, podium[2].lastName)}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-bold text-lg truncate">{podium[2].firstName} {podium[2].lastName}</p>
                                        <p className="text-muted-foreground text-sm">{getClassName(podium[2].classId)}</p>
                                        <p className="text-xl font-bold text-primary mt-2">{(podium[2].lifetimePoints || 0).toLocaleString()} pts</p>
                                        <div className="mt-3 border-t pt-3">
                                            <p className="text-xs font-bold text-muted-foreground mb-2">Top Categories</p>
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {podium[2].categoryPoints && Object.keys(podium[2].categoryPoints).length > 0 ? (
                                                    Object.entries(podium[2].categoryPoints).sort(([, a], [, b]) => b - a).slice(0, 2).map(([category, points]) => (
                                                        <Badge key={category} variant="secondary" className="font-normal text-xs">
                                                            {category}: <span className="font-bold ml-1">{points}</span>
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">No categories</p>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}
                        </div>
                    )}

                    {others.length > 0 && (
                        <Card className="mt-12">
                            <CardHeader>
                                <CardTitle>Leaderboard</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full space-y-2">
                                    {others.map((student, index) => (
                                        <AccordionItem value={`item-${index}`} key={student.id} className="bg-secondary border rounded-md px-3">
                                            <AccordionTrigger className="w-full hover:no-underline py-3">
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-lg font-bold text-muted-foreground w-6 text-center">{index + 4}</div>
                                                        <Avatar className="w-10 h-10">
                                                            <AvatarFallback className="bg-background">{getInitials(student.firstName, student.lastName)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-bold text-left">{student.firstName} {student.lastName}</p>
                                                            <p className="text-xs text-muted-foreground text-left">{getClassName(student.classId)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-lg font-bold text-primary">{(student.lifetimePoints || 0).toLocaleString()} pts</div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-3">
                                                <p className="text-sm font-semibold mb-2">Points by Category:</p>
                                                {student.categoryPoints && Object.keys(student.categoryPoints).length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.entries(student.categoryPoints).sort(([, a], [, b]) => b - a).map(([category, points]) => (
                                                            <Badge key={category} variant="outline" className="font-normal">
                                                                {category}: <span className="font-bold ml-1.5">{points.toLocaleString()}</span>
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">No category data available.</p>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardContent>
                        </Card>
                    )}

                    {(!topStudents || topStudents.length === 0) && (
                        <Card>
                            <CardContent className="p-10 text-center text-muted-foreground">
                                No students have earned points yet.
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                /* ===== GRAPHIC MODE ===== */
                <div className="relative z-10 max-w-2xl mx-auto px-6 pt-10">
                    {/* Dark header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Trophy className="w-8 h-8 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                            <div>
                                <h1 className="text-2xl font-bold text-white">Hall of Fame</h1>
                                <p className="text-xs text-white/40">{schoolId?.replace(/_/g, ' ')}</p>
                            </div>
                        </div>
                        <Button asChild variant="ghost" size="sm" className="text-white/50 hover:text-white hover:bg-white/10">
                            <Link href="/portal"><ArrowLeft className="mr-2 h-4 w-4" /> Back to portal</Link>
                        </Button>
                    </div>

                    {/* Podium */}
                    {podium.length > 0 && (
                        <div className="grid grid-cols-3 gap-4 items-end mb-10">
                            {/* 2nd Place */}
                            {podium.length > 1 ? (
                                <div className="text-center">
                                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 relative">
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-white font-bold text-sm shadow-lg">2</div>
                                        <Avatar className="w-16 h-16 mx-auto mb-2 border-2 border-slate-400/50">
                                            <AvatarFallback className="bg-slate-800 text-slate-300 text-lg">{getInitials(podium[1].firstName, podium[1].lastName)}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-bold text-white text-sm truncate">{podium[1].firstName}</p>
                                        <p className="text-amber-400 font-bold text-sm mt-1">{(podium[1].lifetimePoints || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            ) : <div />}
                            {/* 1st Place */}
                            <div className="text-center">
                                <div className="bg-gradient-to-b from-amber-500/20 to-amber-900/30 backdrop-blur-sm border border-amber-400/30 rounded-2xl p-5 relative shadow-[0_0_30px_rgba(251,191,36,0.15)]">
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                                        <Crown className="w-8 h-8 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                                    </div>
                                    <Avatar className="w-20 h-20 mx-auto mb-2 border-2 border-amber-400/50">
                                        <AvatarFallback className="bg-amber-900/50 text-amber-300 text-xl">{getInitials(podium[0].firstName, podium[0].lastName)}</AvatarFallback>
                                    </Avatar>
                                    <p className="font-bold text-white text-sm truncate">{podium[0].firstName}</p>
                                    <p className="text-amber-400 font-black text-lg mt-1">{(podium[0].lifetimePoints || 0).toLocaleString()}</p>
                                </div>
                            </div>
                            {/* 3rd Place */}
                            {podium.length > 2 ? (
                                <div className="text-center">
                                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 relative">
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">3</div>
                                        <Avatar className="w-14 h-14 mx-auto mb-2 border-2 border-orange-500/50">
                                            <AvatarFallback className="bg-orange-900/50 text-orange-300 text-lg">{getInitials(podium[2].firstName, podium[2].lastName)}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-bold text-white text-sm truncate">{podium[2].firstName}</p>
                                        <p className="text-amber-400 font-bold text-sm mt-1">{(podium[2].lifetimePoints || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            ) : <div />}
                        </div>
                    )}

                    {/* Leaderboard list */}
                    {others.length > 0 && (
                        <div className="mt-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-white/5">
                                <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Leaderboard</h3>
                            </div>
                            <div className="divide-y divide-white/5">
                                {others.map((student, index) => (
                                    <div key={student.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-white/30 w-6 text-center">{index + 4}</span>
                                            <Avatar className="w-8 h-8">
                                                <AvatarFallback className="bg-white/10 text-white/60 text-xs">{getInitials(student.firstName, student.lastName)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-bold text-white text-sm">{student.firstName} {student.lastName}</p>
                                                <p className="text-xs text-white/30">{getClassName(student.classId)}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-amber-400">{(student.lifetimePoints || 0).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(!topStudents || topStudents.length === 0) && (
                        <div className="text-center py-20 text-white/30">
                            No students have earned points yet.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
