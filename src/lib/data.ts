import type { Database } from './types';

export const INITIAL_DATA: Database = {
  students: [
    {
      id: 's1',
      name: 'Test Student',
      password: 'test',
      nfcId: '123456',
      points: 100,
      teacherId: 't1',
      history: [],
    },
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
