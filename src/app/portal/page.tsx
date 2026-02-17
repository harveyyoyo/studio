'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, User, UserCog, GraduationCap } from 'lucide-react';

export default function PortalPage() {
    const { loginState, isInitialized, schoolId } = useAppContext();
    const router = useRouter();

    useEffect(() => {
        if (isInitialized && loginState !== 'school') {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);

    if (!isInitialized || loginState !== 'school') {
        return <p>Loading...</p>;
    }

    return (
        <div className="flex flex-col items-center justify-center py-10">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold font-headline">Welcome to {schoolId?.replace(/_/g, ' ')}</h1>
                <p className="text-muted-foreground">Please select your portal to continue.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                <Link href="/student" className="group">
                    <Card className="h-full border-t-4 border-emerald-500 hover:shadow-xl hover:border-emerald-600 transition-all transform hover:-translate-y-1">
                        <CardHeader>
                            <GraduationCap className="w-10 h-10 mb-2 text-emerald-500" />
                            <CardTitle>Student Portal</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                Access your points and rewards <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/teacher" className="group">
                    <Card className="h-full border-t-4 border-blue-500 hover:shadow-xl hover:border-blue-600 transition-all transform hover:-translate-y-1">
                        <CardHeader>
                            <User className="w-10 h-10 mb-2 text-blue-500" />
                            <CardTitle>Teacher Portal</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                Award points and manage your students <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/admin" className="group">
                    <Card className="h-full border-t-4 border-purple-500 hover:shadow-xl hover:border-purple-600 transition-all transform hover:-translate-y-1">
                        <CardHeader>
                            <UserCog className="w-10 h-10 mb-2 text-purple-500" />
                            <CardTitle>Admin Portal</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                Manage all school data and settings <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
