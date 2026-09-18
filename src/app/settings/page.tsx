import { requireAuth } from "@/lib/auth";
import SettingsInteractive from "@/components/SettingsInteractive";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <SettingsInteractive
      initialUser={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        grade: user.grade,
      }}
    />
  );
}
