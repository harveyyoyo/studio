export interface HistoryItem {
  id?: string;
  desc: string;
  amount: number;
  date: number;
  fulfilled?: boolean;
  teacherId?: string;
}

export interface Class {
  id: string;
  name: string;
  /** Optional primary teacher for this class, used for per-teacher attendance. */
  primaryTeacherId?: string;
}

export interface Teacher {
  id: string;
  name: string;
  username?: string;
  passcode?: string;
  monthlyBudget?: number;
  spentThisMonth?: number;
}

export interface Category {
  id: string;
  name: string;
  points: number;
  color?: string;
  teacherId?: string;
}

export interface AttendanceRewardRule {
  id: string;
  teacherId: string;
  classId: string;
  className?: string;
  /** Period reference from universal periods, if used. */
  periodId?: string;
  /** Inline custom period (teacher-created), if used. */
  customPeriod?: { label: string; startTime: string; endTime: string };
  pointsForSignIn: number;
  pointsForOnTime: number;
  onTimeWindowMinutes: number;
  categoryId?: string;
  enabled: boolean;
  createdAt: number;
}

export interface StudentTheme {
  background: string;
  text: string;
  primary: string;
  cardBackground: string;
  accent: string;
  emoji?: string;
  fontFamily?: string;
  /** Full CSS background value (gradient or pattern). When set, used instead of solid background. */
  backgroundStyle?: string | null;
  /** Optional global font scale (1 = default, 1.1 = slightly larger). */
  fontScale?: number;
}

export interface Student {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  nickname?: string;
  photoUrl?: string;
  points: number;
  lifetimePoints?: number;
  classId?: string;
  nfcId: string;
  categoryPoints?: { [key: string]: number };
  /** Category points within time periods (e.g. "2025-03" for month, "2025-H1" for semester). Used for category-based badges. */
  categoryPointsByPeriod?: { [periodKey: string]: { [categoryName: string]: number } };
  earnedAchievements?: { achievementId: string; earnedAt: number }[];
  /** Badges earned for reaching category point thresholds in a time period. */
  earnedBadges?: { badgeId: string; earnedAt: number; periodKey: string }[];
  teacherIds?: string[];
  theme?: StudentTheme;
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
  /** When set, the coupon cannot be redeemed after this timestamp (ms since epoch). */
  expiresAt?: number;
}

export interface Prize {
  id: string;
  name: string;
  points: number;
  icon: string;
  inStock: boolean;
  addedBy?: string;
  teacherId?: string;
  classId?: string;
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
  /** Visual tier for badge styling (bronze/silver/gold/platinum). */
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  /** Hex or CSS color for badge card border/glow. */
  accentColor?: string;
}

/** Real badge: earned for reaching a points threshold in a specific category within a time period (e.g. Good Behavior badge = 50 Good Behavior points this month). */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Category that counts toward this badge (e.g. Good Behavior). */
  categoryId: string;
  /** Points required in the category within the period to earn the badge. */
  pointsRequired: number;
  /** Time period over which points are counted. */
  period: 'month' | 'semester' | 'year' | 'all_time';
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  accentColor?: string;
  /** When false, this badge is not awarded (existing earners are unchanged). Default true. */
  enabled?: boolean;
}

/** Schedule slot for class sign-in (e.g. Period 1, 2). Times in "HH:mm" 24h format. */
export interface AttendanceScheduleSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
}

/** Attendance (class sign-in) configuration.
 *  Historically this was per-school; with per-teacher attendance, `teacherId`
 *  can be used to scope a config to a specific teacher.
 */
export interface AttendanceSettings {
  pointsForSignIn: number;
  pointsForOnTime: number;
  onTimeWindowMinutes: number;
  /** If set and non-empty, only students in these classes get attendance points. Empty = all classes. */
  enabledClassIds?: string[];
  /** Optional mapping of classId -> schedule slot id (period) for that class. */
  classPeriodAssignments?: Record<string, string>;
  categoryId?: string;
  schedule: AttendanceScheduleSlot[];
  /** Optional owner for per-teacher attendance configuration. */
  teacherId?: string;
}

/** One sign-in event stored for admin reporting. */
export interface AttendanceLogEntry {
  id?: string;
  studentId: string;
  studentName?: string;
  signedInAt: number;
  pointsAwarded: number;
  onTime: boolean;
  periodLabel?: string;
  /** A deterministic per-session key used to prevent double sign-ins. */
  sessionId?: string;
   /** Optional owning teacher when using per-teacher attendance configs. */
  teacherId?: string;
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
  adminPasscode?: string;
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
