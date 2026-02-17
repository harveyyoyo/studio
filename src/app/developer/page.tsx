'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import {
  LogOut, Plus, Trash2, Server
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

export default function DeveloperPage() {
  const { loginState, isInitialized, logout, allSchools, createSchool, deleteSchool } = useAppContext();
  const router = useRouter();
  const [newSchoolId, setNewSchoolId] = useState('');
  const { toast } = useToast();
  const [createdSchoolInfo, setCreatedSchoolInfo] = useState<{id: string, passcode: string} | null>(null);

  useEffect(() => {
    if (isInitialized && loginState !== 'developer') {
      router.replace('/');
    }
  }, [isInitialized, loginState, router]);

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

  const handleDeleteSchool = async (id: string) => {
    await deleteSchool(id);
  }

  if (!isInitialized || loginState !== 'developer') {
    return <p>Loading...</p>;
  }
  
  return (
      <div className="space-y-6">
          <Card className="bg-slate-800 text-white p-6 shadow-lg flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
                      <Server /> Developer Mode
                  </h2>
                  <p className="text-slate-400 text-sm">Manage all school databases.</p>
              </div>
              <Button onClick={logout} variant="secondary" size="sm">
                  <LogOut className="mr-2 h-4 w-4" /> Log Out
              </Button>
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
                      {allSchools.map((id) => (
                          <li key={id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border">
                              <p className="font-bold font-code">{id}</p>
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
                                    <AlertDialogAction onClick={() => handleDeleteSchool(id)}>Continue</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          </li>
                      ))}
                      {allSchools.length === 0 && (
                          <p className="text-center text-muted-foreground italic py-4">No schools found. Create one to begin.</p>
                      )}
                  </ul>
              </CardContent>
          </Card>

          <AlertDialog open={!!createdSchoolInfo} onOpenChange={() => setCreatedSchoolInfo(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>School Created Successfully!</AlertDialogTitle>
                <AlertDialogDescription>
                  The school <span className="font-bold font-code">{createdSchoolInfo?.id}</span> has been created. Here is the passcode. Please store it securely.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center my-4">
                  <p className="text-sm text-muted-foreground">School ID</p>
                  <p className="font-code font-bold text-lg">{createdSchoolInfo?.id}</p>
                  <p className="text-sm text-muted-foreground mt-2">School Passcode</p>
                  <p className="font-code font-bold text-3xl tracking-widest text-primary">{createdSchoolInfo?.passcode}</p>
              </div>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setCreatedSchoolInfo(null)}>Close</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </div>
  )
}
