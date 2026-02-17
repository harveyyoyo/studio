export interface HistoryItem {
  desc: string;
  amount: number;
  date: number;
}

export interface Class {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  nfcId: string;
  points: number;
  classId: string;
  history: HistoryItem[];
}

export interface Coupon {
  code: string;
  value: number;
  category: string;
  className: string;
  used: boolean;
  createdAt: number;
  description?: string;
  usedAt?: number;
  usedBy?: string;
}

export interface Database {
  passcode: string;
  students: Student[];
  classes: Class[];
  categories: string[];
  coupons: Coupon[];
  updatedAt: number;
}
