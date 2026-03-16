
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSettings } from './providers/SettingsProvider';
import { ArrowRight, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppContext } from './AppProvider';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  {
    title: 'Welcome to levelUp EDU!',
    description: 'This quick tour will walk you through the essential features of the app, from setting up your school to seeing a student\'s view.',
    target: '/portal',
    highlightId: null,
  },
  {
    title: 'Step 1: Admin Dashboard',
    description: 'First, let\'s go to the Admin Dashboard. This is where you\'ll manage your school\'s data, including students, classes, and prizes.',
    target: '/admin',
    highlightId: null,
  },
  {
    title: 'Step 2: Add a Class',
    description: 'In the admin dashboard, find the "Classes" section. Click the "Add Class" button to create your first class group.',
    target: '/admin',
    highlightId: 'classes-card',
  },
  {
    title: 'Step 3: Add a Teacher',
    description: 'Great! Now, let\'s add a teacher. Find the "Teachers" section and click "Add Teacher".',
    target: '/admin',
    highlightId: 'teachers-card',
  },
  {
    title: 'Step 4: Add a Student',
    description: 'Next, add a student to your new class. Find the "Students" section and click "Add Student".',
    target: '/admin',
    highlightId: 'students-card',
  },
  {
    title: 'Step 5: Student Sign-In',
    description: 'Excellent! Now that you have some data set up, let\'s see what the student sees. We will now go to the Student Kiosk where they can sign in.',
    target: '/student',
    highlightId: null,
  },
];


export function IntroWizard() {
  const { settings, updateSettings } = useSettings();
  const [stepIndex, setStepIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const { schoolId } = useAppContext();

  const isWizardEnabled = settings.showIntroWizard ?? true;
  const currentStep = steps[stepIndex];

  useEffect(() => {
    if (isWizardEnabled && schoolId === 'schoolabc' && currentStep && pathname !== currentStep.target) {
      router.push(currentStep.target);
    }
  }, [stepIndex, isWizardEnabled, currentStep, router, pathname, schoolId]);


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

  // Logic to highlight an element
  useEffect(() => {
    const cleanupHighlights = () => {
        const allWizardElements = document.querySelectorAll('[data-wizard-id]');
        allWizardElements.forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.transition = 'all 0.3s ease-in-out';
            htmlEl.style.boxShadow = '';
            htmlEl.style.borderRadius = '';
            htmlEl.style.zIndex = '';
        });
    };

    cleanupHighlights();
    
    if (currentStep?.highlightId && schoolId === 'schoolabc' && isWizardEnabled) {
      const timer = setTimeout(() => {
        const highlightedElement = document.querySelector<HTMLElement>(`[data-wizard-id="${currentStep.highlightId}"]`);
        if (highlightedElement) {
          highlightedElement.style.boxShadow = '0 0 0 4px hsl(var(--primary)), 0 0 35px hsl(var(--primary) / 0.7)';
          highlightedElement.style.borderRadius = '1.5rem';
          highlightedElement.style.zIndex = '150';
          highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
    return cleanupHighlights;
  }, [currentStep, schoolId, isWizardEnabled]);

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
