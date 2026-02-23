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
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  points: number;
  lifetimePoints?: number;
  classId?: string;
  nfcId: string;
  history: HistoryItem[];
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
}

export interface Prize {
  id: string;
  name: string;
  points: number;
  icon: string;
  inStock: boolean;
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
