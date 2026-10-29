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
  AlertTriangle,
  Power,
  Loader2,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
  X,
  Check,
  Lock,
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

  // Modal para eliminar o desactivar caja (CRUD Delete - Idéntico al de Empresas)
  const [showDeleteCajaModal, setShowDeleteCajaModal] = useState(false);
  const [deleteTargetCaja, setDeleteTargetCaja] = useState<CashRegister | null>(null);
  const [deleteTargetStats, setDeleteTargetStats] = useState<{
    totalDocs: number;
    feCount: number;
    teCount: number;
    ncCount: number;
    dbCount: number;
  }>({ totalDocs: 0, feCount: 0, teCount: 0, ncCount: 0, dbCount: 0 });
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

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
          const cleanCedula = (activeEstablishment.legal_id || "").replace(/\D/g, "");
          const isLuxxCarWash =
            cleanCedula === "3102832920" ||
            activeEstablishment.code?.includes("luxx") ||
            (activeEstablishment.name || "").toLowerCase().includes("luxx") ||
            (activeEstablishment.app_name || "").toLowerCase().includes("luxx") ||
            activeEstablishment.name?.includes("3102832920");

          if (isLuxxCarWash) {
            // SRL. 3102832920 (Luxx Car Wash y AvalCar): Cargar exactamente sus 2 cajas oficiales de la BD
            storedCajas = dbCajas.filter((c: any) =>
              (c.branch_name || "").toLowerCase().includes("luxx") ||
              (c.terminal_name || "").toLowerCase().includes("luxx") ||
              (c.terminal_name || "").toLowerCase().includes("aval")
            );
          } else {
            // Para las demás empresas (Grupo G Tres, Empresa 107680742, Gas Express):
            // No mostrar las cajas de Luxx / AvalCar
            try {
              const raw = localStorage.getItem(`facturaos_cajas_${activeEstablishment.id}`);
              if (raw) storedCajas = JSON.parse(raw);
            } catch {}
          }
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
            branch_name: `${activeEstablishment.app_name || activeEstablishment.name || "Sucursal Principal"} - Sede Central`,
            terminal_code: "00001",
            terminal_name: "Caja 1 - Terminal de Cobro Principal",
            next_invoice_number: maxFE + 1,
            next_ticket_number: maxTE + 1,
            next_credit_note_number: maxNC + 1,
            next_debit_note_number: maxND + 1,
            is_active: true,
          },
        ];
      } else if (storedCajas.length === 1) {
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

      // Guardar en localStorage para acceso inmediato del generador de facturas (aislado por empresa)
      localStorage.setItem(
        `facturacr_consecutivos_${activeEstablishment?.id || "default"}_${selectedCajaForNumeracion.branch_code}_${selectedCajaForNumeracion.terminal_code}`,
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
        description: `Sucursal ${selectedCajaForNumeracion.branch_code} · Caja ${selectedCajaForNumeracion.terminal_code}: FE #${numeracionForm.next_invoice_number} | TE #${numeracionForm.next_ticket_number}`,
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

  // ─── CRUD CAJA: ELIMINAR / DESACTIVAR (MODAL IDÉNTICO AL DE EMPRESAS) ────────
  const handleOpenDeleteCajaModal = async (caja: CashRegister) => {
    setDeleteTargetCaja(caja);
    setDeleteConfirmText("");

    const nextFE = Number(caja.next_invoice_number) || 1;
    const nextTE = Number(caja.next_ticket_number) || 1;
    const nextNC = Number(caja.next_credit_note_number) || 1;
    const nextND = Number(caja.next_debit_note_number) || 1;
    const feCount = Math.max(0, nextFE - 1);
    const teCount = Math.max(0, nextTE - 1);
    const ncCount = Math.max(0, nextNC - 1);

    const prefix = `${caja.branch_code}${caja.terminal_code}`;
    let dbCount = 0;
    try {
      const { data: invs } = await supabase
        .from("invoices")
        .select("id, consecutive_number")
        .like("consecutive_number", `${prefix}%`);
      if (invs && invs.length > 0) {
        dbCount = invs.length;
      }
    } catch (e) {
      console.warn("Error consultando facturas de la caja:", e);
    }

    const totalDocs = Math.max(dbCount, feCount + teCount + ncCount);
    setDeleteTargetStats({
      totalDocs,
      feCount,
      teCount,
      ncCount,
      dbCount,
    });
    setShowDeleteCajaModal(true);
  };

  const handleToggleCajaStatus = async (caja: CashRegister, newActive: boolean) => {
    setIsProcessingDelete(true);
    try {
      try {
        await supabase
          .from("cash_registers")
          .update({ is_active: newActive })
          .eq("id", caja.id);
      } catch (e) {
        console.warn("Update Supabase cash_registers:", e);
      }

      const updated = cajasList.map((c) =>
        c.id === caja.id ? { ...c, is_active: newActive } : c
      );
      setCajasList(updated);
      if (activeEstablishment?.id) {
        localStorage.setItem(
          `facturaos_cajas_${activeEstablishment.id}`,
          JSON.stringify(updated)
        );
      }

      toast.success(
        `Caja ${caja.terminal_code} (${caja.terminal_name}) ${
          newActive ? "ACTIVADA" : "DESACTIVADA"
        }. Su historial fiscal y correlatividad permanecen 100% resguardados.`
      );
      setShowDeleteCajaModal(false);
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar estado de la caja");
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const handleConfirmPurgeCaja = async (caja: CashRegister) => {
    if (caja.branch_code === "001" && caja.terminal_code === "00001") {
      toast.error("La Caja Principal (001 / 00001) está protegida por normativa de Hacienda y no puede ser eliminada.");
      return;
    }

    if (deleteTargetStats.totalDocs > 0) {
      const proceed = confirm(
        `⚠️ ADVERTENCIA CRÍTICA DE HACIENDA (DGT-R-033-2019):\n\nEsta caja cuenta con ${deleteTargetStats.totalDocs} comprobantes emitidos. Eliminarla romperá la secuencia correlativa de 20 dígitos.\n\n¿Estás completamente seguro de forzar el borrado definitivo? (Se recomienda en su lugar 'Solo Desactivar')`
      );
      if (!proceed) return;
    }

    setIsProcessingDelete(true);
    try {
      try {
        await supabase.from("cash_registers").delete().eq("id", caja.id);
      } catch (e) {
        console.warn("Delete Supabase cash_registers:", e);
      }

      const updated = cajasList.filter((c) => c.id !== caja.id);
      setCajasList(updated);
      if (activeEstablishment?.id) {
        localStorage.setItem(
          `facturaos_cajas_${activeEstablishment.id}`,
          JSON.stringify(updated)
        );
      }

      toast.success(`Caja ${caja.terminal_code} (${caja.terminal_name}) eliminada definitivamente.`);
      setShowDeleteCajaModal(false);
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar la caja");
    } finally {
      setIsProcessingDelete(false);
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
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] text-muted-foreground">{caja.terminal_name}</span>
                      {caja.is_active === false && (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                          Desactivada
                        </span>
                      )}
                    </div>
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

                      {/* Botón Eliminar o Desactivar Caja (Modal Idéntico al de Empresas) */}
                      {caja.branch_code === "001" && caja.terminal_code === "00001" ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteCajaModal(caja)}
                          className="rounded p-1.5 text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
                          title="Caja Principal (001 / 00001) protegida por Hacienda (Clic para ver opciones)"
                        >
                          <Lock className="h-4 w-4 text-amber-500" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteCajaModal(caja)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                          title="Eliminar o desactivar caja"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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

      {/* ─── MODAL ELIMINAR O DESACTIVAR CAJA (CRUD DELETE - IDÉNTICO AL DE EMPRESAS) ────── */}
      {showDeleteCajaModal && deleteTargetCaja && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Eliminar o Desactivar Caja</h3>
                  <p className="text-xs text-muted-foreground">Gestión de baja y seguridad tributaria para puntos de venta</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteCajaModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
                <p className="font-bold text-foreground text-sm">
                  Caja {deleteTargetCaja.terminal_code} — {deleteTargetCaja.terminal_name}
                </p>
                <p className="text-muted-foreground">
                  Sucursal: <strong>{deleteTargetCaja.branch_code} ({deleteTargetCaja.branch_name})</strong> • Terminal: <strong>{deleteTargetCaja.terminal_code}</strong>
                </p>
                {deleteTargetStats.totalDocs > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Tiene {deleteTargetStats.totalDocs} comprobantes registrados en el sistema:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                        FE: #{deleteTargetStats.feCount}
                      </span>
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        TE: #{deleteTargetStats.teCount}
                      </span>
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-700 dark:text-amber-300">
                        NC: #{deleteTargetStats.ncCount}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium">Esta caja no tiene facturas emitidas aún.</p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1.5">
                <p className="font-bold text-foreground">💡 ¿Qué prefieres hacer?</p>
                <p>
                  • <strong>Desactivar (Recomendado):</strong> Conserva todas sus facturas, tiquetes y numeraciones consecutivas para reportes del contador y Ministerio de Hacienda, pero oculta la caja para evitar emisiones accidentales.
                </p>
                <p>
                  • <strong>Eliminar Definitivamente:</strong> Borra la terminal por completo.
                </p>
                {deleteTargetStats.totalDocs > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-[10.5px] text-amber-900 dark:text-amber-200">
                    ⚠️ <strong>Normativa DGT-R-033-2019 de Hacienda:</strong> Las terminales con facturas emitidas deben conservarse para no romper la secuencia consecutiva de 20 dígitos. Se recomienda usar <strong>Solo Desactivar</strong>.
                  </div>
                )}
              </div>

              {deleteTargetCaja.branch_code === "001" && deleteTargetCaja.terminal_code === "00001" ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-[11px] text-destructive font-semibold">
                  🛡️ La <strong>Caja Principal (001 / 00001)</strong> es obligatoria por requerimiento de la Dirección General de Tributación para todo emisor y no puede ser removida del sistema.
                </div>
              ) : (
                deleteTargetStats.totalDocs > 0 && (
                  <div className="space-y-1 pt-1">
                    <label className="font-semibold text-foreground">
                      Escribe el nombre <span className="font-mono text-destructive font-bold select-all">{deleteTargetCaja.terminal_name}</span> para confirmar:
                    </label>
                    <input
                      type="text"
                      placeholder="Escribe el nombre exacto..."
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-destructive focus:outline-none"
                    />
                  </div>
                )
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowDeleteCajaModal(false)}
                className="rounded-xl border border-border px-4 py-2.5 font-semibold text-muted-foreground hover:bg-muted cursor-pointer text-xs"
              >
                Cancelar
              </button>

              {/* Botón para solo Desactivar */}
              {!(deleteTargetCaja.branch_code === "001" && deleteTargetCaja.terminal_code === "00001") && (
                <button
                  type="button"
                  disabled={isProcessingDelete}
                  onClick={() => handleToggleCajaStatus(deleteTargetCaja, false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-4 py-2.5 font-bold cursor-pointer text-xs disabled:opacity-50"
                >
                  {isProcessingDelete ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                  Solo Desactivar
                </button>
              )}

              {/* Botón para Borrado Definitivo */}
              <button
                type="button"
                disabled={
                  isProcessingDelete ||
                  (deleteTargetCaja.branch_code === "001" && deleteTargetCaja.terminal_code === "00001") ||
                  (deleteTargetStats.totalDocs > 0 &&
                    deleteConfirmText.trim().toLowerCase() !== deleteTargetCaja.terminal_name.trim().toLowerCase())
                }
                onClick={() => handleConfirmPurgeCaja(deleteTargetCaja)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2.5 font-bold shadow-md shadow-destructive/25 cursor-pointer text-xs disabled:opacity-40"
              >
                {isProcessingDelete ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
