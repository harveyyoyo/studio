
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useSettings } from './providers/SettingsProvider';

const TutorialWizard = () => {
    const { settings, updateSettings } = useSettings();
    const [step, setStep] = useState(0);

    const steps: { title: string; body: string }[] = [
        {
            title: 'Welcome to LevelUp EDU',
            body: 'This short wizard will walk you through the full flow: setting things up, logging in as a student, redeeming a coupon, giving out prizes as a teacher, and checking the Hall of Fame.'
        },
        {
            title: 'Step 1 – Add your first class',
            body: 'Go to the Admin page and create at least one class (e.g. “Period 1 – Science”). This keeps students organized and lets you run attendance per class.'
        },
        {
            title: 'Step 2 – Add students',
            body: 'Still in Admin, add students to your class. You can type them in or use the CSV import. Each student will get a Student ID you can scan or type at the kiosk.'
        },
        {
            title: 'Step 3 – Create prizes',
            body: 'Go to the Prizes section in Admin and add rewards (stickers, free time, snacks, etc.) with point costs. These show up in the student prize shop.'
        },
        {
            title: 'Step 4 – Create coupons (optional)',
            body: 'If you use paper/secret codes, set up coupons in Admin. Each coupon can give a set number of points when a student enters it in their portal.'
        },
        {
            title: 'Step 5 – Take attendance',
            body: 'Use the Attendance tools in Admin or the kiosk to sign students into class. Attendance can automatically award points and prevent double sign‑ins for the same session.'
        },
        {
            title: 'Step 6 – Log in as a student',
            body: 'Open the Student portal page. Search by name or have a student scan/type their Student ID. Select the student to open their personal dashboard and theme.'
        },
        {
            title: 'Step 7 – Redeem a coupon',
            body: 'In the student portal, find the coupon/code box. Enter a test coupon you created and redeem it. You should see their point balance increase and a celebration pop up.'
        },
        {
            title: 'Step 8 – Choose a prize',
            body: 'Still as that student, open the Prize Shop. Have them pick a reward they can afford and confirm the redemption. This creates a pending prize for the teacher to fulfill.'
        },
        {
            title: 'Step 9 – Teacher checks pending prizes',
            body: 'Now open the Teacher portal. Log in as a teacher and look for the list of pending redemptions. Use this list while you hand out prizes, and check them off as “given”.'
        },
        {
            title: 'Step 10 – Check the Hall of Fame',
            body: 'Visit the Hall of Fame page. You should see top students, badges, and achievements updated based on the points and activity you just tested.'
        },
        {
            title: 'You’re ready to use it with students',
            body: 'You’ve seen the full loop: attendance and coupons create points, students redeem prizes, teachers fulfill them, and the Hall of Fame celebrates top performers. You can reopen help from Settings anytime.'
        },
    ];

    const isLastStep = step >= steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            updateSettings({ showIntroWizard: false });
        } else {
            setStep(prev => Math.min(prev + 1, steps.length - 1));
        }
    };

    const handlePrevious = () => setStep(prev => Math.max(prev - 1, 0));
    const handleClose = () => updateSettings({ showIntroWizard: false });

    useEffect(() => {
        if (settings.showIntroWizard) {
            setStep(0);
        }
    }, [settings.showIntroWizard]);

    if (!settings.showIntroWizard) {
        return null;
    }

    return (
        <Dialog open={settings.showIntroWizard} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{steps[step]?.title ?? 'Welcome to LevelUp EDU'}</DialogTitle>
                    <DialogDescription>
                        {steps[step]?.body}
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 text-xs text-muted-foreground">
                    Step {step + 1} of {steps.length}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Skip
                    </Button>
                    {step > 0 && (
                        <Button variant="ghost" onClick={handlePrevious}>
                            Back
                        </Button>
                    )}
                    <Button onClick={handleNext}>
                        {isLastStep ? 'Finish' : 'Next'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TutorialWizard;
