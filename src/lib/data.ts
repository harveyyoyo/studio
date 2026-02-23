import type { Database } from './types';

export const INITIAL_DATA: Omit<Database, 'passcode'> = {
  name: 'New School',
  students: [
    { id: 's1', firstName: 'Alice', lastName: 'Johnson', nfcId: '100', points: 150, classId: 'c1', history: [{ desc: 'Redeemed: Cool Pencil', amount: -50, date: Date.now() - 86400000 * 5 }, { desc: 'Redeemed coupon: GOOD-100 (Good Behavior)', amount: 200, date: Date.now() - 86400000 * 10 }] },
    { id: 's2', firstName: 'Bob', lastName: 'Williams', nfcId: '101', points: 275, classId: 'c1', history: [{ desc: 'Redeemed coupon: ACAD-100 (Academic Achievement)', amount: 100, date: Date.now() - 86400000 * 3 }, { desc: 'Redeemed coupon: HELP-25 (Helping Others)', amount: 25, date: Date.now() - 86400000 * 9 }, { desc: 'Redeemed coupon: GEN-50 (General Reward)', amount: 50, date: Date.now() - 86400000 * 12 }, { desc: 'Redeemed coupon: REWARD-500 (Good Behavior)', amount: 500, date: Date.now() - 86400000 * 20 }] },
    { id: 's3', firstName: 'Charlie', lastName: 'Brown', nfcId: '102', points: 80, classId: 'c2', history: [{ desc: 'Redeemed coupon: GEN-50 (General Reward)', amount: 100, date: Date.now() - 86400000 * 1 }] },
    { id: 's4', firstName: 'Diana', lastName: 'Miller', nfcId: '103', points: 1200, classId: 'c2', history: [{ desc: 'Redeemed: Ice Cream Coupon', amount: -1000, date: Date.now() - 86400000 * 2 }, { desc: 'Redeemed coupon: ACAD-100 (Academic Achievement)', amount: 1200, date: Date.now() - 86400000 * 30 }, { desc: 'Redeemed coupon: CREATE-200 (Creativity)', amount: 1000, date: Date.now() - 86400000 * 20 }] },
    { id: 's5', firstName: 'Ethan', lastName: 'Davis', nfcId: '104', points: 450, classId: 'c3', history: [{ desc: 'Redeemed coupon: SPORT-50 (Sportsmanship)', amount: 50, date: Date.now() - 86400000 * 18 }, { desc: 'Redeemed coupon: HELP-25 (Helping Others)', amount: 425, date: Date.now() - 86400000 * 5 }] },
    { id: 's6', firstName: 'Fiona', lastName: 'Garcia', nfcId: '105', points: 620, classId: 'c3', history: [{ desc: 'Redeemed coupon: ATTEND-75 (Perfect Attendance)', amount: 620, date: Date.now() - 86400000 * 25 }] },
    { id: 's7', firstName: 'George', lastName: 'Rodriguez', nfcId: '106', points: 95, classId: 'c4', history: [{ desc: 'Redeemed coupon: GEN-50 (General Reward)', amount: 95, date: Date.now() - 86400000 * 3 }] },
    { id: 's8', firstName: 'Hannah', lastName: 'Wilson', nfcId: '107', points: 180, classId: 'c4', history: [{ desc: 'Redeemed coupon: GOOD-100 (Good Behavior)', amount: 180, date: Date.now() - 86400000 * 8 }] },
    { id: 's9', firstName: 'Ian', lastName: 'Martinez', nfcId: '108', points: 320, classId: 'c5', history: [{ desc: 'Redeemed coupon: CREATE-200 (Creativity)', amount: 320, date: Date.now() - 86400000 * 11 }] },
    { id: 's10', firstName: 'Jasmine', lastName: 'Hernandez', nfcId: '109', points: 2100, classId: 'c5', history: [{ desc: 'Redeemed: Pizza Party Slice', amount: -2500, date: Date.now() - 86400000 * 15 }, { desc: 'Redeemed coupon: REWARD-500 (Good Behavior)', amount: 4600, date: Date.now() - 86400000 * 40 }] },
  ],
  classes: [
    { id: 'c1', name: 'Grade 1' },
    { id: 'c2', name: 'Grade 2' },
    { id: 'c3', name: 'Grade 3' },
    { id: 'c4', name: 'Grade 4' },
    { id: 'c5', name: 'Grade 5' },
  ],
  teachers: [
    { id: 't1', name: 'Mrs. Johnson' },
    { id: 't2', name: 'Mr. Smith' },
    { id: 't3', name: 'Ms. Davis' },
  ],
  categories: [
    { id: 'cat1', name: 'Good Behavior', points: 20 },
    { id: 'cat2', name: 'Academic Achievement', points: 50 },
    { id: 'cat3', name: 'Helping Others', points: 30 },
    { id: 'cat4', name: 'Attendance', points: 10 },
  ],
  coupons: [],
  prizes: [],
  updatedAt: Date.now(),
};
