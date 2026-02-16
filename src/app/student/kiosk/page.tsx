'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ScanBarcode,
  ShoppingBag,
  History,
  LogOut,
  Search,
  Edit3,
  Candy,
  BookOpen,
  CheckCircle,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { HistoryItem } from '@/lib/types';

const rewards = [
  { name: 'Cool Pencil', cost: 50, icon: Edit3, color: 'orange' },
  { name: 'Candy Bar', cost: 150, icon: Candy, color: 'pink' },
  { name: 'Homework Pass', cost: 500, icon: BookOpen, color: 'blue' },
];

export default function StudentKioskPage() {
  const router = useRouter();
  const { currentUser, logout, redeemCoupon, buyReward } = useAppContext();
  const [scanMessage, setScanMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [barcode, setBarcode] = useState('');
  const kioskTimer = useRef<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState(30);
  const { toast } = useToast();

  const resetKioskTimer = useCallback(() => {
    setCountdown(30);
    if (kioskTimer.current) clearInterval(kioskTimer.current);
    kioskTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (kioskTimer.current) clearInterval(kioskTimer.current);
          toast({ variant: 'destructive', title: 'Session timed out' });
          logout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [logout, toast]);

  useEffect(() => {
    if (!currentUser) {
      router.replace('/student/login');
    } else {
      resetKioskTimer();
      const activityListener = () => resetKioskTimer();
      document.addEventListener('mousemove', activityListener);
      document.addEventListener('keypress', activityListener);

      return () => {
        if (kioskTimer.current) clearInterval(kioskTimer.current);
        document.removeEventListener('mousemove', activityListener);
        document.removeEventListener('keypress', activityListener);
      };
    }
  }, [currentUser, router, resetKioskTimer]);


  if (!currentUser) {
    return <div>Loading...</div>;
  }

  const processCode = async (code: string) => {
    if (!code) return;
    const result = await redeemCoupon(code);
    if (result.success) {
        setScanMessage({ text: result.message, type: 'success' });
    } else {
        const isUsed = result.message.includes('used');
        setScanMessage({ text: result.message, type: isUsed ? 'error' : 'info' });
    }
    setBarcode('');
    setTimeout(() => setScanMessage(null), 3000);
  };

  const handleBuyItem = async (name: string, cost: number) => {
    if (window.confirm(`Redeem ${name} for ${cost} points?`)) {
       const result = await buyReward(name, cost);
       if (result.success) {
           toast({ title: result.message });
       } else {
           toast({ variant: 'destructive', title: result.message });
       }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-end relative z-10">
          <div>
            <p className="text-emerald-100 text-sm">Welcome back,</p>
            <h2 className="text-3xl font-bold font-headline">{currentUser.name}</h2>
          </div>
          <div className="text-right">
            <p className="text-emerald-100 text-sm">Current Balance</p>
            <div className="text-4xl font-extrabold flex items-center gap-1 font-headline">
              <span>{currentUser.points}</span> <span className="text-lg">pts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-b-4 border-slate-300">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <ScanBarcode className="text-emerald-500" /> Scan Coupon
              </CardTitle>
              <div className="text-xs text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded">
                Auto-logout in <span className="font-mono text-lg">{countdown}s</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Scan barcode now..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && processCode(barcode)}
                  className="w-full p-4 pl-12 bg-slate-50 border-2 border-dashed rounded-xl text-lg font-code"
                  autoFocus
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
              </div>
              {scanMessage && (
                <div
                  className={`mt-4 p-3 rounded-lg text-center font-bold text-sm ${
                    scanMessage.type === 'success'
                      ? 'bg-emerald-100 text-emerald-700'
                      : scanMessage.type === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {scanMessage.type === 'success' && <CheckCircle className="inline w-4 h-4 mb-1 mr-1" />}
                  {scanMessage.type === 'error' && <XCircle className="inline w-4 h-4 mb-1 mr-1" />}
                  {scanMessage.type === 'info' && <HelpCircle className="inline w-4 h-4 mb-1 mr-1" />}
                  {scanMessage.text}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="text-purple-500" /> Rewards Shop
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {rewards.map((item) => (
                <div key={item.name} className="border rounded-xl p-4 text-center hover:bg-muted/50 transition">
                  <div className={`bg-${item.color}-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-${item.color}-600`}>
                    <item.icon />
                  </div>
                  <h4 className="font-bold text-foreground">{item.name}</h4>
                  <p className="text-emerald-600 font-bold text-sm mb-3">{item.cost} pts</p>
                  <Button onClick={() => handleBuyItem(item.name, item.cost)} size="sm" className="w-full font-bold">
                    Redeem
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="text-slate-400" /> Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {currentUser.history.slice(0, 5).map((item, index) => (
                <li key={index} className="flex justify-between items-center border-b pb-2">
                  <span>{item.desc}</span>
                  <span className={`${item.amount > 0 ? 'text-emerald-500' : 'text-red-500'} font-bold`}>
                    {item.amount > 0 ? '+' : ''}{item.amount}
                  </span>
                </li>
              ))}
              {currentUser.history.length === 0 && <li className='text-muted-foreground text-center italic'>No activity yet.</li>}
            </ul>
            <Button onClick={logout} variant="outline" className="w-full mt-6 font-bold text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600">
              <LogOut className="w-4 h-4 mr-2" /> Log Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
