import {
  Search,
  Bell,
  Moon,
  Sun,
  Plus,
  ChevronDown,
  Menu,
  LogOut,
  User,
  Building2,
  Check,
} from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useApp, roleLabel } from "@/contexts/AppContext";
import { company } from "@/lib/mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function AppTopbar({ onMenu }: { onMenu: () => void }) {
  const {
    user,
    establishments,
    activeEstablishment,
    setActiveEstablishment,
    isSuperAdmin,
    theme,
    toggleTheme,
    logout,
  } = useApp();
  const [q, setQ] = useState("");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <button
        onClick={onMenu}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border md:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Empresa / Negocio en operación con selector para clientes con múltiples sociedades */}
      {establishments.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-950 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all shadow-xs outline-none focus:ring-2 focus:ring-indigo-500/20">
            <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
            <div className="text-left leading-tight">
              <span className="font-bold text-slate-900 truncate max-w-[190px] block">
                {activeEstablishment?.app_name || activeEstablishment?.name || "FacturaOS"}
              </span>
              {activeEstablishment?.legal_id && (
                <span className="text-[10px] text-indigo-600 font-mono block font-medium">
                  Cédula: {activeEstablishment.legal_id}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 ml-1 shrink-0">
              <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full" title="Sociedades autorizadas">
                {establishments.length}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-indigo-600" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80 p-2 shadow-xl border-slate-200">
            <DropdownMenuLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between pb-2">
              <span>Tus Sociedades Autorizadas</span>
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {establishments.length} disponibles
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-1 mt-1">
              {establishments.map((est) => {
                const isSelected = est.id === activeEstablishment?.id;
                return (
                  <DropdownMenuItem
                    key={est.id}
                    onClick={() => {
                      setActiveEstablishment(est);
                      toast.success(`Cambiando a: ${est.app_name || est.name}`);
                    }}
                    className={`flex items-center justify-between cursor-pointer p-2.5 rounded-xl transition-all ${
                      isSelected
                        ? "bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="truncate mr-2 min-w-0">
                      <p className="text-xs truncate font-bold text-slate-900">
                        {est.app_name || est.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Cédula: <strong className="text-slate-700">{est.legal_id}</strong>
                      </p>
                    </div>
                    {isSelected ? (
                      <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                        <Check className="h-3.5 w-3.5" /> Activa
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-semibold text-slate-400 hover:text-indigo-600 border border-slate-200 px-2 py-0.5 rounded-md">
                        Cambiar
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium md:flex">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground truncate max-w-[200px]">
            {activeEstablishment?.app_name || activeEstablishment?.name || "FacturaOS"}
          </span>
          {activeEstablishment?.legal_id && (
            <span className="text-[10px] text-muted-foreground font-mono">
              ({activeEstablishment.legal_id})
            </span>
          )}
        </div>
      )}

      {/* Botón para volver al Centro de Mando (solo si es SuperAdmin) */}
      {isSuperAdmin && (
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-xs font-bold transition-all shadow-xs"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Centro de Mando</span>
        </Link>
      )}

      <div className="relative ml-auto hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar facturas, clientes, productos…"
          className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-16 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <Link
        to="/app/invoices/new"
        className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:shadow-glow md:ml-0"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Nueva factura</span>
      </Link>

      <button
        onClick={toggleTheme}
        className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-muted"
        aria-label="Cambiar tema"
      >
        {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>

      <button
        className="relative grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-muted"
        aria-label="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border bg-card p-1 pr-3 hover:bg-muted">
          <div className="grid h-8 w-8 place-items-center rounded-md gradient-primary text-xs font-semibold text-primary-foreground">
            {user.initials}
          </div>
          <div className="hidden text-left lg:block">
            <div className="text-xs font-medium leading-tight">{user.name}</div>
            <div className="text-[10px] text-muted-foreground">{roleLabel[user.role]}</div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            Mi perfil
          </DropdownMenuItem>
          {isSuperAdmin && (
            <DropdownMenuItem asChild>
              <Link to="/admin" className="cursor-pointer font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Centro de Mando
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link to="/app/settings">
              <Building2 className="mr-2 h-4 w-4" />
              Configuración
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
