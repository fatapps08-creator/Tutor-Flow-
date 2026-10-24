import { NextResponse } from "next/server";
import { getStudentsTutorId } from "@/src/features/students/development-tutor";
import { addClassStudent, listClassStudents } from "@/src/features/classes/class-repository";
import { toGoogleSheetsErrorResponse } from "@/src/lib/google-sheets/errors";
export async function GET(){try{return NextResponse.json({classStudents:await listClassStudents(getStudentsTutorId())});}catch(error){return toGoogleSheetsErrorResponse(error);}}
export async function POST(request:Request){try{const body=await request.json();return NextResponse.json({classStudent:await addClassStudent(getStudentsTutorId(),String(body.classId||""),String(body.studentId||""))},{status:201});}catch(error){return toGoogleSheetsErrorResponse(error);}}
