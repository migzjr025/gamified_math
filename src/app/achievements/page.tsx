import { requireAuth } from "@/lib/auth";
import AchievementsInteractive from "@/components/AchievementsInteractive";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireAuth();
  return <AchievementsInteractive userName={user.name} role={user.role} />;
}
