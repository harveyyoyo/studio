'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, getDoc, query, getDocs, orderBy, limit } from 'firebase/firestore';
import {
  Plus, Trash2, Server, Pencil, Database, Download, Upload, ShieldCheck, HelpCircle, LifeBuoy, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


interface SchoolInfo {
  id: string;
  name: string;
}

interface BackupInfo {
    id: string;
}

interface SchoolStats {
  students: number;
  classes: number;
  teachers: number;
  categories: number;
  prizes: number;
  coupons: number;
  usedCoupons: number;
  totalPointsAwarded: number;
}


function SchoolStatsModal({ school, isOpen, onOpenChange }: { school: SchoolInfo | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const [stats, setStats] = useState<SchoolStats | null>(null);
    const [loading, setLoading] = useState(true);
    const firestore = useFirestore();

    useEffect(() => {
        if (!isOpen || !school || !firestore) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                const collections = ['students', 'classes', 'teachers', 'categories', 'prizes', 'coupons'];
                const promises = collections.map(col => getDocs(collection(firestore, 'schools', school.id, col)));
                const snapshots = await Promise.all(promises);

                const couponsSnapshot = snapshots[5];
                const usedCoupons = couponsSnapshot.docs.filter(doc => doc.data().used).length;
                
                const totalPointsAwarded = couponsSnapshot.docs
                    .filter((c) => c.data().used)
                    .reduce((sum, c) => sum + c.data().value, 0) || 0;


                setStats({
                    students: snapshots[0].size,
                    classes: snapshots[1].size,
                    teachers: snapshots[2].size,
                    categories: snapshots[3].size,
                    prizes: snapshots[4].size,
                    coupons: snapshots[5].size,
                    usedCoupons: usedCoupons,
                    totalPointsAwarded: totalPointsAwarded
                });
            } catch (error) {
                console.error("Error fetching school stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [isOpen, school, firestore]);

    if (!school) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Database Stats for <span className="font-code">{school.id}</span></DialogTitle>
                    <DialogDescription>{school.name}</DialogDescription>
                </DialogHeader>
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 text-center">
                      {Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-24" />)}
                    </div>
                ) : stats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 text-center">
                        <div className="bg-secondary p-4 rounded-lg">
                            <p className="text-2xl font-bold">{stats.students}</p>
                            <p className="text-sm text-muted-foreground">Students</p>
                        </div>
                        <div className="bg-secondary p-4 rounded-lg">
                            <p className="text-2xl font-bold">{stats.classes}</p>
                            <p className="text-sm text-muted-foreground">Classes</p>
                        </div>
                        <div className="bg-secondary p-4 rounded-lg">
                            <p className="text-2xl font-bold">{stats.teachers}</p>
                            <p className="text-sm text-muted-foreground">Teachers</p>
                        </div>
                        <div className="bg-secondary p-4 rounded-lg">
                            <p className="text-2xl font-bold">{stats.coupons} / {stats.usedCoupons}</p>
                            <p className="text-sm text-muted-foreground">Coupons (Used)</p>
                        </div>
                        <div className="bg-secondary p-4 rounded-lg">
                            <p className="text-2xl font-bold">{stats.prizes}</p>
                            <p className="text-sm text-muted-foreground">Prize Types</p>
                        </div>
                         <div className="bg-secondary p-4 rounded-lg">
                             <p className="text-2xl font-bold">{stats.totalPointsAwarded.toLocaleString()}</p>
                             <p className="text-sm text-muted-foreground">Points Awarded</p>
                         </div>
                    </div>
                )}
                 <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function DeveloperPage() {
  const { 
      loginState, isInitialized, createSchool, deleteSchool, updateSchool,
      devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools,
      isAutoBackupEnabled, toggleAutoBackup, devMigrateSchoolData
    } = useAppContext();
  const firestore = useFirestore();
  const router = useRouter();
  const [newSchoolId, setNewSchoolId] = useState('');
  const { toast } = useToast();
  
  const [createdSchoolInfo, setCreatedSchoolInfo] = useState<{id: string, passcode: string} | null>(null);
  const [editingSchool, setEditingSchool] = useState<SchoolInfo | null>(null);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [backupSchool, setBackupSchool] = useState<SchoolInfo | null>(null);
  const [schoolBackups, setSchoolBackups] = useState<BackupInfo[]>([]);
  const [statsSchool, setStatsSchool] = useState<SchoolInfo | null>(null);
  
  const [orphanSchoolId, setOrphanSchoolId] = useState('');
  const [latestBackup, setLatestBackup] = useState<{id: string} | null>(null);
  const [isFindingBackup, setIsFindingBackup] = useState(false);

  const schoolsQuery = useMemoFirebase(() => loginState === 'developer' ? collection(firestore, 'schools') : null, [loginState, firestore]);
  const { data: allSchools, isLoading: schoolsLoading } = useCollection<SchoolInfo>(schoolsQuery);

  useEffect(() => {
    if (isInitialized && loginState !== 'developer') {
      router.replace('/');
    }
  }, [isInitialized, loginState, router]);
  
  // Automatically create the sample schools once on developer login
  useEffect(() => {
    if (loginState !== 'developer' || !firestore || !createSchool) return;

    const createSampleSchoolIfNeeded = async (schoolId: string) => {
      const schoolDocRef = doc(firestore, 'schools', schoolId);
      try {
        const docSnap = await getDoc(schoolDocRef);
        if (!docSnap.exists()) {
          console.log(`Creating '${schoolId}' sample school...`);
          await createSchool(schoolId);
        }
      } catch (error) {
        console.error(`Failed to check or create '${schoolId}' school:`, error);
      }
    };
    
    createSampleSchoolIfNeeded('yeshiva');
    createSampleSchoolIfNeeded('schoolabc');
  }, [loginState, firestore, createSchool]);
  
  const handleFindLatestBackup = async () => {
    if (!firestore || !orphanSchoolId) return;
    setIsFindingBackup(true);
    setLatestBackup(null);
    try {
        const backupsRef = collection(firestore, 'schools', orphanSchoolId, 'backups');
        const q = query(backupsRef, orderBy('__name__', 'desc'), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            toast({ variant: 'destructive', title: 'No Backups Found', description: `No backups were found for school ID "${orphanSchoolId}". A backup must exist to restore data.` });
        } else {
            const backupDoc = snapshot.docs[0];
            setLatestBackup({ id: backupDoc.id });
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error Finding Backup', description: (e as Error).message });
    } finally {
        setIsFindingBackup(false);
    }
  }

  const handleRestoreOrphan = async () => {
    if (!orphanSchoolId || !latestBackup) return;
    await devRestoreFromBackup(orphanSchoolId, latestBackup.id);
    toast({ title: 'Restore Complete!', description: `The school "${orphanSchoolId}" should now appear in the main list below. You may need to run the data migration tool on it.`});
    setOrphanSchoolId('');
    setLatestBackup(null);
  }

  const handleCreateSchool = async () => {
      if(!newSchoolId) {
          toast({variant: 'destructive', title: "School ID cannot be empty."});
          return;
      }
      const result = await createSchool(newSchoolId);
      if (result) {
        setCreatedSchoolInfo({ id: result.cleanId, passcode: result.passcode });
      }
      setNewSchoolId('');
  };
  
  const handleOpenEditModal = (school: SchoolInfo) => {
    setEditingSchool(school);
    setNewSchoolName(school.name);
    setNewPasscode(''); // Clear passcode for security
  }

  const handleCloseEditModal = () => {
    setEditingSchool(null);
    setNewSchoolName('');
    setNewPasscode('');
  }

  const handleUpdateSchool = async () => {
    if (!editingSchool) return;

    const updates: { name?: string; passcode?: string } = {};
    if (newSchoolName && newSchoolName !== editingSchool.name) {
      updates.name = newSchoolName;
    }
    if (newPasscode) {
      updates.passcode = newPasscode;
    }

    if (Object.keys(updates).length > 0) {
      await updateSchool(editingSchool.id, updates);
      toast({ title: `School "${editingSchool.id}" updated!` });
    } else {
      toast({ title: 'No changes were made.' });
    }
    handleCloseEditModal();
  }
  
   const handleOpenBackupModal = async (school: SchoolInfo) => {
    if (!firestore) return;
    setBackupSchool(school);
    const backupsColRef = collection(firestore, 'schools', school.id, 'backups');
    const q = query(backupsColRef);
    const snapshot = await getDocs(q);
    const backupList = snapshot.docs.map(doc => ({ id: doc.id })).sort((a, b) => parseInt(b.id) - parseInt(a.id));
    setSchoolBackups(backupList);
  }

  const handleCloseBackupModal = () => {
    setBackupSchool(null);
    setSchoolBackups([]);
  }
  
  const handleCreateBackup = async () => {
      if (!backupSchool) return;
      await devCreateBackup(backupSchool.id);
      handleOpenBackupModal(backupSchool); // Refresh list
      toast({title: "Backup Created"});
  }
  
  const handleRestoreBackup = async (backupId: string) => {
      if (!backupSchool) return;
      await devRestoreFromBackup(backupSchool.id, backupId);
      toast({title: "Restore Complete", description: `School "${backupSchool.id}" has been restored.`});
  }

  const handleBackupAll = async () => {
    if (!allSchools) return;
    await devBackupAllSchools();
    toast({title: "Backup process complete", description: "All schools have been backed up."});
  }

  if (!isInitialized || loginState !== 'developer') {
    return <p>Loading...</p>;
  }
  
  return (
    <TooltipProvider>
      <div className="space-y-6">
          <Card className="bg-card border-b-4 border-slate-700 dark:border-slate-500 p-6 shadow-lg flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
                      <Server /> Developer Mode
                  </h2>
                  <p className="text-slate-400 text-sm">Manage all school databases.</p>
              </div>
          </Card>
          
          <Alert variant="destructive" className="border-2">
            <LifeBuoy className="h-4 w-4" />
            <AlertTitle className="font-bold">Emergency Data Recovery</AlertTitle>
            <AlertDescription>
                If a school was accidentally deleted or its data overwritten, you can attempt to restore it here. This will restore the main school document from its most recent backup. You may then need to use the "Migrate Data" tool on the school.
            </AlertDescription>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 items-start">
              <div className="flex-grow w-full sm:w-auto">
                <Label htmlFor="orphan-id" className="font-bold">Orphaned School ID</Label>
                <Input 
                  id="orphan-id" 
                  placeholder="e.g. elisheva" 
                  value={orphanSchoolId} 
                  onChange={e => setOrphanSchoolId(e.target.value.trim().toLowerCase())}
                />
              </div>
              <div className="self-end h-full">
                <Button onClick={handleFindLatestBackup} disabled={!orphanSchoolId || isFindingBackup}>
                  {isFindingBackup ? "Searching..." : "Find Latest Backup"}
                </Button>
              </div>
            </div>
            {latestBackup && (
              <div className="mt-4 p-4 bg-secondary rounded-lg flex flex-col sm:flex-row justify-between items-center">
                <div>
                  <p className="font-bold">Latest Backup Found!</p>
                  <p className="text-sm font-code">Date: {new Date(parseInt(latestBackup.id)).toLocaleString()}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button>Restore This Backup</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will restore the school document '{orphanSchoolId}' using the backup from {new Date(parseInt(latestBackup.id)).toLocaleString()}. The school will reappear in the list below.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRestoreOrphan}>Restore</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Global Actions</CardTitle>
              <CardDescription>Perform actions across all school databases.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col justify-between bg-secondary p-4 rounded-lg border">
                <div>
                  <h3 className="font-bold flex items-center gap-2"><Database />One-Click Backup</h3>
                  <p className="text-sm text-muted-foreground mt-1">Create a new backup for every school instance instantly.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="secondary" className="mt-4">Backup All Schools</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will trigger a backup for all {allSchools?.length || 0} school databases. This may take a few moments to complete.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBackupAll}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="flex flex-col justify-between bg-secondary p-4 rounded-lg border">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><ShieldCheck />Automatic Daily Backups</h3>
                    <p className="text-sm text-muted-foreground mt-1">If enabled, a backup of all schools will be created automatically once every 24 hours.</p>
                  </div>
                  <div className="flex items-center space-x-2 mt-4">
                    <Switch
                      id="auto-backup-switch"
                      checked={isAutoBackupEnabled}
                      onCheckedChange={toggleAutoBackup}
                    />
                    <Label htmlFor="auto-backup-switch" className="font-normal">
                      {isAutoBackupEnabled ? "Enabled" : "Disabled"}
                    </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                      <span>School Instances</span>
                      <span className="text-sm font-normal bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{allSchools?.length || 0} total</span>
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="flex flex-col sm:flex-row gap-2 mb-6">
                      <Input 
                          placeholder="New School ID (e.g. 'washington_hs')" 
                          value={newSchoolId} 
                          onChange={(e) => setNewSchoolId(e.target.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          onKeyPress={e => e.key === 'Enter' && handleCreateSchool()}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button onClick={handleCreateSchool}><Plus className="mr-2"/>Create School</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Create a new, empty school database instance. <br /> Use a simple, lowercase ID with underscores instead of spaces.</p>
                        </TooltipContent>
                      </Tooltip>
                  </div>
                  {schoolsLoading ? <p>Loading schools...</p> : (
                   <ul className="space-y-2">
                      {allSchools && [...allSchools].sort((a,b) => a.id.localeCompare(b.id)).map((school) => (
                          <li key={school.id} className="flex flex-wrap gap-2 justify-between items-center bg-secondary p-3 rounded-lg border">
                              <div onClick={() => setStatsSchool(school)} className="flex-grow cursor-pointer rounded -m-2 p-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">
                                <p className="font-bold font-code break-all">{school.id}</p>
                                <p className="text-sm text-muted-foreground">{school.name}</p>
                              </div>
                              <div className="flex items-center gap-0.5">
                                 <AlertDialog>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <RefreshCw className="w-4 h-4 text-orange-500" />
                                        </Button>
                                      </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Migrate school data to new structure.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Migrate Data for {school.id}?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will run scripts to move data from the main document to subcollections. Run this if the school's data is not showing up correctly after a restore. This action is safe to run multiple times.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => devMigrateSchoolData(school.id)}>Migrate</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenBackupModal(school)}>
                                      <Database className="w-4 h-4 text-green-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Manage Backups</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(school)}>
                                      <Pencil className="w-4 h-4 text-blue-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit school name and passcode.</p>
                                  </TooltipContent>
                                </Tooltip>
                                <AlertDialog>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                      </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Permanently delete this school and all its data.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the school database for <span className="font-bold font-code">{school.id}</span>. A final backup will be created automatically.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={async () => await deleteSchool(school.id)}>Continue</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                          </li>
                      ))}
                      {(!allSchools || allSchools.length === 0) && (
                          <p className="text-center text-muted-foreground italic py-4">No schools found. Create one to begin.</p>
                      )}
                  </ul>
                  )}
              </CardContent>
          </Card>
          
          <SchoolStatsModal 
            school={statsSchool}
            isOpen={!!statsSchool}
            onOpenChange={(open) => !open && setStatsSchool(null)}
          />
          
          <AlertDialog open={!!createdSchoolInfo} onOpenChange={() => setCreatedSchoolInfo(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>School Created Successfully!</AlertDialogTitle>
                <AlertDialogDescription>
                  The school <span className="font-bold font-code">{createdSchoolInfo?.id}</span> has been created. Here is the passcode. Please store it securely, as it will not be shown again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center my-4">
                  <p className="text-sm text-muted-foreground">School ID</p>
                  <p className="font-code font-bold text-lg">{createdSchoolInfo?.id}</p>
                  <p className="text-sm text-muted-foreground mt-2">New School Passcode</p>
                  <p className="font-code font-bold text-3xl tracking-widest text-primary">{createdSchoolInfo?.passcode}</p>
              </div>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setCreatedSchoolInfo(null)}>Close</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Dialog open={!!editingSchool} onOpenChange={handleCloseEditModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit School: <span className="font-code">{editingSchool?.id}</span></DialogTitle>
                <DialogDescription>
                  Update the school's name or set a new passcode. Leaving the passcode field blank will not change it.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-school-name" className="text-right">Name</Label>
                    <Input
                      id="edit-school-name"
                      value={newSchoolName}
                      onChange={(e) => setNewSchoolName(e.target.value)}
                      className="col-span-3"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-passcode" className="text-right">New Passcode</Label>
                    <Input
                      id="new-passcode"
                      value={newPasscode}
                      placeholder="(Leave blank to keep unchanged)"
                      onChange={(e) => setNewPasscode(e.target.value)}
                      className="col-span-3"
                    />
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={handleCloseEditModal}>Cancel</Button>
                <Button onClick={handleUpdateSchool}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!backupSchool} onOpenChange={handleCloseBackupModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Manage Backups for <span className="font-code">{backupSchool?.id}</span></DialogTitle>
                <DialogDescription>
                  Create, download, or restore backups for this school instance.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Button onClick={handleCreateBackup} className="mb-4"><Plus className="mr-2" />Create New Backup</Button>
                 <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {schoolBackups.length > 0 ? schoolBackups.map(backup => (
                    <li key={backup.id} className="flex justify-between items-center bg-secondary p-2 rounded border">
                      <span className="font-code text-sm break-all">{new Date(parseInt(backup.id)).toLocaleString()}</span>
                      <div className="flex gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                               <Button size="sm" variant="outline" onClick={() => devDownloadBackup(backupSchool!.id, backup.id)}><Download className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Download</p></TooltipContent>
                          </Tooltip>
                        <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline"><Upload className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent><p>Restore</p></TooltipContent>
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restore from this backup?</AlertDialogTitle>
                              <AlertDialogDescription>This will overwrite all current data for {backupSchool?.id} with the data from {new Date(parseInt(backup.id)).toLocaleString()}. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRestoreBackup(backup.id)}>Restore</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </li>
                  )) : <p className="text-center text-sm text-muted-foreground italic py-4">No backups found for this school.</p>}
                </ul>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={handleCloseBackupModal}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>
    </TooltipProvider>
  )
}
