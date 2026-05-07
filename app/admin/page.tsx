import { redirect } from "next/navigation";
import { listAdminUsersPublic } from "@/src/lib/admin";
import { getParentsWithSignups } from "@/src/lib/admin-parents";
import { getAdminGamesWithSignups } from "@/src/lib/admin-games";
import { AdminPageClient } from "@/src/components/admin-page-client";
import { getSession } from "@/src/lib/auth";
import { getAppConfig } from "@/src/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session.isAdmin) {
    redirect("/admin/login");
  }

  const [parentRows, settings, gameRows, admins] = await Promise.all([
    getParentsWithSignups(),
    getAppConfig(),
    getAdminGamesWithSignups(),
    listAdminUsersPublic(),
  ]);

  return (
    <AdminPageClient
      initialParents={parentRows}
      initialSettings={settings}
      initialGames={gameRows}
      initialAdmins={admins}
      sessionUsername={session.username ?? ""}
    />
  );
}
