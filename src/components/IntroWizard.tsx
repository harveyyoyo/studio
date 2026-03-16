'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useSettings } from './providers/SettingsProvider';
import { ArrowRight } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppContext } from './AppProvider';

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
    let highlightedElement: HTMLElement | null = null;
    if (currentStep?.highlightId && schoolId === 'schoolabc') {
      // Use a timeout to ensure the element is available after navigation
      const timer = setTimeout(() => {
        highlightedElement = document.querySelector(`[data-wizard-id="${currentStep.highlightId}"]`);
        if (highlightedElement) {
          highlightedElement.style.transition = 'all 0.3s ease-in-out';
          highlightedElement.style.boxShadow = '0 0 0 4px hsl(var(--primary)), 0 0 25px hsl(var(--primary) / 0.7)';
          highlightedElement.style.borderRadius = '1.5rem';
          highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100); // Small delay to allow page transition
      return () => clearTimeout(timer);
    }
    return () => {
      // This cleanup runs when the component unmounts or the step changes
      const allHighlighted = document.querySelectorAll('[data-wizard-id]');
      allHighlighted.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.boxShadow = '';
        htmlEl.style.borderRadius = '';
      });
    };
  }, [currentStep, schoolId]);

  if (!isWizardEnabled || !currentStep || pathname !== currentStep.target || schoolId !== 'schoolabc') {
    return null;
  }

  return (
    <Dialog open={true}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-md z-[200]">
            <DialogHeader>
                <DialogTitle>{currentStep.title}</DialogTitle>
                <DialogDescription>{currentStep.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-between w-full">
                <Button variant="ghost" onClick={handleTurnOff}>
                    Skip Tutorial
                </Button>
                <Button onClick={handleNext}>
                    {stepIndex < steps.length - 1 ? 'Next' : 'Finish'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
