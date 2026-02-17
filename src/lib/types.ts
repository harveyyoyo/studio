export interface HistoryItem {
  desc: string;
  amount: number;
  date: number;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  nfcId: string;
  points: number;
  teacherId: string;
  history: HistoryItem[];
}

export interface Teacher {
  id: string;
  name: string;
}

export interface Coupon {
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

export interface Database {
  passcode: string;
  students: Student[];
  teachers: Teacher[];
  categories: string[];
  coupons: Coupon[];
  updatedAt: number;
}
