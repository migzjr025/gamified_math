import { requireAdmin } from "@/lib/auth";
import SidebarNav from "@/components/SidebarNav";
import AdminUsersInteractive from "@/components/AdminUsersInteractive";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <SidebarNav userName={user.name} role={user.role} />
      <main className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <AdminUsersInteractive currentUser={user} />
        </div>
      </main>
    </div>
  );
}
