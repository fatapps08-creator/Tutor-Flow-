import type { Session } from "@/src/types";

function dateFromToday(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export const initialScheduleSessions: Session[] = [
  {
    id: "session-aina-1",
    tutorId: "tutor-demo",
    studentId: "student-aina",
    subject: "Mathematics",
    date: dateFromToday(0),
    startTime: "09:00",
    endTime: "10:00",
    durationMinutes: 60,
    status: "upcoming",
    notes: "Fractions practice",
  },
  {
    id: "session-daniel-1",
    tutorId: "tutor-demo",
    studentId: "student-daniel",
    subject: "English",
    date: dateFromToday(0),
    startTime: "11:00",
    endTime: "11:45",
    durationMinutes: 45,
    status: "upcoming",
  },
  {
    id: "session-adam-1",
    tutorId: "tutor-demo",
    studentId: "student-adam",
    subject: "Science",
    date: dateFromToday(0),
    startTime: "15:00",
    endTime: "16:00",
    durationMinutes: 60,
    status: "upcoming",
  },
  {
    id: "session-aina-2",
    tutorId: "tutor-demo",
    studentId: "student-aina",
    subject: "Science",
    date: dateFromToday(1),
    startTime: "10:30",
    endTime: "11:15",
    durationMinutes: 45,
    status: "upcoming",
  },
  {
    id: "session-sofia-1",
    tutorId: "tutor-demo",
    studentId: "student-sofia",
    subject: "Piano",
    date: dateFromToday(2),
    startTime: "14:00",
    endTime: "15:00",
    durationMinutes: 60,
    status: "upcoming",
  },
  {
    id: "session-daniel-2",
    tutorId: "tutor-demo",
    studentId: "student-daniel",
    subject: "English",
    date: dateFromToday(4),
    startTime: "16:00",
    endTime: "16:45",
    durationMinutes: 45,
    status: "upcoming",
    notes: "Writing practice",
  },
];
