'use client';

import { useAppContext } from "@/components/AppProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function SchoolGate({ children }: { children: React.ReactNode }) {
  const { schoolId, isInitialized, loginState } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && (!schoolId || loginState === 'loggedOut')) {
      router.push('/portal');
    }
  }, [isInitialized, schoolId, loginState, router]);

  if (!isInitialized) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;

  if (!schoolId || !['student', 'teacher', 'admin', 'school'].includes(loginState)) return null;

  return <>{children}</>;
}
