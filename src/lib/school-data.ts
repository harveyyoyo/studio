import type { Database } from './types';

export const SCHOOL_DATA: Omit<Database, 'passcode'> = {
  students: [
    { id: 'ss1', firstName: 'Emily', lastName: 'Smith', nfcId: 's101', points: 150, classId: 'sc1', history: [{ desc: 'Bonus points for class participation', amount: 50, date: Date.now() - 86400000 * 2 }] },
    { id: 'ss2', firstName: 'Jacob', lastName: 'Johnson', nfcId: 's102', points: 200, classId: 'sc2', history: [{ desc: 'Extra credit for science fair project', amount: 100, date: Date.now() - 86400000 * 5 }] },
    { id: 'ss3', firstName: 'Sophia', lastName: 'Williams', nfcId: 's103', points: 75, classId: 'sc1', history: [{ desc: 'Perfect attendance award', amount: 75, date: Date.now() - 86400000 * 1 }] },
    { id: 'ss4', firstName: 'Michael', lastName: 'Brown', nfcId: 's104', points: 300, classId: 'sc3', history: [{ desc: 'Redeemed: Pizza party with friends', amount: -200, date: Date.now() - 86400000 * 10 }, { desc: 'A+ on history exam', amount: 500, date: Date.now() - 86400000 * 20 }] },
    { id: 'ss5', firstName: 'Emma', lastName: 'Jones', nfcId: 's105', points: 120, classId: 'sc2', history: [{ desc: 'Helping a classmate with homework', amount: 20, date: Date.now() - 86400000 * 3 }] },
    { id: 'ss6', firstName: 'William', lastName: 'Garcia', nfcId: 's106', points: 50, classId: 'sc1', history: [{ desc: 'Cleaned up the classroom', amount: 50, date: Date.now() - 86400000 * 8 }] },
    { id: 'ss7', firstName: 'Olivia', lastName: 'Miller', nfcId: 's107', points: 450, classId: 'sc3', history: [{ desc: 'Won the school spelling bee', amount: 450, date: Date.now() - 86400000 * 4 }] },
    { id: 'ss8', firstName: 'James', lastName: 'Davis', nfcId: 's108', points: 600, classId: 'sc2', history: [{ desc: 'Tutoring younger students', amount: 600, date: Date.now() - 86400000 * 12 }] },
    { id: 'ss9', firstName: 'Isabella', lastName: 'Rodriguez', nfcId: 's109', points: 180, classId: 'sc1', history: [{ desc: 'Designing the class bulletin board', amount: 180, date: Date.now() - 86400000 * 6 }] },
    { id: 'ss10', firstName: 'Alexander', lastName: 'Martinez', nfcId: 's110', points: 1000, classId: 'sc3', history: [{ desc: 'Redeemed: Principal for a day', amount: -1000, date: Date.now() - 86400000 * 15 }, { desc: 'Student of the month award', amount: 2000, date: Date.now() - 86400000 * 40 }] },
    { id: 'ss11', firstName: 'Mia', lastName: 'Hernandez', nfcId: 's111', points: 250, classId: 'sc4', history: [{ desc: 'Leading a school club', amount: 250, date: Date.now() - 86400000 * 7 }] },
    { id: 'ss12', firstName: 'Ethan', lastName: 'Lopez', nfcId: 's112', points: 350, classId: 'sc4', history: [{ desc: 'Organizing a charity drive', amount: 350, date: Date.now() - 86400000 * 14 }] },
  ],
  classes: [
    { id: 'sc1', name: 'Grade 5' },
    { id: 'sc2', name: 'Grade 6' },
    { id: 'sc3', name: 'Grade 7' },
    { id: 'sc4', name: 'Grade 8' },
  ],
  teachers: [
    { id: 'st1', name: 'Mr. Smith' },
    { id: 'st2', name: 'Mrs. Jones' },
    { id: 'st3', name: 'Ms. Davis' },
    { id: 'st4', name: 'Mr. Brown' },
  ],
  categories: [
    'Academics',
    'Good Behavior',
    'Helping Others',
    'School Spirit',
    'Attendance',
    'Extra Curricular',
  ],
  coupons: [
    { code: 'ACAD10', category: 'Academics', value: 10, used: false, usedBy: null, usedAt: null, createdAt: Date.now() - 86400000 * 20 },
    { code: 'BEHAVE5', category: 'Good Behavior', value: 5, used: true, usedBy: 'Emily Smith', usedAt: Date.now() - 86400000 * 2, createdAt: Date.now() - 86400000 * 30 },
    { code: 'HELP15', category: 'Helping Others', value: 15, used: false, usedBy: null, usedAt: null, createdAt: Date.now() - 86400000 * 10 },
  ],
  prizes: [
    { id: 'sp1', name: 'Sticker Pack', points: 50, inventory: 100 },
    { id: 'sp2', name: 'Homework Pass', points: 100, inventory: 50 },
    { id: 'sp3', name: 'Pizza Slice', points: 200, inventory: 20 },
    { id: 'sp4', name: 'Movie Ticket', points: 500, inventory: 10 },
  ],
  updatedAt: Date.now(),
};
