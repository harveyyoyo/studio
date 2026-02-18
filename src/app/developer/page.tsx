'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  Plus, Trash2, Server, Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function DeveloperPage() {
  const { loginState, isInitialized, createSchool, deleteSchool, updateSchoolPasscode } = useAppContext();
  const firestore = useFirestore();
  const router = useRouter();
  const [newSchoolId, setNewSchoolId] = useState('');
  const { toast } = useToast();
  
  const [allSchools, setAllSchools] = useState<string[]>([]);
  
  // State for showing new school passcode
  const [createdSchoolInfo, setCreatedSchoolInfo] = useState<{id: string, passcode: string} | null>(null);
  
  // State for editing a school's passcode
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [newPasscode, setNewPasscode] = useState('');

  useEffect(() => {
    if (isInitialized && loginState !== 'developer') {
      router.replace('/');
    }
  }, [isInitialized, loginState, router]);

  useEffect(() => {
    if (loginState !== 'developer' || !firestore) {
      setAllSchools([]);
      return;
    }

    const schoolsColRef = collection(firestore, 'schools');
    const unsubscribe = onSnapshot(schoolsColRef, (snapshot) => {
        const schoolIds = snapshot.docs.map(doc => doc.id);
        setAllSchools(schoolIds);
    }, (error) => {
        console.error("Error fetching all schools:", error);
        toast({variant: 'destructive', title: "Could not fetch school list"});
        setAllSchools([]);
    });

    return () => unsubscribe();
  }, [loginState, firestore, toast]);

  const handleCreateSchool = async () => {
      if(!newSchoolId) {
          toast({variant: 'destructive', title: "School ID cannot be empty."});
          return;
      }
      const passcode = await createSchool(newSchoolId);
      if (passcode) {
        setCreatedSchoolInfo({ id: newSchoolId, passcode });
      }
      setNewSchoolId('');
  };
  
  const handleOpenEditModal = (id: string) => {
    setEditingSchoolId(id);
    setNewPasscode('');
  }

  const handleCloseEditModal = () => {
    setEditingSchoolId(null);
    setNewPasscode('');
  }

  const handleUpdatePasscode = async () => {
    if (!editingSchoolId || !newPasscode) {
      toast({ variant: 'destructive', title: 'New passcode cannot be empty.' });
      return;
    }
    await updateSchoolPasscode(editingSchoolId, newPasscode);
    toast({ title: `Passcode for ${editingSchoolId} updated!` });
    handleCloseEditModal();
  }

  if (!isInitialized || loginState !== 'developer') {
    return <p>Loading...</p>;
  }
  
  return (
      <div className="space-y-6">
          <Card className="bg-card border-b-4 border-slate-700 dark:border-slate-500 p-6 shadow-lg flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
                      <Server /> Developer Mode
                  </h2>
                  <p className="text-slate-400 text-sm">Manage all school databases.</p>
              </div>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                      <span>School Instances</span>
                      <span className="text-sm font-normal bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{allSchools.length} total</span>
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="flex gap-2 mb-6">
                      <Input 
                          placeholder="New School ID (e.g. 'washington_hs')" 
                          value={newSchoolId} 
                          onChange={(e) => setNewSchoolId(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && handleCreateSchool()}
                      />
                      <Button onClick={handleCreateSchool}><Plus className="mr-2"/>Create School</Button>
                  </div>

                   <ul className="space-y-2">
                      {[...allSchools].sort().map((id) => (
                          <li key={id} className="flex justify-between items-center bg-secondary p-3 rounded-lg border">
                              <p className="font-bold font-code">{id}</p>
                              <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(id)}>
                                  <Key className="w-4 h-4 text-blue-500" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the school database for <span className="font-bold font-code">{id}</span>.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={async () => await deleteSchool(id)}>Continue</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                          </li>
                      ))}
                      {allSchools.length === 0 && (
                          <p className="text-center text-muted-foreground italic py-4">No schools found. Create one to begin.</p>
                      )}
                  </ul>
              </CardContent>
          </Card>
          
          {/* Dialog for showing new school passcode */}
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
          
          {/* Dialog for editing passcode */}
          <Dialog open={!!editingSchoolId} onOpenChange={handleCloseEditModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Passcode for <span className="font-code">{editingSchoolId}</span></DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="new-passcode">New Passcode</Label>
                <Input
                  id="new-passcode"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleUpdatePasscode()}
                />
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={handleCloseEditModal}>Cancel</Button>
                <Button onClick={handleUpdatePasscode}>Save New Passcode</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>
  )
}
