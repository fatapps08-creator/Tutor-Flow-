import type { LearningProgress, LearningRecord, LearningTargetType } from "@/src/types";
import { getClassesSnapshot } from "@/src/features/classes/class-service";
import { initialLearningRecords } from "@/src/features/students/mock-data";
import { getSessionsSnapshot } from "@/src/features/schedule/schedule-service";

export type LearningRecordInput = {
  sessionId: string;
  topic: string;
  progress: LearningProgress;
  remarks?: string;
};

export type LearningRecordUpdate = Pick<LearningRecord, "topic" | "progress" | "remarks">;

let records = [...initialLearningRecords];
let snapshot = records;
const serverSnapshot = initialLearningRecords;
const listeners = new Set<() => void>();

function notify() {
  snapshot = records;
  listeners.forEach((listener) => listener());
}

function validateContent(topic: string, progress: LearningProgress) {
  if (!topic.trim()) {
    throw new Error("A learning topic is required.");
  }
  if (!["excellent", "good", "improving", "needs_attention"].includes(progress)) {
    throw new Error("A valid learning progress value is required.");
  }
}

export function subscribeToLearningRecords(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLearningRecordsSnapshot() {
  return snapshot;
}

export function getLearningRecordsServerSnapshot() {
  return serverSnapshot;
}

export function listLearningRecords() {
  return records;
}

export function addLearningRecord(input: LearningRecordInput) {
  validateContent(input.topic, input.progress);
  const session = getSessionsSnapshot().find((item) => item.id === input.sessionId);
  if (!session || session.status !== "completed") {
    throw new Error("A learning record requires a completed session.");
  }

  const targetType: LearningTargetType = session.type;
  let targetId: string;
  if (targetType === "individual") {
    if (!session.studentId) {
      throw new Error("The individual session has no student.");
    }
    targetId = session.studentId;
  } else {
    if (!session.classId || !getClassesSnapshot().classes.some((item) => item.id === session.classId)) {
      throw new Error("The group session has no valid class.");
    }
    targetId = session.classId;
  }

  const record: LearningRecord = {
    id: `learning-${crypto.randomUUID()}`,
    tutorId: session.tutorId,
    targetType,
    targetId,
    sessionId: session.id,
    subject: session.subject,
    date: session.date,
    topic: input.topic.trim(),
    progress: input.progress,
    ...(input.remarks?.trim() && { remarks: input.remarks.trim() }),
  };
  records = [record, ...records];
  notify();
  return record;
}

export function updateLearningRecord(recordId: string, input: LearningRecordUpdate) {
  validateContent(input.topic, input.progress);
  const existing = records.find((record) => record.id === recordId);
  if (!existing) {
    throw new Error(`Learning record ${recordId} was not found.`);
  }

  const remarks = input.remarks?.trim();
  const updated: LearningRecord = {
    ...existing,
    topic: input.topic.trim(),
    progress: input.progress,
    ...(remarks ? { remarks } : { remarks: undefined }),
  };
  records = records.map((record) => (record.id === recordId ? updated : record));
  notify();
  return updated;
}

export function deleteLearningRecord(recordId: string) {
  const existing = records.find((record) => record.id === recordId);
  if (!existing) {
    throw new Error(`Learning record ${recordId} was not found.`);
  }
  records = records.filter((record) => record.id !== recordId);
  notify();
}
