export interface HistoryItem {
  desc: string;
  amount: number;
  date: number;
}

export interface Class {
  id: string;
  name: string;
}

export interface Teacher {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  points: number;
  color?: string;
}

export interface Student {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  nickname?: string;
  points: number;
  lifetimePoints?: number;
  classId?: string;
  nfcId: string;
  categoryPoints?: { [key: string]: number };
  earnedAchievements?: { achievementId: string; earnedAt: number }[];
  teacherIds?: string[];
}

export interface Coupon {
  id: string;
  code: string;
  value: number;
  category: string;
  teacher: string;
  used: boolean;
  createdAt: number;
  description?: string;
  usedAt?: number;
  usedBy?: string;
  color?: string;
}

export interface Prize {
  id: string;
  name: string;
  points: number;
  icon: string;
  inStock: boolean;
  addedBy?: string;
  teacherId?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: {
    type: 'points' | 'lifetimePoints' | 'coupons' | 'manual';
    threshold: number;
    categoryId?: string;
  };
  bonusPoints?: number;
  unlockedCount?: number;
}

export interface BackupInfo {
  id: string;
  createdAt?: number;
  storagePath?: string;
  sha256?: string;
  sizeBytes?: number;
  type?: string;
  status?: string;
  error?: string;
  collections?: Record<string, number>;
  totalDocs?: number;
}

export interface Database {
  name: string;
  passcode: string;
  // All array fields are now subcollections
  students?: Student[];
  classes?: Class[];
  teachers?: Teacher[];
  categories?: Category[];
  coupons?: Coupon[];
  prizes?: Prize[];
  updatedAt: number;
  hasMigratedStudents?: boolean;
  hasMigratedClasses?: boolean;
  hasMigratedTeachers?: boolean;
  hasMigratedPrizes?: boolean;
  hasMigratedCoupons?: boolean;
  hasMigratedCategories?: boolean;
}
