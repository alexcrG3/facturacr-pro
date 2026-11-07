import React, { useState } from "react";
import { TemplateCorporativa, type InvoiceTemplateProps } from "./TemplateCorporativa";
import { TemplateModerna } from "./TemplateModerna";
import { TemplateClasica } from "./TemplateClasica";
import { TemplateTermico } from "./TemplateTermico";
import { Building2, Sparkles, FileSpreadsheet, Receipt, Check } from "lucide-react";

export type InvoiceTemplateId = "corporativa" | "moderna" | "clasica" | "termico";

export interface InvoiceRendererProps extends InvoiceTemplateProps {
  initialTemplate?: InvoiceTemplateId;
  establishmentId?: string;
  showSelector?: boolean;
}

export const TEMPLATE_OPTIONS: {
  id: InvoiceTemplateId;
  name: string;
  badge: string;
  desc: string;
  icon: any;
}[] = [
  {
    id: "corporativa",
    name: "Corporativa Pro",
    badge: "1 Página",
    desc: "Diseño ejecutivo con sello oficial, cuentas bancarias y distribución limpia.",
    icon: Building2,
  },
  {
    id: "moderna",
    name: "Moderna Curva",
    badge: "SaaS Premium",
    desc: "Estilo contemporáneo con cabecera curva, tarjetas limpias y acentos indigo/ámbar.",
    icon: Sparkles,
  },
  {
    id: "clasica",
    name: "Clásica Comercial",
    badge: "Oficial B2B",
    desc: "Alta densidad de renglones, tabla detallada, recibo conforme y firma.",
    icon: FileSpreadsheet,
  },
  {
    id: "termico",
    name: "Tiquete Térmico POS",
    badge: "80mm / 58mm",
    desc: "Formato vertical para impresoras térmicas de rollos, puntos de venta y caja rápida.",
    icon: Receipt,
  },
];

export function InvoiceRenderer({
  initialTemplate,
  establishmentId,
  showSelector = true,
  ...templateProps
}: InvoiceRendererProps) {
  const storageKey = establishmentId ? `facturaos_invoice_template_${establishmentId}` : "facturaos_invoice_template_default";

  const [currentTemplate, setCurrentTemplate] = useState<InvoiceTemplateId>(() => {
    if (initialTemplate) return initialTemplate;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey) as InvoiceTemplateId;
      if (saved && ["corporativa", "moderna", "clasica", "termico"].includes(saved)) {
        return saved;
      }
    }
    return "corporativa";
  });

  const handleSelectTemplate = (id: InvoiceTemplateId) => {
    setCurrentTemplate(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selector de plantilla interactivo (oculto en impresión) */}
      {showSelector && (
        <div className="print:hidden bg-slate-100/80 dark:bg-slate-900/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
            <span>Plantilla de Diseño:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 w-full sm:w-auto">
            {TEMPLATE_OPTIONS.map((t) => {
              const Icon = t.icon;
              const isSelected = currentTemplate === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTemplate(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                  }`}
                  title={t.desc}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{t.name}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-mono shrink-0 ${
                    isSelected ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300" : "bg-slate-200/60 dark:bg-slate-800 text-slate-500"
                  }`}>
                    {t.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Renderizado de la plantilla activa */}
      <div className="w-full">
        {currentTemplate === "corporativa" && <TemplateCorporativa {...templateProps} />}
        {currentTemplate === "moderna" && <TemplateModerna {...templateProps} />}
        {currentTemplate === "clasica" && <TemplateClasica {...templateProps} />}
        {currentTemplate === "termico" && <TemplateTermico {...templateProps} />}
      </div>
    </div>
  );
}
