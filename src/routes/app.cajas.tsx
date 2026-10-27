import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Store,
  Plus,
  Settings2,
  Hash,
  FileText,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/app/cajas")({
  component: CajasPage,
});

export interface CashRegister {
  id: string;
  branch_code: string;
  branch_name: string;
  terminal_code: string;
  terminal_name: string;
  next_invoice_number: number;
  next_ticket_number: number;
  next_credit_note_number: number;
  next_debit_note_number: number;
  is_active: boolean;
  created_at?: string;
}

function CajasPage() {
  const { activeEstablishment } = useApp();
  const [cajasList, setCajasList] = useState<CashRegister[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modales
  const [isAddCajaModalOpen, setIsAddCajaModalOpen] = useState(false);
  const [isEditCajaModalOpen, setIsEditCajaModalOpen] = useState(false);
  const [isNumeracionModalOpen, setIsNumeracionModalOpen] = useState(false);
  const [selectedCajaForNumeracion, setSelectedCajaForNumeracion] = useState<CashRegister | null>(null);
  const [editingCaja, setEditingCaja] = useState<CashRegister | null>(null);

  // Formulario Editar Caja
  const [editCajaForm, setEditCajaForm] = useState({
    branch_name: "",
    terminal_name: "",
  });

  // Formulario Añadir Caja
  const [cajaForm, setCajaForm] = useState({
    branch_code: "001",
    branch_name: "Casa Matriz",
    terminal_code: "00002",
    terminal_name: "Caja 2 - Punto de Venta",
    next_invoice_number: 1,
    next_ticket_number: 1,
    next_credit_note_number: 1,
    next_debit_note_number: 1,
  });

  // Formulario Numeración
  const [numeracionForm, setNumeracionForm] = useState({
    next_invoice_number: 1,
    next_ticket_number: 1,
    next_credit_note_number: 1,
    next_debit_note_number: 1,
  });

  // Filtros
  const [branchFilter, setBranchFilter] = useState("todos");
  const [terminalSearch, setTerminalSearch] = useState("");

  const loadCajas = async () => {
    if (!activeEstablishment?.id) {
      setCajasList([]);
      return;
    }
    setIsLoading(true);
    try {
      // 1. Obtener los consecutivos más altos de este establecimiento para no repetir números
      const { data: invData } = await supabase
        .from("invoices")
        .select("consecutive_number")
        .eq("establishment_id", activeEstablishment.id);

      let maxFE = 0;
      let maxTE = 0;
      let maxNC = 0;
      let maxND = 0;

      (invData || []).forEach((row: any) => {
        const c = row.consecutive_number || "";
        if (c.length === 20) {
          const docType = c.substring(8, 10);
          const seq = parseInt(c.substring(10), 10) || 0;
          if (docType === "01") maxFE = Math.max(maxFE, seq);
          else if (docType === "04") maxTE = Math.max(maxTE, seq);
          else if (docType === "03") maxNC = Math.max(maxNC, seq);
          else if (docType === "02") maxND = Math.max(maxND, seq);
        }
      });

      let storedCajas: CashRegister[] = [];
      try {
        const { data: dbCajas } = await supabase
          .from("cash_registers")
          .select("*")
          .eq("is_active", true)
          .order("branch_code", { ascending: true })
          .order("terminal_code", { ascending: true });

        if (dbCajas && dbCajas.length > 0) {
          storedCajas = dbCajas;
        }
      } catch (dbErr) {
        console.warn("Error cargando cajas desde DB:", dbErr);
      }

      if (storedCajas.length === 0) {
        try {
          const raw = localStorage.getItem(`facturaos_cajas_${activeEstablishment.id}`);
          if (raw) storedCajas = JSON.parse(raw);
        } catch {}
      }

      if (storedCajas.length === 0) {
        storedCajas = [
          {
            id: `caja-${activeEstablishment.code}-1`,
            branch_code: "001",
            branch_name: `${activeEstablishment.name || "Sucursal Principal"} - Sede Central`,
            terminal_code: "00001",
            terminal_name: "Caja 1 - Terminal de Cobro Principal",
            next_invoice_number: maxFE + 1,
            next_ticket_number: maxTE + 1,
            next_credit_note_number: maxNC + 1,
            next_debit_note_number: maxND + 1,
            is_active: true,
          },
        ];
      } else {
        storedCajas[0].next_invoice_number = Math.max(storedCajas[0].next_invoice_number || 1, maxFE + 1);
        storedCajas[0].next_ticket_number = Math.max(storedCajas[0].next_ticket_number || 1, maxTE + 1);
        storedCajas[0].next_credit_note_number = Math.max(storedCajas[0].next_credit_note_number || 1, maxNC + 1);
      }

      setCajasList(storedCajas);
    } catch (err) {
      console.error("Error cargando cajas aisladas:", err);
      toast.error("Error al cargar las cajas de la empresa");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCajas();
  }, [activeEstablishment]);

  const openNumeracionModal = (caja: CashRegister) => {
    setSelectedCajaForNumeracion(caja);
    setNumeracionForm({
      next_invoice_number: caja.next_invoice_number || 1,
      next_ticket_number: caja.next_ticket_number || 1,
      next_credit_note_number: caja.next_credit_note_number || 1,
      next_debit_note_number: caja.next_debit_note_number || 1,
    });
    setIsNumeracionModalOpen(true);
  };

  const handleSaveNumeracion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCajaForNumeracion) return;

    try {
      const { error } = await supabase
        .from("cash_registers")
        .update({
          next_invoice_number: Number(numeracionForm.next_invoice_number) || 1,
          next_ticket_number: Number(numeracionForm.next_ticket_number) || 1,
          next_credit_note_number: Number(numeracionForm.next_credit_note_number) || 1,
          next_debit_note_number: Number(numeracionForm.next_debit_note_number) || 1,
        })
        .eq("id", selectedCajaForNumeracion.id);

      if (error) throw error;

      // Actualizar estado local
      setCajasList((prev) =>
        prev.map((c) =>
          c.id === selectedCajaForNumeracion.id
            ? {
                ...c,
                next_invoice_number: Number(numeracionForm.next_invoice_number) || 1,
                next_ticket_number: Number(numeracionForm.next_ticket_number) || 1,
                next_credit_note_number: Number(numeracionForm.next_credit_note_number) || 1,
                next_debit_note_number: Number(numeracionForm.next_debit_note_number) || 1,
              }
            : c
        )
      );

      // Guardar en localStorage para acceso inmediato del generador de facturas
      localStorage.setItem(
        "facturacr_consecutivos_" + selectedCajaForNumeracion.branch_code + "_" + selectedCajaForNumeracion.terminal_code,
        JSON.stringify(numeracionForm)
      );
      if (activeEstablishment?.id) {
        const updatedList = cajasList.map((c) =>
          c.id === selectedCajaForNumeracion.id
            ? {
                ...c,
                next_invoice_number: Number(numeracionForm.next_invoice_number) || 1,
                next_ticket_number: Number(numeracionForm.next_ticket_number) || 1,
                next_credit_note_number: Number(numeracionForm.next_credit_note_number) || 1,
                next_debit_note_number: Number(numeracionForm.next_debit_note_number) || 1,
              }
            : c
        );
        localStorage.setItem(`facturaos_cajas_${activeEstablishment.id}`, JSON.stringify(updatedList));
      }

      setIsNumeracionModalOpen(false);
      toast.success("¡Numeración consecutiva actualizada con éxito!", {
        description: "Sucursal " + selectedCajaForNumeracion.branch_code + " - Caja " + selectedCajaForNumeracion.terminal_code + " continuará desde Factura #" + numeracionForm.next_invoice_number,
      });
    } catch (err) {
      console.error("Error al actualizar numeración:", err);
      toast.error("Error al guardar la numeración");
    }
  };

  const handleCreateCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    const branchCode = cajaForm.branch_code.trim().padStart(3, "0");
    const terminalCode = cajaForm.terminal_code.trim().padStart(5, "0");

    // Verificar si ya existe en la lista
    if (cajasList.some((c) => c.branch_code === branchCode && c.terminal_code === terminalCode)) {
      toast.error(`Ya existe una caja registrada con la combinación Sucursal ${branchCode} y Terminal ${terminalCode}`);
      return;
    }

    try {
      const newCaja: CashRegister = {
        id: `caja-${activeEstablishment?.code || "est"}-${Date.now()}`,
        branch_code: branchCode,
        branch_name: cajaForm.branch_name.trim(),
        terminal_code: terminalCode,
        terminal_name: cajaForm.terminal_name.trim(),
        next_invoice_number: Number(cajaForm.next_invoice_number) || 1,
        next_ticket_number: Number(cajaForm.next_ticket_number) || 1,
        next_credit_note_number: Number(cajaForm.next_credit_note_number) || 1,
        next_debit_note_number: Number(cajaForm.next_debit_note_number) || 1,
        is_active: true,
      };

      try {
        const { data, error } = await supabase
          .from("cash_registers")
          .insert({
            branch_code: branchCode,
            branch_name: cajaForm.branch_name.trim(),
            terminal_code: terminalCode,
            terminal_name: cajaForm.terminal_name.trim(),
            next_invoice_number: Number(cajaForm.next_invoice_number) || 1,
            next_ticket_number: Number(cajaForm.next_ticket_number) || 1,
            next_credit_note_number: Number(cajaForm.next_credit_note_number) || 1,
            next_debit_note_number: Number(cajaForm.next_debit_note_number) || 1,
            is_active: true,
            ...(activeEstablishment?.id ? { establishment_id: activeEstablishment.id } : {}),
          })
          .select()
          .single();

        if (data) {
          newCaja.id = data.id;
        }
      } catch (sbErr) {
        console.warn("Supabase fallback:", sbErr);
      }

      const updatedList = [...cajasList, newCaja];
      setCajasList(updatedList);
      if (activeEstablishment?.id) {
        localStorage.setItem(`facturaos_cajas_${activeEstablishment.id}`, JSON.stringify(updatedList));
      }

      setIsAddCajaModalOpen(false);
      toast.success(`¡Nueva caja ${terminalCode} (${newCaja.terminal_name}) registrada con éxito!`);
    } catch (err) {
      console.error("Error al registrar caja:", err);
      toast.error("Error al registrar la caja");
    }
  };

  const handleDeleteCaja = async (caja: CashRegister) => {
    if (caja.branch_code === "001" && caja.terminal_code === "00001") {
      toast.error("No es posible eliminar la Caja Principal (001 / 00001) por requerimiento de Hacienda.");
      return;
    }

    if (confirm("¿Estás seguro de que deseas eliminar la Caja " + caja.terminal_code + " (" + caja.terminal_name + ")?")) {
      try {
        await supabase.from("cash_registers").delete().eq("id", caja.id);
      } catch {}
      const updated = cajasList.filter((c) => c.id !== caja.id);
      setCajasList(updated);
      if (activeEstablishment?.id) {
        localStorage.setItem(`facturaos_cajas_${activeEstablishment.id}`, JSON.stringify(updated));
      }
      toast.success("Caja " + caja.terminal_code + " eliminada");
    }
  };

  const openEditCajaModal = (caja: CashRegister) => {
    setEditingCaja(caja);
    setEditCajaForm({
      branch_name: caja.branch_name,
      terminal_name: caja.terminal_name,
    });
    setIsEditCajaModalOpen(true);
  };

  const handleUpdateCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCaja) return;

    const updated = cajasList.map((c) =>
      c.id === editingCaja.id
        ? {
            ...c,
            branch_name: editCajaForm.branch_name.trim(),
            terminal_name: editCajaForm.terminal_name.trim(),
          }
        : c
    );

    setCajasList(updated);
    if (activeEstablishment?.id) {
      localStorage.setItem(`facturaos_cajas_${activeEstablishment.id}`, JSON.stringify(updated));
    }

    try {
      await supabase
        .from("cash_registers")
        .update({
          branch_name: editCajaForm.branch_name.trim(),
          terminal_name: editCajaForm.terminal_name.trim(),
        })
        .eq("id", editingCaja.id);
    } catch {}

    setIsEditCajaModalOpen(false);
    toast.success("¡Caja actualizada con éxito!");
  };

  const uniqueBranches = Array.from(new Set(cajasList.map((c) => c.branch_code)));

  const filteredCajas = cajasList.filter((c) => {
    if (branchFilter !== "todos" && c.branch_code !== branchFilter) return false;
    if (terminalSearch.trim()) {
      const q = terminalSearch.toLowerCase();
      return (
        c.terminal_code.includes(q) ||
        c.terminal_name.toLowerCase().includes(q) ||
        c.branch_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Mantenimiento de Cajas y Numeración"
        description="Configuración de sucursales, cajas o puntos de venta y continuación de numeración consecutiva autorizada por Hacienda."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (cajasList.length > 0) openNumeracionModal(cajasList[0]);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-xs transition-colors cursor-pointer"
            >
              <Settings2 className="h-4 w-4 text-primary" /> Configurar numeración
            </button>
            <button
              type="button"
              onClick={() => setIsAddCajaModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Añadir caja
            </button>
          </div>
        }
      />

      {/* Barra de Filtros */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Establecimiento / Sucursal</label>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 shadow-xs"
          >
            <option value="todos">Todas las sucursales</option>
            {uniqueBranches.map((code) => {
              const b = cajasList.find((c) => c.branch_code === code);
              return (
                <option key={code} value={code}>
                  {code} - {b?.branch_name || "Sucursal " + code}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Caja o punto de venta</label>
          <input
            type="text"
            value={terminalSearch}
            onChange={(e) => setTerminalSearch(e.target.value)}
            placeholder="Filtrar por código (00001) o nombre..."
            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 shadow-xs"
          />
        </div>
      </div>

      {/* Tabla de Cajas */}
      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Establecimiento / Sucursal</th>
                <th className="px-5 py-3.5">Caja o punto de venta</th>
                <th className="px-5 py-3.5">Próximos Consecutivos</th>
                <th className="px-5 py-3.5 text-right">Continuar Numeración</th>
                <th className="px-4 py-3.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCajas.map((caja) => (
                <tr key={caja.id} className="hover:bg-muted/30 transition-colors">
                  {/* Sucursal */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary font-bold font-mono text-xs shrink-0">
                        {caja.branch_code}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{caja.branch_name}</div>
                        <div className="text-[11px] text-muted-foreground">Código oficial: {caja.branch_code}</div>
                      </div>
                    </div>
                  </td>

                  {/* Terminal / Caja */}
                  <td className="px-5 py-4">
                    <div className="font-mono font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-primary" />
                      {caja.terminal_code}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{caja.terminal_name}</div>
                  </td>

                  {/* Consecutivos Actuales */}
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary font-medium" title="Próxima Factura Electrónica">
                        FE: #{caja.next_invoice_number}
                      </span>
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400 font-medium" title="Próximo Tiquete Electrónico">
                        TE: #{caja.next_ticket_number}
                      </span>
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-300 font-medium" title="Próxima Nota de Crédito">
                        NC: #{caja.next_credit_note_number}
                      </span>
                    </div>
                  </td>

                  {/* Botón Continuar Numeración */}
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openNumeracionModal(caja)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all shadow-2xs cursor-pointer"
                    >
                      <span>Continuar la numeración automática a partir de..</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditCajaModal(caja)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                        title="Editar nombre de la caja"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCaja(caja)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                        title="Eliminar caja"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card Informativo de Migración de Otro Sistema (Estilo Mariposa de Hacienda) */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-500 shrink-0 shadow-xs text-2xl">
              🦋
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                ¿Ha emitido comprobantes electrónicos desde otra aplicación y ya tiene comprobantes emitidos con una numeración?
              </h3>
              <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
                Si ya ha emitido comprobantes electrónicos desde otra aplicación distinta (como Tica Factura, GTI, Factun u otro software) no se preocupe: puede configurar la numeración para continuar con su numeración de forma consecutiva y así evitar que Hacienda rechace comprobantes por secuencias anteriores o duplicadas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (cajasList.length > 0) openNumeracionModal(cajasList[0]);
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted hover:border-primary/40 shadow-xs transition-all cursor-pointer"
          >
            <Settings2 className="h-4 w-4 text-primary" />
            Configurar numeración automática comprobantes electrónicos
          </button>
        </div>
      </div>

      {/* Modal Continuar Numeración Automática */}
      {isNumeracionModalOpen && selectedCajaForNumeracion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Hash className="h-5 w-5 text-primary" />
                  Continuar Numeración Automática
                </h3>
                <p className="text-xs text-muted-foreground">
                  Sucursal {selectedCajaForNumeracion.branch_code} · Caja {selectedCajaForNumeracion.terminal_code} ({selectedCajaForNumeracion.terminal_name})
                </p>
              </div>
              <button
                onClick={() => setIsNumeracionModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNumeracion} className="space-y-4 text-xs">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200 text-[11px] flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Indica el número del <strong>próximo comprobante</strong> que emitirás. Por ejemplo, si en tu sistema anterior tu última factura fue la <strong>#85</strong>, digita <strong>86</strong> aquí.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="mb-1 block font-semibold text-foreground">
                    Próxima Factura Electrónica (FE)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={numeracionForm.next_invoice_number}
                    onChange={(e) => setNumeracionForm({ ...numeracionForm, next_invoice_number: parseInt(e.target.value) || 1 })}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm font-bold focus:border-ring focus:outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Consecutivo: {selectedCajaForNumeracion.branch_code}{selectedCajaForNumeracion.terminal_code}01{String(numeracionForm.next_invoice_number).padStart(10, "0")}
                  </span>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-foreground">
                    Próximo Tiquete Electrónico (TE)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={numeracionForm.next_ticket_number}
                    onChange={(e) => setNumeracionForm({ ...numeracionForm, next_ticket_number: parseInt(e.target.value) || 1 })}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm font-bold focus:border-ring focus:outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Consecutivo: {selectedCajaForNumeracion.branch_code}{selectedCajaForNumeracion.terminal_code}04{String(numeracionForm.next_ticket_number).padStart(10, "0")}
                  </span>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-foreground">
                    Próxima Nota de Crédito (NC)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={numeracionForm.next_credit_note_number}
                    onChange={(e) => setNumeracionForm({ ...numeracionForm, next_credit_note_number: parseInt(e.target.value) || 1 })}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm font-bold focus:border-ring focus:outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Consecutivo: {selectedCajaForNumeracion.branch_code}{selectedCajaForNumeracion.terminal_code}03{String(numeracionForm.next_credit_note_number).padStart(10, "0")}
                  </span>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-foreground">
                    Próxima Nota de Débito (ND)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={numeracionForm.next_debit_note_number}
                    onChange={(e) => setNumeracionForm({ ...numeracionForm, next_debit_note_number: parseInt(e.target.value) || 1 })}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm font-bold focus:border-ring focus:outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Consecutivo: {selectedCajaForNumeracion.branch_code}{selectedCajaForNumeracion.terminal_code}02{String(numeracionForm.next_debit_note_number).padStart(10, "0")}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNumeracionModalOpen(false)}
                  className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  <Check className="h-4 w-4" /> Guardar Consecutivos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Añadir Caja */}
      {isAddCajaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Store className="h-5 w-5 text-amber-500" />
                Registrar Nueva Caja / Terminal
              </h3>
              <button
                onClick={() => setIsAddCajaModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCaja} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-muted-foreground">Código Sucursal (3 dígitos) *</label>
                  <input
                    required
                    maxLength={3}
                    value={cajaForm.branch_code}
                    onChange={(e) => setCajaForm({ ...cajaForm, branch_code: e.target.value.replace(/\D/g, "") })}
                    placeholder="001"
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 font-mono font-bold focus:border-ring focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-muted-foreground">Código Caja (5 dígitos) *</label>
                  <input
                    required
                    maxLength={5}
                    value={cajaForm.terminal_code}
                    onChange={(e) => setCajaForm({ ...cajaForm, terminal_code: e.target.value.replace(/\D/g, "") })}
                    placeholder="00002"
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 font-mono font-bold focus:border-ring focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-muted-foreground">Nombre de la Sucursal</label>
                <input
                  required
                  value={cajaForm.branch_name}
                  onChange={(e) => setCajaForm({ ...cajaForm, branch_name: e.target.value })}
                  placeholder="Ej: Casa Matriz (San José)"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-muted-foreground">Nombre / Ubicación de la Caja *</label>
                <input
                  required
                  value={cajaForm.terminal_name}
                  onChange={(e) => setCajaForm({ ...cajaForm, terminal_name: e.target.value })}
                  placeholder="Ej: Caja 2 - Mostrador / Vendedor Móvil"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 focus:border-ring focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddCajaModalOpen(false)}
                  className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-semibold shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Registrar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Caja */}
      {isEditCajaModalOpen && editingCaja && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-primary" />
                Editar Caja / Sucursal
              </h3>
              <button
                onClick={() => setIsEditCajaModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCaja} className="space-y-3.5 text-xs">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-[11px] space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  <span>Sucursal: {editingCaja.branch_code}</span>
                  <span>·</span>
                  <span>Terminal: {editingCaja.terminal_code}</span>
                </div>
                <p className="text-muted-foreground">
                  Los códigos numéricos asignados ante Hacienda son fijos para garantizar la validez legal de los comprobantes.
                </p>
              </div>

              <div>
                <label className="mb-1 block font-medium text-muted-foreground">Nombre de la Sucursal</label>
                <input
                  required
                  value={editCajaForm.branch_name}
                  onChange={(e) => setEditCajaForm({ ...editCajaForm, branch_name: e.target.value })}
                  placeholder="Ej: Sede Central / Local 1"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-muted-foreground">Nombre / Identificador de la Caja *</label>
                <input
                  required
                  value={editCajaForm.terminal_name}
                  onChange={(e) => setEditCajaForm({ ...editCajaForm, terminal_name: e.target.value })}
                  placeholder="Ej: Caja Lavacar - Cobro Principal"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 focus:border-ring focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditCajaModalOpen(false)}
                  className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium hover:bg-muted cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 text-xs font-semibold shadow-sm cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
