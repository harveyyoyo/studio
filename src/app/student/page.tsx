'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserGraduate } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/components/AppProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function StudentLoginPage() {
    const { loginState, isInitialized } = useAppContext();
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
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-full mb-4">
                        <UserGraduate className="w-12 h-12 text-emerald-500" />
                    </div>
                    <CardTitle className="font-headline text-2xl">Student Portal</CardTitle>
                    <CardDescription>This is a placeholder for the student login page.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-6">The login functionality for students will be built here.</p>
                    <Button asChild>
                        <Link href="/portal">Back to Portal Selection</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
