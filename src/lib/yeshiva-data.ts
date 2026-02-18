import type { Database } from './types';

export const YESHIVA_DATA: Omit<Database, 'passcode'> = {
  students: [
    {
      id: 's1',
      firstName: 'Shmuel',
      lastName: 'Goldstein',
      nfcId: '101',
      points: 120,
      classId: 'yc1',
      history: [],
    },
    {
      id: 's2',
      firstName: 'Avi',
      lastName: 'Schwartz',
      nfcId: '102',
      points: 80,
      classId: 'yc2',
      history: [],
    },
  ],
  classes: [
    { id: 'yc1', name: 'Shiur Aleph' },
    { id: 'yc2', name: 'Shiur Bet' },
    { id: 'yc3', name: 'Shiur Gimmel' },
  ],
  teachers: [
    { id: 'yt1', name: 'Rabbi Cohen' },
    { id: 'yt2', name: 'Rabbi Levi' },
  ],
  categories: [
    'Middos Tovos', // Good Character
    'Shteiging', // Growth in Learning
    'Gemara B\'iyun', // In-depth Talmud Study
    'Mishna Mastery',
    'Tefillah', // Prayer
  ],
  coupons: [
    {
      code: 'BOKERTOV-10',
      value: 10,
      category: 'Tefillah',
      teacher: 'Rabbi Cohen',
      used: false,
      createdAt: Date.now(),
      description: 'For excellent concentration during morning prayers.',
    },
  ],
  prizes: [
    { id: 'yp1', name: 'Small Sefer', points: 250, icon: 'BookOpen', inStock: true },
    { id: 'yp2', name: 'Candy from the Rebbe', points: 100, icon: 'Candy', inStock: true },
    { id: 'yp3', name: 'Pizza Slice', points: 500, icon: 'Pizza', inStock: true },
    { id: 'yp4', name: 'Large Sefer (Artscroll)', points: 1500, icon: 'BookMarked', inStock: true },
    { id: 'yp5', name: 'Day off from chores', points: 1000, icon: 'Home', inStock: true },
  ],
  updatedAt: Date.now(),
};
