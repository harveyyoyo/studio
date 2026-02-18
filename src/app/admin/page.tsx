'use client';
import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import {
  ArrowLeft, BookOpen, Tag, Database, Plus, Trash2, Upload, Download,
  FileSpreadsheet, Printer, Settings, Edit, History, Users, User, Gift, UploadCloud, IdCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, Coupon, Database as DbInfo } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudentModal } from '@/components/StudentModal';
import { PrizeModal } from '@/components/PrizeModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { StudentActivityModal } from '@/components/StudentActivityModal';
import DynamicIcon from '@/components/DynamicIcon';
import { Coupon as CouponPreview } from '@/components/Coupon';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';


function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card className="bg-card p-6 shadow-lg flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
        </div>
        <Skeleton className="h-9 w-36" />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
            <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-2">
                        <Skeleton className="h-10 flex-grow" />
                        <Skeleton className="h-10 w-16" />
                    </div>
                     <Skeleton className="h-8" />
                     <Skeleton className="h-8" />
                     <Skeleton className="h-8" />
                </CardContent>
            </Card>
        ))}
      </div>

       <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
            </CardContent>
        </Card>

       <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
                 {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-16" />
                ))}
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24 col-span-2" />
          <Skeleton className="h-24 col-span-2" />
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  const { db, schoolId, getClassName, setCouponsToPrint, deleteStudent,
    addClass, deleteClass, deleteCategory, addCategory, addCoupons, setData, isDbLoading,
    createBackup, backups, restoreFromBackup, downloadBackup, addTeacher, deleteTeacher,
    addPrize, updatePrize, deletePrize, uploadStudents, setStudentsToPrint,
  } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const studentCsvInputRef = useRef<HTMLInputElement>(null);
  const backupTriggeredRef = useRef(false);

  const [newClassName, setNewClassName] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [activityStudent, setActivityStudent] = useState<Student | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const [printTeacher, setPrintTeacher] = useState('Admin');
  const [printCategory, setPrintCategory] = useState('');
  const [printValue, setPrintValue] = useState('10');
  
  const [isPrintCategoryDialogOpen, setIsPrintCategoryDialogOpen] = useState(false);
  const [newPrintCategoryName, setNewPrintCategoryName] = useState('');

  const [uploadReport, setUploadReport] = useState<{success: number, failed: number, errors: string[]} | null>(null);

  useEffect(() => {
    if (isDbLoading || backupTriggeredRef.current || !backups) return;

    const lastBackupTime = backups.length > 0 ? parseInt(backups[0].id) : 0;
    const oneDay = 24 * 60 * 60 * 1000;

    if (Date.now() - lastBackupTime > oneDay) {
      backupTriggeredRef.current = true;
      createBackup().then(() => {
        toast({
          title: "Automatic Backup Created",
          description: "A backup was created as the last one was over 24 hours ago."
        });
      });
    }
  }, [isDbLoading, backups, createBackup, toast]);

  useEffect(() => {
    if (db.categories?.length > 0 && !printCategory) {
      setPrintCategory(db.categories[0]);
    }
  }, [db.categories, printCategory]);

  if (isDbLoading) {
      return <AdminDashboardSkeleton />;
  }

  const handleAddClass = async () => {
    if (!newClassName) return;
    await addClass({ name: newClassName });
    setNewClassName('');
    toast({ title: 'Class Added' });
  };
  
  const handleAddTeacher = async () => {
    if (!newTeacherName) return;
    await addTeacher({ name: newTeacherName });
    setNewTeacherName('');
    toast({ title: 'Teacher / Faculty Added' });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    await addCategory(newCategoryName);
    setNewCategoryName('');
    toast({ title: 'Category Added' });
  };

  const handleAddPrintCategory = async () => {
    if (!newPrintCategoryName) return;
    await addCategory(newPrintCategoryName);
    setPrintCategory(newPrintCategoryName);
    setNewPrintCategoryName('');
    setIsPrintCategoryDialogOpen(false);
    toast({ title: 'Category Added' });
  };

  const handleOpenStudentModal = (student: Student | null) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleOpenPrizeModal = (prize: Prize | null) => {
    setEditingPrize(prize);
    setIsPrizeModalOpen(true);
  }
  
  const handleOpenActivityModal = (student: Student) => {
    setActivityStudent(student);
  };

  const handlePrintSheet = async () => {
    const value = parseInt(printValue);
    if (!value || value <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Value',
        description: 'Coupon value must be a positive number.',
      });
      return;
    }
    const coupons = Array.from({ length: 24 }, () => {
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

  const handleCreateBackup = async () => {
    await createBackup();
    toast({ title: "Backup Created", description: "A new backup has been saved." });
  }

  const handleRestoreFromBackup = async (backupId: string) => {
    await restoreFromBackup(backupId);
    toast({ title: "Restore Complete", description: "Data has been restored from the backup." });
  }

  const handleDownloadBackup = async (backupId: string) => {
    await downloadBackup(backupId);
  }

  const handleRestoreFromFile = () => {
    if (
      window.confirm(
        'Are you sure? This will permanently overwrite all current data for this school with the data from the backup file.'
      )
    ) {
      backupFileInputRef.current?.click();
    }
  };

  const onBackupFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as DbInfo;
      if (data.students && data.classes && data.categories && data.coupons) {
        await setData(data);
        toast({ title: 'Data restored successfully!' });
      } else {
        throw new Error('Invalid data file format. Missing required fields.');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to restore data.',
        description: (err as Error).message,
      });
    }
    if (backupFileInputRef.current) backupFileInputRef.current.value = '';
  };
  
  const handleStudentCsvUpload = () => {
    studentCsvInputRef.current?.click();
  }
  
  const onStudentCsvFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        const text = await file.text();
        const report = await uploadStudents(text);
        if (report.failed > 0) {
            setUploadReport(report);
        }
    } catch (err: any) {
        toast({
            variant: 'destructive',
            title: 'Failed to process CSV file.',
            description: (err as Error).message,
        });
    }
    if (studentCsvInputRef.current) studentCsvInputRef.current.value = '';
  }


  const usedCoupons = db.coupons.filter((c) => c.used).length;
  const totalPointsAwarded = db.coupons
    .filter((c) => c.used)
    .reduce((sum, c) => sum + c.value, 0);
  const totalPointsOnCards = db.students.reduce((sum, s) => sum + s.points, 0);
  const prizesRedeemed = db.students.flatMap(s => s.history).filter(h => h.desc.startsWith('Redeemed:')).length;

  const previewCoupon: Coupon = {
      code: 'PREVIEW',
      value: parseInt(printValue) || 0,
      category: printCategory,
      teacher: printTeacher,
      used: false,
      createdAt: Date.now(),
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="bg-card border-b-4 border-slate-700 dark:border-slate-500 p-6 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
              <Settings /> Admin Portal: <span className="text-primary">{schoolId}</span>
            </h2>
          </div>
          <Button onClick={() => router.push('/portal')} variant="secondary" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Portal
          </Button>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-t-4 border-chart-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="text-chart-1" /> Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Class Name"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                />
                <Button onClick={handleAddClass}>Add</Button>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {db.classes?.map((c) => (
                  <li
                    key={c.id}
                    className="flex justify-between items-center bg-secondary p-2 rounded border"
                  >
                    <span className="font-bold text-sm">{c.name}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. Students in this class will become unassigned.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                             await deleteClass(c.id);
                             toast({ title: 'Class Deleted' });
                          }}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="text-purple-500" /> Teachers / Faculty
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Teacher/Faculty Name"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                />
                <Button onClick={handleAddTeacher}>Add</Button>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {db.teachers?.map((t) => (
                  <li
                    key={t.id}
                    className="flex justify-between items-center bg-secondary p-2 rounded border"
                  >
                    <span className="font-bold text-sm">{t.name}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {t.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                             await deleteTeacher(t.id);
                             toast({ title: 'Teacher / Faculty Deleted' });
                          }}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>


          <Card className="border-t-4 border-chart-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="text-chart-2" /> Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Category Name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <Button
                  onClick={handleAddCategory}
                >
                  Add
                </Button>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {db.categories?.map((c) => (
                  <li
                    key={c}
                    className="flex justify-between items-center bg-secondary p-2 rounded border"
                  >
                    <span className="text-sm">{c}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete category "{c}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                             await deleteCategory(c);
                             toast({ title: 'Category Deleted' });
                          }}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-t-4 border-chart-3 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Gift className="text-chart-3" /> Manage Prizes
                    </div>
                    <Button onClick={() => handleOpenPrizeModal(null)} size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Add Prize
                    </Button>
                </CardTitle>
                <CardDescription>Add, edit, or delete prizes available in the prize shop.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {db.prizes?.length > 0 ? [...db.prizes].sort((a,b) => a.points - b.points).map(prize => (
                    <li key={prize.id} className="flex justify-between items-center bg-secondary p-2 rounded border">
                      <div className='flex items-center gap-3'>
                         <Switch 
                           checked={prize.inStock} 
                           onCheckedChange={(checked) => updatePrize({...prize, inStock: checked})}
                           aria-label="In Stock"
                         />
                        <DynamicIcon name={prize.icon} className={cn("w-5 h-5 text-primary", !prize.inStock && "opacity-40")}/>
                        <div>
                          <span className={cn("font-bold text-sm", !prize.inStock && "line-through opacity-60")}>{prize.name}</span>
                          <p className="text-xs text-muted-foreground">{prize.points} pts</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenPrizeModal(prize)}>
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete prize "{prize.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => {
                                await deletePrize(prize.id);
                                toast({ title: 'Prize Deleted' });
                              }}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </li>
                  )) : <p className="text-center text-sm text-muted-foreground italic py-2">No prizes found. Add one to get started!</p>}
                </ul>
              </CardContent>
          </Card>
          
          <Card className="border-t-4 border-chart-4">
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Database className="text-chart-4" /> System Backups
                    </div>
                    <Button onClick={handleCreateBackup} size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Create Backup
                    </Button>
                </CardTitle>
                <CardDescription>Create a manual backup of the current database state.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
                  {backups.length > 0 ? backups.map(backup => (
                    <li key={backup.id} className="flex justify-between items-center bg-secondary p-2 rounded border">
                      <span className="font-code text-sm break-all">{new Date(parseInt(backup.id)).toLocaleString()}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleDownloadBackup(backup.id)}><Download className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline"><Upload className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restore from this backup?</AlertDialogTitle>
                              <AlertDialogDescription>This will overwrite all current data with the data from {new Date(parseInt(backup.id)).toLocaleString()}. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRestoreFromBackup(backup.id)}>Restore</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </li>
                  )) : <p className="text-center text-sm text-muted-foreground italic py-2">No backups found.</p>}
                </ul>
                <Separator className="my-4" />
                <Button onClick={handleRestoreFromFile} variant="outline" className="w-full justify-center gap-2">
                  <Upload /> Restore from JSON file
                </Button>
                <input
                  type="file"
                  ref={backupFileInputRef}
                  onChange={onBackupFileChange}
                  className="hidden"
                  accept="application/json"
                />
            </CardContent>
          </Card>
        </div>

        <Card className="border-t-4 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="text-primary" /> Master Coupon Printer
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-6">
              <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                <div>
                  <Label>Issue By</Label>
                  <Select value={printTeacher} onValueChange={setPrintTeacher}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin/General</SelectItem>
                      {db.teachers?.map((t) => (
                        <SelectItem key={t.id} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <div className="flex items-center gap-2">
                    <Select value={printCategory} onValueChange={setPrintCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category..."/>
                      </SelectTrigger>
                      <SelectContent>
                        {db.categories?.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
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
                <Button onClick={handlePrintSheet} className="w-full font-bold gap-2 sm:col-span-2 md:col-span-3">
                  <Printer /> Print Sheet (24)
                </Button>
              </div>
              <div className="w-full md:w-1/3 flex flex-col items-center">
                  <Label className="font-semibold text-muted-foreground">Live Preview</Label>
                  <div className="mt-2 w-full max-w-[240px] aspect-[2/1]">
                      <CouponPreview coupon={previewCoupon} schoolId={schoolId} />
                  </div>
              </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Students</CardTitle>
              <CardDescription>{db.students.length} students in the database.</CardDescription>
            </div>
            <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleStudentCsvUpload} variant="outline" className="flex-1">
                    <UploadCloud className="mr-2 h-4 w-4" /> Upload CSV
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upload a CSV file with rows containing: <span className="font-code">firstName,lastName</span>. No header row needed. The file can use commas or semicolons as separators.</p>
                </TooltipContent>
              </Tooltip>
              <Button onClick={() => setStudentsToPrint(db.students)} variant="outline" className="flex-1">
                  <Printer className="mr-2 h-4 w-4" /> Print ID Cards
              </Button>
              <Button onClick={() => handleOpenStudentModal(null)} className="flex-1">
                <Plus className="mr-2 h-4 w-4" /> Add Student
              </Button>
              <input
                  type="file"
                  ref={studentCsvInputRef}
                  onChange={onStudentCsvFileChange}
                  className="hidden"
                  accept=".csv"
                />
            </div>
          </CardHeader>
          <CardContent>
              <div className="mb-4">
                <Input 
                  placeholder="Search students by name..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <ScrollArea className="h-96">
                <ul className="space-y-2 pr-4">
                  {db.students
                    .filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                    .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''))
                    .map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-secondary p-3 rounded-lg border gap-2"
                      >
                        <div>
                          <p className="font-bold">
                            {s.lastName}, {s.firstName}{' '}
                            <span className="text-primary font-normal text-xs">
                              ({s.points} pts)
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Class: {getClassName(s.classId || '')} | ID: {s.nfcId}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 self-end sm:self-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={() => setStudentsToPrint([s])}>
                                <IdCard className="w-4 h-4 text-green-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Print ID Card</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenActivityModal(s)}>
                                <History className="w-4 h-4 text-gray-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>View Activity</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenStudentModal(s)}>
                                <Edit className="w-4 h-4 text-blue-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit Student</p></TooltipContent>
                          </Tooltip>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {s.firstName} {s.lastName}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this student's record.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={async () => {
                                  await deleteStudent(s.id);
                                  toast({ title: 'Student Deleted' });
                                }}>Continue</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </li>
                    ))}
                </ul>
              </ScrollArea>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Database Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div className="bg-secondary p-4 rounded-lg">
                  <p className="text-2xl font-bold">{db.students.length}</p>
                  <p className="text-sm text-muted-foreground">Students</p>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                  <p className="text-2xl font-bold">{db.classes?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Classes</p>
              </div>
               <div className="bg-secondary p-4 rounded-lg">
                  <p className="text-2xl font-bold">{db.teachers?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Teachers / Faculty</p>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                  <p className="text-2xl font-bold">{db.coupons.length} / {usedCoupons}</p>
                  <p className="text-sm text-muted-foreground">Coupons (Created/Used)</p>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                  <p className="text-2xl font-bold">{db.prizes.length} / {prizesRedeemed}</p>
                  <p className="text-sm text-muted-foreground">Prizes (Types/Redeemed)</p>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                  <p className="text-2xl font-bold">{totalPointsAwarded.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Points Awarded</p>
              </div>
          </CardContent>
        </Card>

        <StudentModal
          isOpen={isStudentModalOpen}
          setIsOpen={setIsStudentModalOpen}
          student={editingStudent}
        />
        <PrizeModal
          isOpen={isPrizeModalOpen}
          setIsOpen={setIsPrizeModalOpen}
          prize={editingPrize}
        />
        <StudentActivityModal
          isOpen={!!activityStudent}
          setIsOpen={() => setActivityStudent(null)}
          student={activityStudent}
        />
         <AlertDialog open={!!uploadReport} onOpenChange={() => setUploadReport(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>CSV Upload Report</AlertDialogTitle>
              <AlertDialogDescription>
                {uploadReport?.success} students uploaded successfully. {uploadReport?.failed} rows failed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {uploadReport && uploadReport.errors.length > 0 && (
              <div className="mt-4 max-h-60 overflow-y-auto bg-slate-100 dark:bg-slate-800 p-3 rounded-md text-sm font-code">
                <p className="font-bold mb-2">Error Details:</p>
                <ul className="space-y-1">
                  {uploadReport.errors.map((error, i) => <li key={i}>{error}</li>)}
                </ul>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setUploadReport(null)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

export default function AdminPage() {
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

  return <AdminDashboard />;
}
