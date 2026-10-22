import type { Class, LearningTargetType, Session, Student } from "@/src/types";

export type RejectedCompletedSession = {
  session: Session;
  reason: string;
};

export type CompletedSessionEvaluation = {
  candidates: Session[];
  rejected: RejectedCompletedSession[];
};

export function evaluateCompletedSessionCandidates(
  sessions: Session[],
  targetType: LearningTargetType,
  students: Student[],
  classes: Class[],
): CompletedSessionEvaluation {
  const candidates: Session[] = [];
  const rejected: RejectedCompletedSession[] = [];

  for (const session of sessions) {
    if (session.status !== "completed" || session.type !== targetType) continue;

    if (targetType === "individual") {
      if (!session.studentId) {
        rejected.push({ session, reason: "Missing studentId." });
      } else if (!students.some((student) => student.id === session.studentId)) {
        rejected.push({ session, reason: `No student found for studentId "${session.studentId}".` });
      } else {
        candidates.push(session);
      }
      continue;
    }

    if (!session.classId) {
      rejected.push({ session, reason: "Missing classId." });
    } else if (!classes.some((classRecord) => classRecord.id === session.classId)) {
      rejected.push({ session, reason: `No class found for classId "${session.classId}".` });
    } else {
      candidates.push(session);
    }
  }

  return { candidates, rejected };
}
