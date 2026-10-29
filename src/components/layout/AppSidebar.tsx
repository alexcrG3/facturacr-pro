import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Package,
  BarChart3,
  Settings,
  Sparkles,
  ReceiptText,
  Mail,
  Palette,
  FileText,
  FileMinus,
  Ticket,
  ChevronDown,
  ChevronRight,
  Store,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { type Role } from "@/lib/supabase";

export type SidebarTheme = "corporate" | "white";

interface SubNavItem {
  to: string;
  label: string;
  docType: string;
  icon: any;
  search?: Record<string, string>;
}

interface NavItem {
  to: string;
  label: string;
  icon: any;
  roles?: Role[];
  children?: SubNavItem[];
}

const nav: NavItem[] = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    to: "/app/invoices",
    label: "Facturación",
    icon: ReceiptText,
    children: [
      { to: "/app/invoices", label: "Facturas", docType: "facturas", icon: FileText, search: { docType: "facturas" } },
      { to: "/app/invoices", label: "Notas de crédito o débito", docType: "notas", icon: FileMinus, search: { docType: "notas" } },
      { to: "/app/invoices", label: "Tiquetes electrónicos", docType: "tiquetes", icon: Ticket, search: { docType: "tiquetes" } },
    ],
  },
  { to: "/app/clients", label: "Clientes", icon: Users, roles: ["super_admin", "admin", "contador", "vendedor"] },
  { to: "/app/products", label: "Productos y Servicios", icon: Package, roles: ["super_admin", "admin", "contador", "vendedor"] },
  { to: "/app/cabys", label: "Mis CAByS", icon: Sparkles, roles: ["super_admin", "admin", "contador", "vendedor"] },
  { to: "/app/cajas", label: "Cajas", icon: Store, roles: ["super_admin", "admin", "contador"] },
  { to: "/app/reports", label: "DeclaraHub (D-104)", icon: BarChart3, roles: ["super_admin", "admin", "contador"] },
  { to: "/app/gmail", label: "Descargar de Gmail", icon: Mail, roles: ["super_admin", "admin", "contador"] },
];

