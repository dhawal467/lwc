import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col lg:ml-64 min-h-screen">
        <Topbar />
        <main className="flex-1 p-4 md:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
