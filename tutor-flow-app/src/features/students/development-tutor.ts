import "server-only";

import { requireCurrentTutor } from "@/src/lib/identity/server";

export async function getStudentsTutorId() {
  const tutor = await requireCurrentTutor();
  return tutor.tutorId;
}
