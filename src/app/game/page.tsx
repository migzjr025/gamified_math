import { requireAuth } from "@/lib/auth";
import GameInteractive from "@/components/GameInteractive";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireAuth();
  return <GameInteractive userName={user.name} role={user.role} />;
}
