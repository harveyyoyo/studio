'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [schoolId, setSchoolId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = useCallback(async () => {
    if (!schoolId || !passcode) {
      toast({ variant: 'destructive', title: 'Please enter School ID and Passcode.' });
      return;
    }
    setIsLoading(true);
    const success = await login('school', { schoolId, passcode });
    if (success) {
      router.push('/portal');
    } else {
      toast({ variant: 'destructive', title: 'Invalid School ID or Passcode.' });
      setIsLoading(false);
    }
  }, [schoolId, passcode, login, router, toast]);

  const handleTryItOut = async (id: string) => {
    setIsLoading(true);
    const success = await login('school', { schoolId: id, passcode: '1234' });
    if (success) {
      router.push('/portal');
    } else {
      toast({ variant: 'destructive', title: 'Could not log into sample school.' });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Reward Arcade</h1>
          <p className="text-gray-500">Teacher Login</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="schoolId">School ID</Label>
            <Input
              id="schoolId"
              placeholder="Enter your School ID"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <div>
            <Label htmlFor="passcode">Passcode</Label>
            <Input
              id="passcode"
              type="password"
              placeholder="Enter your Passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
        </div>

        <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Login
        </Button>

        <div className="text-center text-sm">
          <p className="font-semibold">- or -</p>
          <p className="text-gray-500">Don't have a school ID? Try out our sample school:</p>
          <div className="flex flex-col space-y-2 mt-2">
            <Button variant="outline" onClick={() => handleTryItOut('schoolabc')} disabled={isLoading}>
              Try School ABC
            </Button>
            <Button variant="outline" onClick={() => handleTryItOut('yeshiva')} disabled={isLoading}>
              Try Yeshiva (Sample)
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
