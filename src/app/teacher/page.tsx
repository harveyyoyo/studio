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
import { ArrowLeft, Printer, Plus, LogIn, LogOut, UserCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function TeacherPrinter({ teacherName, onLogout }: { teacherName: string, onLogout: () => void }) {
    const { db, addCoupons, setCouponsToPrint, addCategory } = useAppContext();
    const { toast } = useToast();

    const [printCategory, setPrintCategory] = useState(db.categories?.[0] || '');
    const [printValue, setPrintValue] = useState('10');
    
    const [isPrintCategoryDialogOpen, setIsPrintCategoryDialogOpen] = useState(false);
    const [newPrintCategoryName, setNewPrintCategoryName] = useState('');

    useEffect(() => {
        if (db.categories?.length > 0 && !printCategory) {
          setPrintCategory(db.categories[0]);
        }
    }, [db.categories, printCategory]);

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
        if (!teacherName) {
            toast({ variant: 'destructive', title: 'An error occurred. Please log in again.' });
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
            teacher: teacherName,
            used: false,
            createdAt: Date.now(),
          };
        });
        await addCoupons(coupons);
        setCouponsToPrint(coupons);
    };
    
    return (
        <div className="space-y-6">
             <Card className="bg-card border-t-4 border-chart-1">
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2"><Printer className="text-chart-1"/>Teacher Portal</CardTitle>
                        <CardDescription>Create coupon print sheets.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                           <p className="text-sm text-muted-foreground">Logged in as</p>
                           <p className="font-bold flex items-center gap-2"><UserCheck className="w-4 h-4 text-primary" /> {teacherName}</p>
                        </div>
                        <Button variant="outline" onClick={onLogout}><LogOut className="mr-2"/> Log Out</Button>
                   </div>
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
    )
}


export default function TeacherPage() {
    const { loginState, isInitialized, db, isDbLoading } = useAppContext();
    const router = useRouter();
    const [loggedInTeacher, setLoggedInTeacher] = useState<string | null>(null);
    const [selectedLoginName, setSelectedLoginName] = useState('Admin');

    useEffect(() => {
        if (isInitialized && loginState !== 'school') {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);

    const handleLogin = () => {
        if (selectedLoginName) {
            setLoggedInTeacher(selectedLoginName);
        }
    };

    const handleLogout = () => {
        setLoggedInTeacher(null);
    };

    if (!isInitialized || loginState !== 'school' || isDbLoading) {
        return <p>Loading...</p>;
    }
    
    if (loggedInTeacher) {
        return <TeacherPrinter teacherName={loggedInTeacher} onLogout={handleLogout} />;
    }

    return (
        <div className="flex flex-col items-center justify-center py-10">
            <Card className="w-full max-w-md border-t-4 border-chart-1">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold font-headline">Teacher Portal Login</CardTitle>
                    <CardDescription>Select your name to continue.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="teacher-name">Select Your Name</Label>
                        <Select value={selectedLoginName} onValueChange={setSelectedLoginName}>
                          <SelectTrigger id="teacher-name"><SelectValue /></SelectTrigger>
                          <SelectContent>
                             <SelectItem value="Admin">Admin</SelectItem>
                            {db.teachers?.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleLogin} className="w-full font-bold">
                       <LogIn className="mr-2" /> Log In
                    </Button>
                    <div className="text-center mt-6">
                        <Button asChild variant="link" className="text-xs h-auto p-0">
                            <Link href="/portal"><ArrowLeft className="mr-2"/> Back to Portal Selection</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
