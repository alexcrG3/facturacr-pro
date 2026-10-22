import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Mail, Lock, ArrowRight, ShieldCheck, Sparkles, Zap, Eye, EyeOff, User, Loader2 } from "lucide-react";
import { Logo, LogoIcon, FacturaOSSplashLoader } from "@/components/layout/Logo";
import { supabase, type Role } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Campos de formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

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
    if (!fullName.trim()) {
      toast.error("Por favor ingresa tu nombre completo");
      return;
    }
    if (!email.trim() || !password.trim()) {
      toast.error("Por favor completa el correo y la contraseña");
      return;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      // El rol se gestiona internamente:
      // Si es el primer usuario que se registra en la plataforma, será Administrador.
      // De lo contrario se asigna rol inicial 'vendedor' para que el Administrador lo configure internamente.
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const initialRole: Role = (count === 0 || count === null) ? "admin" : "vendedor";

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            full_name: fullName.trim(),
            role: initialRole,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        // Guardar perfil en la tabla profiles
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName.trim(),
          role: initialRole,
        });

        if (data.session) {
          toast.success("¡Cuenta creada exitosamente!");
          navigate({ to: "/app/dashboard" });
        } else {
          toast.success("¡Cuenta registrada con éxito! Ya puedes iniciar sesión.", {
            duration: 5000,
          });
          setMode("login");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Ocurrió un error al registrar la cuenta");
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
            {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {mode === "login"
              ? "Ingresa a tu cuenta para gestionar tu facturación electrónica."
              : "Crea tu cuenta para acceder a la plataforma."}
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
              <div>
                <label className="mb-1 block text-xs font-medium">Nombre completo</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Alex García"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium">Correo electrónico</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-medium">Contraseña</label>
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-10 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-glow disabled:opacity-60"
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
                  <span>Crear Cuenta y Entrar</span>
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
