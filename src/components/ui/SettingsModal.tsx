
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
import { Label } from '@/components/ui/label';
import {
    Settings, Volume2, VolumeX, Monitor, Smartphone, ChevronRight,
    Bell, Shield, Moon, Sun, ArrowLeft, Palette, Zap, Trophy,
    BarChart3, MessageSquare, ShoppingBag, ShieldCheck, Star,
    Users, Database, Printer, LayoutDashboard, History, HelpCircle,
} from 'lucide-react';
import { useSettings, colorSchemes, type ColorScheme } from '../providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';

type SettingsView = 'main' | 'advanced' | 'features';

function FeatureRow({ id, label, desc, icon, settings, onToggle, isImplemented = true }: {
    id: string; label: string; desc: string; icon: React.ReactNode;
    settings: any; onToggle: (key: string, val: any) => void; isImplemented?: boolean;
}) {
    const isEnabled = settings[id] || false;
    return (
        <div className="flex items-center justify-between py-2.5 px-2">
            <div className={`flex items-center gap-3 ${!isImplemented && 'opacity-60'}`}>
                <div className={`p-1.5 rounded-lg transition-colors ${(isEnabled && isImplemented) ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40' : 'bg-slate-200 text-slate-400 dark:bg-slate-700'}`}>
                    {icon}
                </div>
                <div>
                    <Label className="font-bold text-sm block text-slate-700 dark:text-slate-200" htmlFor={isImplemented ? id : undefined}>{label}</Label>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{desc}</p>
                </div>
            </div>
            {isImplemented ? (
                <Switch
                    id={id}
                    checked={isEnabled}
                    onCheckedChange={(checked) => onToggle(id, checked)}
                    className="data-[state=checked]:bg-amber-500"
                />
            ) : (
                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                    Soon
                </div>
            )}
        </div>
    );
}

