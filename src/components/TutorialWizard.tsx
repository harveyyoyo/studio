
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useSettings } from './providers/SettingsProvider';

const TutorialWizard = () => {
    const { settings, updateSettings } = useSettings();
    const [step, setStep] = useState(0);

    const handleNext = () => setStep(prev => prev + 1);
    const handlePrevious = () => setStep(prev => prev - 1);
    const handleClose = () => updateSettings({ showIntroWizard: false });

    if (!settings.showIntroWizard) {
        return null;
    }

    return (
        <Dialog open={true} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Welcome to levelUp EDU!</DialogTitle>
                    <DialogDescription>
                        This wizard will guide you through the basic setup of your school.
                    </DialogDescription>
                </DialogHeader>
                <div>
                    {/* Steps will be added here */}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Skip</Button>
                    <Button onClick={handleNext}>Next</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TutorialWizard;
