import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, MapPin, User, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const steps = [
  { n: 1, label: "Empresa", icon: Building2 },
  { n: 2, label: "Sucursal", icon: MapPin },
  { n: 3, label: "Tu cuenta", icon: User },
  { n: 4, label: "Listo", icon: CheckCircle2 },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo />
          <span className="text-xs text-muted-foreground">
            Paso {step} de {steps.length}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10 flex items-center justify-between">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const done = step > s.n;
            const active = step === s.n;
            return (
              <div key={s.n} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-full border-2 transition-all ${
                      done
                        ? "border-success bg-success text-success-foreground"
                        : active
                          ? "border-primary bg-primary text-primary-foreground shadow-glow"
                          : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`mx-2 h-px flex-1 ${step > s.n ? "bg-success" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-elevated">
          {step === 1 && (
            <Form
              title="Cuéntanos sobre tu empresa"
              subtitle="Esta información aparecerá en tus facturas."
              fields={[
                { label: "Razón social", placeholder: "Distribuidora Pacífico S.A." },
                { label: "Cédula jurídica", placeholder: "3-101-456789" },
                { label: "Actividad económica", placeholder: "Comercio al por menor" },
              ]}
            />
          )}
          {step === 2 && (
            <Form
              title="Tu primera sucursal"
              subtitle="Puedes agregar más sucursales luego."
              fields={[
                { label: "Nombre de la sucursal", placeholder: "Casa Matriz" },
                { label: "Provincia", placeholder: "San José" },
                { label: "Dirección exacta", placeholder: "Av. Central, calle 5" },
              ]}
            />
          )}
          {step === 3 && (
            <Form
              title="Crea tu cuenta"
              subtitle="Serás el administrador principal."
              fields={[
                { label: "Nombre completo", placeholder: "Andrea Quirós" },
                { label: "Correo electrónico", placeholder: "andrea@empresa.cr" },
                { label: "Contraseña", placeholder: "••••••••", type: "password" },
              ]}
            />
          )}
          {step === 4 && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-success-soft">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl font-semibold">¡Todo listo!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Tu empresa está configurada. Vamos al panel principal.
              </p>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() =>
                step === 4 ? navigate({ to: "/app/dashboard" }) : setStep((s) => s + 1)
              }
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:shadow-glow"
            >
              {step === 4 ? "Entrar al panel" : "Continuar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Form({
  title,
  subtitle,
  fields,
}: {
  title: string;
  subtitle: string;
  fields: { label: string; placeholder: string; type?: string }[];
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6 grid gap-4">
        {fields.map((f) => {
          const isPassword = f.type === "password";
          return (
            <div key={f.label}>
              <label className="mb-1.5 block text-xs font-medium">{f.label}</label>
              <div className="relative">
                <input
                  type={isPassword ? (showPassword ? "text" : "password") : (f.type ?? "text")}
                  placeholder={f.placeholder}
                  className={`h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 ${
                    isPassword ? "pr-10" : ""
                  }`}
                />
                {isPassword && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
