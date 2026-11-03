import type { Metadata } from "next";
import { AdminLogin } from "@/src/features/admin/admin-panel";

export const metadata: Metadata = { title: "Log masuk admin" };
export default function LoginPage() { return <AdminLogin />; }
