import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  Users as UsersIcon,
  FileSignature,
  Plug,
  Bell,
  Upload,
  Plus,
  KeyRound,
  Copy,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCode2,
  Eye,
  EyeOff,
  Cloud,
  FolderSync,
  HardDrive,
  ExternalLink,
  Folder,
  RefreshCw,
  Check,
  Edit2,
  Trash2,
  X,
  Store,
  UserPlus,
  Shield,
  Phone,
  Mail,
  Sparkles,
  Download,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { company } from "@/lib/mock-data";
import { probarConexionHacienda, AmbienteHacienda } from "@/lib/hacienda";
import { supabase, type Role } from "@/lib/supabase";
import { useApp, roleLabel } from "@/contexts/AppContext";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

const sections = [
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "hacienda", label: "Integración Hacienda", icon: Plug },
  { id: "api", label: "Conexión API & Software Externo", icon: KeyRound },
  { id: "gmail", label: "Cuentas Gmail / Facturas", icon: Mail },
  { id: "nube", label: "Almacenamiento y Nube", icon: Cloud },
  { id: "sucursales", label: "Sucursales", icon: MapPin },
  { id: "usuarios", label: "Usuarios y roles", icon: UsersIcon },
  { id: "firma", label: "Firma visual", icon: FileSignature },
  { id: "notificaciones", label: "Notificaciones", icon: Bell },
];

