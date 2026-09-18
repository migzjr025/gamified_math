import { requireAuth } from "@/lib/auth";
import StudentsInteractive from "@/components/StudentsInteractive";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireAuth();
  return <StudentsInteractive userName={user.name} role={user.role} />;
}
