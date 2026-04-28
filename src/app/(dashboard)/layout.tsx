import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav, MobileDrawer, MobileDrawerProvider } from "@/components/layout/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileDrawerProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex flex-col lg:ml-64 min-h-screen">
          <Topbar />
          <main className="flex-1 p-4 md:p-8 pb-24 lg:pb-8">
            {children}
          </main>
        </div>
        {/* Mobile: bottom tab bar */}
        <MobileNav />
        {/* Mobile: full-screen nav drawer */}
        <MobileDrawer />
      </div>
    </MobileDrawerProvider>
  );
}
