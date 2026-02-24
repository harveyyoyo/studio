import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Settings, Volume2, VolumeX, Eye, Monitor, Smartphone, ChevronRight, Bell, Shield, HelpCircle, Moon, Sun, ArrowLeft } from 'lucide-react';
import { useSettings } from '../providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';

export function SettingsModal() {
    const { settings, updateSettings } = useSettings();
    const playSound = useArcadeSound();
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleToggle = (key: keyof typeof settings, value: any) => {
        updateSettings({ [key]: value });
        if (settings.soundEnabled || key === 'soundEnabled') {
            playSound('click');
        }
    };

    return (
        <Dialog onOpenChange={(open) => { if (!open) setShowAdvanced(false); }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl group relative z-50">
                    <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:rotate-45 transition-transform duration-300" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            {showAdvanced && (
                                <Button variant="ghost" size="icon" onClick={() => setShowAdvanced(false)} className="h-8 w-8 -ml-2">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white">
                                {showAdvanced ? 'Advanced Settings' : 'School Rewards'}
                                {!showAdvanced && <br />}
                                {!showAdvanced && <span className="text-slate-600 dark:text-slate-400 font-normal text-sm">Interface Settings</span>}
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                </div>

                <div className="px-6 py-4 min-h-[300px]">
                    {!showAdvanced ? (
                        <>
                            {/* Graphic Mode - Primary Toggle */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${settings.graphicMode === 'graphics' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                            <Monitor className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white">Graphic Mode</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enhanced visual theme</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.graphicMode === 'graphics'}
                                        onCheckedChange={(checked) => handleToggle('graphicMode', checked ? 'graphics' : 'classic')}
                                        className="data-[state=checked]:bg-blue-600 scale-110"
                                    />
                                </div>
                            </div>

                            {/* Dark Mode Toggle */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${settings.darkMode ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {settings.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white">Dark Mode</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Immersive dark interface</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.darkMode}
                                        onCheckedChange={(checked) => handleToggle('darkMode', checked)}
                                        className="data-[state=checked]:bg-indigo-600 scale-110"
                                    />
                                </div>
                            </div>

                            {/* Advanced Button */}
                            <Button
                                variant="outline"
                                onClick={() => setShowAdvanced(true)}
                                className="w-full flex justify-between items-center py-6 px-4 rounded-xl border-dashed border-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                            >
                                <div className="flex items-center gap-3">
                                    <Settings className="w-5 h-5" />
                                    <span className="font-bold">Advanced Settings</span>
                                </div>
                                <ChevronRight className="w-5 h-5 opacity-50" />
                            </Button>
                        </>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            {/* Display Mode - Web vs App */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-3">
                                    {settings.displayMode === 'app' ? <Smartphone className="w-5 h-5 text-slate-600 dark:text-slate-400" /> : <Monitor className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-white">Display Mode</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">UI layout style</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <button
                                        onClick={() => handleToggle('displayMode', 'web')}
                                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${settings.displayMode === 'web' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                    >
                                        Web
                                    </button>
                                    <button
                                        onClick={() => handleToggle('displayMode', 'app')}
                                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${settings.displayMode === 'app' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                    >
                                        App
                                    </button>
                                </div>
                            </div>

                            {/* Sound Effects */}
                            <div className="flex items-center justify-between py-2 px-2">
                                <div className="flex items-center gap-3">
                                    {settings.soundEnabled ? <Volume2 className="w-5 h-5 text-slate-500" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
                                    <div>
                                        <h4 className="font-medium text-slate-700 dark:text-slate-200 text-sm">Sound Effects</h4>
                                        <p className="text-xs text-slate-400">UI audio feedback</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.soundEnabled}
                                    onCheckedChange={(checked) => handleToggle('soundEnabled', checked)}
                                    className="data-[state=checked]:bg-blue-600"
                                />
                            </div>

                            {/* Notifications */}
                            <button className="flex items-center justify-between py-2 px-2 w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <div className="flex items-center gap-3">
                                    <Bell className="w-5 h-5 text-slate-500" />
                                    <div>
                                        <h4 className="font-medium text-slate-700 dark:text-slate-200 text-sm">Notifications</h4>
                                        <p className="text-xs text-slate-400">Manage alerts</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300" />
                            </button>

                            {/* Privacy */}
                            <button className="flex items-center justify-between py-2 px-2 w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-slate-500" />
                                    <div>
                                        <h4 className="font-medium text-slate-700 dark:text-slate-200 text-sm">Privacy</h4>
                                        <p className="text-xs text-slate-400">Control data</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300" />
                            </button>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 pb-6 pt-2 sm:justify-center border-t border-slate-100 dark:border-slate-800">
                    <DialogClose asChild>
                        <Button className="w-full sm:w-auto px-12 h-11 text-base bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none">
                            OK
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
