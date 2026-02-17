'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Coupon } from '@/lib/types';
import { Users, ArrowLeft, Printer, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function TeacherPage() {
    const { loginState, isInitialized, db, addCoupons, setCouponsToPrint, addCategory, isDbLoading } = useAppContext();
    const router = useRouter();
    const { toast } = useToast();

    const [printTeacher, setPrintTeacher] = useState(db.teachers?.[0]?.name || '');
    const [printCategory, setPrintCategory] = useState(db.categories?.[0] || '');
    const [printValue, setPrintValue] = useState('10');
    
    const [isPrintCategoryDialogOpen, setIsPrintCategoryDialogOpen] = useState(false);
    const [newPrintCategoryName, setNewPrintCategoryName] = useState('');

    useEffect(() => {
        if (isInitialized && loginState !== 'school') {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);
    
    useEffect(() => {
        if (db.teachers?.length > 0 && !printTeacher) {
            setPrintTeacher(db.teachers[0].name);
        }
        if (db.categories?.length > 0 && !printCategory) {
          setPrintCategory(db.categories[0]);
        }
    }, [db.teachers, db.categories, printTeacher, printCategory]);

    const handleAddPrintCategory = async () => {
        if (!newPrintCategoryName) return;
        await addCategory(newPrintCategoryName);
        setPrintCategory(newPrintCategoryName);
        setNewPrintCategoryName('');
        setIsPrintCategoryDialogOpen(false);
        toast({ title: 'Category Added' });
    };

    const handlePrintSheet = async () => {
        const value = parseInt(printValue);
        if (!printTeacher) {
            toast({ variant: 'destructive', title: 'Please select a teacher.' });
            return;
        }
        if (!value || value <= 0) {
          toast({
            variant: 'destructive',
            title: 'Invalid Value',
            description: 'Coupon value must be a positive number.',
          });
          return;
        }
        const coupons: Coupon[] = Array.from({ length: 24 }, () => {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          return {
            code,
            value: value,
            category: printCategory,
            teacher: printTeacher,
            used: false,
            createdAt: Date.now(),
          };
        });
        await addCoupons(coupons);
        setCouponsToPrint(coupons);
    };

    if (!isInitialized || loginState !== 'school' || isDbLoading) {
        return <p>Loading...</p>;
    }
    
    return (
         <div className="space-y-6">
             <Card className="bg-card border-t-4 border-chart-1">
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2"><Printer className="text-chart-1"/>Teacher Portal</CardTitle>
                        <CardDescription>Create coupon print sheets.</CardDescription>
                    </div>
                    <Button asChild variant="outline"><Link href="/portal"><ArrowLeft className="mr-2"/> Back to Portal</Link></Button>
                </CardHeader>
            </Card>

            <div className="flex justify-center">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Printer className="text-primary" /> Coupon Printer
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 items-end">
                       <div>
                            <Label>Issue By</Label>
                            <Select value={printTeacher} onValueChange={setPrintTeacher}>
                              <SelectTrigger><SelectValue placeholder="Select a teacher..." /></SelectTrigger>
                              <SelectContent>
                                {db.teachers?.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                        </div>
                      <div>
                        <Label>Category</Label>
                        <div className="flex items-center gap-2">
                            <Select value={printCategory} onValueChange={setPrintCategory}>
                              <SelectTrigger><SelectValue placeholder="Select a category..."/></SelectTrigger>
                              <SelectContent>
                                {db.categories?.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                             <Dialog open={isPrintCategoryDialogOpen} onOpenChange={setIsPrintCategoryDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0"><Plus className="h-4 w-4" /></Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add New Category</DialogTitle>
                                        <DialogDescription>Create a new category for coupons.</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <Label htmlFor="new-print-category-name">Category Name</Label>
                                        <Input id="new-print-category-name" value={newPrintCategoryName} onChange={e => setNewPrintCategoryName(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddPrintCategory()} />
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleAddPrintCategory}>Save Category</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                      </div>
                      <div>
                        <Label>Value</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 25"
                          value={printValue}
                          onChange={(e) => setPrintValue(e.target.value)}
                        />
                      </div>
                      <Button onClick={handlePrintSheet} className="w-full font-bold gap-2">
                        <Printer /> Print Sheet (24)
                      </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
