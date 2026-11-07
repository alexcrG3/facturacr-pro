import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ReceiptText, Plus, Users, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onOpenMenu: () => void;
}

export function BottomNav({ onOpenMenu }: BottomNavProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (path: string) => {
    if (path === "/app/dashboard") return pathname === "/app/dashboard";
    return pathname.startsWith(path);
  };

  return (
    <nav
      aria-label="Navegación móvil inferior"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 border-t border-border backdrop-blur-lg shadow-lg safe-area-pb"
    >
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {/* 1. Dashboard */}
        <Link
          to="/app/dashboard"
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
            isActive("/app/dashboard")
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="truncate">Inicio</span>
        </Link>

        {/* 2. Facturas */}
        <Link
          to="/app/invoices"
          search={{ docType: "facturas" } as any}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
            isActive("/app/invoices") && !isActive("/app/invoices/new")
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ReceiptText className="h-5 w-5" />
          <span className="truncate">Facturas</span>
        </Link>

        {/* 3. Botón Central Destacado: NUEVA FACTURA */}
        <div className="flex items-center justify-center -mt-5">
          <Link
            to="/app/invoices/new"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform hover:bg-primary/90"
            title="Emitir nueva factura electrónica"
            aria-label="Nueva factura"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </Link>
        </div>

        {/* 4. Clientes */}
        <Link
          to="/app/clients"
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
            isActive("/app/clients")
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="h-5 w-5" />
          <span className="truncate">Clientes</span>
        </Link>

        {/* 5. Menú Lateral (Drawer) */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-colors"
          aria-label="Abrir menú completo"
        >
          <Menu className="h-5 w-5" />
          <span className="truncate">Menú</span>
        </button>
      </div>
    </nav>
  );
}
