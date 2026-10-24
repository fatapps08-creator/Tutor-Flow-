import { NextResponse } from "next/server";
import { requireCurrentTutor } from "@/src/lib/identity/server";
import { getClassStudentsForTutor, addClassStudentForTutor } from "@/src/features/classes/class-repository";
import { toGoogleSheetsErrorResponse } from "@/src/lib/google-sheets/errors";

export async function GET(request: Request) { try { const tutor = await requireCurrentTutor(); const classId = new URL(request.url).searchParams.get("classId") ?? undefined; return NextResponse.json({ classStudents: await getClassStudentsForTutor(tutor.tutorId, classId) }); } catch (error) { return toGoogleSheetsErrorResponse(error); } }
export async function POST(request: Request) { try { const tutor = await requireCurrentTutor(); const { classId, studentId } = await request.json(); return NextResponse.json({ classStudent: await addClassStudentForTutor(tutor.tutorId, classId, studentId) }, { status: 201 }); } catch (error) { return toGoogleSheetsErrorResponse(error); } }
