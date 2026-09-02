import { Dashboard } from "@/components/Dashboard";
import { LandingPage } from "@/app/landing/LandingPage";
import { getSessionUser } from "@/lib/session";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) return <LandingPage />;
  return <Dashboard userEmail={user.email} />;
}
