
import { useState } from 'react';
import { useAppContext } from '@/components/AppProvider';
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
import { Input } from '@/components/ui/input';
import {
    Settings, Volume2, VolumeX, Monitor, Smartphone, ChevronRight,
    Bell, Shield, Moon, Sun, ArrowLeft, Palette, Zap, Trophy,
    BarChart3, MessageSquare, ShoppingBag, ShieldCheck, Star,
    Users, Database, Printer, LayoutDashboard, History, HelpCircle,
    Cpu, Award, Tags, LayoutList
} from 'lucide-react';
import { useSettings, colorSchemes, type ColorScheme } from '../providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';

type SettingsView = 'main' | 'advanced' | 'features';

function FeatureRow({ id, label, desc, icon, settings, onToggle, isImplemented = true, isAdmin = true }: {
    id: string; label: string; desc: string; icon: React.ReactNode;
    settings: any; onToggle: (key: string, val: any) => void; isImplemented?: boolean; isAdmin?: boolean;
}) {
    const isEnabled = settings[id] || false;
    return (
        <div className="flex items-start justify-between py-4 px-3 border-b border-slate-100/50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-xl transition-colors">
            <div className={`flex items-start gap-4 ${!isImplemented && 'opacity-60'} mr-6`}>
                <div className={`p-2.5 rounded-xl transition-colors shrink-0 mt-0.5 ${(isEnabled && isImplemented) ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {icon}
                </div>
                <div className="flex flex-col">
                    <Label className="font-bold text-sm block text-slate-800 dark:text-slate-200 mb-1" htmlFor={isImplemented && isAdmin ? id : undefined}>{label}</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed w-full pr-4">{desc}</p>
                </div>
            </div>
            {isImplemented ? (
                <div className="flex flex-col flex-shrink-0 items-end justify-start min-h-[44px]">
                    <Switch
                        id={id}
                        checked={isEnabled}
                        onCheckedChange={(checked) => onToggle(id, checked)}
                        disabled={!isAdmin}
                        className="data-[state=checked]:bg-amber-500"
                    />
                    {!isAdmin && <span className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-widest whitespace-nowrap">Admin Only</span>}
                </div>
            ) : (
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md mt-1 whitespace-nowrap">
                    Soon
                </div>
            )}
        </div>
    );
}

export function SettingsModal() {
    const { loginState } = useAppContext();
    const isAdmin = loginState === 'admin' || loginState === 'developer';
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
            <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex flex-col max-h-[90vh]">
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

                <div key={view} className="px-6 py-4 overflow-y-auto flex-1 h-full min-h-[50vh]">
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
                                            <h4 className="font-bold text-foreground">Arcade Mode</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Gamified UI with special effects</p>
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

                            {/* Legacy Mode */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${settings.legacyMode ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                            <Cpu className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">Legacy Mode</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Disables heavy effects for older hardware</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.legacyMode}
                                        onCheckedChange={(checked) => handleToggle('legacyMode', checked)}
                                        className="data-[state=checked]:bg-orange-600 scale-110"
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
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 pb-6">

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Settings className="w-3.5 h-3.5" /> Core Workflow</p>
                                <FeatureRow id="enableTeacherBudgets" label="Teacher Budgets & Allowances" desc="Assign monthly point limits to teachers. Enforces strict spending caps when printing coupons or awarding points, helping you control your school's reward economy." icon={<Users className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={true} isAdmin={isAdmin} />
                                <FeatureRow id="enableBulkPoints" label="Bulk Class Assignment (Soon)" desc="Award points to an entire class with a single click instead of individually." icon={<Users className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={false} isAdmin={isAdmin} />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" /> Actionable Insights</p>
                                <FeatureRow id="enableAdminAnalytics" label="School Analytics Dashboard" desc="Adds an Analytics tab for school administrators to view high-level engagement trends, total points issued, historical value redeemed, and active student metrics." icon={<ShieldCheck className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={true} isAdmin={isAdmin} />
                                <FeatureRow id="enableTeacherCharts" label="Teacher Analytics (Soon)" desc="Allow teachers to visualize points data explicitly for their own assigned classes." icon={<BarChart3 className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={false} isAdmin={isAdmin} />
                                <FeatureRow id="enableStudentReports" label="Printable Data Reports (Soon)" desc="Generate clean, printable PDF tracking reports for specific students to use during parent-teacher conferences." icon={<Printer className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={false} isAdmin={isAdmin} />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> Student Experience</p>
                                <FeatureRow id="enableStudentPortal" label="Student Home Login Portal" desc="Creates a dedicated link allowing students to securely log in from home (or personal devices) using their School ID and Badge Number to view their balances, recent activity, and browse eligible rewards in read-only mode." icon={<Smartphone className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={true} isAdmin={isAdmin} />
                                <FeatureRow id="enableQrLogin" label="QR Code Fast Login (Soon)" desc="Allow students to bypass manual typing by logging into kiosks by flashing a dynamic QR code." icon={<LayoutDashboard className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={false} isAdmin={isAdmin} />
                                <FeatureRow id="enablePrizeImages" label="Rich Prize Images (Soon)" desc="Upgrade the prize shop UI to display uploaded photographs for each shop item instead of just icons." icon={<ShoppingBag className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={false} isAdmin={isAdmin} />
                                <FeatureRow id="enableWishlist" label="Student Wishlists (Soon)" desc="Let students pin specific prizes so they can track their savings progress towards larger goals." icon={<Star className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={false} isAdmin={isAdmin} />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Trophy className="w-3.5 h-3.5" /> Advanced Engagement</p>
                                <FeatureRow id="enableAchievements" label="Achievement Badges" desc="Setup digital milestone badges for students when they reach specific goals or accumulation thresholds." icon={<Trophy className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={true} isAdmin={isAdmin} />

                                <FeatureRow id="enableStudentBadges" label="Student Custom Badges" desc="Dynamically assign Bronze/Silver/Gold badges to students based on points earned." icon={<Award className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={true} isAdmin={isAdmin} />
                                {settings.enableStudentBadges && (
                                    <div className="px-4 pb-4 pt-1 space-y-4 animate-in fade-in zoom-in-95 duration-200 border-b border-border mb-2 ml-10">
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                                <Tags className="w-3.5 h-3.5" /> Ruleset Category
                                            </Label>
                                            <Input
                                                value={settings.badgeCategory}
                                                onChange={e => handleToggle('badgeCategory', e.target.value)}
                                                className="h-9 text-xs font-mono font-bold bg-background border-border"
                                                placeholder="e.g. 'all', 'academics'"
                                            />
                                            <p className="text-[10px] text-muted-foreground">Type &lsquo;all&lsquo; to trigger from total points, or target a specific coupon category ID.</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1.5 bg-orange-50 dark:bg-orange-950/20 p-2 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                                <Label className="text-[10px] uppercase font-black tracking-widest text-orange-600 dark:text-orange-400">Bronze</Label>
                                                <Input type="number" value={settings.badgeBronzeThreshold} onChange={e => handleToggle('badgeBronzeThreshold', parseInt(e.target.value) || 0)} className="h-8 text-xs font-black shadow-inner bg-background/50 border-orange-200 dark:border-orange-900/50 focus-visible:ring-orange-500" />
                                            </div>
                                            <div className="space-y-1.5 bg-slate-100 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                                <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">Silver</Label>
                                                <Input type="number" value={settings.badgeSilverThreshold} onChange={e => handleToggle('badgeSilverThreshold', parseInt(e.target.value) || 0)} className="h-8 text-xs font-black shadow-inner bg-background/50 border-slate-200 dark:border-slate-800 focus-visible:ring-slate-500" />
                                            </div>
                                            <div className="space-y-1.5 bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded-xl border border-yellow-200 dark:border-yellow-900/30">
                                                <Label className="text-[10px] uppercase font-black tracking-widest text-yellow-600 dark:text-yellow-400">Gold</Label>
                                                <Input type="number" value={settings.badgeGoldThreshold} onChange={e => handleToggle('badgeGoldThreshold', parseInt(e.target.value) || 0)} className="h-8 text-xs font-black shadow-inner bg-background/50 border-yellow-200 dark:border-yellow-900/50 focus-visible:ring-yellow-500" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <FeatureRow id="enableCategoryBadges" label="Category Badges" desc="Dynamically assign Bronze/Silver/Gold badges to students for each individual coupon category based on points earned specifically in that category." icon={<LayoutList className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={true} isAdmin={isAdmin} />
                                {settings.enableCategoryBadges && (
                                    <div className="px-4 pb-4 pt-1 space-y-4 animate-in fade-in zoom-in-95 duration-200 border-b border-border mb-2 ml-10">
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1.5 bg-orange-50 dark:bg-orange-950/20 p-2 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                                <Label className="text-[10px] uppercase font-black tracking-widest text-orange-600 dark:text-orange-400">Bronze</Label>
                                                <Input type="number" value={settings.categoryBronzeThreshold} onChange={e => handleToggle('categoryBronzeThreshold', parseInt(e.target.value) || 0)} className="h-8 text-xs font-black shadow-inner bg-background/50 border-orange-200 dark:border-orange-900/50 focus-visible:ring-orange-500" />
                                            </div>
                                            <div className="space-y-1.5 bg-slate-100 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                                <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">Silver</Label>
                                                <Input type="number" value={settings.categorySilverThreshold} onChange={e => handleToggle('categorySilverThreshold', parseInt(e.target.value) || 0)} className="h-8 text-xs font-black shadow-inner bg-background/50 border-slate-200 dark:border-slate-800 focus-visible:ring-slate-500" />
                                            </div>
                                            <div className="space-y-1.5 bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded-xl border border-yellow-200 dark:border-yellow-900/30">
                                                <Label className="text-[10px] uppercase font-black tracking-widest text-yellow-600 dark:text-yellow-400">Gold</Label>
                                                <Input type="number" value={settings.categoryGoldThreshold} onChange={e => handleToggle('categoryGoldThreshold', parseInt(e.target.value) || 0)} className="h-8 text-xs font-black shadow-inner bg-background/50 border-yellow-200 dark:border-yellow-900/50 focus-visible:ring-yellow-500" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <FeatureRow id="enableLevels" label="Leveling System (Soon)" desc="Convert total lifetime points into RPG-style tiers (Level 1, Level 2, etc.) for deeper engagement." icon={<Zap className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={false} isAdmin={isAdmin} />
                                <FeatureRow id="enableStreaks" label="Daily Login Streaks (Soon)" desc="Track consecutive days logged in with point multipliers." icon={<History className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={false} isAdmin={isAdmin} />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Monitor className="w-3.5 h-3.5" /> Misc & Platform</p>
                                <FeatureRow id="enableColorPrinting" label="Vibrant Color Printing" desc="Render badges and coupons in full color when sending content to the physical printer." icon={<Palette className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={true} isAdmin={isAdmin} />
                                <FeatureRow id="enableHelperMode" label="Interactive Guidance" desc="Display helpful tooltips and onboarding elements across all platform pages to assist new staff members natively." icon={<HelpCircle className="w-5 h-5" />} settings={settings} onToggle={handleToggle} isImplemented={true} isAdmin={isAdmin} />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 sm:justify-end border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 absolute bottom-0 w-full left-0 z-10 hidden sm:flex">
                    <DialogClose asChild>
                        <Button className="w-full sm:w-auto px-10 h-10 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>

                {/* Mobile absolute footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 sm:hidden">
                    <DialogClose asChild>
                        <Button className="w-full h-12 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer">
                            Close
                        </Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
