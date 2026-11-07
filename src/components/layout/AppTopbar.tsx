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
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useApp, roleLabel } from "@/contexts/AppContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <header className="flex h-14 sm:h-16 w-full max-w-full items-center justify-between gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-md md:px-6 shrink-0">
      {/* Lado izquierdo: Botón Menú + Selector de Empresa */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          onClick={onMenu}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border hover:bg-muted md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Selector de Negocio / Empresa */}
        {establishments.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex min-w-0 flex-1 max-w-[155px] sm:max-w-xs items-center gap-1.5 sm:gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-950 px-2 sm:px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-all shadow-xs outline-none focus:ring-2 focus:ring-indigo-500/20">
              <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
              <div className="text-left leading-tight truncate min-w-0 flex-1">
                <span className="font-bold text-slate-900 truncate block text-xs">
                  {activeEstablishment?.app_name || activeEstablishment?.name || "FacturaOS"}
                </span>
                {activeEstablishment?.legal_id && (
                  <span className="text-[10px] text-indigo-600 font-mono hidden sm:block font-medium truncate">
                    Cédula: {activeEstablishment.legal_id}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 ml-auto shrink-0">
                <span
                  className="hidden sm:inline-block text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full"
                  title="Sociedades autorizadas"
                >
                  {establishments.length}
                </span>
                <ChevronDown className="h-3 w-3 text-indigo-600 shrink-0" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80 max-w-[90vw] p-2 shadow-xl border-slate-200">
              <DropdownMenuLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between pb-2">
                <span>Tus Sociedades Autorizadas</span>
                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {establishments.length} disponibles
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="space-y-1 mt-1 max-h-[350px] overflow-y-auto">
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
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium max-w-[150px] sm:max-w-[240px] truncate">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-foreground truncate">
              {activeEstablishment?.app_name || activeEstablishment?.name || "FacturaOS"}
            </span>
          </div>
        )}
      </div>

      {/* Lado derecho: Acciones */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Acceso a Centro de Mando (solo Super Admin - en móvil disponible en menú y perfil) */}
        {isSuperAdmin && (
          <Link
            to="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-xs font-bold transition-all shadow-xs"
            title="Centro de Mando (SuperAdmin)"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Centro de Mando</span>
          </Link>
        )}

        {/* Buscador global (solo Desktop) */}
        <div className="relative hidden max-w-xs md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar facturas, clientes…"
            className="h-9 w-44 lg:w-60 rounded-lg border border-border bg-card pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {/* Botón Nueva Factura (oculto en móvil porque BottomNav ya tiene el botón flotante + central) */}
        <Link
          to="/app/invoices/new"
          className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs sm:text-sm font-medium text-primary-foreground shadow-soft transition-all hover:shadow-glow shrink-0"
          title="Nueva factura"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Nueva factura</span>
        </Link>

        {/* Modo Oscuro / Claro (en móvil accesible desde el menú del perfil) */}
        <button
          onClick={toggleTheme}
          className="hidden sm:grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted shrink-0"
          aria-label="Cambiar tema"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        {/* Notificaciones */}
        <button
          className="relative grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted shrink-0"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </button>

        {/* Perfil de Usuario */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border bg-card p-1 sm:pr-3 hover:bg-muted shrink-0">
            <div className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-md gradient-primary text-xs font-semibold text-primary-foreground shrink-0">
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
              <div className="text-xs font-normal text-muted-foreground truncate">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/app/settings" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Mi perfil
              </Link>
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
              <Link to="/app/settings" className="cursor-pointer">
                <Building2 className="mr-2 h-4 w-4" />
                Configuración
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme} className="sm:hidden cursor-pointer">
              {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
              Modo {theme === "light" ? "oscuro" : "claro"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
