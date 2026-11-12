import { requirePageAdmin } from "@/lib/auth";
import { AdminTabs } from "@/components/admin/AdminControls";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageAdmin();
  return <><AdminTabs />{children}</>;
}
