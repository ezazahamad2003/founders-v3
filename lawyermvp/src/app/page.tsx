import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";

export default function HomePage() {
  const secret = process.env.ADMIN_PASSWORD || process.env.ADMIN_SESSION_SECRET;
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;

  if (!secret || sessionCookie !== secret) {
    redirect("/login");
  }

  return <DashboardClient />;
}
