import type { DashboardSummaryData } from "@/src/types";
import { initialStudents } from "@/src/features/students/mock-data";
import { initialScheduleSessions } from "@/src/features/schedule/mock-data";

function todayString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export const dashboardData: DashboardSummaryData = {
  tutorName: "Sarah",
  todaysSessionsCount: initialScheduleSessions.filter((session) => session.date === todayString()).length,
  activeStudentsCount: 18,
  pendingRegistrationsCount: 3,
  monthlyPaymentsFormatted: "RM 2,840",
  todaysSchedule: initialScheduleSessions.filter((session) => session.date === todayString()),
  recentLearningActivity: [
    {
      id: "learning-1",
      tutorId: "tutor-demo",
      targetType: "individual",
      targetId: "student-aina",
      sessionId: "session-1",
      subject: "Mathematics",
      date: "2026-10-20",
      topic: "Fractions",
      progress: "excellent",
    },
    {
      id: "learning-2",
      tutorId: "tutor-demo",
      targetType: "individual",
      targetId: "student-daniel",
      sessionId: "session-2",
      subject: "English",
      date: "2026-10-19",
      topic: "Grammar",
      progress: "improving",
    },
    {
      id: "learning-3",
      tutorId: "tutor-demo",
      targetType: "individual",
      targetId: "student-adam",
      sessionId: "session-3",
      subject: "Science",
      date: "2026-10-19",
      topic: "Plant life cycles",
      progress: "good",
    },
  ],
};

export const demoStudentNames: Record<string, string> = {
  ...Object.fromEntries(initialStudents.map(({ student }) => [student.id, student.fullName])),
};
