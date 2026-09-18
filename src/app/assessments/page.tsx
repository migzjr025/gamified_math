import { requireAuth } from "@/lib/auth";
import AssessmentsInteractive from "@/components/AssessmentsInteractive";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireAuth();
  return <AssessmentsInteractive userName={user.name} role={user.role} />;
}