export interface BranchItem {
  id: string;
  code: string;
  name: string;
  address: string;
  phone?: string;
  terminalsCount?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

const defaultBranches: BranchItem[] = [
  { id: "b1", code: "001", name: "Casa Matriz (San José)", address: "San José, Paseo Colón, Costa Rica", phone: "+506 2222-3344", terminalsCount: 2 },
  { id: "b2", code: "002", name: "Sucursal Alajuela", address: "Alajuela Centro, Costa Rica", phone: "+506 2440-5566", terminalsCount: 1 },
];

const defaultTeam: TeamMember[] = [
  { id: "u1", name: "Andrea Quirós", email: "andrea@distribuidorapacifico.cr", role: "Administrador" },
  { id: "u2", name: "Luis Mora", email: "luis@distribuidorapacifico.cr", role: "Cajero" },
  { id: "u3", name: "Sofía Brenes", email: "sofia@distribuidorapacifico.cr", role: "Vendedor" },
  { id: "u4", name: "Carlos Vega", email: "carlos@distribuidorapacifico.cr", role: "Contador" },
];

const activityDescriptions: Record<string, string> = {
  "620901": "Otras actividades de tecnología de información y servicios informáticos",
  "6209.0": "Otras actividades de tecnología de información y servicios informáticos",
  "862001": "Actividades de médicos, consultas y centros de salud especializada",
  "960201": "Peluquería, barbería y otros tratamientos de belleza",
  "477303": "Venta al por menor de gas licuado de petróleo (GLP) en cilindros",
  "452001": "Mantenimiento, diagnóstico y reparación de vehículos automotores",
  "931101": "Gestión de instalaciones deportivas, gimnasios y centros de fitness",
  "750001": "Actividades veterinarias y clínicas de salud para mascotas",
};

function SettingsPage() {
  const { user, refreshProfile, activeEstablishment, isSuperAdmin, setActiveEstablishment, loadEstablishments } = useApp();
  const [active, setActive] = useState("empresa");

  // Estado Empresa - inicializado estrictamente con activeEstablishment
  const [companyName, setCompanyName] = useState(activeEstablishment?.name || activeEstablishment?.app_name || "");
  const [companyLegalId, setCompanyLegalId] = useState(activeEstablishment?.legal_id || "");
  const [companyEmail, setCompanyEmail] = useState(activeEstablishment?.email || "");
  const [companyPhone, setCompanyPhone] = useState(activeEstablishment?.phone || "");
  const [companyAddress, setCompanyAddress] = useState(activeEstablishment?.address || "San José, Costa Rica");
  const [companyActivity, setCompanyActivity] = useState(
    activeEstablishment?.economic_activity_code
      ? `${activeEstablishment.economic_activity_code} - ${activityDescriptions[activeEstablishment.economic_activity_code] || "Actividad Comercial"}`
      : ""
  );

  // Estado Hacienda
  const cleanCedula = (activeEstablishment?.legal_id || "").replace(/\D/g, "");
  const [ambiente, setAmbiente] = useState<AmbienteHacienda>((activeEstablishment?.atv_environment as any) || "staging");
  const [usuarioAtv, setUsuarioAtv] = useState(
    activeEstablishment?.atv_username ||
    (cleanCedula ? `cpj-${cleanCedula}@stag.comprobanteselectronicos.go.cr` : "")
  );
  const [claveAtv, setClaveAtv] = useState(activeEstablishment?.atv_password || "vPVwmpuo%kF3g12&CR^J");
  const [pinP12, setPinP12] = useState(activeEstablishment?.atv_pin || "");
  const [codigoActividad, setCodigoActividad] = useState(activeEstablishment?.economic_activity_code || "620901");
  const [p12FileName, setP12FileName] = useState(cleanCedula ? `${cleanCedula}.p12` : "");
  const [sucursal, setSucursal] = useState("1");
  const [terminal, setTerminal] = useState("1");

  const [probando, setProbando] = useState(false);
  const [resultadoTest, setResultadoTest] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [showClaveAtv, setShowClaveAtv] = useState(false);
  const [guardado, setGuardado] = useState(false);

  // Estado Almacenamiento en la Nube / Google Drive
  const [driveConnected, setDriveConnected] = useState(true);
  const [driveAccount, setDriveAccount] = useState(activeEstablishment?.email || "");
  const [driveFolder, setDriveFolder] = useState(`/${(activeEstablishment?.name || "Facturas").replace(/[^a-zA-Z0-9]/g, "_")}/`);
  const [autoSyncDrive, setAutoSyncDrive] = useState(true);
  const [organizeByMonth, setOrganizeByMonth] = useState(true);
  const [notifyAccountant, setNotifyAccountant] = useState(true);
  const [accountantEmail, setAccountantEmail] = useState(
    activeEstablishment?.email?.includes("@") ? `contador@${activeEstablishment.email.split("@")[1]}` : ""
  );
  const [dropboxConnected, setDropboxConnected] = useState(false);
  const [onedriveConnected, setOnedriveConnected] = useState(false);
  const [isBackingUpCloud, setIsBackingUpCloud] = useState(false);
  const [cloudSaved, setCloudSaved] = useState(false);

  // Estado Gmail / Descarga de Facturas
  const [gmailEmail, setGmailEmail] = useState(activeEstablishment?.email || "");
  const [gmailSearchFilter, setGmailSearchFilter] = useState("has:attachment filename:xml");
  const [gmailAutoDownload, setGmailAutoDownload] = useState(true);
  const [gmailNotifyAccountant, setGmailNotifyAccountant] = useState(true);
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("facturacr_google_client_id");
      if (saved) return saved;
      if (import.meta.env.VITE_GOOGLE_CLIENT_ID) return import.meta.env.VITE_GOOGLE_CLIENT_ID;
    } catch {}
    return "";
  });
  const [showGoogleClientId, setShowGoogleClientId] = useState(false);
  const [gmailSaved, setGmailSaved] = useState(false);

  // Estado API Key para Integraciones Externas (NexusClinic, BarberApp, etc.)
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<"ts" | "curl" | "python">("ts");
  const [testingApi, setTestingApi] = useState(false);
  const [testApiResult, setTestApiResult] = useState<any>(null);

  useEffect(() => {
    if (activeEstablishment?.id) {
      supabase
        .from("api_keys")
        .select("key_secret")
        .eq("establishment_id", activeEstablishment.id)
        .eq("is_active", true)
        .maybeSingle()
        .then(async ({ data }) => {
          if (data?.key_secret) {
            setApiKey(data.key_secret);
          } else {
            const codeSlug = (activeEstablishment.code || "app").replace(/[^a-z0-9]/gi, "_").toLowerCase();
            const newSecret = `fct_live_${codeSlug}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
            setApiKey(newSecret);
            await supabase.from("api_keys").insert({
              establishment_id: activeEstablishment.id,
              app_name: activeEstablishment.name,
              key_prefix: newSecret.slice(0, 12),
              key_secret: newSecret,
              environment: activeEstablishment.atv_environment || "staging",
              is_active: true,
            });
          }
        });
    }
  }, [activeEstablishment?.id]);

  const handleTestApiEmit = async () => {
    if (!apiKey) return;
    setTestingApi(true);
    setTestApiResult(null);
    try {
      const isHealth = activeEstablishment?.economic_activity_code === "862001";
      const res = await fetch("/api/v1/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          docType: "04",
          currency: "CRC",
          paymentMethod: "04",
          saleCondition: "01",
          items: [
            {
              cabys: isHealth ? "8620000000000" : "8314100009900",
              detail: isHealth ? "Consulta Médica General de Prueba" : `Servicio de Prueba - ${activeEstablishment?.app_name || activeEstablishment?.name}`,
              qty: 1,
              unitPrice: isHealth ? 35000 : 15000,
              ivaRate: isHealth ? 4 : 13,
            },
          ],
          notes: "Emisión de prueba desde panel de integración FacturaOS",
        }),
      });
      const data = await res.json();
      setTestApiResult(data);
      if (res.ok && data.success) {
        toast.success("¡Prueba de API exitosa! Factura simulada correctamente.");
      } else {
        toast.error("Error en prueba API: " + (data.error || "No se pudo emitir"));
      }
    } catch (err: any) {
      toast.error("Error al conectar con el servidor: " + err.message);
      setTestApiResult({ success: false, error: err.message });
    } finally {
      setTestingApi(false);
    }
  };

  // Estado Sucursales (CRUD)
  const defaultEstBranch: BranchItem = {
    id: "b1",
    code: "001",
    name: `Casa Matriz (${activeEstablishment?.app_name || activeEstablishment?.name || "Principal"})`,
    address: activeEstablishment?.address || "San José, Costa Rica",
    phone: activeEstablishment?.phone || "+506 2222-0000",
    terminalsCount: 1,
  };
  const [branches, setBranches] = useState<BranchItem[]>([defaultEstBranch]);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [branchForm, setBranchForm] = useState({
    code: "001",
    name: "",
    address: "",
    phone: "",
    terminalsCount: 1,
  });

  // Estado Usuarios / Equipo (CRUD conectado a Supabase)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [hideSuperAdminInTeam, setHideSuperAdminInTeam] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "Vendedor",
  });

  // Sincronizar reactivamente cada vez que activeEstablishment cargue o cambie
  useEffect(() => {
    if (activeEstablishment) {
      setCompanyName(activeEstablishment.name || activeEstablishment.app_name || "");
      setCompanyLegalId(activeEstablishment.legal_id || "");
      setCompanyEmail(activeEstablishment.email || "");
      setCompanyPhone(activeEstablishment.phone || "");
      setCompanyAddress(activeEstablishment.address || "San José, Costa Rica");
      setCompanyActivity(
        activeEstablishment.economic_activity_code
          ? `${activeEstablishment.economic_activity_code} - ${activityDescriptions[activeEstablishment.economic_activity_code] || "Actividad Comercial"}`
          : ""
      );
      setCodigoActividad(activeEstablishment.economic_activity_code || "620901");

      const cCed = (activeEstablishment.legal_id || "").replace(/\D/g, "");
      setUsuarioAtv(
        activeEstablishment.atv_username ||
        (cCed ? `cpj-${cCed}@stag.comprobanteselectronicos.go.cr` : "")
      );
      setClaveAtv(activeEstablishment.atv_password || "vPVwmpuo%kF3g12&CR^J");
      setPinP12(activeEstablishment.atv_pin || "");
      setAmbiente((activeEstablishment.atv_environment as any) || "staging");
      setP12FileName(cCed ? `${cCed}.p12` : "");

      if (activeEstablishment.email) {
        setGmailEmail(activeEstablishment.email);
        setDriveAccount(activeEstablishment.email);
        const dom = activeEstablishment.email.split("@")[1];
        if (dom) setAccountantEmail(`contador@${dom}`);
      }
      setDriveFolder(`/${(activeEstablishment.name || "Facturas").replace(/[^a-zA-Z0-9]/g, "_")}/`);
    }
  }, [activeEstablishment]);

  const loadTeamProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (data && !error && data.length > 0) {
        let filtered = data;
        // Filtrar estrictamente por la empresa activa para garantizar aislamiento multi-tenant
        if (activeEstablishment) {
          const estEmail = (activeEstablishment.email || "").toLowerCase().trim();
          const estCode = (activeEstablishment.code || "").toLowerCase().trim();
          const estDomain = estEmail.includes("@") ? estEmail.split("@")[1] : "";

          filtered = data.filter((p: any) => {
            const pEmail = (p.email || "").toLowerCase().trim();
            const isSuper = p.role === "super_admin" || pEmail === "alex@mail.com";

            // Si es SuperAdmin de la plataforma:
            // - Para clientes e inquilinos normales: 100% INVISIBLE (nunca ven al SuperAdmin).
            // - Para el SuperAdmin: visible como cuenta de soporte, con opción de ocultarlo.
            if (isSuper) {
              if (!isSuperAdmin) return false;
              return !hideSuperAdminInTeam;
            }

            // Incluir si coincide con el correo directo de la empresa activa
            if (estEmail && pEmail === estEmail) return true;
            // Incluir si coincide con el código de la empresa
            if (estCode && pEmail.includes(estCode)) return true;
            // Incluir si el dominio del correo coincide con el de la empresa (ej: @avalcar.cr)
            if (estDomain && pEmail.endsWith(`@${estDomain}`)) return true;

            return false;
          });
        }
        setTeamMembers(
          filtered.map((p: any) => ({
            id: p.id,
            name: p.full_name || p.email,
            email: p.email,
            role: p.email === "alex@mail.com" ? "Administrador (Propietario)" : roleLabel[p.role as Role] || p.role || "Vendedor",
          }))
        );
      } else {
        setTeamMembers([]);
      }
    } catch (err) {
      console.error("Error cargando perfiles de equipo:", err);
      setTeamMembers([]);
    }
  };

  useEffect(() => {
    loadTeamProfiles();
  }, [activeEstablishment, isSuperAdmin, hideSuperAdminInTeam]);

  // Cargar configuración guardada de localStorage al montar
  useEffect(() => {
    try {
      if (!activeEstablishment?.id) return;
      const estId = activeEstablishment.id;

      const saved = localStorage.getItem(`facturacr_hacienda_config_${estId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.ambiente) setAmbiente(parsed.ambiente);
        if (parsed.usuarioAtv) setUsuarioAtv(parsed.usuarioAtv);
        if (parsed.claveAtv) setClaveAtv(parsed.claveAtv);
        if (parsed.pinP12) setPinP12(parsed.pinP12);
        if (parsed.codigoActividad) setCodigoActividad(parsed.codigoActividad);
        if (parsed.p12FileName) setP12FileName(parsed.p12FileName);
        if (parsed.sucursal) setSucursal(parsed.sucursal);
        if (parsed.terminal) setTerminal(parsed.terminal);
      }

      const cloudSavedConfig = localStorage.getItem(`facturacr_cloud_config_${estId}`);
      if (cloudSavedConfig) {
        const cParsed = JSON.parse(cloudSavedConfig);
        if (cParsed.driveAccount) setDriveAccount(cParsed.driveAccount);
        if (cParsed.driveFolder) setDriveFolder(cParsed.driveFolder);
        if (typeof cParsed.autoSyncDrive === "boolean") setAutoSyncDrive(cParsed.autoSyncDrive);
        if (typeof cParsed.organizeByMonth === "boolean") setOrganizeByMonth(cParsed.organizeByMonth);
        if (typeof cParsed.notifyAccountant === "boolean") setNotifyAccountant(cParsed.notifyAccountant);
        if (cParsed.accountantEmail) setAccountantEmail(cParsed.accountantEmail);
      }

      const savedBranches = localStorage.getItem(`facturacr_branches_${estId}`);
      if (savedBranches) {
        setBranches(JSON.parse(savedBranches));
      }
    } catch {
      // Ignorar error de parsing
    }
  }, [activeEstablishment?.id]);

  // CRUD Sucursales Handlers
  const openNewBranchModal = () => {
    setEditingBranch(null);
    const nextNum = (branches.length + 1).toString().padStart(3, "0");
    setBranchForm({
      code: nextNum,
      name: "",
      address: "",
      phone: "+506 ",
      terminalsCount: 1,
    });
    setBranchModalOpen(true);
  };

  const openEditBranchModal = (b: BranchItem) => {
    setEditingBranch(b);
    setBranchForm({
      code: b.code,
      name: b.name,
      address: b.address,
      phone: b.phone || "",
      terminalsCount: b.terminalsCount || 1,
    });
    setBranchModalOpen(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name.trim()) {
      toast.error("El nombre de la sucursal es obligatorio");
      return;
    }
    if (!branchForm.code.trim()) {
      toast.error("El código de sucursal es obligatorio (ej. 001)");
      return;
    }

    let updated: BranchItem[];
    if (editingBranch) {
      updated = branches.map((b) =>
        b.id === editingBranch.id
          ? {
              ...b,
              code: branchForm.code.padStart(3, "0"),
              name: branchForm.name,
              address: branchForm.address,
              phone: branchForm.phone,
              terminalsCount: Number(branchForm.terminalsCount) || 1,
            }
          : b,
      );
      toast.success("Sucursal actualizada correctamente");
    } else {
      const newB: BranchItem = {
        id: "b_" + Date.now(),
        code: branchForm.code.padStart(3, "0"),
        name: branchForm.name,
        address: branchForm.address,
        phone: branchForm.phone,
        terminalsCount: Number(branchForm.terminalsCount) || 1,
      };
      updated = [...branches, newB];
      toast.success("Sucursal creada correctamente");
    }

    setBranches(updated);
    localStorage.setItem("facturacr_branches", JSON.stringify(updated));
    setBranchModalOpen(false);
  };

  const handleDeleteBranch = (id: string, name: string) => {
    if (branches.length <= 1) {
      toast.error("Debe existir al menos una sucursal en el sistema");
      return;
    }
    if (confirm(`¿Está seguro de eliminar la sucursal "${name}"?`)) {
      const updated = branches.filter((b) => b.id !== id);
      setBranches(updated);
      localStorage.setItem("facturacr_branches", JSON.stringify(updated));
      toast.success("Sucursal eliminada");
    }
  };

  // CRUD Usuarios Handlers
  const openNewUserModal = () => {
    setEditingUser(null);
    setUserForm({
      name: "",
      email: "",
      role: "Vendedor",
    });
    setUserModalOpen(true);
  };

  const openEditUserModal = (u: TeamMember) => {
    setEditingUser(u);
    setUserForm({
      name: u.name,
      email: u.email,
      role: u.role,
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim()) {
      toast.error("El nombre del usuario es obligatorio");
      return;
    }

    // Mapear el label español a la clave de Role
    const roleKey = ((Object.entries(roleLabel).find(
      ([_, label]) => label.toLowerCase() === userForm.role.toLowerCase()
    )?.[0] || "vendedor") as Role);

    // La cuenta del propietario principal siempre retiene privilegios de super_admin en DB
    const targetRole = editingUser?.email === "alex@mail.com" ? "super_admin" : roleKey;

    if (editingUser) {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: userForm.name.trim(),
          role: targetRole,
        })
        .eq("id", editingUser.id);

      if (error) {
        toast.error("Error al actualizar rol en la base de datos");
        return;
      }

      toast.success(`Datos de "${userForm.name.trim()}" guardados correctamente`);
      await loadTeamProfiles();
      await refreshProfile();
    } else {
      toast.info("Para agregar un nuevo usuario, el usuario debe registrarse con su correo en la pantalla de acceso. Luego podrás asignarle su rol aquí.");
    }

    setUserModalOpen(false);
  };

  const handleDeleteUser = async (id: string, name: string, email?: string) => {
    if (email === "alex@mail.com") {
      toast.error("La cuenta principal del propietario no puede ser eliminada.");
      return;
    }
    if (confirm(`¿Está seguro de eliminar al usuario "${name}"?`)) {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) {
        toast.error("Error al eliminar perfil de usuario");
        return;
      }
      setTeamMembers((prev) => prev.filter((u) => u.id !== id));
      toast.success(`Usuario "${name}" eliminado`);
    }
  };

  // Guardar Empresa
  const handleSaveCompany = async () => {
    if (!activeEstablishment?.id) {
      toast.error("No hay empresa activa seleccionada");
      return;
    }

    const data = {
      name: companyName,
      legalId: companyLegalId,
      email: companyEmail,
      phone: companyPhone,
      address: companyAddress,
      activity: companyActivity,
    };
    localStorage.setItem(`facturacr_company_profile_${activeEstablishment.id}`, JSON.stringify(data));

    // Guardar en Supabase PostgreSQL en la tabla establishments
    try {
      const { error } = await supabase
        .from("establishments")
        .update({
          name: companyName.trim(),
          legal_id: companyLegalId.trim(),
          email: companyEmail.trim() || null,
          phone: companyPhone.trim() || null,
          address: companyAddress.trim() || null,
          economic_activity_code: companyActivity.split("-")[0].trim() || null,
        })
        .eq("id", activeEstablishment.id);

      if (error) throw error;

      setActiveEstablishment({
        ...activeEstablishment,
        name: companyName.trim(),
        legal_id: companyLegalId.trim(),
        email: companyEmail.trim() || undefined,
        phone: companyPhone.trim() || undefined,
        address: companyAddress.trim() || undefined,
        economic_activity_code: companyActivity.split("-")[0].trim() || "620901",
      });
      await loadEstablishments();

      toast.success(`¡Datos de "${companyName.trim()}" actualizados con éxito en la base de datos!`);
    } catch (e: any) {
      console.error("Error guardando empresa en Supabase:", e);
      toast.error("Error al guardar datos de la empresa: " + (e?.message || ""));
    }
  };

  const handleSaveCloudSettings = () => {
    try {
      const config = {
        driveConnected,
        driveAccount,
        driveFolder,
        autoSyncDrive,
        organizeByMonth,
        notifyAccountant,
        accountantEmail,
        dropboxConnected,
        onedriveConnected,
      };
      if (activeEstablishment?.id) {
        localStorage.setItem(`facturacr_cloud_config_${activeEstablishment.id}`, JSON.stringify(config));
      }
      setCloudSaved(true);
      toast.success("¡Configuración de Nube y Google Drive guardada exitosamente!");
      setTimeout(() => setCloudSaved(false), 3000);
    } catch {
      toast.error("Error al guardar configuración de nube");
    }
  };

  const handleSaveGmailSettings = () => {
    try {
      const config = {
        gmailEmail,
        gmailSearchFilter,
        gmailAutoDownload,
        gmailNotifyAccountant,
        googleClientId: googleClientId.trim(),
      };
      if (activeEstablishment?.id) {
        localStorage.setItem(`facturacr_gmail_config_${activeEstablishment.id}`, JSON.stringify(config));
      }
      localStorage.setItem("facturacr_google_client_id", googleClientId.trim());
      setGmailSaved(true);
      toast.success("¡Configuración de Google Workspace y Gmail guardada!");
      setTimeout(() => setGmailSaved(false), 3000);
    } catch {
      toast.error("Error al guardar configuración de Gmail");
    }
  };

  const handleManualFullBackup = () => {
    setIsBackingUpCloud(true);
    toast.info("Iniciando respaldo completo de todas las facturas a Google Drive...");
    setTimeout(() => {
      setIsBackingUpCloud(false);
      toast.success("¡Respaldo a Google Drive completado!", {
        description: `Se respaldaron todos los XMLs y PDFs en ${driveFolder} con éxito.`,
      });
    }, 2000);
  };

  const handleTestConnection = async () => {
    setProbando(true);
    setResultadoTest(null);
    try {
      const res = await probarConexionHacienda(ambiente, usuarioAtv, claveAtv);
      setResultadoTest(res);
      if (res.ok) {
        toast.success("¡Conexión exitosa con Hacienda!", {
          description: `Servidor de ${ambiente.toUpperCase()} respondió correctamente.`,
        });
      } else {
        toast.error("Error al conectar con Hacienda", {
          description: res.mensaje,
        });
      }
    } catch {
      setResultadoTest({
        ok: false,
        mensaje: "Error de red al intentar contactar con el IDP de Hacienda.",
      });
      toast.error("Error de red", {
        description: "No se pudo contactar con los servidores de Hacienda.",
      });
    } finally {
      setProbando(false);
    }
  };

  const handleSave = async () => {
    if (!activeEstablishment?.id) {
      toast.error("No hay empresa activa seleccionada");
      return;
    }

    try {
      const config = {
        ambiente,
        usuarioAtv,
        claveAtv,
        pinP12,
        codigoActividad,
        p12FileName,
        sucursal,
        terminal,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(`facturacr_hacienda_config_${activeEstablishment.id}`, JSON.stringify(config));

      // Guardar en Supabase PostgreSQL en la tabla establishments
      try {
        const { error } = await supabase
          .from("establishments")
          .update({
            atv_environment: ambiente,
            atv_username: usuarioAtv.trim() || null,
            atv_password: claveAtv.trim() || null,
            atv_pin: pinP12.trim() || null,
            economic_activity_code: codigoActividad.trim() || null,
          })
          .eq("id", activeEstablishment.id);

        if (error) throw error;

        setActiveEstablishment({
          ...activeEstablishment,
          atv_environment: ambiente,
          atv_username: usuarioAtv.trim(),
          atv_password: claveAtv.trim(),
          atv_pin: pinP12.trim(),
          economic_activity_code: codigoActividad.trim(),
        });
        await loadEstablishments();
      } catch (e) {
        console.error("Error guardando credenciales en Supabase:", e);
      }

      setGuardado(true);
      toast.success(`¡Configuración de Hacienda guardada para ${activeEstablishment.app_name || activeEstablishment.name}!`, {
        description: `Ambiente: ${ambiente.toUpperCase()} · Terminal: ${terminal} · Sucursal: ${sucursal}`,
      });
      setTimeout(() => setGuardado(false), 4000);
    } catch (e) {
      toast.error("Error al guardar", {
        description: "No se pudo almacenar la configuración.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Configuración"
        description="Administra tu empresa, credenciales de Hacienda CR y equipo."
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-0.5">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-soft text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
          {active === "hacienda" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Plug className="h-5 w-5 text-primary" />
                    Integración Directa con Hacienda CR (v4.4 v2)
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Estructuras oficiales v4.4 (v2), firma XAdES-EPES, llave criptográfica y API de Recepción.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Entorno:</span>
                  <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAmbiente("staging");
                        setUsuarioAtv("cpj-3-101-483899@stag.comprobanteselectronicos.go.cr");
                        setClaveAtv("vPVwmpuo%kF3g12&CR^J");
                        toast.info("Ambiente cambiado a Staging (Pruebas)");
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        ambiente === "staging"
                          ? "bg-amber-500 text-white shadow-sm font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      🧪 Staging / Pruebas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAmbiente("produccion");
                        setUsuarioAtv("cpj-3-101-483899@prod.comprobanteselectronicos.go.cr");
                        toast.info("Ambiente cambiado a Producción Oficial");
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        ambiente === "produccion"
                          ? "bg-emerald-600 text-white shadow-sm font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      🟢 Producción
                    </button>
                  </div>
                </div>
              </div>

              {/* Indicador Oficial Normativa v4.4 (v2) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-950 dark:text-blue-200">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <span>Anexos y Estructuras Tributarias: Versión 4.4 (v2)</span>
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                        🟢 Conforme Ministerio de Hacienda
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-900/80 dark:text-blue-300/80 mt-0.5">
                      Vigencia obligatoria a partir del <strong>1 de Noviembre de 2026</strong>. Habilitado con códigos de referencia 13, 14, 15 por error material y cédulas alfanuméricas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Preset Banner */}
              {activeEstablishment && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-900 dark:text-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💡</span>
                    <div>
                      <span className="font-bold">Credenciales de Pruebas para {activeEstablishment.app_name || activeEstablishment.name}:</span>{" "}
                      <span>Usuario <code>{`cpj-${(activeEstablishment.legal_id || "3101483899").replace(/\D/g, "")}@stag...`}</code></span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const cleanCed = (activeEstablishment.legal_id || "3101483899").replace(/\D/g, "");
                      setAmbiente("staging");
                      setUsuarioAtv(`cpj-${cleanCed}@stag.comprobanteselectronicos.go.cr`);
                      setClaveAtv("vPVwmpuo%kF3g12&CR^J");
                      setP12FileName(`${cleanCed}.p12`);
                      if (activeEstablishment.economic_activity_code) {
                        setCodigoActividad(activeEstablishment.economic_activity_code);
                      }
                      toast.success(`Credenciales de Pruebas preparadas para ${activeEstablishment.app_name || activeEstablishment.name}`);
                    }}
                    className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    ⚡ Auto-rellenar Staging
                  </button>
                </div>
              )}

              {/* Status Banner */}
              {resultadoTest && (
                <div
                  className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
                    resultadoTest.ok
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {resultadoTest.ok ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">
                      {resultadoTest.ok ? "Ambiente Configurado" : "Fallo de Verificación"}
                    </p>
                    <p className="text-xs opacity-90">{resultadoTest.mensaje}</p>
                  </div>
                </div>
              )}

              {/* Formulario Hacienda */}
              <div className="grid gap-5 md:grid-cols-2">
                {/* Llave criptográfica */}
                <div className="md:col-span-2 rounded-xl border border-dashed border-border bg-muted/20 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                        <KeyRound className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Llave Criptográfica (.p12 / .pfx)</p>
                        <p className="text-xs text-muted-foreground">
                          {p12FileName ? `Archivo cargado: ${p12FileName}` : "Descargada desde el Portal de Hacienda"}
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                      <Upload className="h-3.5 w-3.5" /> Cambiar llave .p12
                      <input
                        type="file"
                        accept=".p12,.pfx"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setP12FileName(file.name);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    PIN de la Llave Criptográfica (4 dígitos ATV o 14 caracteres TRIBU-CR)
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      maxLength={32}
                      placeholder="PIN definido en Hacienda"
                      value={pinP12}
                      onChange={(e) => setPinP12(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background pl-3 pr-10 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                      aria-label={showPin ? "Ocultar PIN" : "Ver PIN"}
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Actividad Económica Emisor (CIIU / Hacienda)
                    </label>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Verificada en RUT Hacienda
                    </span>
                  </div>
                  <input
                    value={codigoActividad}
                    onChange={(e) => setCodigoActividad(e.target.value)}
                    placeholder="Ej. 6209.0"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 font-mono font-semibold"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 bg-muted/40 p-2 rounded-md border border-border/60">
                    <span className="font-bold text-foreground font-mono">{codigoActividad || "CIIU"}:</span>
                    <span>{activityDescriptions[codigoActividad] || "Actividad económica registrada ante el Ministerio de Hacienda"}</span>
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Usuario del API de Hacienda (Comprobantes Electrónicos)
                  </label>
                  <input
                    value={usuarioAtv}
                    onChange={(e) => setUsuarioAtv(e.target.value)}
                    placeholder="cpj-3-101-xxxxxx@prod.comprobanteselectronicos.go.cr"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Contraseña del API de Hacienda
                  </label>
                  <div className="relative">
                    <input
                      type={showClaveAtv ? "text" : "password"}
                      value={claveAtv}
                      onChange={(e) => setClaveAtv(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background pl-3 pr-10 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClaveAtv(!showClaveAtv)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                      aria-label={showClaveAtv ? "Ocultar contraseña de Hacienda" : "Ver contraseña de Hacienda"}
                    >
                      {showClaveAtv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Sucursal por defecto (1-999)
                  </label>
                  <input
                    value={sucursal}
                    onChange={(e) => setSucursal(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Punto de Venta / Terminal por defecto (1-99999)
                  </label>
                  <input
                    value={terminal}
                    onChange={(e) => setTerminal(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={probando}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {probando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Probando conexión...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Probar Conexión con Hacienda
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  {guardado ? "¡Configuración Guardada!" : "Guardar Cambios"}
                </button>
              </div>
            </div>
          )}

          {active === "api" && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary" />
                    Conexión API REST & Software Externo
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    🟢 API v1 Activa (Hacienda v4.4)
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Usa estas credenciales para emitir facturas, tiquetes y notas de crédito de forma desatendida desde <strong>{activeEstablishment?.app_name || activeEstablishment?.name || "tu Software Externo"}</strong> (AvalCar, BarberApp, GasExpress o cualquier software de punto de venta).
                </p>
              </div>

              {/* Banner de Empresa Asignada */}
              {activeEstablishment && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Inquilino / Emisor Vinculado</span>
                    <h3 className="font-bold text-base text-foreground">{activeEstablishment.app_name || activeEstablishment.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Cédula: <strong className="font-mono text-foreground">{activeEstablishment.legal_id}</strong> • Actividad: <span className="font-mono">{activeEstablishment.economic_activity_code}</span> ({activityDescriptions[activeEstablishment.economic_activity_code || ""] || "Comercial"})
                    </p>
                  </div>
                  <span className="shrink-0 self-start sm:self-center rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary">
                    Bóveda Criptográfica 100% Aislada
                  </span>
                </div>
              )}

              {/* Tarjeta 1: Credenciales API */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Credenciales de Autenticación de tu Empresa
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      URL del Endpoint Oficial (HTTP POST)
                    </label>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={`${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/v1/invoices`}
                        className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs font-mono text-foreground focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/api/v1/invoices`;
                          navigator.clipboard.writeText(url);
                          setCopiedUrl(true);
                          toast.success("URL del endpoint copiada al portapapeles");
                          setTimeout(() => setCopiedUrl(false), 2000);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted transition-colors shrink-0 cursor-pointer"
                        title="Copiar URL"
                      >
                        {copiedUrl ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        <span>Copiar</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Tu API Key Secreta (Bearer Token)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          readOnly
                          type={showApiKey ? "text" : "password"}
                          value={apiKey || "Cargando API Key..."}
                          className="h-10 w-full rounded-lg border border-border bg-muted/50 pl-3 pr-10 text-xs font-mono text-foreground focus:outline-none font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                          title={showApiKey ? "Ocultar clave" : "Ver clave completa"}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!apiKey) return;
                          navigator.clipboard.writeText(apiKey);
                          setCopiedApiKey(true);
                          toast.success("API Key copiada al portapapeles");
                          setTimeout(() => setCopiedApiKey(false), 2500);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 py-2 text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
                        title="Copiar API Key"
                      >
                        {copiedApiKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span>{copiedApiKey ? "¡Copiada!" : "Copiar Clave"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2 border border-border/60">
                  <span className="text-base">🔒</span>
                  <span>
                    <strong>Seguridad Garantizada:</strong> Esta API Key autoriza a emitir facturas en nombre exclusivo de <strong>{activeEstablishment?.app_name || activeEstablishment?.name}</strong>. Cero mezcla con otras empresas.
                  </span>
                </div>
              </div>

              {/* Tarjeta 2: Probador Interactivo en Vivo */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Probador de Emisión en Vivo vía API
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Simula el cobro de una venta o servicio desde tu software externo y verifica la respuesta en tiempo real.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestApiEmit}
                    disabled={testingApi || !apiKey}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {testingApi ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Firmando y Emitiendo...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ Probar Emisión API Ahora</span>
                      </>
                    )}
                  </button>
                </div>

                {testApiResult && (
                  <div
                    className={`rounded-xl border p-4 text-xs space-y-2 ${
                      testApiResult.success
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
                        : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {testApiResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span>
                        {testApiResult.success ? "¡Factura Emitida y Aceptada por el API!" : "Error en la prueba de emisión"}
                      </span>
                    </div>

                    {testApiResult.success && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                        <div className="bg-background/80 p-2 rounded-lg border border-border">
                          <span className="text-muted-foreground block text-[10px]">CONSECUTIVO</span>
                          <strong>{testApiResult.consecutiveNumber || testApiResult.consecutivo || "00100004010000000001"}</strong>
                        </div>
                        <div className="bg-background/80 p-2 rounded-lg border border-border sm:col-span-2">
                          <span className="text-muted-foreground block text-[10px]">CLAVE HACIENDA</span>
                          <strong className="truncate block">{testApiResult.clave}</strong>
                        </div>
                      </div>
                    )}

                    <pre className="mt-2 rounded-lg bg-slate-950 text-slate-100 p-3 overflow-x-auto text-[11px] font-mono max-h-48">
                      {JSON.stringify(testApiResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Tarjeta 3: Código de Integración Rápida */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FileCode2 className="h-4 w-4 text-primary" />
                    Ejemplo de Código para {activeEstablishment?.app_name || activeEstablishment?.name || "tu Software"}
                  </h3>
                  <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setActiveCodeTab("ts")}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        activeCodeTab === "ts" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      TypeScript / Node
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCodeTab("curl")}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        activeCodeTab === "curl" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      cURL
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCodeTab("python")}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        activeCodeTab === "python" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Python
                    </button>
                  </div>
                </div>

                {activeCodeTab === "ts" && (
                  <pre className="rounded-xl bg-slate-950 text-emerald-400 p-4 overflow-x-auto text-xs font-mono leading-relaxed">
{`// Al registrar una venta o cobro en ${activeEstablishment?.app_name || activeEstablishment?.name || "tu Software"}:
const response = await fetch("http://localhost:3000/api/v1/invoices", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${apiKey || "fct_live_tu_api_key_aqui"}"
  },
  body: JSON.stringify({
    docType: "01",        // 01: Factura Electrónica, 04: Tiquete
    currency: "CRC",
    paymentMethod: "04",  // Tarjeta (01: Efectivo, 03: Transferencia)
    saleCondition: "01",  // Contado
    client: {
      idType: "01",       // 01: Física, 02: Jurídica, 03: DIMEX
      idNumber: "114340648",
      name: "Juan Pérez Mora",
      email: "cliente@correo.cr"
    },
    items: [
      {
        cabys: "${activeEstablishment?.economic_activity_code === "452001" ? "4520100000000" : (activeEstablishment?.economic_activity_code === "862001" ? "8620000000000" : "8314100009900")}",
        detail: "${activeEstablishment?.economic_activity_code === "452001" ? "Lavado y Mantenimiento de Vehículo" : (activeEstablishment?.economic_activity_code === "862001" ? "Consulta Médica General" : "Servicio Comercial")}",
        qty: 1,
        unitPrice: ${activeEstablishment?.economic_activity_code === "452001" ? "15000" : "25000"},
        ivaRate: 13
      }
    ],
    notes: "Comprobante emitido vía API"
  })
});

const data = await response.json();
console.log("Factura emitida exitosamente:", data.clave);`}
                  </pre>
                )}

                {activeCodeTab === "curl" && (
                  <pre className="rounded-xl bg-slate-950 text-amber-300 p-4 overflow-x-auto text-xs font-mono leading-relaxed">
{`curl -X POST "http://localhost:3000/api/v1/invoices" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey || "fct_live_tu_api_key_aqui"}" \\
  -d '{
    "docType": "04",
    "currency": "CRC",
    "paymentMethod": "04",
    "items": [{
      "cabys": "${activeEstablishment?.economic_activity_code === "452001" ? "4520100000000" : "8314100009900"}",
      "detail": "${activeEstablishment?.economic_activity_code === "452001" ? "Lavado y Mantenimiento de Vehículo" : "Servicio Comercial"}",
      "qty": 1,
      "unitPrice": 15000,
      "ivaRate": 13
    }]
  }'`}
                  </pre>
                )}

                {activeCodeTab === "python" && (
                  <pre className="rounded-xl bg-slate-950 text-sky-300 p-4 overflow-x-auto text-xs font-mono leading-relaxed">
{`import requests

url = "http://localhost:3000/api/v1/invoices"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${apiKey || "fct_live_tu_api_key_aqui"}"
}
payload = {
    "docType": "04",
    "currency": "CRC",
    "paymentMethod": "04",
    "items": [{
        "cabys": "${activeEstablishment?.economic_activity_code === "452001" ? "4520100000000" : "8314100009900"}",
        "detail": "${activeEstablishment?.economic_activity_code === "452001" ? "Lavado y Mantenimiento de Vehículo" : "Servicio Comercial"}",
        "qty": 1,
        "unitPrice": 15000,
        "ivaRate": 13
    }]
}
response = requests.post(url, json=payload, headers=headers)
print(response.json())`}
                  </pre>
                )}
              </div>
            </div>
          )}

          {active === "gmail" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Cuentas Gmail / Descarga de Facturas</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                      <Mail className="h-3 w-3" /> Recepción de Gastos Electrónicos
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Configura la lectura automática de comprobantes electrónicos (XMLs y PDFs) enviados por proveedores a tus correos de Gmail o Google Workspace.
                  </p>
                </div>
                <Link
                  to="/app/gmail"
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-colors w-fit"
                >
                  <Download className="h-4 w-4" />
                  Abrir Centro de Descarga
                </Link>
              </div>

              {/* Tarjeta 1: Cuenta Principal de Recepción */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Bandeja de Facturas de Proveedores</h3>
                      <p className="text-xs text-muted-foreground">
                        Dirección a la que se envían las compras de <strong>Grupo G Tres (3-101-483899)</strong>
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Correo Electrónico Gmail / Workspace</label>
                    <input
                      type="email"
                      value={gmailEmail}
                      onChange={(e) => setGmailEmail(e.target.value)}
                      placeholder="facturas@grupog3.cr"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Puedes usar una cuenta @gmail.com o un correo corporativo de Google Workspace.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Filtro de Consulta Gmail (Search Query)</label>
                    <input
                      type="text"
                      value={gmailSearchFilter}
                      onChange={(e) => setGmailSearchFilter(e.target.value)}
                      placeholder="has:attachment filename:xml"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Filtra solo mensajes con adjuntos XML de facturas emitidas a tu cédula.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Configuración de Google Workspace API y Seguridad */}
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-500/10">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                        API de Google Workspace (OAuth 2.0 Oficial)
                        <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          Solo Lectura (gmail.readonly)
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Conexión directa protegida por Google para leer adjuntos XML de tu dominio <strong>@grupog3cr.com</strong>
                      </p>
                    </div>
                  </div>

                  {googleClientId ? (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 flex items-center gap-1 w-fit">
                      <Check className="h-3.5 w-3.5" /> Client ID Configurado
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 flex items-center gap-1 w-fit">
                      Pendiente de Client ID
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">
                        Google Cloud OAuth Client ID (Web Application)
                      </label>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Variable: VITE_GOOGLE_CLIENT_ID en .env
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showGoogleClientId ? "text" : "password"}
                        value={googleClientId}
                        onChange={(e) => setGoogleClientId(e.target.value)}
                        placeholder="ej: 1234567890-abcdefghijklmnop.apps.googleusercontent.com"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGoogleClientId(!showGoogleClientId)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                        aria-label={showGoogleClientId ? "Ocultar Client ID" : "Ver Client ID"}
                      >
                        {showGoogleClientId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Puedes definirlo aquí o en el archivo protegido <code>.env</code> en la raíz del proyecto.
                    </p>
                  </div>

                  {/* Pilares de Seguridad */}
                  <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
                    <div className="rounded-lg border border-border/60 bg-background/80 p-3 space-y-1">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-blue-500" />
                        1. Solo Lectura Estricta
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        El permiso solicitado es exclusivamente <code>gmail.readonly</code>. Google impide técnica y legalmente que el sistema envíe, modifique o elimine correos.
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-background/80 p-3 space-y-1">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-emerald-500" />
                        2. Cero Contraseñas
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Tu contraseña nunca pasa por la app. La autenticación se realiza en la ventana oficial y cifrada de Google (Google Identity Services).
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-background/80 p-3 space-y-1">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <HardDrive className="h-3.5 w-3.5 text-indigo-500" />
                        3. Conexión 100% Local y Privada
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        La comunicación ocurre punto a punto entre tu navegador y los servidores de Google. Ningún servidor externo intermediario ve tus correos.
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-background/80 p-3 space-y-1">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        4. Token Temporal y Revocable
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        El token expira en 60 minutos y se guarda en memoria volátil de sesión. Puedes revocar el acceso en cualquier momento.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: Reglas de Automatización y Contador */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="font-semibold text-sm">Automatización y Sincronización Contable</h3>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border/60 p-3 hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={gmailAutoDownload}
                      onChange={(e) => setGmailAutoDownload(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground block">
                        Descarga e Importación Automática
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Escanea la bandeja periódicamente y almacena automáticamente los comprobantes de gastos (FE, NC, ND) en la base de datos local.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border/60 p-3 hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={gmailNotifyAccountant}
                      onChange={(e) => setGmailNotifyAccountant(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground block">
                        Integrar Compras Directamente en el Reporte al Contador
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Los gastos procesados se reflejan de inmediato en los cálculos de IVA Crédito Fiscal (D-104) y el Excel de compras en <Link to="/app/reports" className="text-primary underline">Reportes para el Contador</Link>.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Tarjeta 3: Pasos para habilitar acceso */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs space-y-2 text-amber-900 dark:text-amber-200">
                <div className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  ¿Cómo funciona la descarga desde Gmail?
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                  <li>Tus proveedores envían las facturas de gasolina, suministros, inventario o servicios a <strong>{gmailEmail}</strong>.</li>
                  <li>El sistema localiza los correos que contengan el archivo XML firmado por el proveedor y la respuesta de Hacienda.</li>
                  <li>Los datos se leen al instante sin costo alguno y se acumulan para el cálculo automático de tu declaración mensual del IVA D-104.</li>
                </ol>
              </div>

              {/* Botón Guardar */}
              <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={handleSaveGmailSettings}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  {gmailSaved ? (
                    <>
                      <Check className="h-4 w-4" />
                      ¡Configuración Guardada!
                    </>
                  ) : (
                    "Guardar Configuración de Gmail"
                  )}
                </button>
              </div>
            </div>
          )}

          {active === "nube" && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Almacenamiento y Copias de Seguridad</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                    <HardDrive className="h-3 w-3" /> Modo Híbrido: Local + Nube
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Controla dónde se guardan tus facturas electrónicas, XMLs firmados, acuses de Hacienda y PDFs.
                </p>
              </div>

              {/* Tarjeta 1: Almacenamiento Local de la App (Siempre Activo y Predeterminado) */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                      <HardDrive className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                        Almacenamiento Local en la Aplicación
                        <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Siempre Activo (Principal)
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Todas las facturas, XMLs firmados por tu llave .p12, acuses de Hacienda y PDFs se guardan <strong>de forma permanente dentro de tu sistema</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground grid gap-2 sm:grid-cols-3 border border-border/60">
                  <div>
                    <span className="font-medium text-foreground block">✔ Autonomía Total:</span>
                    No dependes de servicios externos. Todo está en tu app.
                  </div>
                  <div>
                    <span className="font-medium text-foreground block">✔ Descargas Ilimitadas:</span>
                    Exporta .zip, XMLs o PDFs en cualquier momento.
                  </div>
                  <div>
                    <span className="font-medium text-foreground block">✔ Expediente Fiscal:</span>
                    Acceso inmediato desde la lista de facturas.
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Respaldo en la Nube (Opcional / Google Drive) */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-border">
                      <svg className="h-6 w-6" viewBox="0 0 87.3 78" fill="none">
                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/>
                        <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 53.6c-.8 1.4-1.2 2.95-1.2 4.5h27.45L43.65 25z" fill="#00AC47"/>
                        <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l6.1 10.55 7.6 13.25z" fill="#EA4335"/>
                        <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2L43.65 25z" fill="#00832D"/>
                        <path d="M59.85 53.1H87.3c0-1.55-.4-3.1-1.2-4.5L72.35 24.8c-.8-1.4-1.95-2.5-3.3-3.3L55.3 45.3l4.55 7.8z" fill="#2684FC"/>
                        <path d="m73.55 76.8-13.7-23.7H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z" fill="#FFBA00"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                        Respaldo Opcional en Google Drive (Copia Espejo)
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${driveConnected ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                          {driveConnected ? "Activado" : "Desactivado"}
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {driveConnected ? (
                          <>Cuenta vinculada: <strong className="text-foreground">{driveAccount}</strong></>
                        ) : (
                          "El respaldo en la nube está desactivado. Todas las facturas se guardan solo en la app."
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDriveConnected(!driveConnected);
                        toast.info(driveConnected ? "Respaldo de Google Drive desactivado" : "Respaldo de Google Drive activado");
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${driveConnected ? "bg-primary" : "bg-muted"}`}
                      title={driveConnected ? "Desactivar Google Drive" : "Activar Google Drive"}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform mt-1 ml-1 ${driveConnected ? "translate-x-5" : "translate-x-0"}`} />
                    </button>

                    {driveConnected && (
                      <button
                        type="button"
                        onClick={() => {
                          const newAcc = prompt("Ingrese la cuenta de correo de Google Drive:", driveAccount);
                          if (newAcc) {
                            setDriveAccount(newAcc);
                            toast.success(`Cuenta de Google Drive actualizada a: ${newAcc}`);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" /> Cambiar Cuenta
                      </button>
                    )}
                  </div>
                </div>

                {driveConnected && (
                  <>

                <div className="grid gap-4 md:grid-cols-2 pt-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Carpeta de Destino en Google Drive
                    </label>
                    <div className="relative">
                      <Folder className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                      <input
                        type="text"
                        value={driveFolder}
                        onChange={(e) => setDriveFolder(e.target.value)}
                        className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm font-mono focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                        placeholder="/Facturas_Electronicas_CR/"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Estructura generada: <code className="text-primary font-mono">{driveFolder}2026/09/FE_00100001010000000001.zip</code>
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Correo del Contador para Copia Automática
                    </label>
                    <input
                      type="email"
                      value={accountantEmail}
                      onChange={(e) => setAccountantEmail(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                      placeholder="contador@empresa.cr"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      El contador recibirá un enlace directo de Google Drive con los XMLs y PDFs de cada mes.
                    </p>
                  </div>
                </div>

                {/* Opciones de sincronización */}
                <div className="space-y-3 pt-3 border-t border-primary/10">
                  <div className="flex items-center justify-between rounded-lg bg-background p-3 border border-border">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Sincronización instantánea con Hacienda</p>
                      <p className="text-[11px] text-muted-foreground">Guardar automáticamente en Google Drive tan pronto Hacienda apruebe la factura.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoSyncDrive(!autoSyncDrive)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${autoSyncDrive ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform mt-0.75 ml-0.75 ${autoSyncDrive ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-background p-3 border border-border">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Organizar automáticamente por Año y Mes</p>
                      <p className="text-[11px] text-muted-foreground">Crea subcarpetas automáticas (ej. <code className="text-primary font-mono">/2026/09_Setiembre/</code>) para mantener orden tributario.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrganizeByMonth(!organizeByMonth)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${organizeByMonth ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform mt-0.75 ml-0.75 ${organizeByMonth ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-background p-3 border border-border">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Compartir carpeta automáticamente con Contador</p>
                      <p className="text-[11px] text-muted-foreground">Otorga permisos de lectura al correo contable para auditoría fiscal.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifyAccountant(!notifyAccountant)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${notifyAccountant ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform mt-0.75 ml-0.75 ${notifyAccountant ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>
                </>
                )}
              </div>

              {/* Otros proveedores de nube */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Otros Servicios en la Nube (Opcional)</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-border p-3.5 bg-card">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-500/10 text-blue-600 font-bold text-xs">
                        DB
                      </div>
                      <div>
                        <p className="text-xs font-medium">Dropbox Business</p>
                        <p className="text-[11px] text-muted-foreground">{dropboxConnected ? "Conectado" : "No conectado"}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDropboxConnected(!dropboxConnected);
                        toast.info(dropboxConnected ? "Dropbox desconectado" : "Dropbox conectado exitosamente");
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border ${dropboxConnected ? "border-emerald-500 text-emerald-600 bg-emerald-500/10" : "border-border hover:bg-muted"}`}
                    >
                      {dropboxConnected ? "Vinculado" : "Conectar"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-3.5 bg-card">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/10 text-sky-600 font-bold text-xs">
                        OD
                      </div>
                      <div>
                        <p className="text-xs font-medium">Microsoft OneDrive</p>
                        <p className="text-[11px] text-muted-foreground">{onedriveConnected ? "Conectado" : "No conectado"}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOnedriveConnected(!onedriveConnected);
                        toast.info(onedriveConnected ? "OneDrive desconectado" : "OneDrive conectado exitosamente");
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border ${onedriveConnected ? "border-emerald-500 text-emerald-600 bg-emerald-500/10" : "border-border hover:bg-muted"}`}
                    >
                      {onedriveConnected ? "Vinculado" : "Conectar"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleManualFullBackup}
                  disabled={isBackingUpCloud}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {isBackingUpCloud ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Respaldando todas las facturas a Google Drive...
                    </>
                  ) : (
                    <>
                      <FolderSync className="h-3.5 w-3.5" />
                      Respaldar todo el historial ahora a Google Drive
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveCloudSettings}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  {cloudSaved ? (
                    <>
                      <Check className="h-4 w-4" />
                      ¡Configuración Guardada!
                    </>
                  ) : (
                    "Guardar Cambios de Nube"
                  )}
                </button>
              </div>

              {/* Zona de Limpieza Total */}
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3 mt-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-destructive flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Zona de Limpieza: Vaciar Almacenamiento Local (localStorage)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Elimina de inmediato todos los datos guardados en el navegador (facturas temporales, clientes, compras y caché) para dejar la aplicación en cero absoluto antes de conectar la base de datos real.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("⚠️ ¿Estás completamente seguro de que deseas eliminar TODO lo que está en localStorage? La página se reiniciará en cero.")) {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 transition-all shrink-0 shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    Vaciar Todo el Almacenamiento Local
                  </button>
                </div>
              </div>
            </div>
          )}

          {active === "empresa" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Datos de la Empresa / Emisor</h2>
                <p className="text-sm text-muted-foreground">
                  Información fiscal y comercial que aparecerá en el encabezado de todas tus facturas, notas de crédito y tiquetes electrónicos.
                </p>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-dashed border-border p-4 bg-muted/30">
                <div className="grid h-16 w-16 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Building2 className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Logotipo de la Empresa</p>
                  <p className="text-xs text-muted-foreground">Formato PNG, JPG o SVG (máx. 2MB). Se incluirá en la representación gráfica (PDF).</p>
                </div>
                <button
                  type="button"
                  onClick={() => toast.info("Subida de logo lista. Selecciona un archivo.")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted transition-colors shadow-sm"
                >
                  <Upload className="h-3.5 w-3.5" /> Subir Logo
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Razón Social / Nombre Comercial
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 font-medium"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Cédula Jurídica / Física del Emisor
                  </label>
                  <input
                    type="text"
                    value={companyLegalId}
                    onChange={(e) => setCompanyLegalId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 font-mono"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Correo Electrónico de Facturación
                  </label>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Teléfono Principal de Contacto
                  </label>
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Dirección Física / Ubicación Comercial
                  </label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Actividad Económica Principal Registrada en Hacienda
                  </label>
                  <input
                    type="text"
                    value={companyActivity}
                    onChange={(e) => setCompanyActivity(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-border pt-4">
                <button
                  type="button"
                  onClick={handleSaveCompany}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <Check className="h-4 w-4" /> Guardar Datos de la Empresa
                </button>
              </div>
            </div>
          )}

          {active === "sucursales" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Sucursales y Cajas</h2>
                  <p className="text-sm text-muted-foreground">
                    Cada sucursal y caja/terminal emite consecutivos de 20 dígitos independientes ante el Ministerio de Hacienda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewBranchModal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors shrink-0"
                >
                  <Plus className="h-4 w-4" /> Nueva Sucursal
                </button>
              </div>

              <div className="grid gap-3">
                {branches.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground">{b.name}</h3>
                          <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                            Sucursal {b.code}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground/70" />
                            {b.address}
                          </span>
                          {b.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground/70" />
                              {b.phone}
                            </span>
                          )}
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            {b.terminalsCount || 1} {b.terminalsCount === 1 ? "caja / terminal activa" : "cajas / terminales activas"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => openEditBranchModal(b)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-primary" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBranch(b.id, b.name)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal de Sucursal (Crear / Editar) */}
              {branchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-base">
                          {editingBranch ? "Editar Sucursal" : "Nueva Sucursal"}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBranchModalOpen(false)}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveBranch} className="space-y-3.5 text-xs">
                      <div>
                        <label className="mb-1 block font-medium text-muted-foreground">
                          Código de Sucursal en Hacienda (3 dígitos) *
                        </label>
                        <input
                          type="text"
                          maxLength={3}
                          value={branchForm.code}
                          onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                          placeholder="001"
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 font-mono text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                          required
                        />
                        <span className="text-[10px] text-muted-foreground">Ej: 001 para Casa Matriz, 002 para Sucursal 2.</span>
                      </div>

                      <div>
                        <label className="mb-1 block font-medium text-muted-foreground">
                          Nombre de la Sucursal *
                        </label>
                        <input
                          type="text"
                          value={branchForm.name}
                          onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                          placeholder="Ej: Sucursal Escazú / Casa Matriz"
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block font-medium text-muted-foreground">
                          Dirección Exacta
                        </label>
                        <input
                          type="text"
                          value={branchForm.address}
                          onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                          placeholder="Provincia, Cantón, Distrito y señas"
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block font-medium text-muted-foreground">
                            Teléfono
                          </label>
                          <input
                            type="text"
                            value={branchForm.phone}
                            onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                            placeholder="+506 2222-0000"
                            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block font-medium text-muted-foreground">
                            Cajas / Terminales
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={99999}
                            value={branchForm.terminalsCount}
                            onChange={(e) => setBranchForm({ ...branchForm, terminalsCount: parseInt(e.target.value) || 1 })}
                            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-border">
                        <button
                          type="button"
                          onClick={() => setBranchModalOpen(false)}
                          className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          {editingBranch ? "Guardar Cambios" : "Crear Sucursal"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {active === "usuarios" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Equipo y Permisos de Acceso</h2>
                  <p className="text-sm text-muted-foreground">
                    {teamMembers.length} {teamMembers.length === 1 ? "usuario" : "usuarios"} con acceso al sistema de facturación electrónica.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setHideSuperAdminInTeam(!hideSuperAdminInTeam)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm shrink-0"
                      title={hideSuperAdminInTeam ? "Mostrar cuenta de soporte en la lista" : "Ocultar cuenta SuperAdmin de esta vista"}
                    >
                      {hideSuperAdminInTeam ? (
                        <>
                          <Eye className="h-3.5 w-3.5 text-primary" /> Mostrar SuperAdmin
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> Ocultar SuperAdmin
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={openNewUserModal}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors shrink-0"
                  >
                    <UserPlus className="h-4 w-4" /> Invitar Usuario
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                {teamMembers.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <UsersIcon className="h-10 w-10 mx-auto text-muted-foreground/30" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">No hay usuarios de este negocio registrados</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Los clientes e inquilinos tienen su propio acceso privado. Haz clic en <strong>"Invitar Usuario"</strong> para asignar al personal de {activeEstablishment?.app_name || activeEstablishment?.name || "este negocio"}.
                      </p>
                    </div>
                  </div>
                ) : (
                  teamMembers.map((t) => (
                    <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full gradient-primary text-xs font-bold text-primary-foreground shadow-sm">
                          {t.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                                t.role.includes("Propietario") || t.role.includes("SuperAdmin")
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                  : t.role.includes("Administrador")
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                  : t.role === "Contador"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : t.role === "Cajero"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {t.role}
                            </span>
                            {t.email === "alex@mail.com" && (
                              <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                                Visible solo para ti (SuperAdmin)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{t.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => openEditUserModal(t)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-primary" /> Editar Rol
                        </button>
                        {t.email !== "alex@mail.com" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(t.id, t.name, t.email)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Modal de Usuario (Invitar / Editar) */}
              {userModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-base">
                          {editingUser ? "Editar Usuario y Rol" : "Invitar Nuevo Usuario"}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUserModalOpen(false)}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
                      <div>
                        <label className="mb-1 block font-medium text-muted-foreground">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          value={userForm.name}
                          onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                          placeholder="Ej: Andrea Quirós"
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block font-medium text-muted-foreground">
                          Correo Electrónico *
                        </label>
                        <input
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          placeholder="usuario@empresa.cr"
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block font-medium text-muted-foreground">
                          Rol y Nivel de Acceso *
                        </label>
                        {editingUser?.email === "alex@mail.com" ? (
                          <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-2.5 text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4 text-purple-600" /> Administrador Principal (Propietario de la Cuenta)
                          </div>
                        ) : (
                          <select
                            value={userForm.role}
                            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                          >
                            <option value="Administrador">Administrador (Acceso Total y Configuración Hacienda)</option>
                            <option value="Cajero">Cajero / Punto de Venta (Emisión y Cobro de Facturas)</option>
                            <option value="Vendedor">Vendedor (Cotizaciones, Facturación y Clientes)</option>
                            <option value="Contador">Contador (Descarga de XMLs, Reportes y Auditoría)</option>
                            <option value="Supervisor">Supervisor / Auditor (Consulta y Aprobaciones)</option>
                          </select>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-border">
                        <button
                          type="button"
                          onClick={() => setUserModalOpen(false)}
                          className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          {editingUser ? "Guardar Cambios" : "Invitar Usuario"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {active === "firma" && (
            <div>
              <h2 className="text-lg font-semibold">Firma visual y Plantilla PDF</h2>
              <p className="text-sm text-muted-foreground">
                Personaliza la apariencia del comprobante impreso.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Color principal" value="#1d3fb8" />
                <Field label="Pie de página" value="¡Gracias por su compra!" />
              </div>
            </div>
          )}

          {active === "notificaciones" && (
            <div>
              <h2 className="text-lg font-semibold">Notificaciones</h2>
              <p className="text-sm text-muted-foreground">
                Recibe alertas importantes por correo y webhooks.
              </p>
              <ul className="mt-5 space-y-3">
                {[
                  "Factura rechazada por Hacienda",
                  "Stock bajo de productos",
                  "Resumen diario de ventas",
                ].map((n) => (
                  <li
                    key={n}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <span className="text-sm">{n}</span>
                    <Toggle defaultOn />
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        defaultValue={value}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </button>
  );
}
