import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Building,
  Activity,
  Users,
  Receipt,
  Search,
  RefreshCw,
  Plus,
  LogOut,
  ArrowRight,
  CheckCircle2,
  X,
  Loader2,
  Lock,
  KeyRound,
  Copy,
  Check,
  UserPlus,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  AlertTriangle,
  Power,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { supabase, type Role } from "@/lib/supabase";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/admin")({
  component: CommandCenterStandalone,
});

function CommandCenterStandalone() {
  const { user, isSuperAdmin, isAuthenticated, isLoadingAuth, setActiveEstablishment, loadEstablishments, logout } = useApp();
  const navigate = useNavigate();

  // Protección de ruta: solo Super Admin tiene acceso al Centro de Mando
  useEffect(() => {
    if (!isLoadingAuth) {
      if (!isAuthenticated) {
        navigate({ to: "/login" });
      } else if (!isSuperAdmin) {
        toast.error("Acceso restringido: Solo el Administrador General puede ingresar al Centro de Mando");
        navigate({ to: "/app/dashboard" });
      }
    }
  }, [isLoadingAuth, isAuthenticated, isSuperAdmin, navigate]);

  const [loading, setLoading] = useState(true);
  const [establishmentsList, setEstablishmentsList] = useState<any[]>([]);
  const [invoicesCount, setInvoicesCount] = useState(0);
  const [usersCount, setUsersCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal para crear nueva empresa
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [legalId, setLegalId] = useState("");
  const [legalIdType, setLegalIdType] = useState("02");
  const [activity, setActivity] = useState("620901");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Modal para crear acceso / usuario independiente por empresa
  const [showUserModal, setShowUserModal] = useState(false);
  const [targetEstForUser, setTargetEstForUser] = useState<any | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("admin");
  const [showPasswordToggle, setShowPasswordToggle] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // Modal para editar empresa (CRUD - Update)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTargetEst, setEditTargetEst] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editLegalId, setEditLegalId] = useState("");
  const [editLegalIdType, setEditLegalIdType] = useState("02");
  const [editCode, setEditCode] = useState("");
  const [editActivity, setEditActivity] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editAtvEnv, setEditAtvEnv] = useState("staging");
  const [editApiKey, setEditApiKey] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);

  // Modal para eliminar empresa (CRUD - Delete)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetEst, setDeleteTargetEst] = useState<any | null>(null);
  const [deletingCompany, setDeletingCompany] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Establecimientos y API Keys
      const { data: estData } = await supabase
        .from("establishments")
        .select("*")
        .order("created_at", { ascending: true });

      const { data: keysData } = await supabase.from("api_keys").select("*");

      // 2. Facturas para conteo por empresa
      const { data: invData } = await supabase
        .from("invoices")
        .select("id, establishment_id, app_name");

      // 3. Usuarios totales
      const { count: uCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });

      const totalInvoices = invData?.length || 0;
      setInvoicesCount(totalInvoices);
      setUsersCount(uCount || 10);

      const merged = (estData || []).map((est: any) => {
        const key = (keysData || []).find((k: any) => k.establishment_id === est.id);
        const count = (invData || []).filter(
          (inv: any) => inv.establishment_id === est.id || inv.app_name === (key?.app_name || est.name),
        ).length;

        return {
          ...est,
          apiKey: key?.key_secret,
          invoicesCount: count,
        };
      });

      setEstablishmentsList(merged);
    } catch (err) {
      console.error("Error cargando centro de mando:", err);
      toast.error("No se pudieron cargar las empresas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleIngresar = (est: any) => {
    setActiveEstablishment(est);
    toast.success(`Accediendo a: ${est.app_name || est.name}`);
    navigate({ to: "/app/dashboard" });
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !legalId.trim()) {
      toast.error("Por favor completa el nombre y la cédula.");
      return;
    }

    setCreating(true);
    try {
      const codeSlug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 25);
      const uniqueCode = `${codeSlug}_${Math.random().toString(36).substring(2, 6)}`;
      const apiKeySecret = `fct_live_${codeSlug}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;

      const { data: newEst, error: estErr } = await supabase
        .from("establishments")
        .insert({
          code: uniqueCode,
          name: name.trim(),
          legal_id: legalId.trim(),
          legal_id_type: legalIdType,
          economic_activity_code: activity.trim() || "620901",
          email: email.trim() || null,
          phone: phone.trim() || null,
          atv_environment: "staging",
          is_active: true,
        })
        .select()
        .single();

      if (estErr) throw estErr;

      await supabase.from("api_keys").insert({
        establishment_id: newEst.id,
        app_name: name.trim(),
        key_prefix: apiKeySecret.slice(0, 12),
        key_secret: apiKeySecret,
        environment: "staging",
        is_active: true,
      });

      toast.success(`¡Empresa "${name}" registrada con éxito!`);
      setName("");
      setLegalId("");
      setEmail("");
      setPhone("");
      setShowModal(false);

      await loadEstablishments();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Error al registrar la empresa");
    } finally {
      setCreating(false);
    }
  };

  // ─── CRUD EMPRESA: EDITAR (UPDATE) ─────────────────────────────────────────
  const handleOpenEditModal = (est: any) => {
    setEditTargetEst(est);
    setEditName(est.app_name || est.name || "");
    setEditLegalId(est.legal_id || "");
    setEditLegalIdType(est.legal_id_type || "02");
    setEditCode(est.code || "");
    setEditActivity(est.economic_activity_code || "620901");
    setEditEmail(est.email || "");
    setEditPhone(est.phone || "");
    setEditIsActive(est.is_active !== false);
    setEditAtvEnv(est.atv_environment || "staging");
    setEditApiKey(est.apiKey || "");
    setCopiedKey(false);
    setShowEditModal(true);
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetEst) return;
    if (!editName.trim() || !editLegalId.trim()) {
      toast.error("Por favor completa el nombre y la cédula.");
      return;
    }

    setSavingEdit(true);
    try {
      const { error: updateErr } = await supabase
        .from("establishments")
        .update({
          name: editName.trim(),
          legal_id: editLegalId.trim(),
          legal_id_type: editLegalIdType,
          code: editCode.trim() || editTargetEst.code,
          economic_activity_code: editActivity.trim() || "620901",
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          is_active: editIsActive,
          atv_environment: editAtvEnv,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editTargetEst.id);

      if (updateErr) throw updateErr;

      // Actualizar nombre en api_keys si aplica
      await supabase
        .from("api_keys")
        .update({ app_name: editName.trim(), is_active: editIsActive })
        .eq("establishment_id", editTargetEst.id);

      toast.success(`Empresa "${editName}" actualizada con éxito`);
      setShowEditModal(false);
      await loadEstablishments();
      await loadData();
    } catch (err: any) {
      console.error("Error al actualizar empresa:", err);
      toast.error(err.message || "Error al actualizar la empresa");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!editTargetEst) return;
    const confirmRegen = window.confirm(
      "¿Estás seguro de regenerar la API Key? Si la aplicación externa ya está conectada con la clave anterior, dejará de funcionar hasta que se actualice con la nueva clave."
    );
    if (!confirmRegen) return;

    setRegeneratingKey(true);
    try {
      const codeSlug = editName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 20);
      const newKey = `fct_live_${codeSlug}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;

      // Buscar si ya tiene una api_key registrada
      const { data: existingKey } = await supabase
        .from("api_keys")
        .select("id")
        .eq("establishment_id", editTargetEst.id)
        .maybeSingle();

      if (existingKey) {
        await supabase
          .from("api_keys")
          .update({
            key_prefix: newKey.slice(0, 12),
            key_secret: newKey,
            app_name: editName.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingKey.id);
      } else {
        await supabase.from("api_keys").insert({
          establishment_id: editTargetEst.id,
          app_name: editName.trim(),
          key_prefix: newKey.slice(0, 12),
          key_secret: newKey,
          environment: editAtvEnv,
          is_active: true,
        });
      }

      setEditApiKey(newKey);
      toast.success("Nueva API Key generada y vinculada.");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Error al regenerar API Key");
    } finally {
      setRegeneratingKey(false);
    }
  };

  // ─── CRUD EMPRESA: ELIMINAR (DELETE / DEACTIVATE) ───────────────────────────
  const handleOpenDeleteModal = (est: any) => {
    setDeleteTargetEst(est);
    setDeleteConfirmText("");
    setShowDeleteModal(true);
  };

  const handleDeleteCompany = async (forcePurge: boolean = false) => {
    if (!deleteTargetEst) return;
    const isHub =
      deleteTargetEst.code?.includes("g3") ||
      deleteTargetEst.name?.toLowerCase().includes("grupo g tres");

    if (isHub) {
      toast.error("La empresa principal (Hub) está protegida y no puede ser eliminada.");
      return;
    }

    setDeletingCompany(true);
    try {
      if (!forcePurge && deleteTargetEst.invoicesCount > 0) {
        // Desactivación segura para preservar registros fiscales
        const { error: deactErr } = await supabase
          .from("establishments")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", deleteTargetEst.id);

        if (deactErr) throw deactErr;

        await supabase
          .from("api_keys")
          .update({ is_active: false })
          .eq("establishment_id", deleteTargetEst.id);

        toast.success(`La empresa "${deleteTargetEst.app_name || deleteTargetEst.name}" ha sido DESACTIVADA.`);
      } else {
        // Eliminación definitiva en cascada
        await supabase.from("api_keys").delete().eq("establishment_id", deleteTargetEst.id);
        await supabase.from("invoices").delete().eq("establishment_id", deleteTargetEst.id);

        const { error: delErr } = await supabase
          .from("establishments")
          .delete()
          .eq("id", deleteTargetEst.id);

        if (delErr) throw delErr;

        toast.success(`Empresa "${deleteTargetEst.app_name || deleteTargetEst.name}" eliminada definitivamente.`);
      }

      setShowDeleteModal(false);
      await loadEstablishments();
      await loadData();
    } catch (err: any) {
      console.error("Error al eliminar empresa:", err);
      toast.error(err.message || "Error al procesar la eliminación");
    } finally {
      setDeletingCompany(false);
    }
  };

  const handleToggleStatus = async (est: any) => {
    const newStatus = est.is_active === false ? true : false;
    try {
      const { error } = await supabase
        .from("establishments")
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq("id", est.id);

      if (error) throw error;

      await supabase
        .from("api_keys")
        .update({ is_active: newStatus })
        .eq("establishment_id", est.id);

      toast.success(
        `Empresa "${est.app_name || est.name}" ${newStatus ? "ACTIVADA" : "DESACTIVADA"}`
      );
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar estado");
    }
  };

  const handleOpenCreateUserModal = (est: any) => {
    setTargetEstForUser(est);
    setNewUserName(`Cajero / Operador`);
    setNewUserEmail(est.email || "");
    setNewUserPassword("");
    setNewUserRole("admin");
    setShowPasswordToggle(false);
    setShowUserModal(true);
  };

  const handleCreateUserForEstablishment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEstForUser) return;
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error("Por favor completa el correo y la contraseña");
      return;
    }
    if (newUserPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setCreatingUser(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

      // Usar cliente aislado para NO cerrar ni sobreescribir la sesión activa del Super Admin
      const isolatedAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const cleanEmail = newUserEmail.trim().toLowerCase();
      const cleanName = newUserName.trim() || targetEstForUser.name;

      // 1. Crear usuario en Supabase Auth con metadata amarrada al establecimiento
      const { data: authData, error: authErr } = await isolatedAuthClient.auth.signUp({
        email: cleanEmail,
        password: newUserPassword.trim(),
        options: {
          data: {
            full_name: cleanName,
            role: newUserRole,
            establishment_id: targetEstForUser.id,
            establishment_code: targetEstForUser.code,
            establishment_name: targetEstForUser.name,
          },
        },
      });

      if (authErr) {
        if (authErr.message.includes("already registered") || authErr.message.includes("User already registered")) {
          toast.error("Este correo ya está registrado en el sistema. Puedes usar otro correo o reasignarlo.");
        } else {
          toast.error(`Error al registrar usuario: ${authErr.message}`);
        }
        return;
      }

      const newUserId = authData.user?.id;

      // 2. Crear o actualizar registro en la tabla profiles
      if (newUserId) {
        const { error: profErr } = await supabase.from("profiles").upsert({
          id: newUserId,
          email: cleanEmail,
          full_name: cleanName,
          role: newUserRole,
        });
        if (profErr) {
          console.warn("Advertencia en profiles upsert:", profErr);
        }
      }

      // 3. Sincronizar el email en la tabla establishments si estaba vacío o cambió
      if (cleanEmail !== targetEstForUser.email?.toLowerCase()) {
        await supabase
          .from("establishments")
          .update({ email: cleanEmail })
          .eq("id", targetEstForUser.id);
      }

      toast.success(
        `¡Acceso creado con éxito para "${targetEstForUser.app_name || targetEstForUser.name}"! Ahora puede ingresar en /login con ${cleanEmail}.`
      );
      setShowUserModal(false);
      await loadData();
    } catch (err: any) {
      console.error("Error al crear credenciales de empresa:", err);
      toast.error(err?.message || "Ocurrió un error al crear el acceso");
    } finally {
      setCreatingUser(false);
    }
  };

  const filtered = establishmentsList.filter((e) => {
    const q = searchTerm.toLowerCase();
    return (
      (e.app_name || e.name || "").toLowerCase().includes(q) ||
      (e.legal_id || "").includes(q) ||
      (e.code || "").toLowerCase().includes(q)
    );
  });

  const getInitials = (str: string) => {
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return str.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased pb-16">
      {/* ─── BARRA SUPERIOR / NAVBAR ────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-black tracking-tight text-slate-900 uppercase">
                Centro de Mando
              </span>
              <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 px-2.5 py-0.5 text-xs font-semibold">
                SaaS Multi-Empresa
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-sm font-semibold transition-all shadow-xs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
              <span>Actualizar</span>
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-semibold shadow-md shadow-blue-600/25 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>+ Nueva Empresa</span>
            </button>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 px-3.5 py-2.5 text-sm font-medium transition-all shadow-xs"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── CONTENIDO PRINCIPAL ────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* ─── TARJETAS KPI (ESTILO IMAGEN DE REFERENCIA) ──────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Empresas
              </p>
              <p className="text-3xl font-black text-slate-900 mt-1">
                {establishmentsList.length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Organizaciones conectadas</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building className="h-6 w-6" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Activas
              </p>
              <p className="text-3xl font-black text-slate-900 mt-1">
                {establishmentsList.filter((e) => e.is_active !== false).length}
              </p>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                {establishmentsList.filter((e) => e.is_active !== false).length} de {establishmentsList.length} activas
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="h-6 w-6" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Usuarios Totales
              </p>
              <p className="text-3xl font-black text-slate-900 mt-1">{usersCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">Administradores, cajeros y staff</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Comprobantes Emitidos
              </p>
              <p className="text-3xl font-black text-slate-900 mt-1">{invoicesCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">En toda la red FacturaOS</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* ─── DIRECTORIO DE EMPRESAS (ESTILO IMAGEN 3) ─────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Directorio de Empresas</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulta todas las organizaciones activas y accede a su aplicación de facturación.
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre, código, cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-600">No se encontraron empresas</p>
              <p className="text-xs text-slate-400 mt-1">Prueba con otro término de búsqueda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((est) => {
                const initials = getInitials(est.app_name || est.name);
                const isHub = est.code?.includes("g3") || est.name?.toLowerCase().includes("grupo g tres");

                return (
                  <div
                    key={est.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-500/40 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left info */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/20">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-900 truncate">
                            {est.app_name || est.name}
                          </h3>
                          <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-semibold uppercase">
                            {isHub ? "Empresa / Facturación" : "API REST"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                          <span>
                            <strong className="text-slate-700">CÓDIGO:</strong> {est.code || "0001"}
                          </span>
                          <span>
                            <strong className="text-slate-700">CÉDULA:</strong> {est.legal_id}
                          </span>
                          <span>
                            <strong className="text-slate-700">ACTIVIDAD:</strong> {est.economic_activity_code}
                          </span>
                          {est.email && <span>{est.email}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right stats & action button */}
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 sm:gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                      <div className="text-center px-1.5">
                        <p className="text-base font-black text-slate-900">{est.invoicesCount}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Facturas</p>
                      </div>

                      {/* Estado con switch de 1 clic */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(est);
                        }}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer ${
                          est.is_active !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                        title="Clic para alternar estado Activo / Inactivo"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            est.is_active !== false ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        <span>{est.is_active !== false ? "ACTIVO" : "INACTIVO"}</span>
                      </button>

                      {/* Botón Crear Acceso */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCreateUserModal(est);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs hover:border-indigo-300"
                        title={`Crear usuario independiente para ${est.app_name || est.name}`}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>+ Crear Acceso</span>
                      </button>

                      {/* Botón Editar Empresa (CRUD Update) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(est);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs hover:border-slate-300 hover:text-blue-600"
                        title="Editar datos de la empresa o ver/regenerar API Key"
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                        <span>Editar</span>
                      </button>

                      {/* Botón Eliminar Empresa (CRUD Delete - protegido para Hub) */}
                      {!isHub ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteModal(est);
                          }}
                          className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 p-2 text-xs font-bold transition-all cursor-pointer shadow-xs hover:border-red-300"
                          title="Eliminar o desactivar empresa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span
                          className="p-2 text-slate-300 cursor-not-allowed inline-flex items-center"
                          title="Empresa Hub principal (protegida contra eliminación)"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </span>
                      )}

                      {/* Botón Ingresar */}
                      <button
                        onClick={() => handleIngresar(est)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                      >
                        <span>Ingresar</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ─── MODAL NUEVA EMPRESA ────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Registrar Nueva Empresa / App</h3>
                  <p className="text-xs text-slate-400">Se creará su espacio y su API Key correspondiente.</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nombre de la Empresa o Aplicación *</label>
                <input
                  required
                  placeholder="Ej. Tienda Costa Rica, GymPass..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Tipo de Identificación</label>
                  <select
                    value={legalIdType}
                    onChange={(e) => setLegalIdType(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-2 text-xs bg-white focus:border-blue-600 focus:outline-none"
                  >
                    <option value="02">02 - Cédula Jurídica</option>
                    <option value="01">01 - Cédula Física</option>
                    <option value="03">03 - DIMEX</option>
                    <option value="04">04 - NITE</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Número de Cédula *</label>
                  <input
                    required
                    placeholder="3-101-xxxxxx"
                    value={legalId}
                    onChange={(e) => setLegalId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Actividad Económica (CIIU)</label>
                <input
                  placeholder="620901"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="admin@empresa.cr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Teléfono</label>
                  <input
                    placeholder="+506 2222-3344"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 font-bold shadow-md shadow-blue-600/25"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Registrar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL CREAR ACCESO / USUARIO INDEPENDIENTE ───────────────────── */}
      {showUserModal && targetEstForUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Crear Acceso / Usuario</h3>
                  <p className="text-xs text-slate-500">
                    Credenciales independientes vinculadas exclusivamente a esta empresa.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Target Establishment info badge */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Empresa Asignada</p>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {targetEstForUser.app_name || targetEstForUser.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  Cédula: {targetEstForUser.legal_id} • Código: {targetEstForUser.code || "0001"}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-indigo-600 text-white px-2.5 py-1 text-[10px] font-bold uppercase">
                Aislado 100%
              </span>
            </div>

            <form onSubmit={handleCreateUserForEstablishment} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nombre del Encargado o Puesto *</label>
                <input
                  required
                  placeholder="Ej: Cajero BarberApp, Dr. Rodríguez, Despachador..."
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Correo Electrónico de Ingreso *</label>
                <input
                  type="email"
                  required
                  placeholder="ej: barberia@gmail.com o cajero@empresa.cr"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-indigo-600 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400">
                  El usuario colocará este correo en la pantalla de inicio de sesión (/login).
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Contraseña de Acceso *</label>
                <div className="relative">
                  <input
                    type={showPasswordToggle ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 pl-3 pr-10 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordToggle(!showPasswordToggle)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPasswordToggle ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Rol Asignado en la Empresa</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as Role)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-2 text-xs bg-white focus:border-indigo-600 focus:outline-none"
                >
                  <option value="admin">Administrador de Empresa (Facturación, Clientes, Reportes, Catálogo)</option>
                  <option value="cajero">Cajero / Facturador (Emisión de Facturas y Tiquetes)</option>
                  <option value="vendedor">Vendedor (Emisión de Comprobantes)</option>
                </select>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-[11px] text-emerald-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Sin mezclas ni preguntas</span>
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  Al guardar, este usuario podrá ingresar en <strong>/login</strong> e irá directo y exclusivamente a <strong>{targetEstForUser.app_name || targetEstForUser.name}</strong>. Cero dropdowns y total discreción fiscal.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 font-bold shadow-md shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                >
                  {creatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Guardar y Crear Acceso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL EDITAR EMPRESA (CRUD - UPDATE) ───────────────────────────── */}
      {showEditModal && editTargetEst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Editar Empresa / Aplicación</h3>
                  <p className="text-xs text-slate-400">
                    Modifica los datos fiscales, estado operativo o credenciales de conexión.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCompany} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nombre de la Empresa o Aplicación *</label>
                <input
                  required
                  placeholder="Ej. Tienda Costa Rica, GymPass..."
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Tipo de Identificación</label>
                  <select
                    value={editLegalIdType}
                    onChange={(e) => setEditLegalIdType(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-2 text-xs bg-white focus:border-blue-600 focus:outline-none"
                  >
                    <option value="02">02 - Cédula Jurídica</option>
                    <option value="01">01 - Cédula Física</option>
                    <option value="03">03 - DIMEX</option>
                    <option value="04">04 - NITE</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Número de Cédula *</label>
                  <input
                    required
                    placeholder="3-101-xxxxxx"
                    value={editLegalId}
                    onChange={(e) => setEditLegalId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Código Slug Interno</label>
                  <input
                    placeholder="ej: gas_express"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-blue-600 focus:outline-none bg-slate-50 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Actividad Económica (CABYS/CIIU)</label>
                  <input
                    placeholder="620901"
                    value={editActivity}
                    onChange={(e) => setEditActivity(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="admin@empresa.cr"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Teléfono</label>
                  <input
                    placeholder="+506 2222-3344"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Entorno ATV Hacienda</label>
                  <select
                    value={editAtvEnv}
                    onChange={(e) => setEditAtvEnv(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-2 text-xs bg-white focus:border-blue-600 focus:outline-none"
                  >
                    <option value="staging">Staging (Pruebas / Sandbox)</option>
                    <option value="production">Producción (Hacienda Real)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Estado del Servicio</label>
                  <select
                    value={editIsActive ? "true" : "false"}
                    onChange={(e) => setEditIsActive(e.target.value === "true")}
                    className="h-10 w-full rounded-xl border border-slate-200 px-2 text-xs bg-white focus:border-blue-600 focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="true">🟢 Activo (Puede facturar y acceder)</option>
                    <option value="false">🔴 Inactivo (Servicio suspendido)</option>
                  </select>
                </div>
              </div>

              {/* API Key Box */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <KeyRound className="h-4 w-4 text-blue-600" />
                    <span>API Key de Conexión</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegenerateApiKey}
                    disabled={regeneratingKey}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {regeneratingKey ? "Regenerando..." : "Regenerar Clave"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={editApiKey || "No asignada aún"}
                    className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 font-mono text-[11px] text-slate-700 focus:outline-none"
                  />
                  {editApiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(editApiKey);
                        setCopiedKey(true);
                        toast.success("API Key copiada al portapapeles");
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer shadow-xs"
                      title="Copiar API Key"
                    >
                      {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey ? "Copiada" : "Copiar"}</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Usa esta clave en el header <code>Authorization: Bearer fct_live_...</code> de la app externa.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 font-bold shadow-md shadow-blue-600/25 cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL ELIMINAR EMPRESA (CRUD - DELETE) ─────────────────────────── */}
      {showDeleteModal && deleteTargetEst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Eliminar o Desactivar Empresa</h3>
                <p className="text-xs text-slate-500">Gestión de baja para organizaciones</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 space-y-2">
                <p className="font-bold text-slate-900 text-sm">
                  {deleteTargetEst.app_name || deleteTargetEst.name}
                </p>
                <p className="text-slate-600">
                  Cédula: <strong>{deleteTargetEst.legal_id}</strong> • Código: <strong>{deleteTargetEst.code}</strong>
                </p>
                {deleteTargetEst.invoicesCount > 0 ? (
                  <div className="flex items-center gap-2 text-amber-700 font-semibold pt-1">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Tiene {deleteTargetEst.invoicesCount} facturas registradas en el sistema.</span>
                  </div>
                ) : (
                  <p className="text-emerald-700 font-medium">Esta empresa no tiene facturas emitidas aún.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">💡 ¿Qué prefieres hacer?</p>
                <p>
                  • <strong>Desactivar:</strong> Conserva todas sus facturas y clientes para reportes del contador, pero bloquea el acceso y la emisión de nuevos comprobantes.
                </p>
                <p>
                  • <strong>Eliminar Definitivamente:</strong> Borra la empresa, sus API keys y registros asociados.
                </p>
              </div>

              {deleteTargetEst.invoicesCount > 0 && (
                <div className="space-y-1 pt-1">
                  <label className="font-semibold text-slate-700">
                    Escribe el nombre <span className="font-mono text-red-600 font-bold select-all">{deleteTargetEst.app_name || deleteTargetEst.name}</span> para confirmar borrado definitivo:
                  </label>
                  <input
                    type="text"
                    placeholder="Escribe el nombre exacto..."
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-red-600 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer text-xs"
              >
                Cancelar
              </button>

              {/* Botón para solo Desactivar */}
              {deleteTargetEst.is_active !== false && (
                <button
                  type="button"
                  disabled={deletingCompany}
                  onClick={() => handleDeleteCompany(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 px-4 py-2.5 font-bold cursor-pointer text-xs disabled:opacity-50"
                >
                  {deletingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4 text-amber-600" />}
                  Solo Desactivar
                </button>
              )}

              {/* Botón para Borrado Definitivo */}
              <button
                type="button"
                disabled={
                  deletingCompany ||
                  (deleteTargetEst.invoicesCount > 0 &&
                    deleteConfirmText.trim().toLowerCase() !==
                      (deleteTargetEst.app_name || deleteTargetEst.name).trim().toLowerCase())
                }
                onClick={() => handleDeleteCompany(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 font-bold shadow-md shadow-red-600/25 cursor-pointer text-xs disabled:opacity-40"
              >
                {deletingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
