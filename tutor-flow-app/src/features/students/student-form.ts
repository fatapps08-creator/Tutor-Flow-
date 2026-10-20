import type { Student, StudentStatus } from "@/src/types";
import type { StudentContactDetails } from "@/src/features/students/mock-data";

export type StudentFormValues = {
  fullName: string;
  guardianName: string;
  guardianPhone: string;
  email: string;
  dateOfBirth: string;
  address: string;
  subjects: string;
  gradeOrLevel: string;
  notes: string;
  status: StudentStatus;
};

export type StudentFormErrors = Partial<Record<keyof StudentFormValues, string>>;

export type StudentFormSubmission = {
  student: Student;
  contact: StudentContactDetails;
};

export function validateStudentForm(values: StudentFormValues): StudentFormErrors {
  const errors: StudentFormErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = "required";
  }

  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "invalidEmail";
  }

  if (values.dateOfBirth && values.dateOfBirth > new Date().toISOString().slice(0, 10)) {
    errors.dateOfBirth = "futureDate";
  }

  return errors;
}

export function toStudentSubmission(
  values: StudentFormValues,
  existing?: Student,
): StudentFormSubmission {
  const subjects = values.subjects
    .split(",")
    .map((subject) => subject.trim())
    .filter(Boolean);

  return {
    student: {
      id: existing?.id ?? `student-${crypto.randomUUID()}`,
      tutorId: existing?.tutorId ?? "tutor-demo",
      fullName: values.fullName.trim(),
      subjects,
      ...(values.gradeOrLevel.trim() && { gradeOrLevel: values.gradeOrLevel.trim() }),
      ...(values.guardianName.trim() && { guardianName: values.guardianName.trim() }),
      ...(values.guardianPhone.trim() && { guardianPhone: values.guardianPhone.trim() }),
      status: values.status,
      joinedDate: existing?.joinedDate ?? new Date().toISOString().slice(0, 10),
      ...(values.notes.trim() && { notes: values.notes.trim() }),
    },
    contact: {
      email: values.email.trim(),
      dateOfBirth: values.dateOfBirth,
      address: values.address.trim(),
    },
  };
}
