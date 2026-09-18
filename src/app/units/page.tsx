import { requireAuth } from "@/lib/auth";
import UnitsInteractive from "@/components/UnitsInteractive";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireAuth();
  return <UnitsInteractive userName={user.name} role={user.role} />;
}
