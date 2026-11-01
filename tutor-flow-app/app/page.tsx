import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/features/auth/session";
import {
  getTenantContextForUser,
  TenantContextUnavailableError,
} from "@/src/features/authorization/tenant-context";

export const instant = false;

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  try {
    getTenantContextForUser(user);
  } catch (error) {
    if (!(error instanceof TenantContextUnavailableError)) throw error;
    redirect("/login?error=tenant-unavailable");
  }

  redirect("/dashboard");
}
