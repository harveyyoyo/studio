'use client';
import { Gamepad2, Printer, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/components/AppProvider';
import React, { useEffect } from 'react';

const entryPoints = [
  {
    title: 'Student Kiosk',
    description: 'Scan coupons & buy prizes!',
    icon: Gamepad2,
    href: '/student/login',
    color: 'emerald',
  },
  {
    title: 'Teacher Station',
    description: 'Print coupons & manage your class.',
    icon: Printer,
    href: '/teacher/login',
    color: 'indigo',
  },
  {
    title: 'Admin Portal',
    description: 'Manage teachers & system data.',
    icon: Settings,
    href: '/admin',
    color: 'slate',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { schoolId, isInitialized, changeSchoolId } = useAppContext();

  useEffect(() => {
    if (isInitialized && !schoolId) {
      router.replace('/setup');
    }
  }, [schoolId, isInitialized, router]);

  if (!isInitialized || !schoolId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {entryPoints.map((point) => (
          <Card
            key={point.title}
            onClick={() => router.push(point.href)}
            className={`cursor-pointer group bg-white shadow-md hover:shadow-xl transition transform hover:-translate-y-1 border-b-4 border-${point.color}-500`}
          >
            <CardHeader className="items-center text-center">
              <div
                className={`bg-${point.color}-100 p-6 rounded-full group-hover:bg-${point.color}-200 transition mb-4`}
              >
                <point.icon
                  className={`w-16 h-16 text-${point.color}-600`}
                />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">
                {point.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-slate-500 text-sm">
                {point.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="col-span-full text-center mt-6">
        <Button
          variant="link"
          className="text-primary/70 hover:text-primary text-xs"
          onClick={changeSchoolId}
        >
          Switch School ID
        </Button>
      </div>
    </>
  );
}
