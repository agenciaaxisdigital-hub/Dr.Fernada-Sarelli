import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Image, FileText, Settings, LogOut, Menu, X, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/admin/galeria", icon: Image, label: "Galeria" },
  { to: "/admin/formularios", icon: FileText, label: "Formulários" },
  { to: "/admin/configuracoes", icon: Settings, label: "Configurações" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-secondary">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:w-64 flex-col border-r bg-card">
        <div className="p-6 border-b">
          <h1 className="text-lg font-bold text-primary">Painel Admin</h1>
          <p className="text-sm font-medium mt-1">{user?.nome}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
                {active && <ChevronRight className="ml-auto h-4 w-4" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <Button variant="outline" size="sm" onClick={handleLogout} className="w-full rounded-full">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card px-4">
          <h1 className="text-sm font-bold text-primary">Painel Admin</h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
            <div className="w-64 h-full bg-card border-r p-4 space-y-1" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 pb-4 border-b">
              <p className="text-sm font-medium">{user?.nome}</p>
            </div>
            {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    location.pathname === item.to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t mt-4">
                <Button variant="outline" size="sm" onClick={handleLogout} className="w-full rounded-full">
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </Button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
