import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Por favor ingresa tu correo electrónico");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
        toast.success("Enlace de restablecimiento enviado correctamente");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al enviar solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">Recuperar contraseña</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Te enviaremos un enlace oficial de Supabase para restablecer tu contraseña.
        </p>

        {sent ? (
          <div className="mt-6 space-y-3">
            <div className="rounded-lg border border-success/30 bg-success-soft p-4 text-xs text-success">
              Se ha enviado un enlace de recuperación a <strong>{email}</strong>. Revisa tu bandeja de entrada o carpeta de spam.
            </div>
            <button
              onClick={() => setSent(false)}
              className="text-xs text-primary hover:underline block"
            >
              ¿No recibiste nada? Reintentar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:shadow-glow flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enviando…</span>
                </>
              ) : (
                "Enviar enlace de restablecimiento"
              )}
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
