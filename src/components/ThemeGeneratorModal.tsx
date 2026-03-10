import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, Loader2, Sparkles } from 'lucide-react';
import { StudentTheme } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn, getContrastColor } from '@/lib/utils';
import { GoogleFontLoader } from './GoogleFontLoader';


interface ThemeGeneratorModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (theme: StudentTheme) => void;
    currentTheme?: StudentTheme;
    studentName: string;
}

export function ThemeGeneratorModal({
    isOpen,
    onOpenChange,
    onSave,
    currentTheme,
    studentName,
}: ThemeGeneratorModalProps) {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewTheme, setPreviewTheme] = useState<StudentTheme | undefined>(currentTheme);
    const [model, setModel] = useState<string>('gemini-2.5-flash');
    const { toast } = useToast();

    // Load provider from local storage on mount
    useEffect(() => {
        const savedModel = localStorage.getItem('arcade_ai_model');
        if (savedModel) setModel(savedModel);
    }, []);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast({
                title: 'Prompt required',
                description: 'Please enter a description for the theme.',
                variant: 'destructive',
            });
            return;
        }

        setIsGenerating(true);
        try {
            const response = await fetch('/api/generate-theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt, model }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate theme');
            }

            const generatedTheme: StudentTheme = await response.json();
            setPreviewTheme(generatedTheme);
            toast({
                title: 'Theme Generated',
                description: 'Preview the new theme below before saving.',
            });
        } catch (error) {
            console.error('Error generating theme:', error);
            toast({
                title: 'Error',
                description: 'There was a problem generating the theme. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = () => {
        if (previewTheme) {
            onSave(previewTheme);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Generate Theme for {studentName}</DialogTitle>
                    <DialogDescription>
                        Describe a theme and let AI generate a custom color palette.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label>AI Generation Model</Label>
                        <Select
                            value={model}
                            onValueChange={(v: string) => {
                                setModel(v);
                                localStorage.setItem('arcade_ai_model', v);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gemini-2.5-flash">Google Gemini 2.5 Flash (Fastest)</SelectItem>
                                <SelectItem value="gemini-2.5-pro">Google Gemini 2.5 Pro (Best Reasoning)</SelectItem>
                                <SelectItem value="gpt-4o-mini">OpenAI GPT-4o-mini (Fast)</SelectItem>
                                <SelectItem value="gpt-4o">OpenAI GPT-4o (Robust)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-end gap-2">
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="prompt">Prompt</Label>
                            <Input
                                id="prompt"
                                placeholder="e.g., Cyberpunk neon greens and purples"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleGenerate();
                                    }
                                }}
                            />
                        </div>
                        <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                            {isGenerating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Wand2 className="w-4 h-4 mr-2" />
                            )}
                            Generate
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label>Live Preview</Label>
                        <div
                            className={cn(
                                "w-full h-48 rounded-xl border border-border shadow-inner p-4 flex flex-col gap-4 overflow-hidden relative transition-colors duration-500",
                                !previewTheme && "bg-muted flex items-center justify-center text-muted-foreground"
                            )}
                            style={previewTheme ? {
                                backgroundColor: previewTheme.background,
                                color: previewTheme.text,
                                fontFamily: previewTheme.fontFamily || 'inherit',
                            } : undefined}
                        >
                            {previewTheme?.fontFamily && <GoogleFontLoader fontFamily={previewTheme.fontFamily} />}

                            {!previewTheme ? (
                                <p>No theme generated yet</p>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between z-10">
                                        <div className="font-bold text-lg flex items-center gap-2">
                                            {previewTheme.emoji && <span className="text-2xl drop-shadow-md">{previewTheme.emoji}</span>}
                                            Student Portal
                                        </div>
                                        <div
                                            className="px-3 py-1 rounded-full text-sm font-bold shadow-sm"
                                            style={{
                                                backgroundColor: previewTheme.primary,
                                                color: getContrastColor(previewTheme.primary) === 'black' ? '#000' : '#fff'
                                            }}
                                        >
                                            ★ 1,250 Pts
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div
                                            className="rounded-lg p-3 shadow-sm border border-black/5"
                                            style={{ backgroundColor: previewTheme.cardBackground }}
                                        >
                                            <div className="text-sm opacity-80 mb-1">Recent Activity</div>
                                            <div className="font-medium">+50 points</div>
                                        </div>
                                        <div
                                            className="rounded-lg p-3 shadow-sm border border-black/5"
                                            style={{ backgroundColor: previewTheme.cardBackground }}
                                        >
                                            <div className="text-sm opacity-80 mb-1">New Reward</div>
                                            <div
                                                className="font-medium"
                                                style={{ color: previewTheme.accent }}
                                            >
                                                Available!
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {previewTheme && (
                        <div className="grid grid-cols-6 gap-2 mt-2 text-center text-[10px] uppercase font-bold text-muted-foreground">
                            {previewTheme.emoji && (
                                <div className="flex flex-col items-center justify-end">
                                    <div className="text-3xl mb-1 flex items-center justify-center bg-muted/20 w-full h-8 rounded-md border border-border">
                                        {previewTheme.emoji}
                                    </div>
                                    Icon
                                </div>
                            )}
                            <div>
                                <div className="w-full h-8 rounded-md mb-1 border border-border" style={{ backgroundColor: previewTheme.background }} title={`Background: ${previewTheme.background}`} />
                                BG
                            </div>
                            <div>
                                <div className="w-full h-8 rounded-md mb-1 border border-border" style={{ backgroundColor: previewTheme.text }} title={`Text: ${previewTheme.text}`} />
                                Text
                            </div>
                            <div>
                                <div className="w-full h-8 rounded-md mb-1 border border-border" style={{ backgroundColor: previewTheme.primary }} title={`Primary: ${previewTheme.primary}`} />
                                Primary
                            </div>
                            <div>
                                <div className="w-full h-8 rounded-md mb-1 border border-border" style={{ backgroundColor: previewTheme.cardBackground }} title={`Card BG: ${previewTheme.cardBackground}`} />
                                Card
                            </div>
                            <div>
                                <div className="w-full h-8 rounded-md mb-1 border border-border" style={{ backgroundColor: previewTheme.accent, borderColor: previewTheme.accent }} title={`Accent: ${previewTheme.accent}`} />
                                Accent
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!previewTheme}>
                        Save & Apply Theme
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
