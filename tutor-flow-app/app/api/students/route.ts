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
  try {
    if (!isDevelopmentAuthBypassEnabled()) {
      await requireRole("OWNER", "ADMIN", "TUTOR", "STAFF");
    }
    const tutorId = await getCoreApiTutorId();
    const students = await getStudentsForTutor(tutorId);
    return NextResponse.json({ students });
  } catch (error) {
    logStudentApiError("list", error);
    return toGoogleSheetsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!isDevelopmentAuthBypassEnabled()) {
      await requireRole("OWNER", "ADMIN", "TUTOR", "STAFF");
    }
    const input = parseStudentInput(await readStudentRequestBody(request));
    const student = await createStudentForTutor(await getCoreApiTutorId(), input);
    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    logStudentApiError("create", error);
    return toGoogleSheetsErrorResponse(error);
  }
}

function logStudentApiError(operation: string, error: unknown) {
  const code = error instanceof GoogleSheetsServiceError ? error.code : "UNEXPECTED";
  console.error(`[students-api] ${operation} failed`, { code });
}
