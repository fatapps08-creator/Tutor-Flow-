import type { Class, ClassStudent, ClassStatus } from "@/src/types";

export type ClassInput = Pick<Class, "className" | "subject" | "description" | "status">;
let snapshot = { classes: [] as Class[], classStudents: [] as ClassStudent[] };
const listeners = new Set<() => void>();
function notify() { listeners.forEach((listener) => listener()); }
async function request<T>(url: string, init?: RequestInit): Promise<T> { const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } }); const body = await response.json(); if (!response.ok) throw new Error(body?.error?.message ?? "Request failed."); return body; }
export function subscribeToClasses(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getClassesSnapshot() { return snapshot; }
export function getClassesServerSnapshot() { return snapshot; }
export async function loadClasses() { const [classesBody, membershipsBody] = await Promise.all([request<{ classes: Class[] }>("/api/classes"), request<{ classStudents: ClassStudent[] }>("/api/class-students")]); snapshot = { classes: classesBody.classes, classStudents: membershipsBody.classStudents }; notify(); }
export async function createClass(input: ClassInput) { const body = await request<{ class: Class }>("/api/classes", { method: "POST", body: JSON.stringify(input) }); snapshot = { ...snapshot, classes: [body.class, ...snapshot.classes] }; notify(); return body.class; }
export async function updateClass(id: string, input: ClassInput) { const body = await request<{ class: Class }>(`/api/classes/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); snapshot = { ...snapshot, classes: snapshot.classes.map((item) => item.id === id ? body.class : item) }; notify(); return body.class; }
export async function updateClassStatus(id: string, status: ClassStatus) { const body = await request<{ class: Class }>(`/api/classes/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }); snapshot = { ...snapshot, classes: snapshot.classes.map((item) => item.id === id ? body.class : item) }; notify(); }
export async function addStudentToClass(classId: string, studentId: string) { const body = await request<{ classStudent: ClassStudent }>("/api/class-students", { method: "POST", body: JSON.stringify({ classId, studentId }) }); snapshot = { ...snapshot, classStudents: [...snapshot.classStudents.filter((item) => item.id !== body.classStudent.id), body.classStudent] }; notify(); return "added" as const; }
export async function removeStudentFromClass(id: string) { const body = await request<{ classStudent: ClassStudent }>(`/api/class-students/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status: "inactive" }) }); snapshot = { ...snapshot, classStudents: snapshot.classStudents.map((item) => item.id === id ? body.classStudent : item) }; notify(); }
