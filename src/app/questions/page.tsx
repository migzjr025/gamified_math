import { requireAuth } from "@/lib/auth";
import QuestionsInteractive from "@/components/QuestionsInteractive";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireAuth();
  return <QuestionsInteractive userName={user.name} role={user.role} />;
}
