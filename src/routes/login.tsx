import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  Eye,
  EyeOff,
  User,
  Loader2,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Logo, LogoIcon, FacturaOSSplashLoader } from "@/components/layout/Logo";
import { supabase, type Role } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode as "login" | "register") || undefined,
    cedula: (search.cedula as string) || undefined,
    empresa: (search.empresa as string) || undefined,
    code: (search.code as string) || undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const getClientParam = (key: string): string => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const val = sp.get(key);
      if (val) return val;
    }
    return ((search as any)?.[key] as string) || "";
  };

  const [mode, setMode] = useState<"login" | "register">(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("mode") === "register" || sp.get("cedula")) return "register";
      if (sp.get("mode") === "login") return "login";
    }
    return search?.mode === "register" || search?.cedula ? "register" : "login";
  });
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Campos de formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Campos específicos de Registro del Dueño de la Empresa
  const [cedula, setCedula] = useState(() => getClientParam("cedula"));
  const [companyLegalName, setCompanyLegalName] = useState(() => getClientParam("empresa"));
  const [validatingCedula, setValidatingCedula] = useState(false);
  const [cedulaValidation, setCedulaValidation] = useState<any | null>(null);

  // Validación de Cédula de la Empresa ante el Padrón Oficial de Hacienda
  const validateCedulaHacienda = async (idNum: string) => {
    const clean = idNum.replace(/\D/g, "");
    if (clean.length < 9) {
      setCedulaValidation(null);
      return;
    }
    setValidatingCedula(true);
    try {
      const res = await fetch(`/api/v1/identities/${clean}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.nombreCompleto) {
          setCedulaValidation(data);
          if (!companyLegalName) {
            setCompanyLegalName(data.nombreCompleto);
          }
        } else {
          setCedulaValidation(null);
        }
      } else {
        setCedulaValidation(null);
      }
    } catch (err) {
      console.warn("Validación de cédula en Hacienda:", err);
      setCedulaValidation(null);
    } finally {
      setValidatingCedula(false);
    }
  };

  useEffect(() => {
    if (search?.cedula) {
      setCedula(search.cedula);
      setMode("register");
      validateCedulaHacienda(search.cedula);
    }
  }, [search?.cedula]);

  // Resolver el destino y establecimiento del usuario según su rol y correo
  const resolveDestinationAndEstablishment = async (userObj: { id: string; email?: string }) => {
    let role: string = "admin";
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, email, full_name")
        .eq("id", userObj.id)
        .maybeSingle();
      if (profile?.role) {
        role = profile.role;
      }
    } catch (err) {
      console.error("Error al consultar perfil en login:", err);
    }

    const userEmail = (userObj.email || "").toLowerCase().trim();
    const isSuper = role === "super_admin" || userEmail === "alex@mail.com";

    if (isSuper) {
      return { target: "/admin" as const, isSuper: true, establishment: null };
    }

    // Inquilino: buscar su empresa correspondiente en establishments
    try {
      const { data: estData } = await supabase
        .from("establishments")
        .select("*")
        .order("created_at", { ascending: true });

      if (estData && estData.length > 0) {
        // Prioridad 1: metadata explícita de establecimiento amarrada al usuario
        const metaEstId = (userObj as any)?.user_metadata?.establishment_id;
        if (metaEstId) {
          const directMatch = estData.find((e: any) => e.id === metaEstId);
          if (directMatch) {
            if (typeof window !== "undefined") {
              localStorage.setItem("facturaos_active_est_id", directMatch.id);
            }
            return { target: "/app/dashboard" as const, isSuper: false, establishment: directMatch };
          }
        }

        // Prioridad 2: coincidencia por email o código
        const emailLocal = userEmail.split("@")[0].replace(/[^a-z0-9]/g, "");
        const matched =
          estData.find((e: any) => e.email?.toLowerCase().trim() === userEmail) ||
          estData.find((e: any) => {
            const codeClean = (e.code || "").replace(/_/g, "").toLowerCase();
            return codeClean.includes(emailLocal) || emailLocal.includes(codeClean);
          }) ||
          estData.find((e: any) => {
            const nameClean = (e.name || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
            return nameClean.includes(emailLocal) || emailLocal.includes(nameClean);
          }) ||
          estData[0];

        if (matched && typeof window !== "undefined") {
          localStorage.setItem("facturaos_active_est_id", matched.id);
        }
        return { target: "/app/dashboard" as const, isSuper: false, establishment: matched };
      }
    } catch (err) {
      console.error("Error al buscar establecimiento para inquilino:", err);
    }

    return { target: "/app/dashboard" as const, isSuper: false, establishment: null };
  };

  useEffect(() => {
    // Si ya existe sesión activa, resolver a dónde corresponde ir
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const dest = await resolveDestinationAndEstablishment(session.user);
        navigate({ to: dest.target });
      } else {
        setCheckingSession(false);
      }
    });
  }, [navigate]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Por favor completa el correo y la contraseña");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Credenciales inválidas. Revisa tu correo y contraseña.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.session && data.session.user) {
        const dest = await resolveDestinationAndEstablishment(data.session.user);
        if (dest.isSuper) {
          toast.success("¡Bienvenido al Centro de Mando de FacturaOS!");
        } else if (dest.establishment) {
          toast.success(`¡Bienvenido a ${dest.establishment.name}!`);
        } else {
          toast.success("¡Bienvenido a FacturaOS!");
        }
        navigate({ to: dest.target });
      }
    } catch (err: any) {
      toast.error(err?.message || "Ocurrió un error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!cedula.trim()) {
      toast.error("Por favor ingresa la cédula jurídica o física de tu empresa");
      return;
    }
    if (!fullName.trim()) {
      toast.error("Por favor ingresa tu nombre como dueño o representante");
      return;
    }
    if (!email.trim() || !password.trim()) {
      toast.error("Por favor completa tu correo y crea tu contraseña");
      return;
    }
    if (password.length < 6) {
      toast.error("Tu contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const cleanCedula = cedula.replace(/\D/g, "");
      const resolvedCompanyName =
        companyLegalName.trim() ||
        cedulaValidation?.nombreCompleto ||
        `Empresa ${cleanCedula}`;
      const activityCode =
        cedulaValidation?.actividadesEconomicas?.[0]?.codigo?.replace(/\D/g, "") || "620901";

      // 1. Buscar si esta empresa ya existe en establishments
      const { data: existingEsts } = await supabase
        .from("establishments")
        .select("*")
        .or(`legal_id.eq.${cleanCedula},legal_id.eq.${cedula.trim()}`);

      let targetEst = existingEsts && existingEsts.length > 0 ? existingEsts[0] : null;

      // 2. Si no existe aún en la base de datos, crearla automáticamente con los datos verificados
      if (!targetEst) {
        const codeSlug = resolvedCompanyName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "_")
          .slice(0, 20);
        const uniqueCode = `${codeSlug}_${Math.random().toString(36).substring(2, 6)}`;
        const apiKeySecret = `fct_live_${codeSlug}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;

        const { data: newEst, error: estErr } = await supabase
          .from("establishments")
          .insert({
            name: resolvedCompanyName,
            legal_id: cleanCedula,
            legal_id_type: cleanCedula.length === 10 ? "02" : cleanCedula.length === 9 ? "01" : "03",
            economic_activity_code: activityCode,
            code: uniqueCode,
            email: email.trim().toLowerCase(),
            is_active: true,
            atv_environment: "staging",
          })
          .select()
          .single();

        if (estErr) throw estErr;
        targetEst = newEst;

        // Crear API Key para la nueva empresa
        await supabase.from("api_keys").insert({
          establishment_id: newEst.id,
          app_name: resolvedCompanyName,
          key_prefix: apiKeySecret.slice(0, 12),
          key_secret: apiKeySecret,
          environment: "staging",
          is_active: true,
        });
      }

      // 3. Crear el usuario en Supabase Auth con su contraseña personal y metadata de empresa
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password.trim(),
        options: {
          data: {
            full_name: fullName.trim(),
            role: "admin", // Dueño de la empresa
            establishment_id: targetEst.id,
            establishment_code: targetEst.code,
            establishment_name: targetEst.name,
            allowed_establishment_ids: [targetEst.id],
          },
        },
      });

      if (authErr) throw authErr;

      if (authData.user) {
        // 4. Guardar en profiles
        await supabase.from("profiles").upsert({
          id: authData.user.id,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role: "admin",
          establishment_id: targetEst.id,
        });

        // 5. Establecer empresa activa en sesión
        if (typeof window !== "undefined") {
          localStorage.setItem("facturaos_active_est_id", targetEst.id);
        }

        if (authData.session) {
          toast.success(`¡Bienvenido a FacturaOS! Tu empresa "${targetEst.name}" ha sido activada.`);
          navigate({ to: "/app/dashboard" });
        } else {
          toast.success("¡Cuenta activada con éxito! Ya puedes iniciar sesión con tu nueva contraseña.", {
            duration: 6000,
          });
          setMode("login");
        }
      }
    } catch (err: any) {
      console.error("Error en registro:", err);
      toast.error(err.message || "Ocurrió un error al registrar la cuenta");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <FacturaOSSplashLoader message="Verificando sesión en FacturaOS..." />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left form */}
      <div className="flex flex-col justify-between px-6 py-8 md:px-12 lg:px-16">
        <div>
          <Logo />
        </div>

        <div className="mx-auto my-8 flex w-full max-w-sm flex-1 flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Conectado con Hacienda
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl text-foreground">
            {mode === "login" ? "Iniciar Sesión" : "Activar Empresa / Registro"}
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {mode === "login"
              ? "Ingresa a tu cuenta para gestionar tu facturación electrónica."
              : "Verifica la cédula jurídica de tu empresa y crea tu contraseña segura."}
          </p>

          {/* Toggle Modo */}
          <div className="mt-6 flex rounded-lg bg-muted p-1 border border-border">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                mode === "login"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                mode === "register"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="mt-5 space-y-3.5">
            {mode === "register" && (
              <>
                {/* 1. Cédula Tributaria de la Empresa */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-semibold text-foreground">
                      Cédula de la Empresa / Sociedad *
                    </label>
                    <span className="text-[10px] text-muted-foreground">Jurídica o Física</span>
                  </div>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Ej. 3102832920 ó 3-101-443322"
                      value={cedula}
                      onChange={(e) => {
                        setCedula(e.target.value);
                        if (e.target.value.replace(/\D/g, "").length >= 9) {
                          validateCedulaHacienda(e.target.value);
                        }
                      }}
                      onBlur={() => validateCedulaHacienda(cedula)}
                      className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-20 font-mono text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => validateCedulaHacienda(cedula)}
                      disabled={validatingCedula || !cedula.trim()}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-primary/10 hover:bg-primary/20 px-2 py-1 text-[11px] font-bold text-primary transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {validatingCedula ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verificar"}
                    </button>
                  </div>

                  {/* Badge de Verificación ante Hacienda */}
                  {cedulaValidation && (
                    <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Verificado en Ministerio de Hacienda</span>
                      </div>
                      <p className="font-semibold text-foreground truncate">
                        {cedulaValidation.nombreCompleto}
                      </p>
                      {cedulaValidation.actividadesEconomicas?.[0] && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          Actividad: {cedulaValidation.actividadesEconomicas[0].codigo} — {cedulaValidation.actividadesEconomicas[0].descripcion}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Nombre del Dueño / Representante */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Nombre del Dueño o Representante Legal *
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Ej. Alexander Gutiérrez"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* 3. Correo Electrónico */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">
                Correo Electrónico de Acceso *
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="facturas@grupoluxxcr.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  required
                />
              </div>
            </div>

            {/* 4. Contraseña creada por el Dueño */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-semibold text-foreground">
                  {mode === "register" ? "Crea tu Contraseña Secreta *" : "Contraseña *"}
                </label>
                {mode === "login" && (
                  <Link to="/forgot-password" className="text-[11px] text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "Mínimo 6 caracteres" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-10 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === "register" && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Esta contraseña es confidencial y solo tú tendrás acceso a ella.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-glow disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Procesando…</span>
                </>
              ) : mode === "login" ? (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              ) : (
                <>
                  <span>Activar Mi Empresa y Entrar</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          © {new Date().getFullYear()} Facturio PRO · Costa Rica. Todos los derechos reservados.
        </p>
      </div>

      {/* Right hero */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#0045AC] via-[#003B94] to-[#002766] lg:block">
        <div className="absolute inset-0 bg-grid opacity-25 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
        <div className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -left-20 bottom-20 h-80 w-80 rounded-full bg-[#0045AC]/40 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3.5">
            <LogoIcon className="h-12 w-12 shadow-2xl ring-2 ring-white/25" animated={true} />
            <div>
              <span className="text-xl font-black tracking-tight text-white leading-none">
                Factura<span className="text-cyan-300">OS</span>
              </span>
              <p className="text-[11px] text-blue-200/80 font-medium tracking-wide">
                Sistema Operativo de Facturación
              </p>
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="text-display text-4xl font-semibold leading-tight text-white">
              La facturación electrónica que tu empresa merece.
            </h2>
            <p className="mt-4 text-sm text-blue-100/90 leading-relaxed">
              Plataforma segura con control de roles de acceso, emisión instantánea y enlace directo con el Ministerio de Hacienda de Costa Rica.
            </p>

            <div className="mt-10 space-y-4">
              {[
                { icon: ShieldCheck, t: "Gestión interna de roles: Admin, Contador, Vendedor y Cajero" },
                { icon: Zap, t: "Base de datos en tiempo real de alta velocidad" },
                { icon: Sparkles, t: "100% compatible con Hacienda CR (v4.4 v2)" },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.t} className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 backdrop-blur border border-white/15">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm text-white font-medium">{f.t}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-xs text-blue-200/70">
            FacturaOS · GRUPO G TRES COMERCIALIZADORA INTERAMERICANA S.A.
          </div>
        </div>
      </div>
    </div>
  );
}
