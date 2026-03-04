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
import type { Coupon, Category, Teacher, Student, Class } from '@/lib/types';
import { ArrowLeft, Printer, Plus, LogIn, LogOut, UserCheck, Award, User, Search, Users } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
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
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SchoolGate } from '@/components/SchoolGate';


function TeacherPrinterInner({ teacherName, onLogout }: { teacherName: string, onLogout: () => void }) {
    const { addCoupons, setCouponsToPrint, addCategory, schoolId, awardPoints, awardPointsToClass } = useAppContext();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';
    const playSound = useArcadeSound();

    const categoriesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null, [firestore, schoolId]);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

    const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'students') : null, [firestore, schoolId]);
    const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
    
    const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

    // State for coupon printing
    const [printCategoryId, setPrintCategoryId] = useState('');
    const [printValue, setPrintValue] = useState('10');
    const [isPrintCategoryDialogOpen, setIsPrintCategoryDialogOpen] = useState(false);
    const [newPrintCategoryName, setNewPrintCategoryName] = useState('');
    const [newPrintCategoryPoints, setNewPrintCategoryPoints] = useState('10');

    // State for direct awarding
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentSearch, setStudentSearch] = useState('');
    const [awardCategoryId, setAwardCategoryId] = useState('');
    const [awardValue, setAwardValue] = useState('10');
    
    // State for bulk awarding
    const [bulkAwardClassId, setBulkAwardClassId] = useState('');
    const [bulkAwardCategoryId, setBulkAwardCategoryId] = useState('');
    const [bulkAwardValue, setBulkAwardValue] = useState('10');


    useEffect(() => {
        if (categories && categories.length > 0) {
            if (!printCategoryId) setPrintCategoryId(categories[0].id);
            if (!awardCategoryId) setAwardCategoryId(categories[0].id);
            if (!bulkAwardCategoryId) setBulkAwardCategoryId(categories[0].id);
        }
    }, [categories, printCategoryId, awardCategoryId, bulkAwardCategoryId]);

    useEffect(() => {
        const category = categories?.find(c => c.id === printCategoryId);
        if (category) {
            setPrintValue(category.points.toString());
        }
    }, [printCategoryId, categories]);

    useEffect(() => {
        const category = categories?.find(c => c.id === awardCategoryId);
        if (category) {
            setAwardValue(category.points.toString());
        }
    }, [awardCategoryId, categories]);

    useEffect(() => {
        const category = categories?.find(c => c.id === bulkAwardCategoryId);
        if (category) {
            setBulkAwardValue(category.points.toString());
        }
    }, [bulkAwardCategoryId, categories]);

    const handleAddPrintCategory = async () => {
        if (!newPrintCategoryName || !newPrintCategoryPoints) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please provide a name and point value for the category.',
            });
            return;
        }
        const points = parseInt(newPrintCategoryPoints);
        if (isNaN(points) || points <= 0) {
            playSound('error');
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
        playSound('success');
        toast({ title: 'Category Added' });
    };

    const handlePrintSheet = async () => {
        const value = parseInt(printValue);
        if (!teacherName) {
            playSound('error');
            toast({ variant: 'destructive', title: 'An error occurred. Please log in again.' });
            return;
        }
        if (!value || value <= 0) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Invalid Value',
                description: 'Coupon value must be a positive number.',
            });
            return;
        }
        const selectedCategory = categories?.find(c => c.id === printCategoryId);
        if (!selectedCategory) {
            playSound('error');
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
    
    const handleAwardPoints = async () => {
        const points = parseInt(awardValue);
        if (!selectedStudent) {
            playSound('error');
            toast({ variant: 'destructive', title: 'No student selected.' });
            return;
        }
        const selectedCategory = categories?.find(c => c.id === awardCategoryId);
        if (!selectedCategory) {
             playSound('error');
            toast({ variant: 'destructive', title: 'Please select a category.' });
            return;
        }
        if (isNaN(points) || points <= 0) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Points must be a positive number.' });
            return;
        }

        const result = await awardPoints(selectedStudent.id, points, selectedCategory.name);

        if (result.success) {
            let toastDescription = `Awarded ${points} points to ${selectedStudent.firstName}.`;
            if(result.bonusTotal && result.bonusTotal > 0) {
              toastDescription += ` They also earned ${result.bonusTotal} bonus points from achievements!`;
            }
            playSound('success');
            toast({ title: 'Points Awarded!', description: toastDescription });
            setSelectedStudent(null);
            setStudentSearch('');
            if (categories && categories.length > 0) {
                setAwardValue(categories[0].points.toString());
            }
        } else {
            playSound('error');
            toast({ variant: 'destructive', title: 'Failed to award points', description: result.message });
        }
    };
    
    const handleBulkAward = async () => {
        const points = parseInt(bulkAwardValue);
        if (!bulkAwardClassId) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Please select a class.' });
            return;
        }
        const selectedCategory = categories?.find(c => c.id === bulkAwardCategoryId);
        if (!selectedCategory) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Please select a category.' });
            return;
        }
        if (isNaN(points) || points <= 0) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Points must be a positive number.' });
            return;
        }

        const result = await awardPointsToClass(bulkAwardClassId, points, selectedCategory.name);

        if (result.success) {
            playSound('success');
            toast({ title: 'Points Awarded!', description: `Awarded ${points} points to ${result.count} students in the selected class.` });
        } else {
            playSound('error');
            toast({ variant: 'destructive', title: 'Failed to award points', description: result.message });
        }
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

    const filteredStudents = (students || []).filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.nfcId || '').toLowerCase().includes(studentSearch.toLowerCase())
    ).sort((a,b) => a.lastName.localeCompare(b.lastName));

    const isLoading = categoriesLoading || studentsLoading || classesLoading;

    return (
        <TooltipProvider>
            <div className={`min-h-screen transition-colors duration-500 ${settings.displayMode === 'app' ? 'pb-24' : 'pb-8'}`}>
                <div className={`px-6 pt-10 pb-12 transition-colors duration-500 ${isGraphic ? 'bg-background/10 border-b border-border/20 shadow-lg' : 'bg-white border-b'}`}>
                    <div className="max-w-4xl mx-auto flex justify-between items-center">
                        <div>
                            <h1 className={`text-2xl font-black tracking-tight ${isGraphic ? 'text-foreground' : 'text-slate-800'}`}>Teacher Portal</h1>
                            <p className={`text-xs font-bold uppercase tracking-wider ${isGraphic ? 'text-chart-3' : 'text-primary'}`}>{teacherName}</p>
                            <p className={`text-xs mt-0.5 ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Generate coupon sheets or award points directly.</p>
                        </div>
                        <Button variant="outline" onClick={onLogout} className={`gap-2 ${isGraphic ? 'border-border text-muted-foreground hover:text-foreground hover:bg-accent' : ''}`}>
                            <LogOut className="w-4 h-4" /> Switch Teacher
                        </Button>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-6 -mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        <Card className={`border-t-4 transition-all ${isGraphic
                            ? 'bg-card/50 backdrop-blur-md border-primary shadow-2xl'
                            : 'bg-white border-primary shadow-lg'
                            }`}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Printer className={isGraphic ? 'text-primary' : 'text-primary'} />
                                    Coupon Printer
                                </CardTitle>
                                <CardDescription className={isGraphic ? 'text-muted-foreground' : ''}>
                                    Generate a sheet of 24 unique QR codes.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? <Skeleton className="h-48 w-full rounded-xl" /> : (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className={`text-[10px] font-black uppercase tracking-widest ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Category</Label>
                                                <div className="flex items-center gap-2">
                                                    <Select value={printCategoryId} onValueChange={setPrintCategoryId}>
                                                        <SelectTrigger className={`rounded-xl h-12 ${isGraphic ? 'bg-foreground/5 border-border text-foreground' : ''}`}>
                                                            <SelectValue placeholder="Select..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <Dialog open={isPrintCategoryDialogOpen} onOpenChange={setIsPrintCategoryDialogOpen}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="icon" className={`h-12 w-12 rounded-xl ${isGraphic ? 'bg-foreground/5 border-border' : ''}`}>
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className={isGraphic ? 'bg-background text-foreground border-border' : ''}>
                                                            <DialogHeader>
                                                                <DialogTitle>Add Category</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="grid gap-4 py-4">
                                                                <div className="grid grid-cols-4 items-center gap-4">
                                                                    <Label htmlFor="name" className="text-right">Name</Label>
                                                                    <Input id="name" value={newPrintCategoryName} onChange={e => setNewPrintCategoryName(e.target.value)} className={`col-span-3 ${isGraphic ? 'bg-foreground/5 border-border' : ''}`} />
                                                                </div>
                                                                <div className="grid grid-cols-4 items-center gap-4">
                                                                    <Label htmlFor="pts" className="text-right">Points</Label>
                                                                    <Input id="pts" type="number" value={newPrintCategoryPoints} onChange={e => setNewPrintCategoryPoints(e.target.value)} className={`col-span-3 ${isGraphic ? 'bg-foreground/5 border-border' : ''}`} />
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <Button onClick={handleAddPrintCategory} className="rounded-xl">Save</Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className={`text-[10px] font-black uppercase tracking-widest ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Points Value</Label>
                                                <Input type="number" value={printValue} onChange={(e) => setPrintValue(e.target.value)} className={`h-12 rounded-xl text-lg font-black ${isGraphic ? 'bg-foreground/5 border-border text-foreground' : 'bg-slate-50'}`} />
                                            </div>
                                        </div>

                                        <Button onClick={handlePrintSheet} className={`w-full font-black text-lg uppercase tracking-widest h-14 rounded-2xl shadow-xl transition-all active:scale-95 text-primary-foreground ${isGraphic ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20' : 'bg-slate-800 hover:bg-slate-700'
                                            }`}>
                                            <Printer className="w-5 h-5 mr-3" /> Generate Sheet
                                        </Button>

                                        <div className="flex flex-col items-center pt-6 border-t border-dashed border-border/50">
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-4 opacity-40`}>Preview</p>
                                            <div className="w-full max-w-[220px] shadow-2xl rounded-lg overflow-hidden border border-border/50">
                                                <CouponPreview coupon={previewCoupon} schoolId={schoolId} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className={`border-t-4 transition-all ${isGraphic
                            ? 'bg-card/50 backdrop-blur-md border-chart-2 shadow-2xl'
                            : 'bg-white border-chart-2 shadow-lg'
                            }`}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className={isGraphic ? 'text-chart-2' : 'text-chart-2'} />
                                    Award Points
                                </CardTitle>
                                <CardDescription className={isGraphic ? 'text-muted-foreground' : ''}>
                                    Award points to a single student or an entire class.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                               <Tabs defaultValue="direct">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="direct"><User className="mr-2 h-4 w-4"/>Direct</TabsTrigger>
                                        <TabsTrigger value="bulk"><Users className="mr-2 h-4 w-4"/>Bulk</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="direct" className="pt-4">
                                        {isLoading ? <Skeleton className="h-48 w-full" /> : (
                                            selectedStudent ? (
                                                <div className="space-y-4 animate-in fade-in">
                                                    <div className="p-3 rounded-xl bg-secondary/30 border flex justify-between items-center">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Awarding to:</p>
                                                            <p className="font-bold">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                                                        </div>
                                                        <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>Change</Button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className={`text-[10px] font-black uppercase tracking-widest ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Category</Label>
                                                        <Select value={awardCategoryId} onValueChange={setAwardCategoryId}>
                                                            <SelectTrigger className={`rounded-xl h-12 ${isGraphic ? 'bg-foreground/5 border-border text-foreground' : ''}`}>
                                                                <SelectValue placeholder="Select..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className={`text-[10px] font-black uppercase tracking-widest ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Points Value</Label>
                                                        <Input type="number" value={awardValue} onChange={(e) => setAwardValue(e.target.value)} className={`h-12 rounded-xl text-lg font-black ${isGraphic ? 'bg-foreground/5 border-border text-foreground' : 'bg-slate-50'}`} />
                                                    </div>
                                                    <Button onClick={handleAwardPoints} className={`w-full font-black text-lg uppercase tracking-widest h-14 rounded-2xl shadow-xl transition-all active:scale-95 text-white ${isGraphic ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20' : 'bg-slate-800 hover:bg-slate-700'}`}>
                                                        <Award className="w-5 h-5 mr-3" /> Award Points
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                                                        <Input placeholder="Search for a student..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="pl-10 h-12 rounded-xl" />
                                                    </div>
                                                    <ScrollArea className="h-64 border rounded-xl">
                                                        {filteredStudents.length > 0 ? (
                                                            <ul className="p-2 space-y-1">
                                                                {filteredStudents.map(student => (
                                                                    <li key={student.id}>
                                                                        <button onClick={() => setSelectedStudent(student)} className="w-full text-left p-3 rounded-lg hover:bg-accent flex items-center gap-3 transition-colors">
                                                                            <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                                                {student.firstName[0]}{student.lastName[0]}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-bold text-sm">{student.lastName}, {student.firstName}</p>
                                                                                <p className="text-xs text-muted-foreground">ID: {student.nfcId}</p>
                                                                            </div>
                                                                        </button>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                                                                <User className="w-10 h-10 mb-2 opacity-50"/>
                                                                <p className="text-sm font-medium">No students found.</p>
                                                            </div>
                                                        )}
                                                    </ScrollArea>
                                                </div>
                                            )
                                        )}
                                    </TabsContent>
                                    <TabsContent value="bulk" className="pt-4">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className={`text-[10px] font-black uppercase tracking-widest ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Class</Label>
                                                <Select value={bulkAwardClassId} onValueChange={setBulkAwardClassId}>
                                                    <SelectTrigger className={`rounded-xl h-12 ${isGraphic ? 'bg-foreground/5 border-border text-foreground' : ''}`}>
                                                        <SelectValue placeholder="Select a class..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                             <div className="space-y-2">
                                                <Label className={`text-[10px] font-black uppercase tracking-widest ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Category</Label>
                                                <Select value={bulkAwardCategoryId} onValueChange={setBulkAwardCategoryId}>
                                                    <SelectTrigger className={`rounded-xl h-12 ${isGraphic ? 'bg-foreground/5 border-border text-foreground' : ''}`}>
                                                        <SelectValue placeholder="Select..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className={`text-[10px] font-black uppercase tracking-widest ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Points Value</Label>
                                                <Input type="number" value={bulkAwardValue} onChange={(e) => setBulkAwardValue(e.target.value)} className={`h-12 rounded-xl text-lg font-black ${isGraphic ? 'bg-foreground/5 border-border text-foreground' : 'bg-slate-50'}`} />
                                            </div>
                                            <Button onClick={handleBulkAward} className={`w-full font-black text-lg uppercase tracking-widest h-14 rounded-2xl shadow-xl transition-all active:scale-95 text-white ${isGraphic ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20' : 'bg-slate-800 hover:bg-slate-700'}`}>
                                                <Users className="w-5 h-5 mr-3" /> Award to Class
                                            </Button>
                                        </div>
                                    </TabsContent>
                               </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </div>

            </div>
        </TooltipProvider>
    );
}

import { ErrorBoundary } from '@/components/ErrorBoundary';

function TeacherPrinterSkeleton() {
    return (
        <div className="max-w-4xl mx-auto px-6 -mt-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-t-4 border-primary">
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-48 w-full rounded-xl" />
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-chart-2">
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-48 w-full rounded-xl" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function TeacherPrinter(props: { teacherName: string, onLogout: () => void }) {
    return (
        <ErrorBoundary name="TeacherPrinter">
            <SchoolGate fallback={<TeacherPrinterSkeleton />}>
                <TeacherPrinterInner {...props} />
            </SchoolGate>
        </ErrorBoundary>
    );
}


export default function TeacherPage() {
    const { loginState, isInitialized, schoolId } = useAppContext();
    const router = useRouter();
    const firestore = useFirestore();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';
    const playSound = useArcadeSound();

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
            playSound('login');
            setLoggedInTeacher(selectedLoginName);
        }
    };

    const handleLogout = () => {
        playSound('swoosh');
        setLoggedInTeacher(null);
    };

    if (!isInitialized || loginState !== 'school') {
        return (
            <div className={`min-h-screen flex items-center justify-center font-sans ${isGraphic ? 'bg-background text-primary' : 'bg-background text-muted-foreground'}`}>
                Loading...
            </div>
        );
    }

    if (loggedInTeacher) {
        return <TeacherPrinter teacherName={loggedInTeacher} onLogout={handleLogout} />;
    }

    return (
        <ErrorBoundary name="TeacherPage">
            <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-500 py-10 px-4 ${isGraphic ? 'bg-gradient-to-br from-indigo-950/20 to-slate-900/20' : 'bg-slate-100'}`}>
                <Card className={`w-full max-w-md border-t-8 transition-all ${isGraphic
                    ? 'bg-card/80 backdrop-blur-xl border-blue-500 shadow-[0_0_50px_hsl(var(--chart-1)/0.2)]'
                    : 'bg-white border-chart-1 shadow-2xl'
                    }`}>
                    <CardHeader className="text-center space-y-4">
                        <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 duration-300 ${isGraphic ? 'bg-primary text-primary-foreground' : 'bg-slate-800 text-white'
                            }`}>
                            <UserCheck className="w-10 h-10" />
                        </div>
                        <div>
                            <CardTitle className={`text-2xl font-black tracking-tight ${isGraphic ? 'text-foreground' : 'text-slate-800'}`}>Teacher Portal</CardTitle>
                            <CardDescription className={isGraphic ? 'text-muted-foreground' : ''}>Select your name to start granting rewards.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {teachersLoading ? <Skeleton className="h-10 w-full" /> : (
                            <div className="space-y-2">
                                <Label htmlFor="teacher-name" className={`text-[10px] font-black uppercase tracking-widest ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Select Your Name</Label>
                                <Select value={selectedLoginName} onValueChange={setSelectedLoginName}>
                                    <SelectTrigger id="teacher-name" className={`h-14 rounded-xl text-lg font-bold ${isGraphic ? 'bg-foreground/5 border-border' : 'bg-slate-50'}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Admin">Admin</SelectItem>
                                        {teachers?.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <Button onClick={handleLogin} className={`w-full h-16 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl transition-all active:scale-95 text-primary-foreground ${isGraphic ? 'bg-primary hover:bg-primary/90 shadow-primary/20' : 'bg-slate-800 hover:bg-slate-700'
                            }`} disabled={teachersLoading}>
                            <LogIn className="mr-3 w-6 h-6" /> Login
                        </Button>

                        <div className="text-center pt-4 border-t border-dashed border-border/50">
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ErrorBoundary>
    );
}