const secondary: NavItem[] = [
  { to: "/app/settings", label: "Configuración", icon: Settings, roles: ["super_admin", "admin"] },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isSuperAdmin } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentSearch = useRouterState({ select: (s) => s.location.search }) as any;
  const currentDocType = currentSearch?.docType;

  const [invoicesExpanded, setInvoicesExpanded] = useState(true);

  useEffect(() => {
    if (pathname.startsWith("/app/invoices")) {
      setInvoicesExpanded(true);
    }
  }, [pathname]);

  const allowedNav = nav.filter((item) => !item.roles || item.roles.includes(user.role));
  const allowedSecondary = secondary.filter((item) => !item.roles || item.roles.includes(user.role));
  
  // Tema fijado al Azul Facturio (#0045AC)
  const [theme, setTheme] = useState<SidebarTheme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("facturacr_sidebar_theme") as SidebarTheme;
      if (saved === "corporate" || saved === "white") return saved;
    }
    return "corporate";
  });

  const selectTheme = (newTheme: SidebarTheme) => {
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("facturacr_sidebar_theme", newTheme);
    }
  };

  // Configuración de estilos según el tema
  const styles = {
    corporate: {
      aside: "border-r border-[#003B94] bg-[#0045AC] text-white shadow-xl",
      logoLight: true,
      navSection: "text-blue-100/75 font-semibold tracking-wider",
      activeItem: "bg-white text-[#0045AC] font-bold shadow-sm",
      activeIcon: "text-[#0045AC]",
      activeBar: "bg-white",
      inactiveItem: "text-white/90 hover:bg-white/15 hover:text-white",
      inactiveIcon: "text-blue-200 group-hover:text-white",
      divider: "border-[#003B94]",
      card: "border border-white/20 bg-[#003B94] text-white shadow-sm",
      cardIcon: "bg-white text-[#0045AC] shadow-sm",
      cardText: "text-blue-100",
      cardBtn: "bg-white text-[#0045AC] font-bold hover:bg-blue-50 shadow-sm",
    },
    white: {
      aside: "border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
      logoLight: false,
      navSection: "text-muted-foreground",
      activeItem: "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft",
      activeIcon: "text-primary",
      activeBar: "bg-primary",
      inactiveItem: "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      inactiveIcon: "text-muted-foreground group-hover:text-primary",
      divider: "border-sidebar-border",
      card: "border border-sidebar-border bg-gradient-to-br from-primary-soft to-transparent text-foreground",
      cardIcon: "gradient-primary text-primary-foreground",
      cardText: "text-muted-foreground",
      cardBtn: "bg-primary text-primary-foreground hover:opacity-90",
    },
  }[theme];

  return (
    <aside className={cn("relative flex h-full w-64 flex-col select-none transition-colors duration-200", styles.aside)}>
      {/* Encabezado con Logo */}
      <div className={cn("flex h-16 items-center justify-between px-5 border-b", styles.divider)}>
        <Logo light={styles.logoLight} />
      </div>

      {/* Acceso Directo al Centro de Mando para Super Admin */}
      {isSuperAdmin && (
        <div className="px-3 pt-3 pb-1">
          <Link
            to="/admin"
            onClick={onNavigate}
            className="flex items-center justify-between rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 px-3 py-2 text-xs font-bold text-white transition-all shadow-sm group"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0 group-hover:scale-110 transition-transform" />
              <span>Centro de Mando</span>
            </div>
            <span className="rounded bg-emerald-400/30 px-1.5 py-0.5 text-[9px] font-black text-emerald-200 tracking-wider">
              ADMIN
            </span>
          </Link>
        </div>
      )}

      {/* Navegación Principal */}
      <nav className="flex-1 space-y-1 px-3 py-3">
        <div className={cn("px-3 pb-1 text-[10px] font-bold uppercase tracking-wider", styles.navSection)}>
          Navegación
        </div>
        {allowedNav.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.to);
          const hasChildren = item.children && item.children.length > 0;

          if (hasChildren) {
            return (
              <div key={item.to} className="space-y-1">
                <div
                  className={cn(
                    "group relative flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 cursor-pointer",
                    active && !currentDocType && pathname === item.to
                      ? styles.activeItem
                      : active
                        ? (theme === "corporate" ? "bg-white/15 text-white font-semibold" : "bg-sidebar-accent/50 text-foreground font-semibold")
                        : styles.inactiveItem
                  )}
                  onClick={() => setInvoicesExpanded((prev) => !prev)}
                >
                  <Link
                    to={item.to}
                    search={{ docType: "facturas" } as any}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInvoicesExpanded(true);
                      onNavigate?.();
                    }}
                    className="flex flex-1 items-center gap-3"
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] transition-colors",
                        active && !currentDocType && pathname === item.to
                          ? styles.activeIcon
                          : styles.inactiveIcon
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInvoicesExpanded((prev) => !prev);
                    }}
                    className="rounded p-0.5 hover:bg-white/10"
                    title={invoicesExpanded ? "Contraer submenú" : "Expandir submenú"}
                  >
                    {invoicesExpanded ? (
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    ) : (
                      <ChevronRight className="h-4 w-4 opacity-70" />
                    )}
                  </button>
                </div>

                {invoicesExpanded && (
                  <div className="space-y-0.5 pl-6 pr-1">
                    {item.children!.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive =
                        pathname === "/app/invoices" &&
                        (currentDocType === sub.docType || (!currentDocType && sub.docType === "facturas"));
                      return (
                        <Link
                          key={sub.label}
                          to={sub.to}
                          search={sub.search as any}
                          onClick={onNavigate}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
                            isSubActive
                              ? (theme === "corporate"
                                  ? "bg-white text-[#0045AC] font-bold shadow-sm"
                                  : "bg-primary text-primary-foreground font-bold shadow-xs")
                              : (theme === "corporate"
                                  ? "text-blue-100/80 hover:bg-white/15 hover:text-white"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground")
                          )}
                        >
                          <SubIcon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 transition-colors",
                              isSubActive
                                ? (theme === "corporate" ? "text-[#0045AC]" : "text-primary-foreground")
                                : (theme === "corporate" ? "text-blue-200 group-hover:text-white" : "text-muted-foreground")
                            )}
                          />
                          <span className="truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active ? styles.activeItem : styles.inactiveItem
              )}
            >
              {active && theme === "white" && (
                <span className={cn("absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r", styles.activeBar)} />
              )}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  active ? styles.activeIcon : styles.inactiveIcon
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Menú Secundario (Configuración) */}
      <div className={cn("space-y-1 px-3 pb-3 border-t pt-3", styles.divider)}>
        <div className={cn("px-3 pb-1 text-[10px] font-bold uppercase tracking-wider", styles.navSection)}>
          Ajustes
        </div>
        {allowedSecondary.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active ? styles.activeItem : styles.inactiveItem
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  active ? styles.activeIcon : styles.inactiveIcon
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Tarjeta Plan Pro */}
      <div className={cn("m-3 mt-0 rounded-xl p-4 transition-colors", styles.card)}>
        <div className="mb-1.5 flex items-center gap-2">
          <div className={cn("grid h-7 w-7 place-items-center rounded-lg shadow-sm", styles.cardIcon)}>
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">Plan Pro</span>
        </div>
        <p className={cn("text-xs leading-relaxed", styles.cardText)}>
          Conecta con Hacienda y desbloquea facturación ilimitada.
        </p>
        <button className={cn("mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold transition-all", styles.cardBtn)}>
          Actualizar
        </button>
      </div>
    </aside>
  );
}
