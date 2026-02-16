'use client';
import { useState, useEffect, FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/components/AppProvider';
import { Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function StudentLoginPage() {
  const [loginMethod, setLoginMethod] = useState('nfc');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nfcInput, setNfcInput] = useState('');
  
  const { db, loginStudent, schoolId, changeSchoolId, isInitialized } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !schoolId) {
      router.replace('/setup');
    }
  }, [schoolId, isInitialized, router]);

  const handlePassLogin = (e: FormEvent) => {
    e.preventDefault();
    const student = db.students.find(s => s.name === username && s.password === password);
    if (student) {
      loginStudent(student);
    } else {
      toast({ variant: 'destructive', title: 'Invalid Credentials' });
    }
  };
  
  const handleNfcLogin = (nfcId: string) => {
    const student = db.students.find(s => s.nfcId === nfcId);
    if (student) {
      loginStudent(student);
    } else {
      toast({ variant: 'destructive', title: 'Unknown NFC Card' });
    }
    setNfcInput('');
  }
  
  const handleSimulateLogin = () => {
    handleNfcLogin('123456');
  }

  if (!isInitialized || !schoolId) {
    return <p>Loading...</p>;
  }

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Card className="w-full max-w-md border-t-4 border-emerald-500 shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold font-headline">Student Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button onClick={() => setLoginMethod('nfc')} variant={loginMethod === 'nfc' ? 'secondary' : 'ghost'} className="flex-1 shadow-sm">NFC Card</Button>
            <Button onClick={() => setLoginMethod('pass')} variant={loginMethod === 'pass' ? 'secondary' : 'ghost'} className="flex-1 shadow-sm">Username</Button>
          </div>

          {loginMethod === 'nfc' && (
            <div className="text-center space-y-4 relative">
              <div className="w-32 h-32 mx-auto bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center border-4 border-dashed">
                <Wifi className="w-12 h-12 text-slate-400" />
              </div>
              <Input 
                type="text" 
                id="nfcRealInput" 
                className="opacity-0 absolute top-0 left-0 h-full w-full cursor-default" 
                autoFocus 
                value={nfcInput}
                onChange={(e) => setNfcInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNfcLogin(nfcInput)}
              />
              <p className="text-sm text-muted-foreground animate-pulse">Tap your card on the reader...</p>
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-bold">Simulator</p>
                <Button onClick={handleSimulateLogin} variant="outline" className="w-full">Simulate "Test Student"</Button>
              </div>
            </div>
          )}

          {loginMethod === 'pass' && (
            <form onSubmit={handlePassLogin} className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase">Username</Label>
                <Input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g., Test Student" />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase">Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="e.g., test" />
              </div>
              <Button type="submit" className="w-full font-bold shadow-lg shadow-emerald-200">Log In</Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex-col items-center justify-center text-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">Connected to <span className="font-bold text-foreground font-code">{schoolId}</span></p>
          <Button variant="link" onClick={changeSchoolId} className="text-xs h-auto p-1 text-primary/70 hover:text-primary">Switch School ID</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
