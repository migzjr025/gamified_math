import { requireAuth } from "@/lib/auth";
import GradesInteractive from "@/components/GradesInteractive";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireAuth();
  return <GradesInteractive userName={user.name} role={user.role} />;
}
