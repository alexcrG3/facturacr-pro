import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Search,
  Copy,
  Check,
  Trash2,
  FileText,
  Package,
  Layers,
  Building2,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { CabysFinderModal } from "@/components/common/CabysFinderModal";
import { type CabysItem } from "@/lib/cabys";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/cabys")({
  component: MisCabysPage,
});

import { useApp } from "@/contexts/AppContext";

export interface CompanyCabysRow {
  id: string;
  cabys_code: string;
  description: string;
  economic_activity: string;
  economic_activity_desc: string;
  tax_rate: number;
  created_at?: string;
}

function MisCabysPage() {
  const { activeEstablishment } = useApp();
  const [cabysList, setCabysList] = useState<CompanyCabysRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isFinderOpen, setIsFinderOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emisorActivity = activeEstablishment?.economic_activity_code || "6209.0";

  const loadCabys = async () => {
    if (!activeEstablishment) return;
    setIsLoading(true);
    try {
      if (activeEstablishment.code === "nexus_clinic") {
        setCabysList([
          {
            id: "cab-med-1",
            cabys_code: "8512100000000",
            description: "Servicios de médicos generales en consulta externa",
            economic_activity: "862001",
            economic_activity_desc: "Actividades de médicos y odontólogos",
            tax_rate: 4,
          },
          {
            id: "cab-med-2",
            cabys_code: "8512200000000",
            description: "Servicios de médicos especialistas en clínica privada",
            economic_activity: "862001",
            economic_activity_desc: "Actividades de médicos y odontólogos",
            tax_rate: 4,
          },
          {
            id: "cab-med-3",
            cabys_code: "8519900000000",
            description: "Otros servicios de atención de la salud humana y enfermería",
            economic_activity: "862001",
            economic_activity_desc: "Actividades de médicos y odontólogos",
            tax_rate: 4,
          },
        ]);
        return;
      }

      if (activeEstablishment.code === "barber_app") {
        setCabysList([
          {
            id: "cab-bar-1",
            cabys_code: "9721000000000",
            description: "Servicios de peluquería, corte de cabello y estética masculina",
            economic_activity: "960201",
            economic_activity_desc: "Peluquería y otros tratamientos de belleza",
            tax_rate: 13,
          },
        ]);
        return;
      }

      if (activeEstablishment.code === "gas_express") {
        setCabysList([
          {
            id: "cab-gas-1",
            cabys_code: "3341000000000",
            description: "Gas Licuado de Petróleo (GLP) en cilindros para uso doméstico",
            economic_activity: "466101",
            economic_activity_desc: "Venta al por mayor de combustibles sólidos, líquidos y gaseosos",
            tax_rate: 13,
          },
        ]);
        return;
      }

      if (activeEstablishment.code === "athletix_os") {
        setCabysList([
          {
            id: "cab-ath-1",
            cabys_code: "9651000000000",
            description: "Servicios de gimnasios, fitness y acondicionamiento físico",
            economic_activity: "831401",
            economic_activity_desc: "Actividades de clubes deportivos y gimnasios",
            tax_rate: 13,
          },
        ]);
        return;
      }

      if (activeEstablishment.code === "avalcar_cr") {
        setCabysList([
          {
            id: "cab-av-1",
            cabys_code: "8714100000000",
            description: "Mantenimiento y reparación mecánica y eléctrica de vehículos de motor",
            economic_activity: "452001",
            economic_activity_desc: "Mantenimiento y reparación de vehículos automotores",
            tax_rate: 13,
          },
        ]);
        return;
      }

      // Grupo G Tres (matriz de software y tecnología)
      const { data, error } = await supabase
        .from("company_cabys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCabysList(data || []);
    } catch (err) {
      console.error("Error cargando Mis CABYS de Supabase:", err);
      toast.error("Error cargando el catálogo de CABYS de la empresa");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCabys();
  }, [activeEstablishment]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Código CABYS " + code + " copiado al portapapeles");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAddCabysFromCatalog = async (item: CabysItem) => {
    try {
      const exists = cabysList.some((c) => c.cabys_code === item.codigo);
      if (exists) {
        toast.info("El código CABYS " + item.codigo + " ya está registrado en Mis CAByS");
        setIsFinderOpen(false);
        return;
      }

      const newRow = {
        cabys_code: item.codigo,
        description: item.descripcion,
        economic_activity: emisorActivity,
        economic_activity_desc: "6209.0 - Otras actividades de la tecnología de información y servicio informáticos",
        tax_rate: item.impuesto,
      };

      const { data, error } = await supabase
        .from("company_cabys")
        .insert(newRow)
        .select()
        .single();

      if (error) throw error;

      setCabysList((prev) => [data, ...prev]);
      setIsFinderOpen(false);
      toast.success("CAByS " + item.codigo + " añadido a la empresa", {
        description: item.descripcion,
      });
    } catch (err) {
      console.error("Error al guardar CABYS:", err);
      toast.error("Error al registrar el código CABYS");
    }
  };

  const handleDeleteCabys = async (id: string, code: string, desc: string) => {
    if (confirm("¿Deseas quitar el código CABYS " + code + " de Mis CAByS?\n\n" + desc)) {
      try {
        const { error } = await supabase.from("company_cabys").delete().eq("id", id);
        if (error) throw error;
        setCabysList((prev) => prev.filter((c) => c.id !== id));
        toast.success("Código CABYS " + code + " removido de la empresa");
      } catch {
        toast.error("Error al quitar el código CABYS");
      }
    }
  };

  const filtered = cabysList.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.cabys_code.includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.economic_activity && c.economic_activity.toLowerCase().includes(q)) ||
      (c.economic_activity_desc && c.economic_activity_desc.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Mis CAByS"
        description="Catálogo de bienes y servicios autorizados y utilizados por tu empresa ante el Ministerio de Hacienda (BCCR)."
        actions={
          <button
            type="button"
            onClick={() => setIsFinderOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-sm font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Añadir bien o servicio
          </button>
        }
      />

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              Actividad Económica Emisor: <span className="font-mono text-primary font-bold">6209.0</span> — Otras actividades de la tecnología de información y servicio informáticos
            </p>
            <p className="text-muted-foreground mt-0.5">Todos los comprobantes electrónicos asociarán estos códigos CABYS a tu giro comercial autorizado ante Hacienda.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2.5 py-1 flex items-center gap-1 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" /> {cabysList.length} códigos registrados
          </span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Código del CAByS, descripción o actividad económica..."
          className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 shadow-xs"
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Código</th>
                <th className="px-5 py-3.5">Actividad Económica</th>
                <th className="px-5 py-3.5">Bien o Servicio</th>
                <th className="px-5 py-3.5 text-center">Tarifa IVA</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <p className="text-sm font-medium">No se encontraron códigos CABYS</p>
                    <p className="text-xs mt-1 text-muted-foreground/75">
                      Haz clic en <span className="font-semibold text-amber-500">"+ Añadir bien o servicio"</span> para buscar en el catálogo oficial de Hacienda / BCCR.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isCopied = copiedCode === item.cabys_code;
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-foreground">
                          <span>{item.cabys_code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.cabys_code)}
                            className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Copiar código CABYS"
                          >
                            {isCopied ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-muted-foreground max-w-sm text-xs">
                        <span className="font-mono font-medium text-foreground">
                          {item.economic_activity === "620901" ? "6209.0" : (item.economic_activity || "6209.0")}
                        </span>
                        {" - "}
                        <span>
                          {item.economic_activity_desc || "Otras actividades de la tecnología de información y servicio informáticos"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-medium text-foreground">
                        {item.description}
                      </td>

                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">
                          {item.tax_rate}% IVA
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to="/app/invoices/new"
                            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                            title="Emitir factura con este código"
                          >
                            <FileText className="h-3 w-3" /> Facturar
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDeleteCabys(item.id, item.cabys_code, item.description)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10 transition-colors ml-1 cursor-pointer"
                            title="Quitar de Mis CAByS"
                          >
                            <Trash2 className="h-3 w-3" /> Quitar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CabysFinderModal
        isOpen={isFinderOpen}
        onClose={() => setIsFinderOpen(false)}
        onSelect={handleAddCabysFromCatalog}
        actionLabel="Añadir a Mis CAByS"
      />
    </div>
  );
}
