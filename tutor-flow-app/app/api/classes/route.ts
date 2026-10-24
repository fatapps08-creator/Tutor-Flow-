import { NextResponse } from "next/server";
import { getStudentsTutorId } from "@/src/features/students/development-tutor";
import { listClasses, createClass } from "@/src/features/classes/class-repository";
import { toGoogleSheetsErrorResponse } from "@/src/lib/google-sheets/errors";
export async function GET(){try{return NextResponse.json({classes:await listClasses(getStudentsTutorId())});}catch(error){return toGoogleSheetsErrorResponse(error);}}
export async function POST(request:Request){try{return NextResponse.json({class:await createClass(getStudentsTutorId(),await request.json())},{status:201});}catch(error){return toGoogleSheetsErrorResponse(error);}}
