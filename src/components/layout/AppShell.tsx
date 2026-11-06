import { Outlet, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { Loader2, LogOut, Eye, ShieldAlert } from "lucide-react";
import { Logo, LogoIcon, FacturaOSSplashLoader } from "./Logo";

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
        {simulatedSession && (
          <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-amber-500 px-4 py-2.5 text-xs font-semibold text-amber-950 shadow-md">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-950/20 text-sm">
                🎭
              </span>
              <span>
                <strong>MODO SIMULACIÓN ACTIVO:</strong> Estás viendo el sistema como{" "}
                <strong className="underline underline-offset-2">
                  {simulatedSession.simulatedUser.name}
                </strong>{" "}
                (Rol:{" "}
                <span className="rounded bg-amber-950/15 px-1.5 py-0.5 font-mono uppercase font-bold text-[11px]">
                  {simulatedSession.simulatedUser.role}
                </span>
                ) en la empresa{" "}
                <strong className="underline underline-offset-2">
                  {simulatedSession.simulatedEstablishment.app_name ||
                    simulatedSession.simulatedEstablishment.name}
                </strong>
                .
              </span>
            </div>
            <button
              onClick={() => {
                stopSimulation();
                navigate({ to: "/admin" });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-950 px-3.5 py-1.5 font-bold text-white hover:bg-black transition-colors cursor-pointer shadow-xs text-xs"
            >
              <LogOut className="h-3.5 w-3.5" /> Salir de Simulación y volver al Centro de Mando
            </button>
          </div>
        )}
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
