'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function HallOfFamePage() {
    const { loginState, isInitialized, schoolId, db, getClassName } = useAppContext();
    const router = useRouter();

    useEffect(() => {
        if (isInitialized && loginState !== 'school') {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);

    if (!isInitialized || loginState !== 'school') {
        return <p>Loading...</p>;
    }

    const studentsWithLifetimePoints = db.students.map(student => {
        const pointsSpent = student.history
            .filter(h => h.amount < 0)
            .reduce((sum, h) => sum + Math.abs(h.amount), 0);
        const lifetimePoints = student.points + pointsSpent;
        return { ...student, lifetimePoints };
    });

    const topStudents = studentsWithLifetimePoints.sort((a, b) => b.lifetimePoints - a.lifetimePoints);

    const podium = topStudents.slice(0, 3);
    const others = topStudents.slice(3);

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    }

    return (
        <div className="space-y-6">
            <Card className="bg-card border-b-4 border-amber-400 dark:border-amber-500 p-6 shadow-lg">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
                            <Trophy className="text-amber-500" /> Hall of Fame
                        </h2>
                        <CardDescription>Top all-time point earners at {schoolId?.replace(/_/g, ' ')}</CardDescription>
                    </div>
                    <Button asChild variant="secondary" size="sm">
                       <Link href="/portal"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Portal</Link>
                    </Button>
                </div>
            </Card>
            
            {podium.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center items-end pt-8">
                    {/* 2nd Place */}
                    {podium.length > 1 && (
                        <div className={'md:order-2'}>
                            <Card className="relative p-6 border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-300 dark:bg-slate-600 text-white font-bold rounded-full w-12 h-12 flex items-center justify-center text-xl">2</div>
                                <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-slate-300 dark:border-slate-600">
                                    <AvatarFallback className="text-3xl bg-secondary">{getInitials(podium[1].firstName, podium[1].lastName)}</AvatarFallback>
                                </Avatar>
                                <p className="font-bold text-xl truncate">{podium[1].firstName} {podium[1].lastName}</p>
                                <p className="text-muted-foreground text-sm">{getClassName(podium[1].classId || '')}</p>
                                <p className="text-2xl font-bold text-primary mt-2">{podium[1].lifetimePoints.toLocaleString()} pts</p>
                            </Card>
                        </div>
                    )}

                    {/* 1st Place */}
                    <div className="md:order-1">
                         <Card className="relative p-8 border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30">
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-amber-400 dark:bg-amber-500 text-white font-bold rounded-full w-16 h-16 flex items-center justify-center text-3xl"><Trophy/></div>
                            <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-amber-400 dark:border-amber-500">
                                <AvatarFallback className="text-4xl bg-secondary">{getInitials(podium[0].firstName, podium[0].lastName)}</AvatarFallback>
                            </Avatar>
                            <p className="font-bold text-2xl truncate">{podium[0].firstName} {podium[0].lastName}</p>
                            <p className="text-muted-foreground">{getClassName(podium[0].classId || '')}</p>
                            <p className="text-4xl font-bold text-primary mt-2">{podium[0].lifetimePoints.toLocaleString()} pts</p>
                        </Card>
                    </div>
                    
                    {/* 3rd Place */}
                     {podium.length > 2 && (
                        <div className={'md:order-3'}>
                            <Card className="relative p-4 border-2 border-orange-400/50 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-orange-400/80 dark:bg-orange-700 text-white font-bold rounded-full w-10 h-10 flex items-center justify-center text-lg">3</div>
                                <Avatar className="w-20 h-20 mx-auto mb-3 border-4 border-orange-400/50 dark:border-orange-700">
                                    <AvatarFallback className="text-2xl bg-secondary">{getInitials(podium[2].firstName, podium[2].lastName)}</AvatarFallback>
                                </Avatar>
                                <p className="font-bold text-lg truncate">{podium[2].firstName} {podium[2].lastName}</p>
                                <p className="text-muted-foreground text-sm">{getClassName(podium[2].classId || '')}</p>
                                <p className="text-xl font-bold text-primary mt-2">{podium[2].lifetimePoints.toLocaleString()} pts</p>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {/* Rest of the leaderboard */}
            {others.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Leaderboard</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {others.map((student, index) => (
                                <li key={student.id} className="flex items-center justify-between p-3 rounded-md bg-secondary border">
                                    <div className="flex items-center gap-4">
                                        <div className="text-lg font-bold text-muted-foreground w-6 text-center">{index + 4}</div>
                                        <Avatar className="w-10 h-10">
                                            <AvatarFallback className="bg-background">{getInitials(student.firstName, student.lastName)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold">{student.firstName} {student.lastName}</p>
                                            <p className="text-xs text-muted-foreground">{getClassName(student.classId || '')}</p>
                                        </div>
                                    </div>
                                    <div className="text-lg font-bold text-primary">{student.lifetimePoints.toLocaleString()} pts</div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {topStudents.length === 0 && (
                 <Card>
                    <CardContent className="p-10 text-center text-muted-foreground">
                        No students have earned points yet.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
