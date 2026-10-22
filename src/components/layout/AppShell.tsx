import { Outlet, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { Loader2 } from "lucide-react";
import { Logo, LogoIcon, FacturaOSSplashLoader } from "./Logo";

function AppShellContent() {
  const { isAuthenticated, isLoadingAuth } = useApp();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isLoadingAuth, isAuthenticated, navigate]);

  if (isLoadingAuth) {
    return <FacturaOSSplashLoader message="Cargando panel de control..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AppShell() {
  return <AppShellContent />;
}
