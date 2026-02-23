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
import type { Coupon, Category, Teacher } from '@/lib/types';
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
import { Coupon as CouponPreview } from '@/components/Coupon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';


function TeacherPrinter({ teacherName, onLogout }: { teacherName: string, onLogout: () => void }) {
    const { addCoupons, setCouponsToPrint, addCategory, schoolId } = useAppContext();
    const { toast } = useToast();
    const firestore = useFirestore();

    const categoriesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null, [firestore, schoolId]);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

    const [printCategoryId, setPrintCategoryId] = useState('');
    const [printValue, setPrintValue] = useState('10');
    
    const [isPrintCategoryDialogOpen, setIsPrintCategoryDialogOpen] = useState(false);
    const [newPrintCategoryName, setNewPrintCategoryName] = useState('');
    const [newPrintCategoryPoints, setNewPrintCategoryPoints] = useState('10');

    useEffect(() => {
        if (categories && categories.length > 0 && !printCategoryId) {
          setPrintCategoryId(categories[0].id);
        }
    }, [categories, printCategoryId]);

     useEffect(() => {
        const category = categories?.find(c => c.id === printCategoryId);
        if (category) {
            setPrintValue(category.points.toString());
        }
    }, [printCategoryId, categories]);

    const handleAddPrintCategory = async () => {
        if (!newPrintCategoryName || !newPrintCategoryPoints) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please provide a name and point value for the category.',
            });
            return;
        }
        const points = parseInt(newPrintCategoryPoints);
        if (isNaN(points) || points <= 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid Points',
                description: 'Points must be a positive number.',
            });
            return;
        }
        const newCategory = await addCategory({ name: newPrintCategoryName, points });
        if (newCategory) {
            setPrintCategoryId(newCategory.id);
        }
        setNewPrintCategoryName('');
        setNewPrintCategoryPoints('10');
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
        const selectedCategory = categories?.find(c => c.id === printCategoryId);
        if (!selectedCategory) {
            toast({
                variant: 'destructive',
                title: 'Category Not Found',
                description: 'Please select a valid category.',
            });
            return;
        }
        const couponsToCreate: Coupon[] = Array.from({ length: 24 }, () => {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          return {
            id: code,
            code,
            value: value,
            category: selectedCategory.name,
            teacher: teacherName,
            used: false,
            createdAt: Date.now(),
          };
        });
        await addCoupons(couponsToCreate);
        setCouponsToPrint(couponsToCreate);
    };

    const selectedCategoryForPreview = categories?.find(c => c.id === printCategoryId);
    const previewCoupon: Coupon = {
      id: 'PREVIEW',
      code: 'PREVIEW',
      value: parseInt(printValue) || 0,
      category: selectedCategoryForPreview?.name || 'Category',
      teacher: teacherName,
      used: false,
      createdAt: Date.now(),
    };
    
    return (
        <TooltipProvider>
            <div className="space-y-6">
                 <Card className="bg-card border-t-4 border-chart-1">
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="font-headline text-2xl flex items-center gap-2"><Printer className="text-chart-1"/>Teacher Portal</CardTitle>
                            <CardDescription>Create coupon print sheets.</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                            <div className="text-left sm:text-right">
                               <p className="text-sm text-muted-foreground">Logged in as</p>
                               <p className="font-bold flex items-center gap-2"><UserCheck className="w-4 h-4 text-primary" /> {teacherName}</p>
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" onClick={onLogout} className="w-full sm:w-auto"><LogOut className="mr-2"/> Log Out</Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Return to the teacher selection screen.</p>
                                </TooltipContent>
                            </Tooltip>
                       </div>
                    </CardHeader>
                </Card>

                <div className="flex justify-center">
                    <Card className="w-full max-w-4xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                               <Printer className="text-primary" /> Coupon Printer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col md:flex-row gap-6">
                            {categoriesLoading ? <Skeleton className="h-48 w-full" /> : (
                            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                <div>
                                    <Label>Category</Label>
                                    <div className="flex items-center gap-2">
                                        <Select value={printCategoryId} onValueChange={setPrintCategoryId}>
                                        <SelectTrigger><SelectValue placeholder="Select a category..."/></SelectTrigger>
                                        <SelectContent>
                                            {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                        </Select>
                                        <Dialog open={isPrintCategoryDialogOpen} onOpenChange={setIsPrintCategoryDialogOpen}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0"><Plus className="h-4 w-4" /></Button>
                                                    </DialogTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Add a new coupon category.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Add New Category</DialogTitle>
                                                    <DialogDescription>Create a new category for coupons.</DialogDescription>
                                                </DialogHeader>
                                                 <div className="grid grid-cols-3 items-center gap-4 py-4">
                                                    <Label htmlFor="new-print-category-name" className="text-right">Name</Label>
                                                    <Input id="new-print-category-name" value={newPrintCategoryName} onChange={e => setNewPrintCategoryName(e.target.value)} className="col-span-2" />

                                                    <Label htmlFor="new-print-category-points" className="text-right">Points</Label>
                                                    <Input id="new-print-category-points" type="number" value={newPrintCategoryPoints} onChange={e => setNewPrintCategoryPoints(e.target.value)} className="col-span-2" />
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
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button onClick={handlePrintSheet} className="w-full font-bold gap-2 sm:col-span-2">
                                            <Printer /> Print Sheet (24 Coupons)
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Generate and print a full sheet of 24 coupons with these settings.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            )}
                             <div className="w-full md:w-1/3 flex flex-col items-center flex-shrink-0">
                                <Label className="font-semibold text-muted-foreground">Live Preview</Label>
                                <div className="mt-2 w-full max-w-[240px] aspect-[2/1]">
                                    <CouponPreview coupon={previewCoupon} schoolId={schoolId} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TooltipProvider>
    )
}


export default function TeacherPage() {
    const { loginState, isInitialized, schoolId } = useAppContext();
    const router = useRouter();
    const firestore = useFirestore();

    const [loggedInTeacher, setLoggedInTeacher] = useState<string | null>(null);
    const [selectedLoginName, setSelectedLoginName] = useState('Admin');

    const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null, [firestore, schoolId]);
    const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);


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

    if (!isInitialized || loginState !== 'school') {
        return <p>Loading...</p>;
    }
    
    if (loggedInTeacher) {
        return <TeacherPrinter teacherName={loggedInTeacher} onLogout={handleLogout} />;
    }

    return (
        <TooltipProvider>
            <div className="flex flex-col items-center justify-center py-10">
                <Card className="w-full max-w-md border-t-4 border-chart-1">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold font-headline">Teacher Portal Login</CardTitle>
                        <CardDescription>Select your name to continue.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {teachersLoading ? <Skeleton className="h-10 w-full" /> : (
                        <div>
                            <Label htmlFor="teacher-name">Select Your Name</Label>
                            <Select value={selectedLoginName} onValueChange={setSelectedLoginName}>
                              <SelectTrigger id="teacher-name"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="Admin">Admin</SelectItem>
                                {teachers?.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                        </div>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={handleLogin} className="w-full font-bold" disabled={teachersLoading}>
                                   <LogIn className="mr-2" /> Log In
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Log in as the selected teacher to access the coupon printer.</p>
                            </TooltipContent>
                        </Tooltip>
                        <div className="text-center mt-6">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="link" className="text-xs h-auto p-0">
                                        <Link href="/portal"><ArrowLeft className="mr-2"/> Back to Portal Selection</Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Return to the main portal selection screen.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}
