'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, User, UserCog, GraduationCap, ShoppingBag } from 'lucide-react';

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
                <Link href="/student" className="group">
                    <Card className="h-full border-t-4 border-primary hover:shadow-xl hover:border-primary/80 transition-all transform hover:-translate-y-1">
                        <CardHeader>
                            <GraduationCap className="w-10 h-10 mb-2 text-primary" />
                            <CardTitle>Student Portal</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                Check points, redeem coupons & prizes <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/teacher" className="group">
                    <Card className="h-full border-t-4 border-chart-1 hover:shadow-xl hover:border-chart-1/80 transition-all transform hover:-translate-y-1">
                        <CardHeader>
                            <User className="w-10 h-10 mb-2 text-chart-1" />
                            <CardTitle>Teacher Portal</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                Award points and manage your students <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/admin" className="group">
                    <Card className="h-full border-t-4 border-chart-2 hover:shadow-xl hover:border-chart-2/80 transition-all transform hover:-translate-y-1">
                        <CardHeader>
                            <UserCog className="w-10 h-10 mb-2 text-chart-2" />
                            <CardTitle>Admin Portal</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                Manage all school data and settings <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/prize" className="group">
                    <Card className="h-full border-t-4 border-chart-3 hover:shadow-xl hover:border-chart-3/80 transition-all transform hover:-translate-y-1">
                        <CardHeader>
                            <ShoppingBag className="w-10 h-10 mb-2 text-chart-3" />
                            <CardTitle>Prize Shop</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                Browse all available prizes <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
