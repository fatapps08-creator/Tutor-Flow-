// src/types/index.ts

export type Language = 'en' | 'ms';

export type SessionType = 'individual' | 'group';
export type ClassStatus = 'active' | 'archived';
export type ClassStudentStatus = 'active' | 'inactive';
export type LearningTargetType = 'individual' | 'group';
export type RegistrationType = 'individual' | 'group';

export type SessionStatus = 'upcoming' | 'completed' | 'cancelled' | 'no_show';
export type StudentStatus = 'active' | 'inactive' | 'paused';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';
export type PaymentStatus = 'paid' | 'pending' | 'overdue';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'cancelled' | 'no_show';
export type LearningProgress = 'excellent' | 'good' | 'improving' | 'needs_attention';

/**
 * Planned Google Sheets Tabs mapping
 */
export type GoogleSheetTabName =
  | 'Tutors'
  | 'Students'
  | 'Registrations'
  | 'Sessions'
  | 'Learning Records'
  | 'Attendance'
  | 'Payments'
  | 'Settings'
  | 'Classes'
  | 'ClassStudents';

export interface Tutor {
  id: string;
  centerId: string;
  name: string;
  email: string;
  businessName?: string;
  phone?: string;
  defaultLanguage: Language;
  createdAt: string;
}

export interface Student {
  id: string;
  tutorId: string;
  fullName: string;
  subjects: string[];
  gradeOrLevel?: string;
  guardianName?: string;
  guardianPhone?: string;
  status: StudentStatus;
  joinedDate: string;
  notes?: string;
}

export interface Class {
  id: string;
  tutorId: string;
  className: string;
  subject: string;
  description?: string;
  status: ClassStatus;
  createdAt: string;
}

export interface ClassStudent {
  id: string;
  tutorId: string;
  classId: string;
  studentId: string;
  joinedDate: string;
  status: ClassStudentStatus;
}

export interface Registration {
  id: string;
  tutorId: string;
  studentName: string;
  requestedSubject: string;
  guardianName?: string;
  guardianPhone?: string;
  preferredSchedule?: string;
  registrationType: RegistrationType;
  preferredClassId?: string;
  status: RegistrationStatus;
  submittedAt: string;
  notes?: string;
  createdStudentId?: string;
}

export interface Session {
  id: string;
  tutorId: string;
  type: SessionType;
  studentId?: string;
  classId?: string;
  subject: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g., "9:00 AM"
  endTime: string; // e.g., "10:00 AM"
  durationMinutes: number; // e.g., 60
  status: SessionStatus;
  notes?: string;
}

export interface LearningRecord {
  id: string;
  tutorId: string;
  targetType: LearningTargetType;
  targetId: string;
  sessionId: string;
  subject: string;
  date: string; // YYYY-MM-DD
  topic: string;
  progress: LearningProgress;
  remarks?: string;
}

export interface Attendance {
  id: string;
  tutorId: string;
  studentId: string;
  sessionId: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface Payment {
  id: string;
  tutorId: string;
  studentId: string;
  amount: number;
  currency: string;
  billingMonth: string; // e.g., "2026-10"
  status: PaymentStatus;
  paidAt?: string;
  referenceNote?: string;
}

export interface Settings {
  id: string;
  tutorId: string;
  tutorDisplayName: string;
  businessName: string;
  currency: string;
  timezone: string;
  language: Language;
  defaultSessionDurationMinutes: number;
}

export interface DashboardSummaryData {
  tutorName: string;
  todaysSessionsCount: number;
  activeStudentsCount: number;
  pendingRegistrationsCount: number;
  monthlyPaymentsFormatted: string;
  todaysSchedule: Session[];
  recentLearningActivity: LearningRecord[];
}
