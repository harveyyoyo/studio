import type { Database } from './types';

export const YESHIVA_DATA: Omit<Database, 'passcode'> = {
  students: [
    // Existing
    { id: 'ys1', firstName: 'Shmuel', lastName: 'Goldstein', nfcId: 'y101', points: 120, classId: 'yc1', history: [{ desc: 'Redeemed coupon: BOKERTOV-10 (Tefillah)', amount: 120, date: Date.now() - 86400000 * 2 }] },
    { id: 'ys2', firstName: 'Avi', lastName: 'Schwartz', nfcId: 'y102', points: 80, classId: 'yc2', history: [{ desc: 'Redeemed coupon: SHTEIG-50 (Shteiging)', amount: 80, date: Date.now() - 86400000 * 5 }] },
    { id: 'ys3', firstName: 'Yosef', lastName: 'Cohen', nfcId: 'y103', points: 250, classId: 'yc1', history: [{ desc: 'Redeemed coupon: MIDDOS-200 (Middos Tovos)', amount: 250, date: Date.now() - 86400000 * 1 }] },
    { id: 'ys4', firstName: 'David', lastName: 'Levi', nfcId: 'y104', points: 400, classId: 'yc3', history: [{ desc: 'Redeemed: Pizza Slice', amount: -500, date: Date.now() - 86400000 * 10 }, { desc: 'Redeemed coupon: GEMARA-100 (Gemara B\'iyun)', amount: 900, date: Date.now() - 86400000 * 20 }] },
    { id: 'ys5', firstName: 'Moshe', lastName: 'Katz', nfcId: 'y105', points: 150, classId: 'yc2', history: [{ desc: 'Redeemed coupon: SHTEIG-50 (Shteiging)', amount: 150, date: Date.now() - 86400000 * 3 }] },
    { id: 'ys6', firstName: 'Dovid', lastName: 'Weiss', nfcId: 'y106', points: 300, classId: 'yc1', history: [{ desc: 'Redeemed coupon: MISHNA-75 (Mishna Mastery)', amount: 300, date: Date.now() - 86400000 * 8 }] },
    { id: 'ys7', firstName: 'Chaim', lastName: 'Friedman', nfcId: 'y107', points: 50, classId: 'yc3', history: [{ desc: 'Redeemed coupon: BOKERTOV-10 (Tefillah)', amount: 50, date: Date.now() - 86400000 * 4 }] },
    { id: 'ys8', firstName: 'Yaakov', lastName: 'Rosenberg', nfcId: 'y108', points: 600, classId: 'yc2', history: [{ desc: 'Redeemed coupon: MIDDOS-200 (Middos Tovos)', amount: 600, date: Date.now() - 86400000 * 12 }] },
    { id: 'ys9', firstName: 'Yisrael', lastName: 'Adler', nfcId: 'y109', points: 180, classId: 'yc1', history: [{ desc: 'Redeemed coupon: SHTEIG-50 (Shteiging)', amount: 180, date: Date.now() - 86400000 * 6 }] },
    { id: 'ys10', firstName: 'Menachem', lastName: 'Gross', nfcId: 'y110', points: 1200, classId: 'yc3', history: [{ desc: 'Redeemed: Large Sefer (Artscroll)', amount: -1500, date: Date.now() - 86400000 * 15 }, { desc: 'Redeemed coupon: GEMARA-100 (Gemara B\'iyun)', amount: 2700, date: Date.now() - 86400000 * 40 }] },
    { id: 'ys11', firstName: 'Eliezer', lastName: 'Klein', nfcId: 'y111', points: 220, classId: 'yc2', history: [{ desc: 'Redeemed coupon: MISHNA-75 (Mishna Mastery)', amount: 220, date: Date.now() - 86400000 * 9 }] },
    { id: 'ys12', firstName: 'Baruch', lastName: 'Stein', nfcId: 'y112', points: 70, classId: 'yc1', history: [{ desc: 'Redeemed coupon: BOKERTOV-10 (Tefillah)', amount: 70, date: Date.now() - 86400000 * 1 }] },
    { id: 'ys13', firstName: 'Aryeh', lastName: 'Feldman', nfcId: 'y113', points: 350, classId: 'yc3', history: [{ desc: 'Redeemed coupon: MIDDOS-200 (Middos Tovos)', amount: 350, date: Date.now() - 86400000 * 18 }] },
    { id: 'ys14', firstName: 'Zev', lastName: 'Hoffman', nfcId: 'y114', points: 100, classId: 'yc2', history: [{ desc: 'Redeemed coupon: SHTEIG-50 (Shteiging)', amount: 100, date: Date.now() - 86400000 * 7 }] },
    { id: 'ys15', firstName: 'Tzvi', lastName: 'Roth', nfcId: 'y115', points: 800, classId: 'yc1', history: [{ desc: 'Redeemed coupon: GEMARA-100 (Gemara B\'iyun)', amount: 800, date: Date.now() - 86400000 * 25 }] },
    { id: 'ys16', firstName: 'Akiva', lastName: 'Berger', nfcId: 'y116', points: 190, classId: 'yc3', history: [{ desc: 'Redeemed coupon: MISHNA-75 (Mishna Mastery)', amount: 190, date: Date.now() - 86400000 * 11 }] },
    { id: 'ys17', firstName: 'Yehuda', lastName: 'Green', nfcId: 'y117', points: 40, classId: 'yc2', history: [{ desc: 'Redeemed coupon: BOKERTOV-10 (Tefillah)', amount: 40, date: Date.now() - 86400000 * 2 }] },
    { id: 'ys18', firstName: 'Shlomo', lastName: 'Jacobs', nfcId: 'y118', points: 550, classId: 'yc1', history: [{ desc: 'Redeemed coupon: MIDDOS-200 (Middos Tovos)', amount: 550, date: Date.now() - 86400000 * 14 }] },
    { id: 'ys19', firstName: 'Gedalya', lastName: 'Fisher', nfcId: 'y119', points: 130, classId: 'yc3', history: [{ desc: 'Redeemed coupon: SHTEIG-50 (Shteiging)', amount: 130, date: Date.now() - 86400000 * 5 }] },
    { id: 'ys20', firstName: 'Nachman', lastName: 'Pollack', nfcId: 'y120', points: 1000, classId: 'yc2', history: [{ desc: 'Redeemed: Day off from chores', amount: -1000, date: Date.now() - 86400000 * 30 }, { desc: 'Redeemed coupon: GEMARA-100 (Gemara B\'iyun)', amount: 2000, date: Date.now() - 86400000 * 60 }] },
    { id: 'ys21', firstName: 'Daniel', lastName: 'Kaplan', nfcId: 'y121', points: 450, classId: 'yc4', history: [{ desc: 'Redeemed coupon: AVOSUBANIM-100 (Avos Ubanim)', amount: 450, date: Date.now() - 86400000 * 20 }] },
    { id: 'ys22', firstName: 'Ephraim', lastName: 'Shapiro', nfcId: 'y122', points: 280, classId: 'yc1', history: [{ desc: 'Redeemed coupon: CHAVRUSA-50 (Chavrusa Learning)', amount: 280, date: Date.now() - 86400000 * 15 }] },
    { id: 'ys23', firstName: 'Ezra', lastName: 'Silver', nfcId: 'y123', points: 90, classId: 'yc2', history: [{ desc: 'Redeemed coupon: BOKERTOV-10 (Tefillah)', amount: 90, date: Date.now() - 86400000 * 3 }] },
    { id: 'ys24', firstName: 'Gavriel', lastName: 'Goldman', nfcId: 'y124', points: 720, classId: 'yc3', history: [{ desc: 'Redeemed coupon: MIDDOS-200 (Middos Tovos)', amount: 720, date: Date.now() - 86400000 * 22 }] },
    { id: 'ys25', firstName: 'Hershel', lastName: 'Mandel', nfcId: 'y125', points: 310, classId: 'yc4', history: [{ desc: 'Redeemed coupon: SHTEIG-50 (Shteiging)', amount: 310, date: Date.now() - 86400000 * 10 }] },
    { id: 'ys26', firstName: 'Levi', lastName: 'Stern', nfcId: 'y126', points: 1500, classId: 'yc1', history: [{ desc: 'Redeemed coupon: GEMARA-100 (Gemara B\'iyun)', amount: 1500, date: Date.now() - 86400000 * 35 }] },
    { id: 'ys27', firstName: 'Mordechai', lastName: 'Blau', nfcId: 'y127', points: 400, classId: 'yc2', history: [{ desc: 'Redeemed coupon: CHESED-150 (Chesed)', amount: 400, date: Date.now() - 86400000 * 13 }] },
    { id: 'ys28', firstName: 'Noach', lastName: 'Singer', nfcId: 'y128', points: 85, classId: 'yc3', history: [{ desc: 'Redeemed coupon: MISHNA-75 (Mishna Mastery)', amount: 85, date: Date.now() - 86400000 * 6 }] },
    { id: 'ys29', firstName: 'Reuven', lastName: 'Farkas', nfcId: 'y129', points: 110, classId: 'yc4', history: [{ desc: 'Redeemed coupon: BOKERTOV-10 (Tefillah)', amount: 110, date: Date.now() - 86400000 * 4 }] },
    { id: 'ys30', firstName: 'Simcha', lastName: 'Teitelbaum', nfcId: 'y130', points: 2200, classId: 'yc1', history: [{ desc: 'Redeemed: Seforim Gift Card', amount: -2000, date: Date.now() - 86400000 * 28 }, { desc: 'Redeemed coupon: AVOSUBANIM-100 (Avos Ubanim)', amount: 4200, date: Date.now() - 86400000 * 50 }] },
  ],
  classes: [
    { id: 'yc1', name: 'Shiur Aleph' },
    { id: 'yc2', name: 'Shiur Bet' },
    { id: 'yc3', name: 'Shiur Gimmel' },
    { id: 'yc4', name: 'Bais Medrash' },
    { id: 'yc5', name: 'Kollel' },
  ],
  teachers: [
    { id: 'yt1', name: 'Rabbi Cohen' },
    { id: 'yt2', name: 'Rabbi Levi' },
    { id: 'yt3', name: 'Rav Goldberg' },
    { id: 'yt4', name: 'Rosh Yeshiva' },
    { id: 'yt5', name: 'Rabbi Epstein' },
  ],
  categories: [
    'Middos Tovos', // Good Character
    'Shteiging', // Growth in Learning
    'Gemara B\'iyun', // In-depth Talmud Study
    'Mishna Mastery',
    'Tefillah', // Prayer
    'Chesed', // Acts of Kindness
    'Avos Ubanim', // Father-Son Learning
    'Chavrusa Learning', // Partner Study
  ],
  coupons: [
    { code: 'BOKERTOV-10', value: 10, category: 'Tefillah', teacher: 'Rabbi Cohen', used: false, createdAt: Date.now(), description: 'For excellent concentration during morning prayers.' },
    { code: 'SHTEIG-50', value: 50, category: 'Shteiging', teacher: 'Rabbi Levi', used: false, createdAt: Date.now() - 86400000, description: 'For asking a great question in shiur.'},
    { code: 'GEMARA-100', value: 100, category: 'Gemara B\'iyun', teacher: 'Rav Goldberg', used: false, createdAt: Date.now() - 86400000 * 2, description: 'For preparing well for shiur.'},
    { code: 'MISHNA-75', value: 75, category: 'Mishna Mastery', teacher: 'Rabbi Cohen', used: false, createdAt: Date.now() - 86400000 * 3, description: 'For completing the weekly Mishna assignment.'},
    { code: 'MIDDOS-200', value: 200, category: 'Middos Tovos', teacher: 'Rosh Yeshiva', used: false, createdAt: Date.now() - 86400000 * 4, description: 'For exceptional character and integrity.'},
    { code: 'CHESED-150', value: 150, category: 'Chesed', teacher: 'Rabbi Levi', used: true, createdAt: Date.now() - 86400000 * 5, usedBy: 'Avi Schwartz', usedAt: Date.now() - 86400000 * 2},
    { code: 'AVOSUBANIM-100', value: 100, category: 'Avos Ubanim', teacher: 'Admin', used: false, createdAt: Date.now() - 86400000 * 6, description: 'For attending Avos Ubanim learning program.'},
    { code: 'CHAVRUSA-50', value: 50, category: 'Chavrusa Learning', teacher: 'Rabbi Epstein', used: false, createdAt: Date.now() - 86400000 * 7, description: 'For productive learning with a chavrusa.'},
  ],
  prizes: [
    { id: 'yp1', name: 'Small Sefer', points: 250, icon: 'BookOpen', inStock: true },
    { id: 'yp2', name: 'Candy from the Rebbe', points: 100, icon: 'Candy', inStock: true },
    { id: 'yp3', name: 'Pizza Slice', points: 500, icon: 'Pizza', inStock: true },
    { id: 'yp4', name: 'Large Sefer (Artscroll)', points: 1500, icon: 'BookMarked', inStock: true },
    { id: 'yp5', name: 'Day off from chores', points: 1000, icon: 'Home', inStock: true },
    { id: 'yp6', name: 'Ice Cream in town', points: 750, icon: 'IceCream', inStock: false},
    { id: 'yp7', name: 'Shabbos Guest for a Meal', points: 2000, icon: 'Users', inStock: true},
    { id: 'yp8', name: 'Seforim Gift Card', points: 3000, icon: 'Gift', inStock: true},
    { id: 'yp9', name: 'Trip with the Rebbe', points: 10000, icon: 'Bus', inStock: true},
  ],
  updatedAt: Date.now(),
};
