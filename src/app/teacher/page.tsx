
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Coupon, Category, Teacher, Student, Class, HistoryItem, Prize } from '@/lib/types';
import { ArrowLeft, Printer, Plus, LogIn, LogOut, UserCheck, Award, User, Search, Users, Minus, Gift, Loader2, Trash2, Edit, Filter, Ticket } from 'lucide-react';
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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import DynamicIcon from '@/components/DynamicIcon';
import { getStudentNickname } from '@/lib/utils';


function RecentRedemptions({ schoolId, students, classes, teacherId }: { schoolId: string; students: Student[], classes: Class[], teacherId: string }) {
    const [redemptions, setRedemptions] = useState<(HistoryItem & { id: string; studentId: string; studentName: string; studentClass: string })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterType, setFilterType] = useState<'all' | 'me'>('all');
    const firestore = useFirestore();
    const { togglePrizeFulfillment } = useAppContext();
    const { toast } = useToast();

    const classMap = useMemo(() => new Map(classes.map(c => [c.id, c.name])), [classes]);
    const getClassName = (classId: string) => classMap.get(classId) || 'Unassigned';

    const handleFulfillmentToggle = async (studentId: string, activityId: string, fulfilled: boolean) => {
        try {
            await togglePrizeFulfillment(studentId, activityId, fulfilled);
            setRedemptions(prev => prev.map(r =>
                r.id === activityId ? { ...r, fulfilled } : r
            ));
        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Update failed',
                description: (e as Error).message || 'Could not update fulfillment status.'
            });
        }
    };

    useEffect(() => {
        if (!students || !schoolId || !firestore) {
            setIsLoading(false);
            return;
        }

        const fetchRedemptions = async () => {
            setIsLoading(true);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 30); // Show last 30 days

            const allRedemptions: (HistoryItem & { id: string, studentId: string, studentName: string; studentClass: string })[] = [];

            for (const student of students) {
                const activitiesRef = collection(firestore, `schools/${schoolId}/students/${student.id}/activities`);
                const q = query(activitiesRef, where('date', '>=', sevenDaysAgo.getTime()));

                try {
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach(doc => {
                        const activity = doc.data() as HistoryItem;
                        if (activity.desc.startsWith('Redeemed:')) {
                            allRedemptions.push({
                                studentId: student.id,
                                studentName: `${student.firstName} ${student.lastName}`,
                                studentClass: getClassName(student.classId || ''),
                                ...activity,
                                id: doc.id,
                            });
                        }
                    });
                } catch (e) {
                    console.error(`Could not fetch activities for student ${student.id}`, e);
                }
            }

            setRedemptions(allRedemptions.sort((a, b) => b.date - a.date));
            setIsLoading(false);
        };

        fetchRedemptions();
    }, [students, schoolId, firestore, classMap]);

    const filteredRedemptions = useMemo(() => {
        if (filterType === 'all') return redemptions;
        return redemptions.filter(r => r.teacherId === teacherId);
    }, [redemptions, filterType, teacherId]);

    return (
        <Card className="md:col-span-2 border-t-4 border-chart-3 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-xl font-black">
                        <Gift className="w-6 h-6 text-chart-3" />
                        Prize Redemptions
                    </CardTitle>
                    <CardDescription className="font-medium">
                        Student purchases that need to be delivered.
                    </CardDescription>
                </div>
                <Tabs value={filterType} onValueChange={(v: any) => setFilterType(v)} className="w-[200px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="all" className="text-xs font-bold">All</TabsTrigger>
                        <TabsTrigger value="me" className="text-xs font-bold">Mine</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                    {isLoading ? (
                        <div className="space-y-4 pr-4">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                        </div>
                    ) : filteredRedemptions.length > 0 ? (
                        <ul className="space-y-3 pr-4">
                            {filteredRedemptions.map((item) => (
                                <li key={item.id} className={cn(
                                    "group flex justify-between items-center bg-white dark:bg-slate-900/50 p-4 rounded-2xl border transition-all hover:shadow-md",
                                    item.fulfilled ? "border-slate-100 opacity-60" : "border-chart-3/20 shadow-sm"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <Checkbox
                                            id={`fulfilled-${item.id}`}
                                            checked={item.fulfilled}
                                            onCheckedChange={(checked) => handleFulfillmentToggle(item.studentId, item.id, !!checked)}
                                            className="w-6 h-6 rounded-lg data-[state=checked]:bg-chart-3 data-[state=checked]:border-chart-3"
                                        />
                                        <div>
                                            <p className="font-black text-slate-800 dark:text-slate-200 leading-none mb-1">
                                                {item.desc.replace('Redeemed: ', '')}
                                            </p>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                {item.studentName} <span className="opacity-40">•</span> {item.studentClass}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className="font-black text-rose-500 bg-rose-50 border-rose-100 mb-1">
                                            {item.amount} pts
                                        </Badge>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase opacity-40">
                                            {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                            <Gift className="w-16 h-16 text-slate-300" />
                            <p className="text-sm font-bold uppercase tracking-widest">No redemptions found</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function TeacherPrizeManager({ schoolId, teacherId }: { schoolId: string, teacherId: string }) {
    const firestore = useFirestore();
    const { addPrize, updatePrize, deletePrize } = useAppContext();
    const { toast } = useToast();
    const playSound = useArcadeSound();

    const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
    const { data: prizes, isLoading: prizesLoading } = useCollection<Prize>(prizesQuery);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingPrize, setEditingPrize] = useState<Prize | null>(null);

    const [name, setName] = useState('');
    const [points, setPoints] = useState('50');
    const [icon, setIcon] = useState('Gift');
    const [inStock, setInStock] = useState(true);

    const resetForm = () => {
        setName('');
        setPoints('50');
        setIcon('Gift');
        setInStock(true);
        setEditingPrize(null);
    };

    const handleSave = async () => {
        if (!name || !points) return;
        try {
            const prizeData = {
                name,
                points: parseInt(points),
                icon,
                inStock,
                teacherId,
                addedBy: 'teacher'
            };

            if (editingPrize) {
                await updatePrize({ ...editingPrize, ...prizeData });
                toast({ title: 'Prize Updated' });
            } else {
                await addPrize(prizeData);
                toast({ title: 'Prize Added' });
            }
            setIsAddDialogOpen(false);
            resetForm();
            playSound('redeem');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error saving prize', description: (e as Error).message });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this prize?')) return;
        try {
            await deletePrize(id);
            toast({ title: 'Prize Deleted' });
            playSound('error');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error deleting prize' });
        }
    };

    const openEdit = (prize: Prize) => {
        setEditingPrize(prize);
        setName(prize.name);
        setPoints(prize.points.toString());
        setIcon(prize.icon);
        setInStock(prize.inStock);
        setIsAddDialogOpen(true);
    };

    return (
        <Card className="md:col-span-2 border-t-4 border-indigo-500 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-xl font-black text-indigo-600 dark:text-indigo-400">
                        <Gift className="w-6 h-6" />
                        Prize Management
                    </CardTitle>
                    <CardDescription className="font-medium">
                        Create rewards that students can buy with their points.
                    </CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-200/50 active:scale-95 transition-all">
                            <Plus className="w-5 h-5 mr-2" /> Add Prize
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black text-slate-800 dark:text-white">
                                {editingPrize ? 'Edit Prize' : 'New Prize'}
                            </DialogTitle>
                            <DialogDescription>
                                Set the name, cost, and icon for this reward.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Prize Name</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Homework Pass" className="h-12 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Point Cost</Label>
                                    <Input type="number" value={points} onChange={e => setPoints(e.target.value)} className="h-12 rounded-xl border-2 border-slate-100 bg-slate-50 font-black text-lg" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Icon Name</Label>
                                    <Select value={icon} onValueChange={setIcon}>
                                        <SelectTrigger className="h-12 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['Gift', 'Star', 'Award', 'Trophy', 'Zap', 'Heart', 'Smile', 'Book', 'Coffee', 'Pizza'].map(i => (
                                                <SelectItem key={i} value={i}>
                                                    <div className="flex items-center gap-2">
                                                        <DynamicIcon name={i} className="w-4 h-4" />
                                                        {i}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <Checkbox id="inStock" checked={inStock} onCheckedChange={checked => setInStock(!!checked)} />
                                <Label htmlFor="inStock" className="text-sm font-bold text-slate-700">Currently in stock and available for purchase</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSave} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-200">
                                {editingPrize ? 'Update Prize' : 'Create Prize'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px]">
                    {prizesLoading ? (
                        <div className="space-y-3 pr-4">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                        </div>
                    ) : (prizes || []).length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-4">
                            {(prizes || []).sort((a, b) => (a.teacherId === teacherId ? -1 : 1)).map((prize) => (
                                <div key={prize.id} className={cn(
                                    "group p-4 rounded-2xl border transition-all hover:shadow-lg relative overflow-hidden",
                                    prize.teacherId === teacherId ? "border-indigo-100 bg-indigo-50/10" : "border-slate-100 bg-white/50 grayscale-[0.5] opacity-80"
                                )}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                                                <DynamicIcon name={prize.icon} className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 dark:text-slate-200 leading-none mb-1">{prize.name}</p>
                                                <Badge variant="secondary" className="font-black text-[10px] tracking-widest rounded-lg bg-white dark:bg-slate-800 border shadow-xs">
                                                    {prize.points} PTS
                                                </Badge>
                                            </div>
                                        </div>
                                        {prize.teacherId === teacherId && (
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" onClick={() => openEdit(prize)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => handleDelete(prize.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    {!prize.inStock && (
                                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-50 text-red-500 text-[8px] font-black uppercase rounded-full border border-red-100">Out of Stock</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                            <Gift className="w-16 h-16 text-slate-300" />
                            <p className="text-sm font-bold uppercase tracking-widest">No prizes added yet</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function MyCoupons({ schoolId, teacherName, students }: { schoolId: string; teacherName: string; students: Student[] }) {
    const firestore = useFirestore();
    const couponsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'coupons') : null, [firestore, schoolId]);
    const { data: coupons, isLoading } = useCollection<Coupon>(couponsQuery);
  
    const getStudentName = (studentId?: string) => {
      if (!studentId) return 'N/A';
      const student = students?.find(s => s.id === studentId);
      return student ? `${getStudentNickname(student)} ${student.lastName}` : `ID: ${studentId}`;
    };
  
    const myCoupons = useMemo(() => {
      if (!coupons) return [];
      return coupons.filter(c => c.teacher === teacherName).sort((a, b) => b.createdAt - a.createdAt);
    }, [coupons, teacherName]);
  
    const available = myCoupons.filter(c => !c.used);
    const redeemed = myCoupons.filter(c => c.used);
  
    return (
      <Card className="md:col-span-2 border-t-4 border-chart-4 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl font-black">
              <Ticket className="w-6 h-6 text-chart-4" />
              My Generated Coupons
            </CardTitle>
            <CardDescription className="font-medium">
              Coupons you have created, separated by availability.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Available ({available.length})</h3>
            <ScrollArea className="h-72 border rounded-lg bg-background/50">
              {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading coupons...</div> : available.length > 0 ? (
                <ul className="p-3 space-y-2">
                  {available.map(coupon => (
                    <li key={coupon.id} className="p-3 bg-card rounded-lg border">
                      <div className="flex justify-between items-center font-bold">
                        <span className="font-code text-primary">{coupon.code}</span>
                        <span>{coupon.value} pts</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <p>{coupon.category}</p>
                        <p>Created on {new Date(coupon.createdAt).toLocaleDateString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="p-8 text-center text-sm text-muted-foreground">No available coupons created by you.</p>}
            </ScrollArea>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Redeemed ({redeemed.length})</h3>
            <ScrollArea className="h-72 border rounded-lg bg-background/50">
              {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading coupons...</div> : redeemed.length > 0 ? (
                <ul className="p-3 space-y-2">
                  {redeemed.map(coupon => (
                    <li key={coupon.id} className="p-3 bg-card rounded-lg border opacity-60">
                      <div className="flex justify-between items-center font-bold">
                        <span className="font-code text-muted-foreground line-through">{coupon.code}</span>
                        <span>{coupon.value} pts</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <p>{coupon.category}</p>
                        <p>Used by {coupon.usedBy ? getStudentName(coupon.usedBy) : 'Unknown'} on {coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="p-8 text-center text-sm text-muted-foreground">No redeemed coupons yet.</p>}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    );
  }

function TeacherPrinterInner({ teacherName, teacherId, onLogout }: { teacherName: string, teacherId: string, onLogout: () => void }) {
    const { updateTeacher, addCoupons, setCouponsToPrint, addCategory, schoolId, awardPointsToMultipleStudents, deductPointsFromMultipleStudents, addPrize, updatePrize, deletePrize } = useAppContext();
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

    const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null, [firestore, schoolId]);
    const { data: teachers } = useCollection<Teacher>(teachersQuery);
    const currentTeacher = teachers?.find(t => t.id === teacherId);

    // State for coupon printing
    const [printCategoryId, setPrintCategoryId] = useState('');
    const [printValue, setPrintValue] = useState('10');
    const [printExpiresOn, setPrintExpiresOn] = useState(''); // yyyy-mm-dd
    const [isPrintCategoryDialogOpen, setIsPrintCategoryDialogOpen] = useState(false);
    const [newPrintCategoryName, setNewPrintCategoryName] = useState('');
    const [newPrintCategoryPoints, setNewPrintCategoryPoints] = useState('10');

    // State for direct/bulk awarding
    const [awardMode, setAwardMode] = useState<'award' | 'deduct'>('award');
    const [studentSearch, setStudentSearch] = useState('');
    const [filterClassId, setFilterClassId] = useState('all');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [awardCategoryId, setAwardCategoryId] = useState('');
    const [awardValue, setAwardValue] = useState('10');
    const [awardReason, setAwardReason] = useState('');

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
        const newCategory = await addCategory({ name: newPrintCategoryName, points, teacherId: currentTeacher?.id });
        if (newCategory) {
            setPrintCategoryId(newCategory.id);
        }
        setNewPrintCategoryName('');
        setNewPrintCategoryPoints('10');
        setIsPrintCategoryDialogOpen(false);
        playSound('success');
        toast({ title: 'Category Added' });
    };

    const computeExpiresAt = () => {
        if (!printExpiresOn) return undefined;
        const date = new Date(printExpiresOn + 'T23:59:59');
        if (Number.isNaN(date.getTime())) return undefined;
        return date.getTime();
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

        const totalCost = value * 24;
        if (settings.enableTeacherBudgets && currentTeacher?.monthlyBudget !== undefined) {
            const spent = currentTeacher.spentThisMonth || 0;
            const remaining = currentTeacher.monthlyBudget - spent;
            if (totalCost > remaining) {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Budget Exceeded',
                    description: `Generating these coupons requires ${totalCost} pts, but you only have ${remaining} pts remaining this month.`,
                });
                return;
            }
        }

        const expiresAt = computeExpiresAt();

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
                color: selectedCategory.color,
                ...(expiresAt ? { expiresAt } : {}),
            };
        });
        await addCoupons(couponsToCreate);
        if (settings.enableTeacherBudgets && currentTeacher) {
            await updateTeacher({ ...currentTeacher, spentThisMonth: (currentTeacher.spentThisMonth || 0) + totalCost });
        }
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

        const totalCost = points * selectedStudentIds.length;
        if (settings.enableTeacherBudgets && currentTeacher?.monthlyBudget !== undefined) {
            const spent = currentTeacher.spentThisMonth || 0;
            const remaining = currentTeacher.monthlyBudget - spent;
            if (totalCost > remaining) {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Budget Exceeded',
                    description: `Awarding requires ${totalCost} pts, but you only have ${remaining} pts remaining this month.`,
                });
                return;
            }
        }

        const result = await awardPointsToMultipleStudents(selectedStudentIds, points, selectedCategory.name);

        if (result.success) {
            if (settings.enableTeacherBudgets && currentTeacher) {
                await updateTeacher({ ...currentTeacher, spentThisMonth: (currentTeacher.spentThisMonth || 0) + totalCost });
            }
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

    const handleDeductPoints = async () => {
        const points = parseInt(awardValue);
        if (selectedStudentIds.length === 0) {
            playSound('error');
            toast({ variant: 'destructive', title: 'No students selected.' });
            return;
        }
        if (!awardReason.trim()) {
            playSound('error');
            toast({ variant: 'destructive', title: 'A reason is required for deductions.' });
            return;
        }
        if (isNaN(points) || points <= 0) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Points to deduct must be a positive number.' });
            return;
        }

        const result = await deductPointsFromMultipleStudents(selectedStudentIds, points, awardReason);

        if (result.success) {
            playSound('swoosh');
            toast({ title: 'Points Deducted!', description: `Deducted ${points} points from ${result.count} student(s).` });
            setSelectedStudentIds([]);
            setAwardReason('');
        } else {
            playSound('error');
            toast({ variant: 'destructive', title: 'Failed to deduct points', description: result.message });
        }
    };

    const selectedCategoryForPreview = categories?.find(c => c.id === printCategoryId);
    const previewCoupon: Coupon = {
        id: 'PREVIEW',
        code: '123456',
        value: parseInt(printValue) || 0,
        category: selectedCategoryForPreview?.name || 'Category',
        teacher: teacherName,
        used: false,
        createdAt: Date.now(),
        color: selectedCategoryForPreview?.color,
        expiresAt: computeExpiresAt(),
    };

    const filteredCategories = useMemo(() => {
        return categories?.filter(c => !c.teacherId || (currentTeacher && c.teacherId === currentTeacher.id)) || [];
    }, [categories, currentTeacher]);

    const filteredStudents = useMemo(() => {
        return (students || []).filter(s => {
            const computedName = `${getStudentNickname(s)} ${s.lastName}`.toLowerCase();
            const nameMatch = computedName.includes(studentSearch.toLowerCase());
            const classMatch = filterClassId === 'all' || s.classId === filterClassId;
            return nameMatch && classMatch;
        }).sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [students, studentSearch, filterClassId]);

    useEffect(() => {
        if (filteredStudents.length === 1) {
            setSelectedStudentIds([filteredStudents[0].id]);
        }
    }, [filteredStudents]);

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
            <div className={cn(
                "min-h-screen transition-colors duration-500 relative overflow-hidden font-sans",
                settings.displayMode === 'app' && 'pb-24'
            )}>
                {/* Background Decor - Only for Graphic Mode */}
                {isGraphic && (
                    <>
                        <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
                        <div className="pointer-events-none fixed -top-24 -left-24 h-[500px] w-[500px] rounded-full bg-chart-1/10 blur-[120px] z-0 animate-pulse-slow" />
                        <div className="pointer-events-none fixed top-1/2 -right-24 h-[600px] w-[600px] rounded-full bg-chart-2/10 blur-[140px] z-0" />
                        <div className="pointer-events-none fixed -bottom-24 left-1/4 h-[400px] w-[400px] rounded-full bg-chart-3/10 blur-[100px] z-0" />
                    </>
                )}

                <div className={cn(
                    "px-4 pt-6 pb-8 md:px-6 md:pt-10 md:pb-12 transition-colors duration-500 relative z-10",
                    isGraphic ? 'bg-card/30 backdrop-blur-xl border-b border-white/5 shadow-2xl' : 'bg-white border-b'
                )}>
                    <div className="max-w-full mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="animate-in fade-in slide-in-from-left duration-700">
                            <h1 className={cn("text-3xl font-black tracking-tighter uppercase font-headline", isGraphic ? 'text-primary drop-shadow-sm' : 'text-slate-800')}>Teacher Portal</h1>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter", isGraphic ? 'bg-primary text-primary-foreground' : 'bg-slate-800 text-white')}>
                                    Authorized
                                </span>
                                <p className={cn("text-xs font-bold uppercase tracking-widest", isGraphic ? 'text-chart-2' : 'text-primary')}>{teacherName}</p>
                                {settings.enableTeacherBudgets && currentTeacher?.monthlyBudget !== undefined && (
                                    <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter", isGraphic ? 'bg-secondary text-secondary-foreground border border-secondary-foreground/20' : 'bg-slate-200 text-slate-800')}>
                                        Budget: {Math.max(0, currentTeacher.monthlyBudget - (currentTeacher.spentThisMonth || 0))} pts remaining
                                    </span>
                                )}
                            </div>
                            <p className={cn("text-xs mt-2", isGraphic ? 'text-muted-foreground' : 'text-slate-500')}>Generate coupon sheets or award points directly to your students.</p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={onLogout}
                            className={cn(
                                "gap-2 rounded-xl h-11 transition-all active:scale-95",
                                isGraphic ? 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/40' : 'bg-slate-50'
                            )}
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Switch Teacher</span>
                        </Button>
                    </div>
                </div>

                <div className="max-w-full mx-auto px-4 md:px-6 -mt-6 relative z-10 animate-in fade-in slide-in-from-bottom duration-700 delay-150 fill-mode-both">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        <Card className={cn(
                            "border-t-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1",
                            isGraphic
                                ? 'bg-card/60 backdrop-blur-2xl border-chart-1 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
                                : 'bg-white border-chart-1 shadow-lg'
                        )}>
                            <CardHeader className="p-4 md:p-6">
                                <CardTitle className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-xl", isGraphic ? 'bg-chart-1/20 text-chart-1' : 'bg-indigo-50 text-indigo-600')}>
                                        <Printer className="w-6 h-6" />
                                    </div>
                                    Print Coupons
                                </CardTitle>
                                <CardDescription className={isGraphic ? 'text-muted-foreground/80' : ''}>
                                    Generate a sheet of 24 unique QR codes for rewards.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 md:p-6">
                                {isLoading ? <Skeleton className="h-48 w-full rounded-xl" /> : (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className={cn("text-[10px] font-black uppercase tracking-widest ml-1", isGraphic ? 'text-muted-foreground' : 'text-slate-500')}>Incentive Category</Label>
                                                <div className="flex items-center gap-2">
                                                    <Select value={printCategoryId} onValueChange={setPrintCategoryId}>
                                                        <SelectTrigger className={cn("rounded-xl h-12 transition-all", isGraphic ? 'bg-foreground/5 border-white/10 hover:bg-foreground/10 text-foreground' : 'bg-slate-50 border-slate-200')}>
                                                            <SelectValue placeholder="Select..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {filteredCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <Dialog open={isPrintCategoryDialogOpen} onOpenChange={setIsPrintCategoryDialogOpen}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="icon" className={cn("h-12 w-12 rounded-xl shrink-0 transition-all", isGraphic ? 'bg-foreground/5 border-white/10 hover:bg-white/10 text-white' : 'bg-slate-50 border-slate-200')}>
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className={cn("rounded-[2rem]", isGraphic ? 'bg-card/90 backdrop-blur-2xl text-foreground border-white/10' : 'bg-white')}>
                                                            <DialogHeader>
                                                                <DialogTitle className="text-2xl font-black">Add Category</DialogTitle>
                                                                <DialogDescription>Create a new quick-selection category for rewards.</DialogDescription>
                                                            </DialogHeader>
                                                            <div className="grid gap-6 py-6">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest ml-1">Name</Label>
                                                                    <Input id="name" value={newPrintCategoryName} onChange={e => setNewPrintCategoryName(e.target.value)} className={cn("h-12 rounded-xl", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')} placeholder="e.g. Extra Recess" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="pts" className="text-[10px] font-black uppercase tracking-widest ml-1">Default Points</Label>
                                                                    <Input id="pts" type="number" value={newPrintCategoryPoints} onChange={e => setNewPrintCategoryPoints(e.target.value)} className={cn("h-12 rounded-xl font-bold", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')} />
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <Button onClick={handleAddPrintCategory} className="rounded-2xl h-12 w-full font-black uppercase tracking-widest">Create Category</Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className={cn("text-[10px] font-black uppercase tracking-widest ml-1", isGraphic ? 'text-muted-foreground' : 'text-slate-500')}>Point Value</Label>
                                                <Input type="number" value={printValue} onChange={(e) => setPrintValue(e.target.value)} className={cn("h-14 rounded-xl text-2xl font-black transition-all", isGraphic ? 'bg-foreground/5 border-white/10 text-foreground focus:ring-chart-1/20' : 'bg-slate-50 border-slate-200')} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className={cn("text-[10px] font-black uppercase tracking-widest ml-1", isGraphic ? 'text-muted-foreground' : 'text-slate-500')}>Expiration (optional)</Label>
                                                <Input
                                                    type="date"
                                                    value={printExpiresOn}
                                                    onChange={(e) => setPrintExpiresOn(e.target.value)}
                                                    className={cn("h-11 rounded-xl text-xs font-bold tracking-widest", isGraphic ? 'bg-foreground/5 border-white/10 text-foreground' : 'bg-slate-50 border-slate-200')}
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handlePrintSheet}
                                            className={cn(
                                                "w-full font-black text-lg uppercase tracking-widest h-16 rounded-2xl shadow-xl transition-all active:scale-95 group",
                                                isGraphic ? 'bg-chart-1 hover:bg-chart-1/90 shadow-chart-1/30 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            )}
                                        >
                                            <Printer className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                                            Generate Sheet
                                        </Button>

                                        <div className="flex flex-col items-center pt-8 border-t border-dashed border-border/50">
                                            <p className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-40">Sheet Preview (scaled)</p>
                                            <div className="w-full max-w-[260px] rounded-2xl border border-border/40 bg-slate-100/80 shadow-xl p-3 flex items-center justify-center">
                                                <div className="w-full coupon-preview-container">
                                                    <CouponPreview coupon={previewCoupon} schoolId={schoolId} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className={cn(
                            "border-t-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1",
                            isGraphic
                                ? 'bg-card/60 backdrop-blur-2xl border-chart-2 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
                                : 'bg-white border-chart-2 shadow-lg'
                        )}>
                            <CardHeader className="p-4 md:p-6">
                                <CardTitle className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-xl", isGraphic ? 'bg-chart-2/20 text-chart-2' : 'bg-rose-50 text-rose-600')}>
                                        <Award className="w-6 h-6" />
                                    </div>
                                    Direct Award
                                </CardTitle>
                                <CardDescription className={isGraphic ? 'text-muted-foreground/80' : ''}>
                                    Select students and apply points instantly.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 md:p-6">
                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            <Input
                                                placeholder="Search name..."
                                                value={studentSearch}
                                                onChange={e => setStudentSearch(e.target.value)}
                                                className={cn("h-11 rounded-xl pl-9 transition-all", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}
                                            />
                                        </div>
                                        <Select value={filterClassId} onValueChange={setFilterClassId}>
                                            <SelectTrigger className={cn("h-11 rounded-xl transition-all", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}>
                                                <SelectValue placeholder="All Classes" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Classes</SelectItem>
                                                {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className={cn("border rounded-2xl overflow-hidden", isGraphic ? 'border-white/10 bg-black/5' : 'bg-slate-50/50')}>
                                        <div className={cn("px-4 py-2 border-b flex justify-between items-center", isGraphic ? 'bg-white/5 border-white/5' : 'bg-white')}>
                                            <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                                                {selectedStudentIds.length} / {filteredStudents.length} Selected
                                            </Label>
                                            <Button variant="link" size="sm" onClick={toggleSelectAll} className="h-auto p-0 text-[10px] font-black uppercase tracking-widest">
                                                {selectedStudentIds.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
                                            </Button>
                                        </div>
                                        <ScrollArea className="h-56">
                                            {isLoading ? (
                                                <div className="p-3 space-y-2">
                                                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                                                </div>
                                            ) : (
                                                <ul className="p-2 space-y-1">
                                                    {filteredStudents.map(student => (
                                                        <li key={student.id}>
                                                            <label className={cn(
                                                                "flex items-center gap-3 p-3 rounded-xl transition-all w-full text-left cursor-pointer group",
                                                                selectedStudentIds.includes(student.id)
                                                                    ? (isGraphic ? 'bg-primary/20 border border-primary/30' : 'bg-indigo-50 border border-indigo-100')
                                                                    : (isGraphic ? 'hover:bg-white/5 border border-transparent' : 'hover:bg-white border border-transparent')
                                                            )}>
                                                                <Checkbox
                                                                    checked={selectedStudentIds.includes(student.id)}
                                                                    onCheckedChange={checked => handleStudentSelect(student.id, !!checked)}
                                                                    className="rounded-md"
                                                                />
                                                                <div className="flex-grow">
                                                                    <p className="font-bold text-sm leading-tight">{student.lastName}, {getStudentNickname(student)}</p>
                                                                    <p className="text-[10px] font-medium opacity-50 uppercase tracking-tighter">ID: {student.nfcId || '---'}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={cn("font-black text-sm", isGraphic ? 'text-primary' : 'text-indigo-600')}>{student.points}</span>
                                                                    <span className="text-[8px] font-black ml-0.5 opacity-40 uppercase">pts</span>
                                                                </div>
                                                            </label>
                                                        </li>
                                                    ))}
                                                    {filteredStudents.length === 0 && (
                                                        <p className="text-center text-xs text-muted-foreground italic py-10">No students found.</p>
                                                    )}
                                                </ul>
                                            )}
                                        </ScrollArea>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-dashed border-border/50">
                                        <Tabs value={awardMode} onValueChange={(v) => setAwardMode(v as 'award' | 'deduct')} className="w-full">
                                            <TabsList className={cn("grid w-full grid-cols-2 p-1 rounded-2xl h-12", isGraphic ? 'bg-white/5' : 'bg-slate-100')}>
                                                <TabsTrigger value="award" className="rounded-xl font-black uppercase tracking-tighter text-[10px]"><Award className="w-3.5 h-3.5 mr-2" />Award Points</TabsTrigger>
                                                <TabsTrigger value="deduct" className="rounded-xl font-black uppercase tracking-tighter text-[10px]"><Minus className="w-3.5 h-3.5 mr-2" />Deduct Points</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="award" className="pt-5 space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Reason</Label>
                                                        <Select value={awardCategoryId} onValueChange={setAwardCategoryId}>
                                                            <SelectTrigger className={cn("h-11 rounded-xl", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}><SelectValue placeholder="Select..." /></SelectTrigger>
                                                            <SelectContent>{categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Amount</Label>
                                                        <Input type="number" value={awardValue} onChange={(e) => setAwardValue(e.target.value)} className={cn("h-11 rounded-xl text-lg font-black", isGraphic ? 'bg-foreground/5 border-white/10 text-foreground' : 'bg-slate-50')} />
                                                    </div>
                                                </div>
                                            </TabsContent>
                                            <TabsContent value="deduct" className="pt-5 space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Points</Label>
                                                        <Input type="number" value={awardValue} onChange={(e) => setAwardValue(e.target.value)} className={cn("h-11 rounded-xl text-lg font-black", isGraphic ? 'bg-foreground/5 border-white/10 text-foreground' : 'bg-slate-50')} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Reason</Label>
                                                        <Input value={awardReason} onChange={(e) => setAwardReason(e.target.value)} className={cn("h-11 rounded-xl", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')} placeholder="Misbehavior" />
                                                    </div>
                                                </div>
                                            </TabsContent>
                                        </Tabs>

                                        <Button
                                            onClick={awardMode === 'award' ? handleAwardPoints : handleDeductPoints}
                                            disabled={selectedStudentIds.length === 0}
                                            variant={awardMode === 'deduct' ? 'destructive' : 'default'}
                                            className={cn(
                                                "w-full font-black text-lg uppercase tracking-widest h-16 rounded-2xl shadow-xl transition-all active:scale-95 group",
                                                isGraphic && awardMode === 'award' && 'bg-chart-2 hover:bg-chart-2/90 shadow-chart-2/30 text-rose-950',
                                                isGraphic && awardMode === 'deduct' && 'bg-red-600 hover:bg-red-500 shadow-red-500/30 text-white',
                                                !isGraphic && awardMode === 'award' && 'bg-slate-800 hover:bg-slate-700 text-white',
                                                !isGraphic && awardMode === 'deduct' && 'bg-red-700 hover:bg-red-600 text-white'
                                            )}
                                        >
                                            {awardMode === 'award' ? <Award className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" /> : <Minus className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />}
                                            {awardMode === 'award' ? `Award to ${selectedStudentIds.length}` : `Deduct from ${selectedStudentIds.length}`}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <TeacherPrizeManager schoolId={schoolId!} teacherId={teacherId} />
                        <RecentRedemptions schoolId={schoolId!} students={students || []} classes={classes || []} teacherId={teacherId} />
                        <MyCoupons schoolId={schoolId!} teacherName={teacherName} students={students || []} />
                    </div>
                </div>

            </div>
        </TooltipProvider>
    );
}



import { ErrorBoundary } from '@/components/ErrorBoundary';

function TeacherPrinterSkeleton() {
    return (
        <div className="max-w-full mx-auto px-4 md:px-6 -mt-6 animate-pulse">
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

function TeacherPrinter(props: { teacherName: string, teacherId: string, onLogout: () => void }) {
    const { isAdmin, isTeacher } = useAppContext();
    if (!isAdmin && !isTeacher) {
        return <TeacherPrinterSkeleton />;
    }
    return (
        <ErrorBoundary name="TeacherPrinter">
            <TeacherPrinterInner {...props} />
        </ErrorBoundary>
    );
}


export default function TeacherPage() {
    const { loginState, isInitialized, schoolId, login, logout, isAdmin, isTeacher, userName, userId, teacherDocId } = useAppContext();
    const router = useRouter();
    const firestore = useFirestore();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';
    const playSound = useArcadeSound();
    const { toast } = useToast();

    // No longer using loggedInTeacher state; we use the global loginState.
    const [selectedLoginName, setSelectedLoginName] = useState('');
    const [passcode, setPasscode] = useState('');

    const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null, [firestore, schoolId]);
    const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);


    useEffect(() => {
        if (isInitialized && !['student', 'teacher', 'admin', 'school'].includes(loginState)) {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);

    const handleLogin = async () => {
        if (!selectedLoginName || !passcode) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Please select your name and enter a passcode.' });
            return;
        }

        const teacher = teachers?.find(t => (t.username || t.id) === selectedLoginName);
        const success = await login('teacher', {
            schoolId: schoolId || undefined,
            username: selectedLoginName,
            passcode,
            teacherName: teacher?.name,
            teacherDocId: teacher?.id
        });
        if (success) {
            playSound('login');
            toast({ title: 'Logged in successfully.' });
        } else {
            playSound('error');
            toast({ variant: 'destructive', title: 'Invalid credentials.' });
            setPasscode(''); // Clear passcode on fail
        }
    };

    const handleLogout = () => {
        playSound('swoosh');
        logout();
    };

    if (!isInitialized || !schoolId) {
        return (
            <div className={`min-h-screen flex items-center justify-center font-sans ${isGraphic ? 'bg-background text-primary' : 'bg-background text-muted-foreground'}`}>
                <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Initializing Portal...
                </Button>
            </div>
        );
    }

    if (loginState === 'teacher' || loginState === 'admin' || loginState === 'developer') {
        const displayName = userName || (loginState === 'admin' || loginState === 'developer' ? 'Admin' : 'Teacher');
        const validTeacherId = teacherDocId || userId || '';
        return <TeacherPrinter teacherName={displayName} teacherId={validTeacherId} onLogout={handleLogout} />;
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
                            <CardDescription className={isGraphic ? 'text-muted-foreground' : ''}>Login to grant rewards and print coupons.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="teacher-username" className={`text-[10px] font-black uppercase tracking-widest ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Teacher Name</Label>
                                <Select
                                    value={selectedLoginName}
                                    onValueChange={setSelectedLoginName}
                                >
                                    <SelectTrigger
                                        id="teacher-username"
                                        className={`h-14 rounded-xl text-lg font-bold ${isGraphic ? 'bg-foreground/5 border-border' : 'bg-slate-50'}`}
                                    >
                                        <SelectValue placeholder="Select your name..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teachers?.map(t => (
                                            <SelectItem key={t.id} value={t.username || t.id}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="teacher-passcode" className={`text-[10px] font-black uppercase tracking-widest ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Passcode</Label>
                                <Input
                                    id="teacher-passcode"
                                    type="password"
                                    value={passcode}
                                    onChange={e => setPasscode(e.target.value)}
                                    className={`h-14 rounded-xl text-lg font-mono tracking-widest text-center ${isGraphic ? 'bg-foreground/5 border-border' : 'bg-slate-50'}`}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                />
                            </div>
                        </div>

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
