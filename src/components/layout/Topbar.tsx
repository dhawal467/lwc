import { User, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export async function Topbar() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role === 'admin') {
      isAdmin = true;
    }
  }

  return (
    <header className="sticky top-0 z-40 h-16 bg-surface/50 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center">
        {/* We will route the dynamic page title here later, using "FurnitureMFG" on mobile and the Page Name on Desktop */}
        <h2 className="font-display font-semibold text-lg lg:text-xl text-text-primary">
          <span className="lg:hidden text-primary font-bold mr-2">FurnitureMFG</span>
          <span className="hidden lg:inline text-text-secondary">Dashboard</span>
        </h2>
      </div>
      <div className="flex items-center gap-3">
        {isAdmin && (
          <a href="/api/export">
            <Button variant="secondary" size="sm" className="hidden sm:flex gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </a>
        )}

        {/* Placeholder for Theme Toggle */}
        <button className="w-8 h-8 rounded-full bg-surface-raised border border-border flex items-center justify-center hover:bg-border transition-colors">
          <span className="text-xs">🌓</span>
        </button>
        
        {/* User Avatar Placeholder */}
        <div className="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center overflow-hidden">
          <User className="w-5 h-5" />
        </div>
      </div>
    </header>
  );
}
