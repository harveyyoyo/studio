'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { rewards, Reward } from '@/lib/rewards';

export default function PrizePage() {
    return (
        <div className="space-y-6">
            <Card className="bg-card border-t-4 border-chart-3">
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2">
                            <ShoppingBag className="text-chart-3" /> Prize Shop
                        </CardTitle>
                        <CardDescription>Browse the available prizes you can get with your points.</CardDescription>
                    </div>
                    <Button asChild variant="outline"><Link href="/portal"><ArrowLeft className="mr-2"/> Back to Portal</Link></Button>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((reward: Reward) => (
                    <Card key={reward.name} className="p-4 flex flex-col items-center justify-between text-center bg-background dark:bg-card transition-all hover:shadow-xl hover:-translate-y-1">
                        <div className="p-6 bg-accent rounded-full mb-3 text-primary">
                            {reward.icon}
                        </div>
                        <p className="font-bold text-xl">{reward.name}</p>
                        <Badge variant="secondary" className="my-3 text-lg font-bold">{reward.points.toLocaleString()} pts</Badge>
                        <Button disabled>Redeem in Student Portal</Button>
                    </Card>
                ))}
            </div>
        </div>
    )
}
