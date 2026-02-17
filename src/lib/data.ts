import type { Database } from './types';

export const INITIAL_DATA: Omit<Database, 'passcode'> = {
  students: [
    {
      id: 's1',
      firstName: 'Test',
      lastName: 'Student',
      nfcId: '100',
      points: 100,
      classId: 'c1',
      history: [],
    },
  ],
  classes: [
    { id: 'c1', name: 'Grade 5' },
    { id: 'c2', name: 'Grade 6' },
  ],
  teachers: [
    { id: 't1', name: 'Mrs. Johnson' },
    { id: 't2', name: 'Mr. Smith' },
  ],
  categories: [
    'Good Behavior',
    'Academic Achievement',
    'Helping Others',
    'Perfect Attendance',
    'General Reward',
  ],
  coupons: [
    {
      code: 'REWARD-500',
      value: 500,
      category: 'Good Behavior',
      teacher: 'Mrs. Johnson',
      used: false,
      createdAt: Date.now(),
      description: 'For an outstanding display of classroom leadership.',
    },
  ],
  updatedAt: Date.now(),
};
