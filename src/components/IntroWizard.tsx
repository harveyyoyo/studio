
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSettings } from './providers/SettingsProvider';
import { ArrowRight, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAppContext } from './AppProvider';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  {
    title: 'Welcome to levelUp EDU!',
    description: 'This quick tour will walk you through the essential features of the app. Click "Next" to begin.',
    target: '/portal',
  },
  {
    title: 'Step 1: Admin Dashboard',
    description: 'Click the "Admin Portal" link to manage your school\'s data. Once you\'re there, click "Next".',
    target: '/portal',
  },
  {
    title: 'Step 2: Add a Class',
    description: 'You\'re in the Admin Dashboard! Find the "Classes" section and click "Add Class" to create your first class group. Then click "Next".',
    target: '/admin',
  },
  {
    title: 'Step 3: Add a Teacher',
    description: 'Great! Now, let\'s add a teacher. Find the "Teachers" section and click "Add Teacher". Then click "Next".',
    target: '/admin',
  },
  {
    title: 'Step 4: Add a Student',
    description: 'Add a student. You can assign them to a class and multiple teachers. Make a note of the Student ID you assign—you\'ll need it for the next step. Click "Next" when you\'re done.',
    target: '/admin',
  },
  {
    title: 'Step 5: Go to Student Kiosk',
    description: 'Excellent! Now, click the "Home" icon to go back to the main portal page. From there, click on "Student Kiosk" to sign in as the student.',
    target: '/admin',
  },
  {
    title: 'Step 6: Student Sign-In',
    description: "You're at the student kiosk. Type in the Student ID you just created and click 'Identify Student' to see their points and redeem coupons.",
    target: '/student',
  }
];


export function IntroWizard() {
  const { settings, updateSettings } = useSettings();
  const [stepIndex, setStepIndex] = useState(0);
  const pathname = usePathname();
  const { schoolId } = useAppContext();

  const isWizardEnabled = settings.showIntroWizard ?? true;
  const currentStep = steps[stepIndex];

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleTurnOff();
    }
  };

  const handleTurnOff = () => {
    updateSettings({ showIntroWizard: false });
  };

  if (!isWizardEnabled || !currentStep || pathname !== currentStep.target || schoolId !== 'schoolabc') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-6 right-6 w-full max-w-sm z-[200]"
      >
        <Card className="shadow-2xl border-2 border-primary/20 bg-background/80 backdrop-blur-xl">
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>{currentStep.title}</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={handleTurnOff}>
                    <X className="w-4 h-4"/>
                </Button>
            </div>
            <CardDescription>{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end w-full">
                <Button onClick={handleNext} className="rounded-full shadow-lg">
                    {stepIndex < steps.length - 1 ? 'Next' : 'Finish'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
