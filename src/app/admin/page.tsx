
'use client';
import { useEffect, useState, useRef, useMemo, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useFunctions } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  Users, Gift, BookOpen, Trash2, Edit, Plus, UploadCloud, Printer, LayoutDashboard, Database,
  Settings, History, Award, CheckCircle, Tag, Trophy, ArrowRight, Loader2, Play, ShieldCheck,
  User, Ticket, Upload, Download, Activity, Zap, Clock, Palette, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, Coupon, Category, Class, Teacher, BackupInfo, Achievement, Badge, AttendanceSettings, AttendanceLogEntry, AttendanceScheduleSlot } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudentModal } from '@/components/StudentModal';
import { PrizeModal } from '@/components/PrizeModal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { StudentActivityModal } from '@/components/StudentActivityModal';
import DynamicIcon from '@/components/DynamicIcon';
import { Coupon as CouponPreview } from '@/components/Coupon';
import { Switch } from '@/components/ui/switch';
import { cn, getStudentNickname, getRandomColor } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '@/components/providers/SettingsProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { ImageCropper } from '@/components/ImageCropper';
import { Helper } from '@/components/ui/helper';
import { CategoryModal } from '@/components/CategoryModal';
import { ThemeGeneratorModal } from '@/components/ThemeGeneratorModal';
import { AchievementModal } from '@/components/AchievementModal';
import { BadgeModal } from '@/components/BadgeModal';
import { addAchievement, updateAchievement, deleteAchievement, addBadge, updateBadge, deleteBadge } from '@/lib/db';
import { SAMPLE_BADGES, getSampleCategoryBadges } from '@/lib/sample-badges';

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4 md:p-8">
      <Card className="bg-card p-6 shadow-lg flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-36" />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboardInner() {
  const {
    schoolId, setCouponsToPrint, deleteStudent,
    addClass, deleteClass, deleteCategory, addCategory, updateCategory,
    devCreateBackup, devRestoreFromBackup, devDownloadBackup, addTeacher, updateTeacher, deleteTeacher,
    addPrize, updatePrize, deletePrize, uploadStudents, setStudentsToPrint,
    updateStudent,
    achievements, achievementsLoading,
    badges, badgesLoading,
    purgeStudentProgress,
    getAttendanceConfig,
    setAttendanceConfig,
    listAttendanceLog
  } = useAppContext();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const studentCsvInputRef = useRef<HTMLInputElement>(null);
  const { settings, updateSettings } = useSettings();

  // Data fetching hooks
  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'students') : null, [firestore, schoolId]);
  const { data: students, isLoading: studentsLoading, error: studentsError } = useCollection<Student>(studentsQuery);

  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
  const { data: classes, isLoading: classesLoading, error: classesError } = useCollection<Class>(classesQuery);

  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null, [firestore, schoolId]);
  const { data: teachers, isLoading: teachersLoading, error: teachersError } = useCollection<Teacher>(teachersQuery);

  const categoriesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null, [firestore, schoolId]);
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCollection<Category>(categoriesQuery);

  const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
  const { data: prizes, isLoading: prizesLoading, error: prizesError } = useCollection<Prize>(prizesQuery);

  const couponsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'coupons') : null, [firestore, schoolId]);
  const { data: coupons, isLoading: couponsLoading, error: couponsError } = useCollection<Coupon>(couponsQuery);

  const backupsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'backups') : null, [firestore, schoolId]);
  const { data: backups, isLoading: backupsLoading, error: backupsError } = useCollection<BackupInfo>(backupsQuery);

  const schoolDocRef = useMemoFirebase(() => (firestore && schoolId ? doc(firestore, 'schools', schoolId) : null), [firestore, schoolId]);
  const { data: schoolData } = useDoc<{ name?: string; logoUrl?: string; logoHistory?: { url?: string; uploadedAt?: number }[] }>(schoolDocRef);

  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const previousSchoolLogos = useMemo(() => {
    const current = (logoPreviewUrl ?? schoolData?.logoUrl)?.trim();
    const fromHistory = Array.isArray(schoolData?.logoHistory)
      ? schoolData!.logoHistory!.map((e) => e?.url?.trim()).filter((u): u is string => !!u)
      : [];
    const seen = new Set<string>();
    const out: string[] = [];
    if (current) {
      seen.add(current);
      out.push(current);
    }
    fromHistory.forEach((u) => {
      if (!seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    });
    return out;
  }, [schoolData?.logoUrl, schoolData?.logoHistory, logoPreviewUrl]);

  const [newClassName, setNewClassName] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherPasscode, setNewTeacherPasscode] = useState('');
  const [newTeacherBudget, setNewTeacherBudget] = useState('');
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [activityStudent, setActivityStudent] = useState<Student | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSortOption, setStudentSortOption] = useState<string>('lastNameAsc');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [studentFilterClass, setStudentFilterClass] = useState<string>('all');
  const [themeStudent, setThemeStudent] = useState<Student | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [achievementToDelete, setAchievementToDelete] = useState<Achievement | null>(null);
  const [isAddSampleBadgesOpen, setIsAddSampleBadgesOpen] = useState(false);
  const [isAddingSamples, setIsAddingSamples] = useState(false);
  const [isCategoryBadgeModalOpen, setIsCategoryBadgeModalOpen] = useState(false);
  const [editingCategoryBadge, setEditingCategoryBadge] = useState<Badge | null>(null);
  const [categoryBadgeToDelete, setCategoryBadgeToDelete] = useState<Badge | null>(null);
  const [isAddSampleCategoryBadgesOpen, setIsAddSampleCategoryBadgesOpen] = useState(false);
  const [isAddingSampleCategoryBadges, setIsAddingSampleCategoryBadges] = useState(false);
  const [badgeEarnersFor, setBadgeEarnersFor] = useState<Badge | null>(null);
  const [badgeTogglingId, setBadgeTogglingId] = useState<string | null>(null);
  const [badgesStudent, setBadgesStudent] = useState<Student | null>(null);
  const [studentToPurge, setStudentToPurge] = useState<Student | null>(null);
  const [isPurgingStudent, setIsPurgingStudent] = useState(false);
  const [showPurgeFlash, setShowPurgeFlash] = useState(false);

  const [uploadReport, setUploadReport] = useState<{ success: number, failed: number, errors: string[] } | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [cropLogoSrc, setCropLogoSrc] = useState<string | null>(null);
  const [isPreviousLogosOpen, setIsPreviousLogosOpen] = useState(false);
  const [isDtcAlertOpen, setIsDtcAlertOpen] = useState(false);

  const [attendanceConfig, setAttendanceConfigState] = useState<AttendanceSettings | null>(null);
  const [attendanceLog, setAttendanceLogState] = useState<AttendanceLogEntry[]>([]);
  const [attendanceConfigSaving, setAttendanceConfigSaving] = useState(false);
  const [attendanceLogLoading, setAttendanceLogLoading] = useState(false);

  const filteredStudents = useMemo(() => {
    const list = (students || []).filter((s) => {
      const computedName = `${s.firstName} ${s.lastName} ${s.nickname || ''}`.toLowerCase();
      const term = studentSearchTerm.toLowerCase();
      const matchesSearch = computedName.includes(term) || (s.nfcId || '').toLowerCase().includes(term);
      const matchesClass = studentFilterClass === 'all' || s.classId === studentFilterClass;
      return matchesSearch && matchesClass;
    });

    return list.sort((a, b) => {
      if (studentSortOption === 'lastNameAsc') return a.lastName.localeCompare(b.lastName);
      if (studentSortOption === 'lastNameDesc') return b.lastName.localeCompare(a.lastName);
      if (studentSortOption === 'firstNameAsc') return a.firstName.localeCompare(b.firstName);
      if (studentSortOption === 'firstNameDesc') return b.firstName.localeCompare(a.firstName);
      if (studentSortOption === 'pointsDesc') return (b.lifetimePoints || b.points || 0) - (a.lifetimePoints || a.points || 0);
      if (studentSortOption === 'pointsAsc') return (a.lifetimePoints || a.points || 0) - (b.lifetimePoints || b.points || 0);
      return 0;
    });
  }, [students, studentSearchTerm, studentFilterClass, studentSortOption]);

  useEffect(() => {
    if (!selectionMode) return;
    if (filteredStudents.length !== 1) return;
    setSelectedStudentIds(new Set([filteredStudents[0].id]));
  }, [selectionMode, filteredStudents]);

  const defaultAttendanceConfig: AttendanceSettings = {
    pointsForSignIn: 1,
    pointsForOnTime: 1,
    onTimeWindowMinutes: 15,
    schedule: [],
  };

  useEffect(() => {
    if (!settings.enableClassSignIn || !schoolId || !getAttendanceConfig) return;
    getAttendanceConfig()
      .then((c) => {
        setAttendanceConfigState(c ?? defaultAttendanceConfig);
      })
      .catch(() => {
        setAttendanceConfigState(defaultAttendanceConfig);
      });
  }, [settings.enableClassSignIn, schoolId, getAttendanceConfig]);

  const loadAttendanceLog = () => {
    if (!listAttendanceLog) return;
    setAttendanceLogLoading(true);
    listAttendanceLog(80)
      .then(setAttendanceLogState)
      .catch(() => setAttendanceLogState([]))
      .finally(() => setAttendanceLogLoading(false));
  };

  const handleSaveAttendanceConfig = async () => {
    if (!attendanceConfig || !setAttendanceConfig) return;
    setAttendanceConfigSaving(true);
    try {
      await setAttendanceConfig(attendanceConfig);
      playSound('success');
      toast({ title: 'Attendance settings saved.' });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      let description = err?.message ?? String(e);
      if (description === 'internal' || err?.code?.includes('internal')) {
        description = 'Redeploy Cloud Functions (firebase deploy --only functions). If you sign in as developer, set DEV_PASSCODE in the function config. Check Firebase Console → Functions → Logs for details.';
      }
      toast({ variant: 'destructive', title: 'Failed to save', description });
    } finally {
      setAttendanceConfigSaving(false);
    }
  };

  const addScheduleSlot = () => {
    setAttendanceConfigState((prev) => ({
      ...prev!,
      schedule: [...(prev?.schedule ?? []), { id: `slot_${Date.now()}`, label: `Period ${(prev?.schedule?.length ?? 0) + 1}`, startTime: '08:00', endTime: '08:45' }],
    }));
  };

  const updateScheduleSlot = (index: number, field: keyof AttendanceScheduleSlot, value: string) => {
    setAttendanceConfigState((prev) => {
      if (!prev?.schedule) return prev;
      const next = [...prev.schedule];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, schedule: next };
    });
  };

  const removeScheduleSlot = (index: number) => {
    setAttendanceConfigState((prev) => ({
      ...prev!,
      schedule: prev?.schedule?.filter((_, i) => i !== index) ?? [],
    }));
  };

  const isDbLoading = studentsLoading || classesLoading || teachersLoading || categoriesLoading || prizesLoading || couponsLoading || backupsLoading;

  const collectionErrors = [
    { name: 'Students', error: studentsError },
    { name: 'Classes', error: classesError },
    { name: 'Teachers', error: teachersError },
    { name: 'Categories', error: categoriesError },
    { name: 'Prizes', error: prizesError },
    { name: 'Coupons', error: couponsError },
    { name: 'Backups', error: backupsError },
  ].filter(c => c.error);

  const getClassName = (classId: string) => {
    return classes?.find((c) => c.id === classId)?.name || 'Unassigned';
  };

  const getStudentName = (studentId?: string) => {
    if (!studentId) return 'N/A';
    const student = students?.find(s => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : `ID: ${studentId}`;
  };

  if (isDbLoading) {
    return <AdminDashboardSkeleton />;
  }

  if (collectionErrors.length > 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Alert variant="destructive">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Data Fetch Error</AlertTitle>
          <AlertDescription>
            Some school data could not be loaded. This may be due to temporary network issues or missing permissions.
            <ul className="mt-2 text-xs font-code list-disc pl-4">
              {collectionErrors.map((c, i) => (
                <li key={i}>{c.name}: {c.error?.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()} className="rounded-full">
          <History className="mr-2 h-4 w-4" /> Retry Loading
        </Button>
      </div>
    );
  }

  const handleSaveClass = () => {
    if (!newClassName) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Class Name Required', description: 'Please enter a name for the new class.' });
      return;
    }
    addClass({ name: newClassName });
    setNewClassName('');
    setIsClassModalOpen(false);
  };

  const handleSaveTeacher = () => {
    if (!newTeacherName) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Teacher Name Required', description: 'Please enter a name for the teacher.' });
      return;
    }

    let username = newTeacherUsername;
    let passcode = newTeacherPasscode;
    const budgetVal = newTeacherBudget ? parseInt(newTeacherBudget, 10) : undefined;

    if (!username) {
      username = newTeacherName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    }
    if (!passcode) {
      passcode = '1234';
    }

    if (editingTeacher) {
      updateTeacher({
        ...editingTeacher,
        name: newTeacherName,
        username,
        passcode,
        ...(budgetVal !== undefined ? { monthlyBudget: budgetVal } : { monthlyBudget: undefined }),
      });
    } else {
      addTeacher({ name: newTeacherName, username, passcode, ...(budgetVal !== undefined && { monthlyBudget: budgetVal }) });
    }

    setNewTeacherName('');
    setNewTeacherUsername('');
    setNewTeacherPasscode('');
    setNewTeacherBudget('');
    setEditingTeacher(null);
    setIsTeacherModalOpen(false);
  };

  const handleOpenCategoryModal = (category: Category | null) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleOpenStudentModal = (student: Student | null) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleOpenPrizeModal = (prize: Prize | null) => {
    setEditingPrize(prize);
    setIsPrizeModalOpen(true);
  };

  const handleOpenActivityModal = (student: Student) => {
    setActivityStudent(student);
  };

  const handleCreateBackup = async () => {
    if (!schoolId) return;
    await devCreateBackup(schoolId);
    playSound('success');
    toast({ title: "Backup Created", description: "A new backup has been saved." });
  };

  const handleRestoreFromBackup = async (backupId: string) => {
    if (!schoolId) return;
    await devRestoreFromBackup(schoolId, backupId);
    playSound('success');
    toast({ title: "Restore Complete", description: "Data has been restored from the backup." });
  };

  const handleDownloadBackup = async (backupId: string) => {
    if (!schoolId) return;
    await devDownloadBackup(schoolId, backupId);
  };

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!schoolId) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Cannot upload logo',
        description: 'No school selected. Refresh the page and log in again.',
      });
      e.target.value = '';
      return;
    }
    if (!functions) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Cannot upload logo',
        description: 'Server connection is not available. Refresh the page and try again.',
      });
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Unsupported file type',
        description: 'Please use PNG, JPG, or WebP. Your file appears to be a different format.',
      });
      e.target.value = '';
      return;
    }
    if (file.size > maxSizeBytes) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Logo must be under 5MB. Try compressing or resizing the image.',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropLogoSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input to allow same file again
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropLogoSrc(null);
    if (!schoolId || !functions) return;

    try {
      setIsLogoUploading(true);
      toast({ title: 'Uploading logo…', description: 'Please wait.' });

      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64 || '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(croppedBlob);
      });

      const uploadLogo = httpsCallable<{ schoolId: string; imageBase64: string; contentType: string }, { logoUrl: string }>(functions, 'uploadSchoolLogo');
      const res = await uploadLogo({
        schoolId,
        imageBase64,
        contentType: croppedBlob.type || 'image/jpeg',
      });

      const data = res.data;
      if (!data?.logoUrl) {
        throw new Error('No logo URL returned');
      }

      setLogoPreviewUrl(data.logoUrl);
      playSound('success');
      toast({ title: 'Logo updated!', description: 'Your school logo will now appear next to the school name.' });
    } catch (error: unknown) {
      console.error('Logo upload failed', error);
      playSound('error');
      const err = error as { code?: string; message?: string; details?: unknown };
      const code = err?.code ?? '';
      const message = String(err?.message ?? '');
      let description = message;
      if (!description && err?.details) {
        try {
          description = typeof err.details === 'string' ? err.details : JSON.stringify(err.details);
        } catch {
          // ignore
        }
      }
      if (code === 'functions/unauthenticated') {
        description = 'You must be logged in as an admin. Please sign in again.';
      } else if (code === 'functions/permission-denied') {
        description = 'You need admin access to update the school logo.';
      } else if (code === 'functions/invalid-argument') {
        description = message || 'Invalid image. Use PNG, JPG, or WebP under 5MB.';
      } else if (!message || message === 'undefined') {
        description = 'Could not save the logo. Try again or use a smaller image.';
      }
      toast({
        variant: 'destructive',
        title: 'Logo upload failed',
        description,
      });
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!schoolId || !schoolDocRef) return;
    try {
      setIsLogoUploading(true);
      await updateDoc(schoolDocRef, { logoUrl: null });
      setLogoPreviewUrl(null);
      playSound('success');
      toast({ title: 'Logo removed', description: 'The school logo has been deleted.' });
    } catch (err: any) {
      console.error('Failed to remove logo', err);
      playSound('error');
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the logo.' });
    } finally {
      setIsLogoUploading(false);
    }
  };

  const onStudentCsvFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const report = await uploadStudents(text, students || [], classes || []);
      if (report.failed > 0) {
        setUploadReport(report);
      }
    } catch (err: any) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Failed to process CSV file.',
        description: (err as Error).message,
      });
    }
    if (studentCsvInputRef.current) studentCsvInputRef.current.value = '';
  };

  const usedCouponsCount = coupons?.filter((c) => c.used).length || 0;
  const totalPointsAwarded = coupons?.filter((c) => c.used).reduce((sum, c) => sum + c.value, 0) || 0;

  const handleStudentCsvUpload = () => {
    studentCsvInputRef.current?.click();
  };

  const availableCoupons = coupons?.filter(c => !c.used).sort((a, b) => b.createdAt - a.createdAt) || [];
  const redeemedCoupons = coupons?.filter(c => c.used).sort((a, b) => (b.usedAt ?? 0) - (a.usedAt ?? 0)) || [];

  const handleDtcPrintClick = () => {
    if (selectionMode) {
      if (selectedStudentIds.size === 1) {
        const selected = students?.filter(s => selectedStudentIds.has(s.id)) || [];
        setStudentsToPrint({ students: selected, classes: classes || [], printerType: 'dtc4500e' });
      }
      // Button is disabled for > 1, so no action needed.
    } else {
      // This is for "Bulk Print" or "Print Class"
      setIsDtcAlertOpen(true);
    }
  };


  return (
    <TooltipProvider>
      <div className={cn("space-y-6 max-w-full mx-auto p-4 md:p-8", settings.displayMode === 'app' && 'pb-24')}>
        <Helper content="This page is for system administrators. It allows you to manage all school instances, create backups, and perform system-wide operations.">
          <h2 className="text-2xl font-bold tracking-tight">Admin</h2>
          <p className="text-muted-foreground">
            Manage students, classes, prizes, and system settings.
          </p>
        </Helper>

        <Tabs key={`${String(settings.enableAchievements)}:${String(settings.enableBadges)}`} defaultValue="students" className="space-y-6">
          <div className="flex overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-muted/50 p-1.5 rounded-2xl inline-flex w-max border shadow-sm sm:mx-auto">
              {settings.enableAdminAnalytics && (
                <TabsTrigger value="stats" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <LayoutDashboard className="w-4 h-4" /> Stats
                </TabsTrigger>
              )}
              <TabsTrigger value="branding" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <UploadCloud className="w-4 h-4" /> Branding
              </TabsTrigger>
              {settings.enableClassSignIn && (
                <TabsTrigger value="attendance" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Clock className="w-4 h-4" /> Attendance
                </TabsTrigger>
              )}
              <TabsTrigger value="students" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Users className="w-4 h-4" /> Students
              </TabsTrigger>
              <TabsTrigger value="classes" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <BookOpen className="w-4 h-4" /> Classes
              </TabsTrigger>
              <TabsTrigger value="teachers" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <User className="w-4 h-4" /> Teachers
              </TabsTrigger>
              <TabsTrigger value="categories" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Tag className="w-4 h-4" /> Categories
              </TabsTrigger>
              <TabsTrigger value="prizes" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Gift className="w-4 h-4" /> Prizes
              </TabsTrigger>
              <TabsTrigger value="coupons" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Ticket className="w-4 h-4" /> Coupons
              </TabsTrigger>
              {settings.enableAchievements && (
                <TabsTrigger value="bonuspoints" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Trophy className="w-4 h-4" /> Bonus Points
                </TabsTrigger>
              )}
              {settings.enableBadges && (
                <TabsTrigger value="category-badges" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Award className="w-4 h-4" /> Badges
                </TabsTrigger>
              )}
              <TabsTrigger value="backups" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Database className="w-4 h-4" /> Backups
              </TabsTrigger>
            </TabsList>
          </div>

          {settings.enableAdminAnalytics && (
            <TabsContent value="stats" className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <Card className="border-t-4 border-destructive shadow-md">
                <CardHeader className="py-6">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Activity className="text-destructive w-6 h-6" /> School Analytics
                  </CardTitle>
                  <CardDescription>Overview of points and engagement across the school.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-secondary/30 border-0 shadow-none">
                      <CardContent className="p-6">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Points Issued</h3>
                        <p className="text-4xl font-black text-foreground">{students?.reduce((sum, s) => sum + (s.lifetimePoints || s.points || 0), 0).toLocaleString() || 0}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-secondary/30 border-0 shadow-none">
                      <CardContent className="p-6">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Coupons Redeemed</h3>
                        <p className="text-4xl font-black text-foreground">{usedCouponsCount.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-secondary/30 border-0 shadow-none">
                      <CardContent className="p-6">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Active Students</h3>
                        <p className="text-4xl font-black text-foreground">{students?.length || 0}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-secondary/30 border-0 shadow-none">
                      <CardContent className="p-6">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Value Redeemed</h3>
                        <p className="text-4xl font-black text-foreground">{totalPointsAwarded.toLocaleString()} pts</p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-destructive shadow-md">
                <CardHeader>
                  <Helper content="A high-level overview of your school's data, including counts for students, classes, teachers, and coupon activity.">
                    <CardTitle className="flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-destructive" /> System Stats</CardTitle>
                  </Helper>
                  <CardDescription>Overview of your school data at a glance.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                  {[
                    { label: 'Students', val: students?.length || 0 },
                    { label: 'Classes', val: classes?.length || 0 },
                    { label: 'Teachers', val: teachers?.length || 0 },
                    { label: 'Coupons', val: coupons?.length || 0 },
                    { label: 'Used', val: usedCouponsCount },
                    { label: 'Points Issued', val: totalPointsAwarded.toLocaleString() },
                  ].map((stat, i) => (
                    <div key={i} className="bg-secondary/30 border p-6 rounded-2xl">
                      <p className="text-3xl font-bold font-code">{stat.val}</p>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter mt-1">{stat.label}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="branding" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-destructive shadow-md">
              <CardHeader className="py-6">
                <Helper content="Upload your school logo to show it next to the school name across the app.">
                  <CardTitle className="flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-primary" /> School Logo
                  </CardTitle>
                </Helper>
                <CardDescription>Logo appears beside the school name in the header. PNG, JPG, or WebP under 5MB.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="relative group">
                    <div className="h-20 w-20 rounded-full overflow-hidden bg-muted border border-border/60 flex items-center justify-center text-xs font-semibold text-muted-foreground shadow-lg shadow-primary/30">
                      {(logoPreviewUrl ?? schoolData?.logoUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoPreviewUrl ?? schoolData?.logoUrl ?? ''} alt="Current school logo" className={settings.logoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />
                      ) : (
                        <span>No logo</span>
                      )}
                    </div>
                    {(logoPreviewUrl ?? schoolData?.logoUrl) && (
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove logo"
                        disabled={isLogoUploading}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Current</span>
                  <div className="mt-2 flex flex-col items-center gap-1">
                    {previousSchoolLogos.length >= 1 ? (
                      <>
                        <Button variant="link" size="sm" className="text-[11px] h-auto p-0 text-muted-foreground" onClick={() => setIsPreviousLogosOpen(true)}>
                          View previous logos
                        </Button>
                        <Dialog open={isPreviousLogosOpen} onOpenChange={setIsPreviousLogosOpen}>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Previous School Logos</DialogTitle>
                              <DialogDescription>Select a previous logo to restore it.</DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-wrap justify-center gap-4 py-4 max-h-[400px] overflow-y-auto">
                              {previousSchoolLogos.map((url, idx) => (
                                <button
                                  key={`${url}-${idx}`}
                                  type="button"
                                  onClick={async () => {
                                    if (!schoolDocRef) return;
                                    try {
                                      await updateDoc(schoolDocRef, { logoUrl: url });
                                      setLogoPreviewUrl(url ?? null);
                                      playSound('success');
                                      toast({ title: 'Logo restored', description: 'Using selected previous logo.' });
                                      setIsPreviousLogosOpen(false);
                                    } catch (e) {
                                      toast({ variant: 'destructive', title: 'Failed to restore logo', description: String(e) });
                                    }
                                  }}
                                  className="h-24 w-24 rounded-2xl overflow-hidden border-2 border-border hover:border-primary transition-all bg-muted/60 flex-shrink-0"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={url} alt="Previous logo" className={settings.logoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />
                                </button>
                              ))}
                            </div>
                            <DialogFooter>
                              <Button variant="secondary" onClick={() => setIsPreviousLogosOpen(false)}>Close</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground text-center max-w-[200px]">Previous logos will appear here after you upload new ones.</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2 flex-1 max-w-sm">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Display</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateSettings({ logoDisplayMode: 'contain' })}
                      className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold ${settings.logoDisplayMode === 'contain' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    >
                      Fit
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSettings({ logoDisplayMode: 'cover' })}
                      className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold ${settings.logoDisplayMode === 'cover' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    >
                      Fill (crop)
                    </button>
                  </div>
                  <Label htmlFor="school-logo">Upload new logo</Label>
                  <Input
                    id="school-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleLogoUpload}
                    disabled={!schoolId || isLogoUploading}
                  />
                  {isLogoUploading && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Square image recommended, at least 128×128px.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {settings.enableClassSignIn && (
            <TabsContent value="attendance" className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <Card className="border-t-4 border-primary/50 shadow-md">
                <CardHeader className="py-6">
                  <Helper content="When Class Sign-In is on in Settings → Features, student kiosk logins can award points. Choose which classes participate, what rewards they get, what counts as on time, and set your class times.">
                    <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Attendance & Punctuality</CardTitle>
                  </Helper>
                  <CardDescription>Control who gets attendance, what rewards they earn, what &quot;on time&quot; means, and your period schedule.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {attendanceConfig && (
                    <>
                      {/* Who gets attendance */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" /> Who gets attendance</h4>
                        <p className="text-sm text-muted-foreground">Only students in the selected classes will earn points when they sign in at the kiosk. Leave &quot;All classes&quot; checked to include everyone.</p>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="att-all-classes"
                            checked={!attendanceConfig.enabledClassIds || attendanceConfig.enabledClassIds.length === 0}
                            onCheckedChange={(checked) => {
                              if (checked) setAttendanceConfigState({ ...attendanceConfig, enabledClassIds: undefined });
                              else setAttendanceConfigState({ ...attendanceConfig, enabledClassIds: (classes ?? []).map((c) => c.id) });
                            }}
                          />
                          <Label htmlFor="att-all-classes" className="font-semibold cursor-pointer">All classes</Label>
                        </div>
                        {(attendanceConfig.enabledClassIds && attendanceConfig.enabledClassIds.length >= 1) ? (
                          <div className="flex flex-wrap gap-3 pt-2">
                            {(classes ?? []).map((c) => (
                              <div key={c.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`att-class-${c.id}`}
                                  checked={attendanceConfig.enabledClassIds?.includes(c.id) ?? false}
                                  onCheckedChange={(checked) => {
                                    const prev = attendanceConfig.enabledClassIds ?? [];
                                    const next = checked ? [...prev, c.id] : prev.filter((id) => id !== c.id);
                                    setAttendanceConfigState({ ...attendanceConfig, enabledClassIds: next.length ? next : undefined });
                                  }}
                                />
                                <Label htmlFor={`att-class-${c.id}`} className="cursor-pointer">{c.name}</Label>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {attendanceConfig.enabledClassIds && attendanceConfig.enabledClassIds.length >= 1
                          ? <Button type="button" variant="outline" size="sm" onClick={() => setAttendanceConfigState({ ...attendanceConfig, enabledClassIds: undefined })}>Switch to all classes</Button>
                          : (classes?.length ?? 0) >= 1
                            ? <Button type="button" variant="outline" size="sm" onClick={() => setAttendanceConfigState({ ...attendanceConfig, enabledClassIds: (classes ?? []).map((c) => c.id) })}>Select specific classes</Button>
                            : null}
                      </div>

                      {/* Rewards */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Award className="w-4 h-4" /> Rewards</h4>
                        <p className="text-sm text-muted-foreground">Points students earn for signing in and (optionally) for being on time.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <Label>Points per sign-in</Label>
                            <Input
                              type="number"
                              min={0}
                              value={attendanceConfig.pointsForSignIn}
                              onChange={(e) => setAttendanceConfigState({ ...attendanceConfig, pointsForSignIn: parseInt(e.target.value, 10) || 0 })}
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">Awarded every time they log in at the kiosk.</p>
                          </div>
                          <div>
                            <Label>Bonus points (on time)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={attendanceConfig.pointsForOnTime}
                              onChange={(e) => setAttendanceConfigState({ ...attendanceConfig, pointsForOnTime: parseInt(e.target.value, 10) || 0 })}
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">Extra when they sign in within the on-time window.</p>
                          </div>
                          <div>
                            <Label>Award to category (optional)</Label>
                            <Select
                              value={attendanceConfig.categoryId ?? '__none__'}
                              onValueChange={(v) => setAttendanceConfigState({ ...attendanceConfig, categoryId: v === '__none__' ? undefined : v })}
                            >
                              <SelectTrigger><SelectValue placeholder="General points" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">General points</SelectItem>
                                {categories?.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground mt-1">Leave as &quot;General&quot; to add to total only.</p>
                          </div>
                        </div>
                      </div>

                      {/* What counts as on time */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Zap className="w-4 h-4" /> What counts as on time</h4>
                        <p className="text-sm text-muted-foreground">A sign-in is &quot;on time&quot; if the student logs in within this many minutes after the period start. After that they still get sign-in points but not the on-time bonus.</p>
                        <div className="max-w-[200px]">
                          <Label>On-time window (minutes)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={120}
                            value={attendanceConfig.onTimeWindowMinutes}
                            onChange={(e) => setAttendanceConfigState({ ...attendanceConfig, onTimeWindowMinutes: parseInt(e.target.value, 10) || 15 })}
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">e.g. 15 = on time if they sign in within 15 min of period start.</p>
                        </div>
                      </div>

                      {/* Class times */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Class times (periods)</h4>
                        <p className="text-sm text-muted-foreground">Define your periods with start and end times (24h format HH:mm). Used to decide which period a sign-in belongs to and whether it was on time.</p>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Label>Schedule</Label>
                          <Button type="button" variant="outline" size="sm" onClick={addScheduleSlot}>Add period</Button>
                        </div>
                        <div className="space-y-2">
                          {attendanceConfig.schedule.map((slot, index) => (
                            <div key={slot.id} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-muted/50">
                              <Input className="w-28" placeholder="e.g. Period 1" value={slot.label} onChange={(e) => updateScheduleSlot(index, 'label', e.target.value)} />
                              <Input className="w-20" placeholder="08:00" value={slot.startTime} onChange={(e) => updateScheduleSlot(index, 'startTime', e.target.value)} />
                              <span className="text-muted-foreground">–</span>
                              <Input className="w-20" placeholder="08:45" value={slot.endTime} onChange={(e) => updateScheduleSlot(index, 'endTime', e.target.value)} />
                              <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => removeScheduleSlot(index)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          ))}
                          {(!attendanceConfig.schedule || attendanceConfig.schedule.length === 0) && (
                            <p className="text-sm text-muted-foreground py-2">No periods yet. Add periods (e.g. Period 1 08:00–08:45) to enable on-time bonus.</p>
                          )}
                        </div>
                      </div>

                      <Button onClick={handleSaveAttendanceConfig} disabled={attendanceConfigSaving}>
                        {attendanceConfigSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Save attendance settings
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card className="border-t-4 border-primary/30 shadow-md">
                <CardHeader className="flex flex-row justify-between items-center py-6">
                  <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Recent sign-ins</CardTitle>
                  <Button variant="outline" size="sm" onClick={loadAttendanceLog} disabled={attendanceLogLoading}>
                    {attendanceLogLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[320px] w-full pr-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2 font-bold">Student</th>
                          <th className="py-2 font-bold">Time</th>
                          <th className="py-2 font-bold">Points</th>
                          <th className="py-2 font-bold">On time</th>
                          <th className="py-2 font-bold">Period</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceLog.map((entry) => (
                          <tr key={entry.id ?? entry.signedInAt} className="border-b border-border/50">
                            <td className="py-2">{entry.studentName || entry.studentId}</td>
                            <td className="py-2 text-muted-foreground">{new Date(entry.signedInAt).toLocaleString()}</td>
                            <td className="py-2">+{entry.pointsAwarded}</td>
                            <td className="py-2">{entry.onTime ? <CheckCircle className="w-4 h-4 text-green-600 inline" /> : '–'}</td>
                            <td className="py-2 text-muted-foreground">{entry.periodLabel ?? '–'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {attendanceLog.length === 0 && !attendanceLogLoading && (
                      <p className="text-center text-muted-foreground py-8">No sign-ins yet, or click Refresh to load. Have students log in at the kiosk to record attendance.</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="classes" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-destructive shadow-md">
              <CardHeader className="flex flex-row justify-between items-center py-6">
                <div>
                  <Helper content="Manage class groups for your school.">
                    <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-destructive" /> Classes</CardTitle>
                  </Helper>
                  <CardDescription>Manage class groups for your school.</CardDescription>
                </div>
                <Button onClick={() => setIsClassModalOpen(true)} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Add Class</Button>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {classes?.map((c) => (
                    <li key={c.id} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border hover:border-primary/20 transition-colors">
                      <span className="font-bold">{c.name}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => deleteClass(c.id, students || [])}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                  {(!classes || classes.length === 0) && (
                    <p className="text-center text-sm text-muted-foreground py-8 opacity-50">No classes yet.</p>
                  )}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teachers" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-destructive shadow-md">
              <CardHeader className="flex flex-row justify-between items-center py-6">
                <div>
                  <Helper content="Add and manage teachers who can issue coupons.">
                    <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-destructive" /> Teachers</CardTitle>
                  </Helper>
                  <CardDescription>Add and manage teachers who can issue coupons.</CardDescription>
                </div>
                <Button onClick={() => setIsTeacherModalOpen(true)} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Add Teacher</Button>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {teachers?.map((t) => (
                    <li key={t.id} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border hover:border-purple-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700">
                          {t.name[0]}
                        </div>
                        <div>
                          <p className="font-bold">{t.name}</p>
                          <p className="text-xs text-muted-foreground">User: <span className="font-code">{t.username}</span> | Pass: <span className="font-code">{t.passcode}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setEditingTeacher(t);
                          setNewTeacherName(t.name);
                          setNewTeacherUsername(t.username || '');
                          setNewTeacherPasscode(t.passcode || '');
                          setNewTeacherBudget(t.monthlyBudget?.toString() || '');
                          setIsTeacherModalOpen(true);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => deleteTeacher(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                  {(!teachers || teachers.length === 0) && (
                    <p className="text-center text-sm text-muted-foreground py-8 opacity-50">No teachers yet.</p>
                  )}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-destructive shadow-md">
              <CardHeader className="flex flex-row justify-between items-center py-6">
                <div>
                  <Helper content="Define categories and default point values for coupons.">
                    <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5 text-destructive" /> Reward Categories</CardTitle>
                  </Helper>
                  <CardDescription>Define categories and point values for coupons.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={async () => {
                    if (!confirm("This will assign a random color to all existing categories. Continue?")) return;
                    try {
                      let count = 0;
                      for (const c of categories || []) {
                        await updateCategory({ ...c, color: getRandomColor() });
                        count++;
                      }
                      toast({ title: "Colors Randomized", description: `Updated ${count} categories.` });
                    } catch(e) {
                      toast({ variant: "destructive", title: "Failed to randomize colors" });
                    }
                  }}>
                    <Palette className="mr-2 h-4 w-4" /> Randomize Colors
                  </Button>
                  <Button onClick={() => handleOpenCategoryModal(null)} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {categories?.map((c) => (
                    <li key={c.id} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border hover:border-chart-2/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.color || '#cccccc' }} />
                        <div>
                          <p className="font-bold">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                              {c.points} pts
                              <span className="ml-2 font-medium">
                                  • Added by {c.teacherId ? (teachers?.find(t => t.id === c.teacherId)?.name || 'Unknown Teacher') : 'Admin'}
                              </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenCategoryModal(c)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => deleteCategory(c.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                  {(!categories || categories.length === 0) && (
                    <p className="text-center text-sm text-muted-foreground py-8 opacity-50">No categories yet.</p>
                  )}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-destructive shadow-md overflow-hidden">
              <CardHeader className="bg-primary/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-8">
                <Helper content="Manage your enrollments, view student activity, and print ID cards. Points are awarded from the Teacher Portal.">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Users className="text-destructive w-6 h-6" /> Students
                  </CardTitle>
                </Helper>
                <CardDescription>Manage your enrollments and view student activity.</CardDescription>
                <div className='flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0'>
                  <Button onClick={handleStudentCsvUpload} variant="outline" className="rounded-xl px-4"><UploadCloud className="mr-2 h-4 w-4" /> Import CSV</Button>
                  <Button
                    onClick={() => {
                      const filtered = filteredStudents;

                      if (selectionMode && selectedStudentIds.size > 0) {
                        const selected = students?.filter(s => selectedStudentIds.has(s.id)) || [];
                        setStudentsToPrint({ students: selected, classes: classes || [] });
                      } else {
                        setStudentsToPrint({ students: filtered, classes: classes || [] });
                      }
                    }}
                    variant={(selectionMode && selectedStudentIds.size >= 1) || studentFilterClass !== 'all' ? "default" : "outline"}
                    className={cn(
                      "rounded-xl px-4",
                      ((selectionMode && selectedStudentIds.size >= 1) || studentFilterClass !== 'all') && "bg-orange-500 hover:bg-orange-600 font-bold"
                    )}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    {selectionMode && selectedStudentIds.size >= 1
                      ? `Print Selected (${selectedStudentIds.size})`
                      : studentFilterClass !== 'all'
                        ? `Print Class (${students?.filter(s => s.classId === studentFilterClass).length || 0})`
                        : "Bulk ID Print"
                    }
                  </Button>
                  <Button
                    onClick={handleDtcPrintClick}
                    disabled={selectionMode && selectedStudentIds.size > 1}
                    variant={(selectionMode && selectedStudentIds.size === 1) ? "default" : "outline"}
                    className={cn(
                      "rounded-xl px-4",
                      (selectionMode && selectedStudentIds.size === 1) ? "bg-amber-500 hover:bg-amber-600 font-bold" : "bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200"
                    )}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    {selectionMode && selectedStudentIds.size === 1
                      ? `Print Selected (DTC)`
                      : "DTC Card Print"
                    }
                  </Button>
                  <Button onClick={() => handleOpenStudentModal(null)} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Add Student</Button>
                  <input type="file" ref={studentCsvInputRef} onChange={onStudentCsvFileChange} className="hidden" accept=".csv" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-grow">
                    <Input placeholder="Search by name, nickname, or ID..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="rounded-full pl-10 h-11" />
                    <LayoutDashboard className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                  </div>
                    <div className="flex gap-2 items-center flex-wrap">
                    <Select value={studentSortOption} onValueChange={setStudentSortOption}>
                      <SelectTrigger className="w-[180px] rounded-xl h-11">
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lastNameAsc">Last Name (A-Z)</SelectItem>
                        <SelectItem value="lastNameDesc">Last Name (Z-A)</SelectItem>
                        <SelectItem value="firstNameAsc">First Name (A-Z)</SelectItem>
                        <SelectItem value="firstNameDesc">First Name (Z-A)</SelectItem>
                        <SelectItem value="pointsDesc">Points (High - Low)</SelectItem>
                        <SelectItem value="pointsAsc">Points (Low - High)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={studentFilterClass} onValueChange={setStudentFilterClass}>
                      <SelectTrigger className="w-[180px] rounded-xl h-11">
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes?.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 bg-secondary/30 px-4 h-11 rounded-xl border">
                      <Label htmlFor="selection-mode" className="text-sm font-bold opacity-70">Select</Label>
                      <Switch
                        id="selection-mode"
                        checked={selectionMode}
                        onCheckedChange={(checked) => {
                          setSelectionMode(checked);
                          if (!checked) setSelectedStudentIds(new Set());
                        }}
                      />
                    </div>
                  </div>
                </div>
                <ScrollArea className="h-[500px]">
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                    {filteredStudents.map(s => (
                      <li key={s.id} className={cn(
                        "flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-4 rounded-2xl border transition-all hover:bg-background shadow-sm",
                        selectedStudentIds.has(s.id) ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20" : "bg-secondary/20 border-transparent"
                      )}>
                        <div className="flex items-center gap-3">
                          {selectionMode && (
                            <Checkbox
                              checked={selectedStudentIds.has(s.id)}
                              onCheckedChange={(checked) => {
                                const next = new Set(selectedStudentIds);
                                if (checked) next.add(s.id);
                                else next.delete(s.id);
                                setSelectedStudentIds(next);
                              }}
                              className="mr-2"
                            />
                          )}
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 border border-border/40 flex items-center justify-center font-bold text-primary flex-shrink-0">
                            {s.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.photoUrl} alt={`${s.firstName} ${s.lastName}`} className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />
                            ) : (
                              <span>{(s.firstName[0] || '')}{(s.lastName[0] || '')}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-lg">{s.lastName}, {s.firstName}</p>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">{getClassName(s.classId || '')} | ID: <span className="font-code">{s.nfcId || '---'}</span></p>
                            <p className="text-primary font-bold text-xs mt-1">{s.points} pts accumulated</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 self-end sm:self-center">
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setThemeStudent(s)} title="Generate AI Theme"><Wand2 className="w-4 h-4 text-purple-500" /></Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => handleOpenActivityModal(s)}><History className="w-4 h-4" /></Button>
                          {settings.enableBadges && (
                            <Button
                              variant="outline"
                              size="icon"
                              className={cn("h-9 w-9 rounded-full", (!s.earnedBadges || s.earnedBadges.length === 0) && "opacity-40")}
                              disabled={!s.earnedBadges || s.earnedBadges.length === 0}
                              onClick={() => setBadgesStudent(s)}
                              title="View badges for this student"
                            >
                              <Award className={cn("w-4 h-4", (!s.earnedBadges || s.earnedBadges.length === 0) ? "text-muted-foreground" : "text-amber-500")} />
                            </Button>
                          )}
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => handleOpenStudentModal(s)}><Edit className="w-4 h-4 text-blue-500" /></Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full text-amber-600 hover:bg-amber-50"
                            title="Purge points & badges"
                            onClick={() => setStudentToPurge(s)}
                          >
                            <Zap className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full text-red-500 hover:bg-red-50" onClick={() => deleteStudent(s.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prizes" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-destructive shadow-md">
              <CardHeader className="flex flex-row justify-between items-center py-6">
                <div>
                  <Helper content="Manage items available for student redemption in the Prize Shop.">
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="text-destructive w-5 h-5" /> Prize Shop
                    </CardTitle>
                  </Helper>
                  <CardDescription>Items available for student redemption.</CardDescription>
                </div>
                <Button onClick={() => handleOpenPrizeModal(null)} className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" /> Add Prize
                </Button>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
                  {prizes?.sort((a, b) => a.points - b.points).map(p => (
                    <li key={p.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-secondary/30 p-4 rounded-2xl border group transition-all hover:bg-background">
                      <div className="flex items-center gap-4 flex-grow">
                        <div className="flex flex-col items-center">
                          <Switch checked={p.inStock} onCheckedChange={(checked) => updatePrize({ ...p, inStock: checked })} className="data-[state=checked]:bg-green-500 scale-75" />
                          <p className="text-[10px] font-bold mt-1 uppercase tracking-tighter opacity-50">{p.inStock ? 'On' : 'Off'}</p>
                        </div>
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-background border flex-shrink-0", !p.inStock && "opacity-40 grayscale")}>
                          <DynamicIcon name={p.icon} className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className={cn("font-bold text-base leading-none mb-1", !p.inStock && "line-through opacity-40")}>{p.name}</p>
                          <p className="text-xs font-bold text-primary">{p.points} points</p>
                        </div>
                      </div>
                      <div className="flex gap-1 self-end sm:self-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleOpenPrizeModal(p)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-red-500" onClick={() => deletePrize(p.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="coupons" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-destructive shadow-md">
              <CardHeader>
                <Helper content="This section shows all coupons that have been generated in the system, separated into those that are still available and those that have already been redeemed by a student.">
                  <CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5 text-destructive" /> Coupon Management</CardTitle>
                </Helper>
                <CardDescription>View all available and redeemed coupons in the system.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Available Coupons ({availableCoupons.length})</h3>
                  <ScrollArea className="h-[500px] border rounded-lg bg-background/50">
                    {availableCoupons.length >= 1 ? (
                      <ul className="p-3 space-y-2">
                        {availableCoupons.map(coupon => (
                          <li key={coupon.id} className="p-3 bg-card rounded-lg border">
                            <div className="flex justify-between items-center font-bold">
                              <span className="font-code text-primary">{coupon.code}</span>
                              <span>{coupon.value} pts</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              <p>{coupon.category} / by {coupon.teacher}</p>
                              <p>Created on {new Date(coupon.createdAt).toLocaleDateString()}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-center text-sm text-muted-foreground p-8">No available coupons.</p>
                    )}
                  </ScrollArea>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Redeemed Coupons ({redeemedCoupons.length})</h3>
                  <ScrollArea className="h-[500px] border rounded-lg bg-background/50">
                    {redeemedCoupons.length >= 1 ? (
                      <ul className="p-3 space-y-2">
                        {redeemedCoupons.map(coupon => (
                          <li key={coupon.id} className="p-3 bg-card rounded-lg border opacity-70">
                            <div className="flex justify-between items-center font-bold">
                              <span className="font-code">{coupon.code}</span>
                              <span>{coupon.value} pts</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              <p>{coupon.category} / by {coupon.teacher}</p>
                              <p>Used by {getStudentName(coupon.usedBy)} on {coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString() : 'N/A'}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-center text-sm text-muted-foreground p-8">No redeemed coupons.</p>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {settings.enableAchievements && (
          <TabsContent value="bonuspoints" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-destructive shadow-md">
              <CardHeader className="flex flex-row justify-between items-center py-6">
                <div>
                  <Helper content="Define bonus point milestones. When students hit these point thresholds they earn extra bonus points. Enable in Settings → Features → Recognition.">
                    <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-destructive" /> Bonus Points</CardTitle>
                  </Helper>
                  <CardDescription>Create milestones that award extra points when students reach point thresholds.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsAddSampleBadgesOpen(true)} className="rounded-xl" disabled={isAddingSamples}>
                    {isAddingSamples ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
                    Add sample milestones
                  </Button>
                  <Button onClick={() => { setEditingAchievement(null); setIsBadgeModalOpen(true); }} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Add milestone</Button>
                </div>
              </CardHeader>
              <CardContent>
                {achievementsLoading ? (
                  <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {[1, 2, 3].map(i => (
                      <li key={i} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-8 w-20" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {(achievements || []).map((ach) => (
                      <li key={ach.id} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border hover:border-amber-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center border-2 shrink-0"
                            style={{ borderColor: ach.accentColor || undefined, backgroundColor: ach.accentColor ? `${ach.accentColor}20` : undefined }}
                          >
                            <DynamicIcon name={ach.icon} className="w-5 h-5" style={ach.accentColor ? { color: ach.accentColor } : undefined} />
                          </div>
                          <div>
                            <p className="font-bold">{ach.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {ach.criteria.type === 'points' && `Current points ≥ ${ach.criteria.threshold}`}
                              {ach.criteria.type === 'lifetimePoints' && `Lifetime points ≥ ${ach.criteria.threshold}`}
                              {ach.criteria.type === 'coupons' && `Category threshold ${ach.criteria.threshold}`}
                              {ach.criteria.type === 'manual' && 'Manual award only'}
                              {ach.tier && ` · ${ach.tier}`}
                              {(ach.bonusPoints ?? 0) >= 1 && ` · +${ach.bonusPoints} bonus pts`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingAchievement(ach); setIsBadgeModalOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                            onClick={() => setAchievementToDelete(ach)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                    {(!achievements || achievements.length === 0) && (
                      <p className="text-center text-sm text-muted-foreground py-8 opacity-50">No milestones yet. Add one to get started.</p>
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {settings.enableBadges && (
          <TabsContent value="category-badges" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-destructive shadow-md">
              <CardHeader className="flex flex-row justify-between items-center py-6">
                <div>
                  <Helper content="Define badges students earn by reaching a points threshold in a category within a time period (e.g. Good Behavior badge for 50 points this month).">
                    <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-destructive" /> Badges</CardTitle>
                  </Helper>
                  <CardDescription>Category-based badges. Enable in Settings → Features → Recognition → Badges.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => { setEditingCategoryBadge(null); setIsCategoryBadgeModalOpen(true); }} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Add badge</Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddSampleCategoryBadgesOpen(true)}
                    className="rounded-xl"
                    disabled={isAddingSampleCategoryBadges || !categories?.length}
                  >
                    {isAddingSampleCategoryBadges ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
                    Add sample badges
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {badgesLoading ? (
                  <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {[1, 2, 3].map(i => (
                      <li key={i} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-8 w-20" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {(badges || []).map((b) => {
                      const cat = categories?.find(c => c.id === b.categoryId);
                      const periodLabel = b.period === 'month' ? 'This month' : b.period === 'semester' ? 'This semester' : b.period === 'year' ? 'This year' : 'All time';
                      const isToggling = badgeTogglingId === b.id;
                      const earnersCount = (students || []).filter(s => s.earnedBadges?.some(e => e.badgeId === b.id)).length;
                      return (
                        <li key={b.id} className={cn("flex justify-between items-center p-4 rounded-2xl border transition-colors", b.enabled === false ? "bg-muted/30 opacity-75" : "bg-secondary/20 hover:border-amber-200")}>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center border-2 shrink-0"
                              style={{ borderColor: b.accentColor || undefined, backgroundColor: b.accentColor ? `${b.accentColor}20` : undefined }}
                            >
                              <DynamicIcon name={b.icon} className="w-5 h-5" style={b.accentColor ? { color: b.accentColor } : undefined} />
                            </div>
                            <div>
                              <p className="font-bold">{b.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {cat?.name ?? 'Unknown'} · {b.pointsRequired} pts · {periodLabel}
                                {b.tier && ` · ${b.tier}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Enabled</span>
                              {isToggling ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              ) : (
                                <Switch
                                  checked={b.enabled !== false}
                                  onCheckedChange={async (checked) => {
                                    if (!firestore || !schoolId) return;
                                    setBadgeTogglingId(b.id);
                                    try {
                                      await updateBadge(firestore, schoolId, { ...b, enabled: checked });
                                      toast({ title: checked ? 'Badge enabled' : 'Badge disabled' });
                                    } catch (e: any) {
                                      toast({ variant: 'destructive', title: 'Update failed', description: e?.message });
                                    } finally {
                                      setBadgeTogglingId(null);
                                    }
                                  }}
                                  className="scale-90"
                                />
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-muted-foreground"
                              onClick={() => setBadgeEarnersFor(b)}
                              title="Who earned this badge"
                            >
                              <Users className="h-4 w-4" />
                              {earnersCount}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCategoryBadge(b); setIsCategoryBadgeModalOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => setCategoryBadgeToDelete(b)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                    {(!badges || badges.length === 0) && (
                      <p className="text-center text-sm text-muted-foreground py-8 opacity-50">No badges yet. Add one (e.g. Good Behavior badge for 50 points this month).</p>
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          <TabsContent value="backups" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-destructive shadow-md">
              <CardHeader className="flex flex-row justify-between items-center py-6">
                <div>
                  <Helper content="Create and restore full data snapshots of your school. This is a critical tool for data safety and recovery.">
                    <CardTitle className="flex items-center gap-2">
                      <Database className="text-destructive w-5 h-5" /> System Backups
                    </CardTitle>
                  </Helper>
                  <CardDescription>Create and restore data snapshots.</CardDescription>
                </div>
                <Button onClick={handleCreateBackup} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Create Snapshot</Button>
              </CardHeader>
              <CardContent className="p-6">
                <ScrollArea className="h-[400px]">
                  <ul className="space-y-2.5 pr-4">
                    {(backups || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(b => (
                      <li key={b.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-secondary/20 p-4 rounded-2xl border group transition-all hover:bg-background">
                        <div className="flex items-center gap-4 flex-grow">
                          <div className="w-10 h-10 rounded-full bg-chart-4/10 flex items-center justify-center flex-shrink-0">
                            <Database className="w-5 h-5 text-chart-4" />
                          </div>
                          <div>
                            <p className="font-code text-sm font-bold">{b.createdAt ? new Date(b.createdAt).toLocaleString() : 'Unknown date'}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{b.totalDocs} documents • <span className={b.type === 'scheduled' ? 'text-green-600' : 'text-blue-600'}>{b.type || 'manual'}</span></p>
                          </div>
                        </div>
                        <div className="flex gap-2 self-end sm:self-center">
                          <Button size="icon" variant="outline" className="rounded-full h-10 w-10 shadow-sm" onClick={() => handleDownloadBackup(b.id)}><Download className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="outline" className="rounded-full h-10 w-10 shadow-sm hover:border-red-200 hover:bg-red-50"><Upload className="h-4 w-4 text-orange-600" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl border-2">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-bold">Restore snapshot?</AlertDialogTitle>
                                <AlertDialogDescription className="text-base text-balance mt-2">
                                  This will <span className="font-bold text-red-600">OVERWRITE all current school data</span> with the state from {b.createdAt ? new Date(b.createdAt).toLocaleString() : 'unknown date'}. This cannot be easily undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-6">
                                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRestoreFromBackup(b.id)} className="rounded-full bg-orange-600 hover:bg-orange-700">Restore Data</AlertDialogAction>
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
          </TabsContent>

        </Tabs>

        {/* Modals outside Tabs */}
        <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="new-class-name">Class Name</Label>
                <Input id="new-class-name" value={newClassName} onChange={e => setNewClassName(e.target.value)} autoFocus />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsClassModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveClass}>Add Class</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isTeacherModalOpen} onOpenChange={(open) => {
          setIsTeacherModalOpen(open);
          if (!open) {
            setEditingTeacher(null);
            setNewTeacherName('');
            setNewTeacherUsername('');
            setNewTeacherPasscode('');
            setNewTeacherBudget('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="new-teacher-name">Display Name</Label>
                <Input id="new-teacher-name" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} autoFocus placeholder="e.g. Mr. Smith" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-teacher-username">Login Username</Label>
                <Input id="new-teacher-username" value={newTeacherUsername} onChange={e => setNewTeacherUsername(e.target.value)} placeholder="e.g. jsmith" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-teacher-passcode">Login Passcode</Label>
                <Input id="new-teacher-passcode" type="password" value={newTeacherPasscode} onChange={e => setNewTeacherPasscode(e.target.value)} placeholder="Secret passcode" />
              </div>
              {settings.enableTeacherBudgets && (
                <div className="space-y-1">
                  <Label htmlFor="new-teacher-budget">Monthly Budget (Points)</Label>
                  <Input id="new-teacher-budget" type="number" value={newTeacherBudget} onChange={e => setNewTeacherBudget(e.target.value)} placeholder="Leave blank for unlimited" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => {
                setIsTeacherModalOpen(false);
                setEditingTeacher(null);
                setNewTeacherName('');
                setNewTeacherUsername('');
                setNewTeacherPasscode('');
                setNewTeacherBudget('');
              }}>Cancel</Button>
              <Button onClick={handleSaveTeacher}>{editingTeacher ? 'Save Changes' : 'Add Teacher'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {cropLogoSrc && (
          <ImageCropper
            imageSrc={cropLogoSrc}
            aspectRatio={1}
            onCropComplete={handleCropComplete}
            onCancel={() => setCropLogoSrc(null)}
          />
        )}

        <StudentModal
          isOpen={isStudentModalOpen}
          setIsOpen={setIsStudentModalOpen}
          student={editingStudent}
          allStudents={students || []}
          allClasses={classes || []}
          allTeachers={teachers || []}
        />
        <PrizeModal
          isOpen={isPrizeModalOpen}
          setIsOpen={setIsPrizeModalOpen}
          prize={editingPrize}
          teachers={teachers || []}
          allClasses={classes || []}
        />
        <CategoryModal
          isOpen={isCategoryModalOpen}
          setIsOpen={setIsCategoryModalOpen}
          category={editingCategory}
        />
        <StudentActivityModal
          isOpen={!!activityStudent}
          setIsOpen={() => setActivityStudent(null)}
          student={activityStudent}
        />
        {settings.enableBadges && (
          <Dialog open={!!badgesStudent} onOpenChange={(open) => !open && setBadgesStudent(null)}>
            <DialogContent className="sm:max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  {badgesStudent
                    ? <>Badges for {badgesStudent.firstName} {badgesStudent.lastName}</>
                    : 'Badges'}
                </DialogTitle>
                <DialogDescription>
                  Earned category badges for this student. Badges are awarded automatically when they hit the thresholds.
                </DialogDescription>
              </DialogHeader>
              {badgesStudent && (() => {
                const earned = (badgesStudent.earnedBadges || [])
                  .map((e) => {
                    const def = badges.find((b) => b.id === e.badgeId);
                    return def && def.enabled !== false ? { ...def, periodKey: e.periodKey, earnedAt: e.earnedAt } : null;
                  })
                  .filter(Boolean) as (Badge & { periodKey: string; earnedAt: number })[];
                earned.sort((a, b) => b.earnedAt - a.earnedAt);
                return (
                  <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                    {earned.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        This student has not earned any badges yet.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {earned.map((b) => (
                          <li key={`${b.id}-${b.periodKey}-${b.earnedAt}`} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center border-2 bg-primary/5"
                                style={b.accentColor ? { borderColor: b.accentColor, backgroundColor: `${b.accentColor}20` } : undefined}
                              >
                                <DynamicIcon name={b.icon} className="w-4 h-4" style={b.accentColor ? { color: b.accentColor } : undefined} />
                              </div>
                              <div>
                                <p className="font-semibold leading-tight">{b.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {b.period === 'month' ? 'Monthly' : b.period === 'semester' ? 'Semester' : b.period === 'year' ? 'Yearly' : 'All time'} ·{' '}
                                  {new Date(b.earnedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              {b.tier || ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
              <DialogFooter>
                <Button variant="secondary" onClick={() => setBadgesStudent(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {themeStudent && (
          <ThemeGeneratorModal
            isOpen={!!themeStudent}
            onOpenChange={(open) => !open && setThemeStudent(null)}
            studentName={`${themeStudent.firstName} ${themeStudent.lastName}`}
            currentTheme={themeStudent.theme}
            onSave={async (theme) => {
              try {
                await updateStudent({ ...themeStudent, theme });
                playSound('success');
                toast({ title: 'Theme Updated!', description: `Successfully applied theme to ${themeStudent.firstName}.` });
              } catch (e) {
                console.error(e);
                playSound('error');
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to update student theme.' });
              }
            }}
          />
        )}
        <AchievementModal
          isOpen={isBadgeModalOpen}
          setIsOpen={setIsBadgeModalOpen}
          achievement={editingAchievement}
          categories={categories || []}
          onSave={async (data) => {
            if (!firestore || !schoolId) return;
            if (editingAchievement && 'id' in data) {
              await updateAchievement(firestore, schoolId, data as Achievement);
            } else {
              await addAchievement(firestore, schoolId, data as Omit<Achievement, 'id'>);
            }
            setEditingAchievement(null);
          }}
        />
        <BadgeModal
          isOpen={isCategoryBadgeModalOpen}
          setIsOpen={setIsCategoryBadgeModalOpen}
          badge={editingCategoryBadge}
          categories={categories || []}
          onSave={async (data) => {
            if (!firestore || !schoolId) return;
            if (editingCategoryBadge && 'id' in data) {
              await updateBadge(firestore, schoolId, data as Badge);
            } else {
              await addBadge(firestore, schoolId, data as Omit<Badge, 'id'>);
            }
            setEditingCategoryBadge(null);
          }}
        />
        <AlertDialog open={!!categoryBadgeToDelete} onOpenChange={(open) => !open && setCategoryBadgeToDelete(null)}>
          <AlertDialogContent className="rounded-3xl border-2">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete badge &quot;{categoryBadgeToDelete?.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>Students will no longer earn this badge. Already earned badges are not removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCategoryBadgeToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  if (categoryBadgeToDelete && firestore && schoolId) {
                    await deleteBadge(firestore, schoolId, categoryBadgeToDelete.id);
                    setCategoryBadgeToDelete(null);
                    playSound('success');
                    toast({ title: 'Badge deleted' });
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog open={!!badgeEarnersFor} onOpenChange={(open) => !open && setBadgeEarnersFor(null)}>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {badgeEarnersFor && (
                  <>
                    <Award className="h-5 w-5" style={badgeEarnersFor.accentColor ? { color: badgeEarnersFor.accentColor } : undefined} />
                    Who earned &quot;{badgeEarnersFor.name}&quot;
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                Students who have earned this badge (by period). Same student may appear multiple times if they earned it in different periods.
              </DialogDescription>
            </DialogHeader>
            {badgeEarnersFor && (() => {
              const entries = (students || []).flatMap((s) =>
                (s.earnedBadges || [])
                  .filter((e) => e.badgeId === badgeEarnersFor.id)
                  .map((e) => ({ student: s, periodKey: e.periodKey, earnedAt: e.earnedAt }))
              );
              entries.sort((a, b) => b.earnedAt - a.earnedAt);
              return (
                <div className="max-h-[320px] overflow-y-auto space-y-1 pr-1">
                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No one has earned this badge yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {entries.map((entry, i) => (
                        <li key={`${entry.student.id}-${entry.periodKey}-${entry.earnedAt}`} className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/50 text-sm">
                          <span className="font-medium">{getStudentNickname(entry.student)} {entry.student.lastName}</span>
                          <span className="text-muted-foreground text-xs">
                            {entry.periodKey} · {new Date(entry.earnedAt).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setBadgeEarnersFor(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog open={!!achievementToDelete} onOpenChange={(open) => !open && setAchievementToDelete(null)}>
          <AlertDialogContent className="rounded-3xl border-2">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete milestone &quot;{achievementToDelete?.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>Students will no longer earn bonus points from this milestone. Existing bonus points already awarded are not removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAchievementToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  if (achievementToDelete && firestore && schoolId) {
                    await deleteAchievement(firestore, schoolId, achievementToDelete.id);
                    setAchievementToDelete(null);
                    playSound('success');
                    toast({ title: 'Milestone deleted' });
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={!!studentToPurge} onOpenChange={(open) => !open && !isPurgingStudent && setStudentToPurge(null)}>
          <AlertDialogContent className="rounded-3xl border-2">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Purge points & badges for&nbsp;
                {studentToPurge ? `${getStudentNickname(studentToPurge)} ${studentToPurge.lastName}?` : 'this student?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will reset their current points, lifetime points, category totals, achievements, and badges to zero. Activity history stays for audit.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPurgingStudent} onClick={() => setStudentToPurge(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-amber-600 hover:bg-amber-700"
                disabled={isPurgingStudent}
                onClick={async () => {
                  if (!studentToPurge) return;
                  try {
                    setIsPurgingStudent(true);
                    setShowPurgeFlash(true);
                    await purgeStudentProgress(studentToPurge.id);
                    playSound('success');
                    toast({ title: 'Student purged', description: 'Points and badges have been reset.' });
                    setTimeout(() => setShowPurgeFlash(false), 600);
                    setStudentToPurge(null);
                  } catch (e: any) {
                    setShowPurgeFlash(false);
                    playSound('error');
                    toast({ variant: 'destructive', title: 'Purge failed', description: e?.message || 'Please try again.' });
                  } finally {
                    setIsPurgingStudent(false);
                  }
                }}
              >
                {isPurgingStudent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Yes, purge now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isAddSampleBadgesOpen} onOpenChange={setIsAddSampleBadgesOpen}>
          <AlertDialogContent className="rounded-3xl border-2">
            <AlertDialogHeader>
              <AlertDialogTitle>Add sample milestones?</AlertDialogTitle>
              <AlertDialogDescription>
                This will add {SAMPLE_BADGES.length} ready-made bonus point milestones (Early Bird, Century, Rising Star, etc.) with point thresholds and bonus points. You can edit or delete them anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsAddSampleBadgesOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!firestore || !schoolId) return;
                  setIsAddingSamples(true);
                  try {
                    for (const badge of SAMPLE_BADGES) {
                      await addAchievement(firestore, schoolId, badge);
                    }
                    playSound('success');
                    toast({ title: 'Sample milestones added', description: `${SAMPLE_BADGES.length} milestones were created.` });
                    setIsAddSampleBadgesOpen(false);
                  } catch (e: any) {
                    playSound('error');
                    toast({ variant: 'destructive', title: 'Failed to add milestones', description: e?.message || 'Please try again.' });
                  } finally {
                    setIsAddingSamples(false);
                  }
                }}
              >
                Add {SAMPLE_BADGES.length} milestones
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isAddSampleCategoryBadgesOpen} onOpenChange={setIsAddSampleCategoryBadgesOpen}>
          <AlertDialogContent className="rounded-3xl border-2">
            <AlertDialogHeader>
              <AlertDialogTitle>Add sample badges?</AlertDialogTitle>
              <AlertDialogDescription>
                {categories?.length
                  ? `This will add 4 category-based badges (Monthly Star, Monthly Champion, Semester Standout, Yearly Excellence) for the category "${categories[0].name}". You can edit or delete them anytime.`
                  : 'Create at least one category in the Categories tab first, then add sample badges.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsAddSampleCategoryBadgesOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!categories?.length || isAddingSampleCategoryBadges}
                onClick={async () => {
                  if (!firestore || !schoolId || !categories?.length) return;
                  const categoryId = categories[0].id;
                  const samples = getSampleCategoryBadges(categoryId);
                  setIsAddingSampleCategoryBadges(true);
                  try {
                    for (const b of samples) {
                      await addBadge(firestore, schoolId, b);
                    }
                    playSound('success');
                    toast({ title: 'Sample badges added', description: `${samples.length} badges were created for ${categories[0].name}.` });
                    setIsAddSampleCategoryBadgesOpen(false);
                  } catch (e: any) {
                    playSound('error');
                    toast({ variant: 'destructive', title: 'Failed to add badges', description: e?.message || 'Please try again.' });
                  } finally {
                    setIsAddingSampleCategoryBadges(false);
                  }
                }}
              >
                {isAddingSampleCategoryBadges ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add 4 badges
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isDtcAlertOpen} onOpenChange={setIsDtcAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bulk DTC Printing</AlertDialogTitle>
              <AlertDialogDescription>
                Direct-to-card (DTC) printers print one card at a time. To prevent issues, please use the &quot;Select&quot; mode to choose and print one student ID at a time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsDtcAlertOpen(false)}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {showPurgeFlash && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
            <div className="absolute inset-0 bg-white/90 animate-pulse" />
            <div className="relative z-10 px-10 py-6 rounded-full border-4 border-amber-500 bg-white shadow-2xl text-amber-700 text-xl font-black tracking-[0.3em] uppercase">
              Purged
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function AdminLogin({ onLogin }: { onLogin: (passcode: string) => Promise<boolean> }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const success = await onLogin(passcode);
    if (!success) {
      setError('Invalid admin passcode');
      setPasscode('');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-sm shadow-2xl border-t-8 border-destructive">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-destructive text-destructive-foreground rounded-2xl flex items-center justify-center shadow-lg">
            <LayoutDashboard className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-black">Admin Access</CardTitle>
          <CardDescription>Enter the school admin passcode.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="h-12 text-center text-lg font-mono tracking-widest"
                autoFocus
              />
              {error && <p className="text-sm text-red-500 text-center font-bold">{error}</p>}
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-lg font-bold shadow-md"
              disabled={isLoading || !passcode}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Dashboard'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { loginState, isInitialized, isAdmin, login, schoolId } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !['student', 'teacher', 'admin', 'school', 'developer'].includes(loginState)) {
      router.replace('/');
    }
  }, [isInitialized, loginState, router]);

  const handleAdminLogin = async (passcode: string) => {
    if (!schoolId) return false;
    return await login('admin', { schoolId, passcode });
  };

  if (!isInitialized || !['student', 'teacher', 'admin', 'school', 'developer'].includes(loginState)) {
    return <AdminDashboardSkeleton />;
  }

  if (!isAdmin) {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  return (
    <ErrorBoundary name="AdminPage">
      <AdminDashboardInner />
    </ErrorBoundary>
  );
}
