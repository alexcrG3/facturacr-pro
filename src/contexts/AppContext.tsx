import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { company, type Branch } from "@/lib/mock-data";
import { supabase, type Role } from "@/lib/supabase";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

export type { Role };

export interface EstablishmentRecord {
  id: string;
  code: string;
  name: string;
  legal_id: string;
  legal_id_type: string;
  economic_activity_code: string;
  email?: string;
  phone?: string;
  address?: string;
  atv_username?: string;
  atv_password?: string;
  atv_pin?: string;
  atv_environment?: string;
  is_active?: boolean;
  p12_base64?: string;
  api_key?: string;
  app_name?: string;
}

export type User = {
  id?: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
  establishment_id?: string | null;
};

type AppState = {
  user: User;
  authUser: SupabaseAuthUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  branch: Branch;
  setBranch: (b: Branch) => void;
  establishments: EstablishmentRecord[];
  activeEstablishment: EstablishmentRecord | null;
  setActiveEstablishment: (est: EstablishmentRecord) => void;
  loadEstablishments: () => Promise<void>;
  isSuperAdmin: boolean;
  theme: "light" | "dark";
  toggleTheme: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const defaultUser: User = {
  name: "Usuario",
  email: "",
  role: "admin",
  initials: "US",
};

const Ctx = createContext<AppState | null>(null);

function getInitials(nameOrEmail: string): string {
  if (!nameOrEmail) return "US";
  const clean = nameOrEmail.trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<SupabaseAuthUser | null>(null);
  const [user, setUser] = useState<User>(defaultUser);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [branch, setBranch] = useState<Branch>(company.branches[0]);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [establishments, setEstablishments] = useState<EstablishmentRecord[]>([]);
  const [activeEstablishment, setActiveEstablishmentState] = useState<EstablishmentRecord | null>(null);

  const isSuperAdmin =
    user.role === "super_admin" || (user.email?.toLowerCase().trim() === "alex@mail.com" && user.role !== "vendedor" && user.role !== "cajero");

  const resolveActiveEstablishment = (
    estData: EstablishmentRecord[],
    currentUserEmail?: string,
    currentUserRole?: Role,
    overrideEstId?: string | null,
    overrideAllowedIds?: string[]
  ): EstablishmentRecord | null => {
    if (!estData || estData.length === 0) return null;

    const email = (currentUserEmail || user.email || "").toLowerCase().trim();
    const role = currentUserRole || user.role;
    const isSuper = role === "super_admin" || role === "contador" || email === "alex@mail.com";
    const estId = overrideEstId !== undefined ? overrideEstId : user.establishment_id;
    const allowedIds: string[] = overrideAllowedIds || (authUser as any)?.user_metadata?.allowed_establishment_ids || [];

    // 0. Si viene en la URL (?est= o ?app=) y el usuario es super_admin o tiene permiso
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const paramEst = urlParams?.get("est") || urlParams?.get("app");
    if (paramEst) {
      const matchParam = estData.find((e: any) => e.code === paramEst || e.id === paramEst);
      if (matchParam && (isSuper || allowedIds.includes(matchParam.id) || matchParam.id === estId)) {
        if (typeof window !== "undefined") {
          localStorage.setItem("facturaos_active_est_id", matchParam.id);
        }
        return matchParam;
      }
    }

    // 1. Si es inquilino (no super_admin ni contador), anclarlo ESTRICTAMENTE a sus empresas autorizadas
    if (!isSuper) {
      const savedId = typeof window !== "undefined" ? localStorage.getItem("facturaos_active_est_id") : null;

      // Si tiene varias empresas y había una guardada en sesión que está autorizada
      if (savedId && allowedIds.includes(savedId)) {
        const directMatch = estData.find((e) => e.id === savedId);
        if (directMatch) return directMatch;
      }

      // Prioridad 1: establishment_id explícito en la base de datos (profiles.establishment_id)
      if (estId) {
        const directMatch = estData.find((e) => e.id === estId);
        if (directMatch) {
          if (typeof window !== "undefined") {
            localStorage.setItem("facturaos_active_est_id", directMatch.id);
          }
          return directMatch;
        }
      }

      // Prioridad 2: primera de las empresas autorizadas
      if (allowedIds.length > 0) {
        const firstAllowed = estData.find((e) => allowedIds.includes(e.id));
        if (firstAllowed) {
          if (typeof window !== "undefined") {
            localStorage.setItem("facturaos_active_est_id", firstAllowed.id);
          }
          return firstAllowed;
        }
      }

      // Prioridad 3: metadata explícita de autenticación
      const metaEstId = (authUser as any)?.user_metadata?.establishment_id;
      if (metaEstId) {
        const directMatch = estData.find((e) => e.id === metaEstId);
        if (directMatch) {
          if (typeof window !== "undefined") {
            localStorage.setItem("facturaos_active_est_id", directMatch.id);
          }
          return directMatch;
        }
      }

      // Prioridad 4: coincidencia exacta por correo de la empresa
      if (email) {
        const matched = estData.find((e) => e.email?.toLowerCase().trim() === email);
        if (matched) {
          if (typeof window !== "undefined") {
            localStorage.setItem("facturaos_active_est_id", matched.id);
          }
          return matched;
        }
      }
    }

    // 2. Si es super_admin (o fallback si no se encontró match de inquilino)
    const savedId = typeof window !== "undefined" ? localStorage.getItem("facturaos_active_est_id") : null;

    const found =
      (paramEst ? estData.find((e: any) => e.code === paramEst || e.id === paramEst) : null) ||
      (savedId ? estData.find((e: any) => e.id === savedId) : null) ||
      estData[0];

    if (found && typeof window !== "undefined") {
      localStorage.setItem("facturaos_active_est_id", found.id);
    }
    return found || null;
  };

  const loadEstablishments = async (
    overrideEmail?: string,
    overrideRole?: Role,
    overrideEstId?: string | null,
    overrideAllowedIds?: string[]
  ) => {
    try {
      const { data: estData, error } = await supabase
        .from("establishments")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (estData && estData.length > 0) {
        const role = overrideRole || user.role;
        const email = (overrideEmail || user.email || "").toLowerCase().trim();
        const isSuper = role === "super_admin" || role === "contador" || email === "alex@mail.com";
        const allowedIds: string[] =
          overrideAllowedIds !== undefined
            ? overrideAllowedIds
            : (authUser as any)?.user_metadata?.allowed_establishment_ids || [];
        const userEstId = overrideEstId !== undefined ? overrideEstId : user.establishment_id;

        // Filtrar establecimientos autorizados para el usuario
        const filteredEsts = isSuper
          ? estData
          : estData.filter((e) => {
              if (allowedIds.length > 0) return allowedIds.includes(e.id);
              if (userEstId) return e.id === userEstId;
              if (email) return e.email?.toLowerCase().trim() === email;
              return false;
            });

        setEstablishments(filteredEsts.length > 0 ? filteredEsts : estData);
        const resolved = resolveActiveEstablishment(estData, overrideEmail, overrideRole, overrideEstId, allowedIds);
        if (resolved) {
          setActiveEstablishmentState(resolved);
        }
      }
    } catch (err) {
      console.error("Error cargando establecimientos:", err);
    }
  };

  const setActiveEstablishment = (est: EstablishmentRecord) => {
    // Protección multi-tenant: si NO es super_admin ni contador, verificar que esté en sus empresas autorizadas
    const isAuditorOrSuper = isSuperAdmin || user.role === "contador";
    const allowedIds: string[] = (authUser as any)?.user_metadata?.allowed_establishment_ids || [];
    const isAllowed =
      isAuditorOrSuper ||
      allowedIds.length === 0 ||
      allowedIds.includes(est.id) ||
      (user.establishment_id && est.id === user.establishment_id);

    if (!isAllowed) {
      console.warn("Acceso denegado: el usuario no tiene permisos para conmutar a esta empresa");
      return;
    }
    setActiveEstablishmentState(est);
    if (typeof window !== "undefined") {
      localStorage.setItem("facturaos_active_est_id", est.id);
    }
  };

  useEffect(() => {
    loadEstablishments();
  }, []);

  const loadUserProfile = async (sbUser: SupabaseAuthUser) => {
    try {
      // 1. Siempre consultar a Supabase Auth para obtener metadata fresca (allowed_establishment_ids)
      let activeUser = sbUser;
      try {
        const { data: freshUserResp } = await supabase.auth.getUser();
        if (freshUserResp?.user) {
          activeUser = freshUserResp.user;
          setAuthUser(freshUserResp.user);
        }
      } catch (e) {
        console.warn("getUser fallback:", e);
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", activeUser.id)
        .maybeSingle();

      const userEmail = profile?.email || activeUser.email || "";
      const role = ((profile?.role || activeUser.user_metadata?.role) as Role) || "admin";
      const name = profile?.full_name || activeUser.user_metadata?.full_name || userEmail.split("@")[0] || "Usuario";
      const establishment_id = profile?.establishment_id || (activeUser as any)?.user_metadata?.establishment_id || null;
      const allowedIds: string[] = (activeUser as any)?.user_metadata?.allowed_establishment_ids || [];

      if (!profile && !error) {
        await supabase.from("profiles").upsert({
          id: activeUser.id,
          email: userEmail,
          full_name: name,
          role,
          establishment_id,
        });
      }

      setUser({
        id: activeUser.id,
        name,
        email: userEmail,
        role,
        initials: getInitials(name),
        establishment_id,
      });

      // Refrescar y alinear establecimiento activo pasando explícitamente allowedIds frescos
      await loadEstablishments(userEmail, role, establishment_id, allowedIds);
    } catch (err) {
      console.error("Error cargando perfil de usuario:", err);
      const name = sbUser.email?.split("@")[0] || "Usuario";
      const fallbackEmail = sbUser.email || "";
      setUser({
        id: sbUser.id,
        name,
        email: fallbackEmail,
        role: "admin",
        initials: getInitials(name),
        establishment_id: null,
      });
      await loadEstablishments(fallbackEmail, "admin", null);
    }
  };

  const refreshProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const targetId = session?.user?.id || user.id;
      if (targetId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", targetId)
          .maybeSingle();

        if (profile) {
          const name = profile.full_name || "Usuario";
          const role = (profile.role as Role) || "admin";
          const establishment_id = profile.establishment_id || null;
          setUser({
            id: profile.id,
            name,
            email: profile.email || "",
            role,
            initials: getInitials(name),
            establishment_id,
          });
          return;
        }
      }
      if (authUser) {
        await loadUserProfile(authUser);
      }
    } catch (err) {
      console.error("Error al refrescar perfil:", err);
    }
  };

  useEffect(() => {
    // 1. Verificar sesión activa inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user);
        loadUserProfile(session.user).finally(() => {
          setIsLoadingAuth(false);
        });
      } else {
        setAuthUser(null);
        setIsLoadingAuth(false);
      }
    });

    // 2. Suscribirse a cambios de estado de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        await loadUserProfile(session.user);
      } else {
        setAuthUser(null);
        setUser(defaultUser);
      }
      setIsLoadingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("facturio-theme") : null;
    if (stored === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("facturio-theme", next);
      return next;
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setUser(defaultUser);
    setActiveEstablishmentState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("facturaos_active_est_id");
      window.location.href = "/login";
    }
  };

  return (
    <Ctx.Provider
      value={{
        user,
        authUser,
        isAuthenticated: !!authUser,
        isLoadingAuth,
        branch,
        setBranch,
        establishments,
        activeEstablishment,
        setActiveEstablishment,
        loadEstablishments,
        isSuperAdmin,
        theme,
        toggleTheme,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be inside AppProvider");
  return v;
}

export const roleLabel: Record<Role, string> = {
  super_admin: "Administrador",
  admin: "Administrador",
  cajero: "Cajero",
  vendedor: "Vendedor",
  contador: "Contador",
};
