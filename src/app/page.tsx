'use client';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import { Building, Code } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [adminSchoolId, setAdminSchoolId] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [devPasscode, setDevPasscode] = useState('');
  const { login } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();

  const handleAdminLogin = async () => {
    const success = await login('admin', {
      schoolId: adminSchoolId,
      passcode: adminPasscode,
    });
    if (success) {
      router.push('/admin');
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid School ID or passcode.',
      });
      setAdminPasscode('');
    }
  };

  const handleDeveloperLogin = async () => {
    const success = await login('developer', { passcode: devPasscode });
    if (success) {
      router.push('/admin');
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Incorrect developer passcode.',
      });
      setDevPasscode('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Tabs defaultValue="admin" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admin">
            <Building className="mr-2 h-4 w-4" /> School Admin
          </TabsTrigger>
          <TabsTrigger value="developer">
            <Code className="mr-2 h-4 w-4" /> Developer
          </TabsTrigger>
        </TabsList>
        <TabsContent value="admin">
          <Card className="border-t-4 border-primary shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold font-headline">
                School Admin Login
              </CardTitle>
              <CardDescription>
                Enter your School ID and passcode to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label
                  htmlFor="schoolId"
                  className="block text-sm font-bold text-slate-600 mb-1"
                >
                  School ID
                </Label>
                <Input
                  id="schoolId"
                  placeholder="e.g. lincoln_high"
                  value={adminSchoolId}
                  onChange={(e) => setAdminSchoolId(e.target.value.trim())}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
              </div>
              <div>
                <Label
                  htmlFor="admin-passcode"
                  className="block text-sm font-bold text-slate-600 mb-1"
                >
                  Passcode
                </Label>
                <Input
                  id="admin-passcode"
                  type="password"
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
              </div>
              <Button onClick={handleAdminLogin} className="w-full font-bold">
                Enter Admin Portal
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="developer">
          <Card className="border-t-4 border-slate-500 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold font-headline">
                Developer Login
              </CardTitle>
              <CardDescription>
                Enter the developer passcode for system-wide access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label
                  htmlFor="dev-passcode"
                  className="block text-sm font-bold text-slate-600 mb-1"
                >
                  Developer Passcode
                </Label>
                <Input
                  id="dev-passcode"
                  type="password"
                  value={devPasscode}
                  onChange={(e) => setDevPasscode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleDeveloperLogin()}
                />
              </div>
              <Button
                onClick={handleDeveloperLogin}
                className="w-full font-bold"
              >
                Enter Developer Mode
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
