import { NextResponse } from "next/server";
import {
  GoogleSheetsServiceError,
  toGoogleSheetsErrorResponse,
} from "@/src/lib/google-sheets/errors";
import { getCoreApiTutorId } from "@/src/features/students/development-tutor";
import { isDevelopmentAuthBypassEnabled } from "@/src/features/auth/config";
import { requireRole } from "@/src/features/authorization/role-authorization";
import {
  createStudentForTutor,
  getStudentsForTutor,
} from "@/src/features/students/student-repository";
import {
  parseStudentInput,
  readStudentRequestBody,
} from "@/src/features/students/student-api-validation";

export async function GET() {
  let tutorId: string | undefined;
  try {
    if (!isDevelopmentAuthBypassEnabled()) {
      await requireRole("OWNER", "ADMIN", "TUTOR", "STAFF");
    }
    tutorId = await getCoreApiTutorId();
    const students = await getStudentsForTutor(tutorId);
    return NextResponse.json({ students });
  } catch (error) {
    logStudentApiError("list", error, tutorId);
    return toGoogleSheetsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  let tutorId: string | undefined;
  try {
    if (!isDevelopmentAuthBypassEnabled()) {
      await requireRole("OWNER", "ADMIN", "TUTOR", "STAFF");
    }
    const input = parseStudentInput(await readStudentRequestBody(request));
    tutorId = await getCoreApiTutorId();
    const student = await createStudentForTutor(tutorId, input);
    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    logStudentApiError("create", error, tutorId);
    return toGoogleSheetsErrorResponse(error);
  }
}

function logStudentApiError(operation: string, error: unknown, tutorId?: string) {
  const code = error instanceof GoogleSheetsServiceError ? error.code : "UNEXPECTED";
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[students-api] ${operation} failed`, { code, message, tutorId });
}
