import React from "react";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";

export function OfficialSealBadge({
  resolution = "DGT-R-033-2019 / MH-DGT-RES-0027-2024",
  version = "4.3",
  variant = "horizontal",
}: {
  resolution?: string;
  version?: string;
  variant?: "horizontal" | "compact" | "badge";
}) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-50/70 p-2 text-[10px] text-emerald-950">
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-600 text-white font-black text-[10px]">
          CR
        </div>
        <div className="leading-tight">
          <p className="font-bold flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span>Documento Tributario Electrónico Autorizado</span>
          </p>
          <p className="text-[9px] text-emerald-700">
            Res. {resolution} · Hacienda v{version}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-emerald-600/30 bg-emerald-50/60 p-3 text-xs text-emerald-950">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white shadow-xs">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div className="min-w-0 space-y-0.5 leading-snug">
        <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-[11px]">
          <span>AUTORIZADO POR EL MINISTERIO DE HACIENDA DE COSTA RICA</span>
          <span className="rounded bg-emerald-200/60 px-1.5 py-0.2 text-[9px] font-mono text-emerald-800">
            v{version}
          </span>
        </div>
        <p className="text-[10px] text-emerald-800">
          Emitido conforme a la resolución <strong>N° {resolution}</strong> de la Dirección General de Tributación.
          Comprobante respaldado mediante firma digital y validación criptográfica XML.
        </p>
      </div>
    </div>
  );
}
