import type { ClassInput } from "@/src/features/classes/class-service";

export type ClassFormValues = ClassInput;
export type ClassFormErrors = Partial<Record<"className" | "subject", string>>;

export function validateClassForm(values: ClassFormValues): ClassFormErrors {
  const errors: ClassFormErrors = {};
  if (!values.className.trim()) errors.className = "classNameRequired";
  if (!values.subject.trim()) errors.subject = "classSubjectRequired";
  return errors;
}

export function toClassInput(values: ClassFormValues): ClassInput {
  return {
    className: values.className.trim(),
    subject: values.subject.trim(),
    description: values.description?.trim() || undefined,
    status: values.status,
  };
}
