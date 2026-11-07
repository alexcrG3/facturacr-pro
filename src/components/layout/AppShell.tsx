import { Outlet, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { BottomNav } from "./BottomNav";
import { useApp } from "@/contexts/AppContext";
import { LogOut } from "lucide-react";
import { FacturaOSSplashLoader } from "./Logo";

function AppShellContent() {
  const { isAuthenticated, isLoadingAuth, simulatedSession, stopSimulation } = useApp();
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
    <div className="flex min-h-screen w-full max-w-full overflow-x-clip bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block shrink-0">
        <AppSidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden max-w-[85vw] shadow-2xl">
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <div className="flex min-w-0 max-w-full flex-1 flex-col">
        {/* Encabezado fijo superior / Appbar - FIJO en móvil y sticky en desktop */}
        <div className="fixed md:sticky top-0 left-0 right-0 md:left-auto md:right-auto z-40 w-full bg-background/95 backdrop-blur-md shadow-xs">
          {simulatedSession && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 shadow-md">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-950/20 text-sm">
                  🎭
                </span>
                <span className="truncate">
                  <strong>MODO SIMULACIÓN:</strong> {simulatedSession.simulatedUser.name} ({simulatedSession.simulatedUser.role})
                </span>
              </div>
              <button
                onClick={() => {
                  stopSimulation();
                  navigate({ to: "/admin" });
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-950 px-2.5 py-1 font-bold text-white hover:bg-black transition-colors cursor-pointer text-xs"
              >
                <LogOut className="h-3 w-3" />
                <span>Salir</span>
              </button>
            </div>
          )}

          <AppTopbar onMenu={() => setMobileOpen(true)} />
        </div>

        <main className="flex-1 w-full min-w-0 max-w-full px-3 pt-18 sm:pt-20 md:pt-6 pb-24 md:pb-8 overflow-x-hidden">
          <Outlet />
        </main>

        {/* Barra de Navegación Móvil Inferior (Estilo PWA Nativa) */}
        <BottomNav onOpenMenu={() => setMobileOpen(true)} />
      </div>
    </div>
  );
}

export function AppShell() {
  return <AppShellContent />;
}
