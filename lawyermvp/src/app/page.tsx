import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";

export default function HomePage() {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;

  if (!sessionSecret || sessionCookie !== sessionSecret) {
    redirect("/login");
  }

  return <DashboardClient />;
}
