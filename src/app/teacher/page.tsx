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
import { SchoolGate } from '@/components/SchoolGate';
import { Checkbox } from '@/components/ui/checkbox';


function TeacherPrinterInner({ teacherName, onLogout }: { teacherName: string, onLogout: () => void }) {
    const { addCoupons, setCouponsToPrint, addCategory, schoolId, awardPointsToMultipleStudents } = useAppContext();
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

    // State for direct/bulk awarding
    const [studentSearch, setStudentSearch] = useState('');
    const [filterClassId, setFilterClassId] = useState('all');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [awardCategoryId, setAwardCategoryId] = useState('');
    const [awardValue, setAwardValue] = useState('10');

    useEffect(() => {
        if (categories && categories.length > 0) {
            if (!printCategoryId) setPrintCategoryId(categories[0].id);
            if (!awardCategoryId) setAwardCategoryId(categories[0].id);
        }
    }, [categories, printCategoryId, awardCategoryId]);

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
        if (selectedStudentIds.length === 0) {
            playSound('error');
            toast({ variant: 'destructive', title: 'No students selected.' });
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

        const result = await awardPointsToMultipleStudents(selectedStudentIds, points, selectedCategory.name);

        if (result.success) {
            playSound('success');
            toast({ title: 'Points Awarded!', description: `Awarded ${points} points to ${result.count} student(s).` });
            setSelectedStudentIds([]);
            if (categories && categories.length > 0) {
                setAwardValue(categories[0].points.toString());
            }
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

    const filteredStudents = (students || []).filter(s => {
        const nameMatch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase());
        const classMatch = filterClassId === 'all' || s.classId === filterClassId;
        return nameMatch && classMatch;
    }).sort((a,b) => a.lastName.localeCompare(b.lastName));
    
    const toggleSelectAll = () => {
        if (selectedStudentIds.length === filteredStudents.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(filteredStudents.map(s => s.id));
        }
    };
    
    const handleStudentSelect = (studentId: string, isSelected: boolean) => {
        if (isSelected) {
            setSelectedStudentIds(prev => [...prev, studentId]);
        } else {
            setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
        }
    };


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
                                    Select students and award points directly.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input placeholder="Search students..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="h-11 rounded-xl" />
                                        <Select value={filterClassId} onValueChange={setFilterClassId}>
                                            <SelectTrigger className="h-11 rounded-xl">
                                                <SelectValue placeholder="Filter by class..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Classes</SelectItem>
                                                {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    <div className="border rounded-xl">
                                        <div className="p-2 border-b flex justify-between items-center">
                                            <Label className="font-medium text-sm text-muted-foreground">{selectedStudentIds.length} of {filteredStudents.length} selected</Label>
                                            <Button variant="link" size="sm" onClick={toggleSelectAll}>
                                                {selectedStudentIds.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
                                            </Button>
                                        </div>
                                        <ScrollArea className="h-48">
                                            {isLoading ? <Skeleton className="h-full w-full" /> : (
                                                <ul className="p-2 space-y-1">
                                                {filteredStudents.map(student => (
                                                    <li key={student.id}>
                                                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors w-full text-left cursor-pointer">
                                                            <Checkbox
                                                                checked={selectedStudentIds.includes(student.id)}
                                                                onCheckedChange={checked => handleStudentSelect(student.id, !!checked)}
                                                            />
                                                            <div className="flex-grow">
                                                                <p className="font-bold text-sm">{student.lastName}, {student.firstName}</p>
                                                                <p className="text-xs text-muted-foreground">ID: {student.nfcId}</p>
                                                            </div>
                                                            <span className="font-bold text-sm text-primary">{student.points} pts</span>
                                                        </label>
                                                    </li>
                                                ))}
                                                </ul>
                                            )}
                                        </ScrollArea>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1.5">
                                                <Label>Category</Label>
                                                <Select value={awardCategoryId} onValueChange={setAwardCategoryId}>
                                                    <SelectTrigger className="h-11 rounded-xl">
                                                        <SelectValue placeholder="Select..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>Points</Label>
                                                <Input type="number" value={awardValue} onChange={(e) => setAwardValue(e.target.value)} className="h-11 rounded-xl text-base font-bold" />
                                            </div>
                                        </div>
                                        <Button 
                                            onClick={handleAwardPoints} 
                                            disabled={selectedStudentIds.length === 0}
                                            className={`w-full font-black text-lg uppercase tracking-widest h-14 rounded-2xl shadow-xl transition-all active:scale-95 text-white ${isGraphic ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20' : 'bg-slate-800 hover:bg-slate-700'}`}>
                                            <Award className="w-5 h-5 mr-3" /> Award to {selectedStudentIds.length} Student(s)
                                        </Button>
                                    </div>
                                </div>
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
