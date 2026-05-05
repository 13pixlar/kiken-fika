import { redirect } from "next/navigation";
import { getParentsWithSignups } from "@/src/lib/admin-parents";
import { AdminPageClient } from "@/src/components/admin-page-client";
import { getSession } from "@/src/lib/auth";
import { getAppConfig } from "@/src/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session.isAdmin) {
    redirect("/admin/login");
  }

  const [parentRows, settings] = await Promise.all([
    getParentsWithSignups(),
    getAppConfig(),
  ]);

  return <AdminPageClient initialParents={parentRows} initialSettings={settings} />;
}