export function SettingsModal() {
    const { settings, updateSettings } = useSettings();
    const playSound = useArcadeSound();
    const [view, setView] = useState<SettingsView>('main');

    const handleToggle = (key: string, value: any) => {
        updateSettings({ [key]: value } as any);
        if (settings.soundEnabled || key === 'soundEnabled') {
            playSound('click');
        }
    };

    const viewTitle = view === 'main' ? 'Interface Settings' : view === 'advanced' ? 'Advanced' : 'Features';

    return (
        <Dialog onOpenChange={(open) => { if (!open) setView('main'); }}>
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
                            {view !== 'main' && (
                                <Button variant="ghost" size="icon" onClick={() => setView('main')} className="h-8 w-8 -ml-2">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white">
                                {viewTitle}
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                </div>

                <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                    {view === 'main' && (
                        <>
                            {/* Graphic Mode */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${settings.graphicMode === 'graphics' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                            <Monitor className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">Graphic Mode</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Gamified arcade-style UI</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.graphicMode === 'graphics'}
                                        onCheckedChange={(checked) => handleToggle('graphicMode', checked ? 'graphics' : 'classic')}
                                        className="data-[state=checked]:bg-blue-600 scale-110"
                                    />
                                </div>
                            </div>

                            {/* Color Scheme */}
                            {settings.graphicMode === 'classic' && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                            <Palette className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">Color Scheme</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Classic mode colors</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(Object.keys(colorSchemes) as ColorScheme[]).map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => handleToggle('colorScheme', key)}
                                                className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${settings.colorScheme === key ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                            >
                                                <span className={`w-4 h-4 rounded-full ${colorSchemes[key].swatch} shrink-0`} />
                                                {colorSchemes[key].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Dark Mode */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${settings.darkMode ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {settings.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">Dark Mode</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Immersive dark interface</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.darkMode}
                                        onCheckedChange={(checked) => handleToggle('darkMode', checked)}
                                        className="data-[state=checked]:bg-indigo-600 scale-110"
                                    />
                                </div>
                            </div>

                            {/* Display Mode */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-3">
                                    {settings.displayMode === 'app' ? <Smartphone className="w-5 h-5 text-muted-foreground" /> : <Monitor className="w-5 h-5 text-muted-foreground" />}
                                    <div>
                                        <h4 className="font-bold text-foreground">Display Mode</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">UI layout style</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-background p-1 rounded-lg border border-border">
                                    <button
                                        onClick={() => handleToggle('displayMode', 'web')}
                                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${settings.displayMode === 'web' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                    >
                                        Web
                                    </button>
                                    <button
                                        onClick={() => handleToggle('displayMode', 'app')}
                                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${settings.displayMode === 'app' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                    >
                                        App
                                    </button>
                                </div>
                            </div>

                            {/* Features Button */}
                            <Button
                                variant="outline"
                                onClick={() => setView('features')}
                                className="w-full flex justify-between items-center py-6 px-4 rounded-xl border-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 mb-3"
                            >
                                <div className="flex items-center gap-3">
                                    <Zap className="w-5 h-5" />
                                    <span className="font-bold">Features</span>
                                </div>
                                <ChevronRight className="w-5 h-5 opacity-50" />
                            </Button>

                            {/* Advanced Button */}
                            <Button
                                variant="outline"
                                onClick={() => setView('advanced')}
                                className="w-full flex justify-between items-center py-6 px-4 rounded-xl border-dashed border-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                            >
                                <div className="flex items-center gap-3">
                                    <Settings className="w-5 h-5" />
                                    <span className="font-bold">Advanced</span>
                                </div>
                                <ChevronRight className="w-5 h-5 opacity-50" />
                            </Button>
                        </>
                    )}

                    {view === 'advanced' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
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

                    {view === 'features' && (
                        <div className="space-y-1 animate-in slide-in-from-right-4 duration-300">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 pt-1 pb-2">Engagement</p>
                            <FeatureRow id="enableAchievements" label="Achievements" desc="Digital badges for milestones" icon={<Trophy className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={true} />
                            <FeatureRow id="enableLevels" label="Level System" desc="Students level up with points" icon={<Zap className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={false} />
                            <FeatureRow id="enableStreaks" label="Daily Streaks" desc="Track consecutive earning days" icon={<History className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={false} />

                            <div className="border-t border-slate-100 dark:border-slate-800 my-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 pt-1 pb-2">Guidance</p>
                            <FeatureRow id="enableHelperMode" label="Helper Mode" desc="Show helpful tips on each page" icon={<HelpCircle className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={false} />

                            <div className="border-t border-slate-100 dark:border-slate-800 my-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 pt-1 pb-2">Insights</p>
                            <FeatureRow id="enableTeacherCharts" label="Teacher Charts" desc="Class-level data visualization" icon={<BarChart3 className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={false} />
                            <FeatureRow id="enableAdminAnalytics" label="School Analytics" desc="School-wide data trends" icon={<ShieldCheck className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={false} />
                            <FeatureRow id="enableStudentReports" label="Printable Reports" desc="PDF reports for meetings" icon={<Printer className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={false} />

                            <div className="border-t border-slate-100 dark:border-slate-800 my-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 pt-1 pb-2">Social</p>
                            <FeatureRow id="enableNotifications" label="In-App Alerts" desc="Notify students on points earned" icon={<Bell className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={false} />
                            <FeatureRow id="enableShoutouts" label="Public Shoutouts" desc="Teacher recognition feed" icon={<MessageSquare className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={false} />

                            <div className="border-t border-slate-100 dark:border-slate-800 my-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 pt-1 pb-2">Experience</p>
                            <FeatureRow id="enablePrizeImages" label="Prize Images" desc="Upload photos for shop items" icon={<ShoppingBag className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={false} />
                            <FeatureRow id="enableWishlist" label="Wishlists" desc="Students save for prizes" icon={<Star className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={false} />
                            <FeatureRow id="enableQrLogin" label="QR Card Login" desc="Login via QR code scanning" icon={<LayoutDashboard className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={false} />

                            <div className="border-t border-slate-100 dark:border-slate-800 my-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 pt-1 pb-2">Workflow</p>
                            <FeatureRow id="enableBulkPoints" label="Bulk Assignment" desc="Points to a whole class at once" icon={<Users className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={false} />
                            <FeatureRow id="enableAuditLog" label="System Logs" desc="Track admin changes & actions" icon={<Database className="w-4 h-4" />} settings={settings} onToggle={handleToggle} isImplemented={false} />
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
