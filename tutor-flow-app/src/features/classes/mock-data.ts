import type { Class, ClassStudent } from "@/src/types";

export const initialClasses: Class[] = [
  {
    id: "class-mathematics-foundations",
    tutorId: "tutor-demo",
    className: "Mathematics Foundations",
    subject: "Mathematics",
    description: "Small-group practice for core mathematics skills.",
    status: "active",
    createdAt: "2026-09-12T09:00:00.000Z",
  },
  {
    id: "class-english-writing",
    tutorId: "tutor-demo",
    className: "English Writing Club",
    subject: "English",
    description: "Build confidence with grammar and writing.",
    status: "active",
    createdAt: "2026-09-18T09:00:00.000Z",
  },
];

export const initialClassStudents: ClassStudent[] = [
  {
    id: "class-student-math-aina",
    tutorId: "tutor-demo",
    classId: "class-mathematics-foundations",
    studentId: "student-aina",
    joinedDate: "2026-09-12",
    status: "active",
  },
  {
    id: "class-student-math-adam",
    tutorId: "tutor-demo",
    classId: "class-mathematics-foundations",
    studentId: "student-adam",
    joinedDate: "2026-09-14",
    status: "active",
  },
  {
    id: "class-student-english-daniel",
    tutorId: "tutor-demo",
    classId: "class-english-writing",
    studentId: "student-daniel",
    joinedDate: "2026-09-18",
    status: "active",
  },
];
