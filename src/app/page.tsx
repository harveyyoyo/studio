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
import { Building, Code, BookOpen, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const [schoolId, setSchoolId] = useState('');
  const [schoolPasscode, setSchoolPasscode] = useState('');
  const [devPasscode, setDevPasscode] = useState('');
  const { login } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const playSound = useArcadeSound();

  const handleSchoolLogin = async () => {
    if (!schoolId || !schoolPasscode) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Please enter a School ID and passcode.',
      });
      return;
    }
    const success = await login('school', {
      schoolId: schoolId,
      passcode: schoolPasscode,
    });
    if (success) {
      playSound('login');
      router.push('/portal');
    } else {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid School ID or passcode.',
      });
      setSchoolPasscode('');
    }
  };

  const handleDeveloperLogin = async () => {
    const success = await login('developer', { passcode: devPasscode });
    if (success) {
      playSound('login');
      router.push('/developer');
    } else {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Incorrect developer passcode.',
      });
      setDevPasscode('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-6">
       <Dialog>
        <DialogTrigger asChild>
           <Button variant="outline"><BookOpen className="mr-2 h-4 w-4" /> How to Use This App</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-4xl">
           <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-headline text-2xl"><BookOpen className="w-6 h-6"/> How to Use the App</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-4 max-h-[70vh] overflow-y-auto pr-6">
            <p>Reward Arcade is a fun and easy way to manage a school-wide points and rewards system. Students can earn points, redeem them for prizes, and track their progress, all while fostering a positive school culture.</p>
            
            <div>
              <h3 className="font-bold text-foreground">1. Login</h3>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong className="text-foreground">School Login:</strong> To access any school-specific portal (Student, Teacher, Admin), you'll first need to log in using your school's unique <strong className="text-foreground">School ID</strong> and <strong className="text-foreground">Passcode</strong>.</li>
                <li><strong className="text-foreground">Developer Login:</strong> This is for system administrators to manage all school instances.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-foreground">2. Portals</h3>
              <p>Once you've logged into a school, you can choose from several portals:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>
                  <strong className="text-foreground">Student Portal:</strong> Students log in by scanning their ID card. They can view points, redeem coupon codes, see transaction history, and check eligible prizes.
                </li>
                <li>
                  <strong className="text-foreground">Teacher Portal:</strong> Teachers select their name to log in. They can generate and print sheets of reward coupons with custom values.
                </li>
                <li>
                  <strong className="text-foreground">Admin Portal:</strong> This is the control center to manage students, classes, teachers, reward categories, prizes, and print ID cards.
                </li>
                <li>
                  <strong className="text-foreground">Prize Shop:</strong> Students scan their ID to browse and redeem points for available prizes.
                </li>
                 <li>
                  <strong className="text-foreground">Hall of Fame:</strong> View a leaderboard of the top all-time point earners in the school.
                </li>
              </ul>
            </div>
            <p className="italic pt-4">That's it! It's designed to be simple and intuitive. Enjoy building a positive and rewarding environment at your school!</p>
          </div>
        </DialogContent>
      </Dialog>
      
      <Tabs defaultValue="school" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="school" onClick={() => playSound('click')}>
            <Building className="mr-2 h-4 w-4" /> School Login
          </TabsTrigger>
          <TabsTrigger value="developer" onClick={() => playSound('click')}>
            <Code className="mr-2 h-4 w-4" /> Developer
          </TabsTrigger>
        </TabsList>
        <TabsContent value="school">
          <Card className="border-t-4 border-primary shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold font-headline">
                School Portal Login
              </CardTitle>
              <CardDescription>
                Enter your School ID and passcode to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-500 text-green-900 dark:text-green-200 [&>svg]:text-green-700 dark:[&>svg]:text-green-300">
                <Info className="h-4 w-4" />
                <AlertTitle className="font-bold">Try It Out!</AlertTitle>
                <AlertDescription className="font-code text-xs">
                  <div className="flex justify-between"><span>ID: school</span><span>Pass: 1234</span></div>
                  <div className="flex justify-between"><span>ID: yeshiva</span><span>Pass: 1234</span></div>
                </AlertDescription>
              </Alert>

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
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value.trim().toLowerCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleSchoolLogin()}
                />
              </div>
              <div>
                <Label
                  htmlFor="school-passcode"
                  className="block text-sm font-bold text-slate-600 mb-1"
                >
                  School Passcode
                </Label>
                <Input
                  id="school-passcode"
                  type="password"
                  value={schoolPasscode}
                  onChange={(e) => setSchoolPasscode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSchoolLogin()}
                />
              </div>
              <Button onClick={handleSchoolLogin} className="w-full font-bold">
                Enter School Portal
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
