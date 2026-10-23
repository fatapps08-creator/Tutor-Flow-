import "server-only";

import type {
  Attendance,
  Class,
  ClassStudent,
  LearningRecord,
  Payment,
  Registration,
  Session,
  Settings,
  Student,
  Tutor,
} from "@/src/types";

export type TutorScopedRecord = { id: string };
export type CreateInput<T extends TutorScopedRecord> = Omit<T, "id" | "tutorId">;
export type UpdateInput<T extends TutorScopedRecord> = Partial<Omit<T, "id" | "tutorId">>;

export interface Repository<T extends TutorScopedRecord> {
  list(tutorId: string): Promise<T[]>;
  get(tutorId: string, id: string): Promise<T | undefined>;
  create(tutorId: string, input: CreateInput<T>): Promise<T>;
  update(tutorId: string, id: string, input: UpdateInput<T>): Promise<T>;
}

export type TutorRepository = Repository<Tutor>;
export type StudentRepository = Repository<Student>;
export type ClassRepository = Repository<Class>;
export type ClassStudentRepository = Repository<ClassStudent>;
export type SessionRepository = Repository<Session>;
export type AttendanceRepository = Repository<Attendance>;
export type LearningRecordRepository = Repository<LearningRecord>;
export type RegistrationRepository = Repository<Registration>;
export type PaymentRepository = Repository<Payment>;
export type SettingsRepository = Repository<Settings>;

export type TutorFlowRepositories = {
  tutors: TutorRepository;
  students: StudentRepository;
  classes: ClassRepository;
  classStudents: ClassStudentRepository;
  sessions: SessionRepository;
  attendance: AttendanceRepository;
  learningRecords: LearningRecordRepository;
  registrations: RegistrationRepository;
  payments: PaymentRepository;
  settings: SettingsRepository;
};
