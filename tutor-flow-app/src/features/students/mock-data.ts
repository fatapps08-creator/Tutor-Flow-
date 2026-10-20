import type {
  Attendance,
  LearningRecord,
  Payment,
  Student,
} from "@/src/types";
import { initialScheduleSessions as initialSessions } from "@/src/features/schedule/mock-data";

export { initialSessions };

export type StudentContactDetails = {
  email: string;
  dateOfBirth: string;
  address: string;
};

export type StudentProfile = {
  student: Student;
  contact: StudentContactDetails;
};

export const initialStudents: StudentProfile[] = [
  {
    student: {
      id: "student-aina",
      tutorId: "tutor-demo",
      fullName: "Aina Rahman",
      subjects: ["Mathematics", "Science"],
      gradeOrLevel: "Year 6",
      guardianName: "Nadia Rahman",
      guardianPhone: "+60 12-345 6789",
      status: "active",
      joinedDate: "2026-02-12",
      notes: "Enjoys visual examples and short practice sets.",
    },
    contact: {
      email: "aina.rahman@example.com",
      dateOfBirth: "2014-06-18",
      address: "Petaling Jaya, Selangor",
    },
  },
  {
    student: {
      id: "student-daniel",
      tutorId: "tutor-demo",
      fullName: "Daniel Tan",
      subjects: ["English"],
      gradeOrLevel: "Form 2",
      guardianName: "Mei Ling Tan",
      guardianPhone: "+60 16-234 5678",
      status: "active",
      joinedDate: "2026-04-03",
      notes: "Currently focusing on grammar and writing confidence.",
    },
    contact: {
      email: "daniel.tan@example.com",
      dateOfBirth: "2012-10-02",
      address: "Subang Jaya, Selangor",
    },
  },
  {
    student: {
      id: "student-adam",
      tutorId: "tutor-demo",
      fullName: "Adam Yusuf",
      subjects: ["Science", "Mathematics"],
      gradeOrLevel: "Year 5",
      guardianName: "Farid Yusuf",
      guardianPhone: "+60 11-8765 4321",
      status: "active",
      joinedDate: "2026-05-21",
      notes: "",
    },
    contact: {
      email: "adam.yusuf@example.com",
      dateOfBirth: "2015-01-25",
      address: "Shah Alam, Selangor",
    },
  },
  {
    student: {
      id: "student-sofia",
      tutorId: "tutor-demo",
      fullName: "Sofia Lim",
      subjects: ["Piano"],
      gradeOrLevel: "Beginner",
      guardianName: "Rachel Lim",
      guardianPhone: "+60 17-345 6789",
      status: "paused",
      joinedDate: "2025-11-14",
      notes: "Paused lessons during the school term.",
    },
    contact: {
      email: "sofia.lim@example.com",
      dateOfBirth: "2013-03-09",
      address: "Kuala Lumpur",
    },
  },
  {
    student: {
      id: "student-haziq",
      tutorId: "tutor-demo",
      fullName: "Haziq Ismail",
      subjects: ["English", "Mathematics"],
      gradeOrLevel: "Form 1",
      guardianName: "Siti Ismail",
      guardianPhone: "+60 13-456 7890",
      status: "inactive",
      joinedDate: "2025-08-07",
      notes: "Lessons completed in the previous school year.",
    },
    contact: {
      email: "haziq.ismail@example.com",
      dateOfBirth: "2013-11-30",
      address: "Ampang, Selangor",
    },
  },
];

export const initialLearningRecords: LearningRecord[] = [
  {
    id: "learning-aina-1",
    tutorId: "tutor-demo",
    studentId: "student-aina",
    sessionId: "session-aina-previous",
    subject: "Mathematics",
    date: "2026-10-17",
    topic: "Fractions",
    progress: "excellent",
    remarks: "Confidently solved multi-step problems.",
  },
  {
    id: "learning-daniel-1",
    tutorId: "tutor-demo",
    studentId: "student-daniel",
    sessionId: "session-daniel-previous",
    subject: "English",
    date: "2026-10-16",
    topic: "Grammar",
    progress: "improving",
    remarks: "Practiced sentence structure and punctuation.",
  },
];

export const initialAttendance: Attendance[] = [
  {
    id: "attendance-aina-1",
    tutorId: "tutor-demo",
    studentId: "student-aina",
    sessionId: "session-aina-previous",
    date: "2026-10-17",
    status: "present",
    remarks: "On time",
  },
  {
    id: "attendance-daniel-1",
    tutorId: "tutor-demo",
    studentId: "student-daniel",
    sessionId: "session-daniel-previous",
    date: "2026-10-16",
    status: "late",
    remarks: "Joined 5 minutes late",
  },
];

export const initialPayments: Payment[] = [
  {
    id: "payment-aina-1",
    tutorId: "tutor-demo",
    studentId: "student-aina",
    amount: 320,
    currency: "MYR",
    billingMonth: "2026-10",
    status: "paid",
    paidAt: "2026-10-03",
    referenceNote: "October tuition",
  },
  {
    id: "payment-daniel-1",
    tutorId: "tutor-demo",
    studentId: "student-daniel",
    amount: 240,
    currency: "MYR",
    billingMonth: "2026-10",
    status: "pending",
    referenceNote: "October tuition",
  },
];
