import { type Product } from "./mock-data";
import { type CabysItem } from "./cabys";
import { supabase } from "./supabase";
import { type EstablishmentRecord } from "@/contexts/AppContext";

export interface CompanyCabysRow {
  id: string;
  cabys_code: string;
  description: string;
  economic_activity: string;
  economic_activity_desc: string;
  tax_rate: number;
  created_at?: string;
}

export const ACTIVITY_DESCRIPTIONS: Record<string, string> = {
  "620901": "Otras actividades de tecnología de información y servicios informáticos",
  "6209.0": "Otras actividades de tecnología de información y servicios informáticos",
  "620101": "Desarrollo de sistemas informáticos y software",
  "862001": "Actividades de médicos, consultas y centros de salud especializada",
  "960201": "Peluquería, barbería y otros tratamientos de belleza",
  "466101": "Venta al por mayor de combustibles (GLP, gasolinas, diesel)",
  "477303": "Venta al por menor de gas licuado de petróleo (GLP) en cilindros",
  "452001": "Mantenimiento, diagnóstico y lavado de vehículos automotores",
  "453001": "Comercio de repuestos y accesorios para vehículos automotores",
  "931101": "Gestión de instalaciones deportivas, gimnasios y centros de fitness",
  "750001": "Actividades veterinarias y clínicas de salud para mascotas",
};

export function getActivityDescription(code?: string): string {
  if (!code) return "Actividad Comercial Registrada ante Hacienda";
  const clean = code.replace(/\D/g, "");
  return ACTIVITY_DESCRIPTIONS[clean] || ACTIVITY_DESCRIPTIONS[code] || "Actividad Comercial Registrada ante Hacienda";
}

export function isLuxxCarWash(est?: EstablishmentRecord | null): boolean {
  if (!est) return false;
  const cleanCedula = (est.legal_id || "").replace(/\D/g, "");
  return (
    cleanCedula === "3102832920" ||
    est.code?.includes("luxx") ||
    est.code === "avalcar_cr" ||
    (est.name || "").toLowerCase().includes("luxx") ||
    (est.app_name || "").toLowerCase().includes("luxx") ||
    (est.name || "").includes("3102832920") ||
    est.economic_activity_code === "452001"
  );
}

export function isGrupoGTres(est?: EstablishmentRecord | null): boolean {
  if (!est) return false;
  const cleanCedula = (est.legal_id || "").replace(/\D/g, "");
  return (
    cleanCedula === "3101483899" ||
    est.code === "grupo_g_tres" ||
    (est.name || "").toLowerCase().includes("grupo g tres")
  );
}

export function isGasExpress(est?: EstablishmentRecord | null): boolean {
  if (!est) return false;
  const cleanCedula = (est.legal_id || "").replace(/\D/g, "");
  return (
    cleanCedula === "3101443322" ||
    est.code === "gas_express" ||
    (est.name || "").toLowerCase().includes("gas express") ||
    est.economic_activity_code === "466101"
  );
}

// --------------------------------------------------------------------------
// BASE CATALOGS (Strictly Isolated by Establishment)
// --------------------------------------------------------------------------

function getBaseProductsForEstablishment(est: EstablishmentRecord): Product[] {
  if (isLuxxCarWash(est)) {
    return [
      {
        id: "luxx-1",
        name: "Lavado Completo de Vehículo (Car Wash)",
        sku: "LAV-01",
        cabys: "8714900000000",
        category: "Lavado",
        price: 8000,
        cost: 0,
        stock: 0,
        minStock: 0,
        tax: 13,
        unit: "Sp",
        description: "Lavado exterior a presión, shampoo con cera y aspirado interior profundo",
      },
      {
        id: "luxx-2",
        name: "Lavado y Detailing Premium",
        sku: "DET-01",
        cabys: "8714900000000",
        category: "Detailing",
        price: 25000,
        cost: 0,
        stock: 0,
        minStock: 0,
        tax: 13,
        unit: "Sp",
        description: "Detailing de interiores, hidratación de plásticos y descontaminado de pintura",
      },
      {
        id: "luxx-3",
        name: "Alineación y Tramado Completo",
        sku: "ALIN-01",
        cabys: "8714100000000",
        category: "Taller",
        price: 24000,
        cost: 0,
        stock: 0,
        minStock: 0,
        tax: 13,
        unit: "Sp",
        description: "Alineación computarizada 3D, balanceo y calibración de suspensión",
      },
      {
        id: "luxx-4",
        name: "Cambio de Aceite y Filtro",
        sku: "LUB-01",
        cabys: "8714100000000",
        category: "Lubricentro",
        price: 35000,
        cost: 0,
        stock: 0,
        minStock: 0,
        tax: 13,
        unit: "Sp",
        description: "Cambio de aceite sintético con filtro de aceite y revisión de 15 puntos",
      },
      {
        id: "luxx-5",
        name: "Diagnóstico y Escaneo Computarizado",
        sku: "ESC-01",
        cabys: "8714100000000",
        category: "Taller",
        price: 18000,
        cost: 0,
        stock: 0,
        minStock: 0,
        tax: 13,
        unit: "Sp",
        description: "Escaneo electrónico OBD2 de motor, frenos ABS y transmisión",
      },
      {
        id: "luxx-6",
        name: "Pulido de Carrocería y Encerado",
        sku: "PUL-01",
        cabys: "8714200000000",
        category: "Detailing",
        price: 30000,
        cost: 0,
        stock: 0,
        minStock: 0,
        tax: 13,
        unit: "Sp",
        description: "Pulido a máquina con eliminación de microrayones y sellador cerámico",
      },
    ];
  }

  if (isGasExpress(est)) {
    return [
      {
        id: "gas-1",
        name: "Cilindro Gas GLP 25 lbs",
        sku: "GAS-25",
        cabys: "3341000000000",
        category: "Cilindros",
        price: 10500,
        cost: 0,
        stock: 50,
        minStock: 10,
        tax: 13,
        unit: "Unid",
        description: "Gas Licuado de Petróleo GLP en cilindro de 25 libras",
      },
      {
        id: "gas-2",
        name: "Cilindro Gas GLP 100 lbs",
        sku: "GAS-100",
        cabys: "3341000000000",
        category: "Cilindros",
        price: 42000,
        cost: 0,
        stock: 20,
        minStock: 5,
        tax: 13,
        unit: "Unid",
        description: "Gas Licuado de Petróleo GLP en cilindro industrial de 100 libras",
      },
      {
        id: "gas-3",
        name: "Válvula Reguladora Gas GLP",
        sku: "VALV-01",
        cabys: "4341000000000",
        category: "Accesorios",
        price: 8500,
        cost: 0,
        stock: 15,
        minStock: 3,
        tax: 13,
        unit: "Unid",
        description: "Regulador de baja presión para cilindro de gas doméstico",
      },
    ];
  }

  if (est.code === "nexus_clinic") {
    return [
      {
        id: "med-1",
        name: "Consulta Médica General",
        sku: "MED-GEN",
        cabys: "8512100000000",
        category: "Consultas",
        price: 30000,
        cost: 0,
        stock: 0,
        minStock: 0,
        tax: 4,
        unit: "Sp",
      },
      {
        id: "med-2",
        name: "Consulta Médica Especialista",
        sku: "MED-ESP",
        cabys: "8512200000000",
        category: "Consultas",
        price: 45000,
        cost: 0,
        stock: 0,
        minStock: 0,
        tax: 4,
        unit: "Sp",
      },
    ];
  }

  if (est.code === "barber_app") {
    return [
      {
        id: "bar-1",
        name: "Corte de Cabello Clásico",
        sku: "CORTE-01",
        cabys: "9721000000000",
        category: "Barbería",
        price: 8000,
        cost: 0,
        stock: 0,
        minStock: 0,
        tax: 13,
        unit: "Sp",
      },
      {
        id: "bar-2",
        name: "Corte y Barba Completa",
        sku: "COMBO-01",
        cabys: "9721000000000",
        category: "Barbería",
        price: 14000,
        cost: 0,
        stock: 0,
        minStock: 0,
        tax: 13,
        unit: "Sp",
      },
    ];
  }

  // Empresa nueva o independiente: catálogo base vacío, el cliente crea lo suyo
  return [];
}

function getBaseCabysForEstablishment(est: EstablishmentRecord): CompanyCabysRow[] {
  if (isLuxxCarWash(est)) {
    return [
      {
        id: "cab-luxx-1",
        cabys_code: "8714900000000",
        description: "Otros servicios de mantenimiento, lavado y limpieza de vehículos automotores",
        economic_activity: "452001",
        economic_activity_desc: "452001 - Mantenimiento, diagnóstico y lavado de vehículos automotores",
        tax_rate: 13,
      },
      {
        id: "cab-luxx-2",
        cabys_code: "8714100000000",
        description: "Mantenimiento y reparación mecánica y eléctrica de vehículos de motor",
        economic_activity: "452001",
        economic_activity_desc: "452001 - Mantenimiento y reparación de vehículos automotores",
        tax_rate: 13,
      },
      {
        id: "cab-luxx-3",
        cabys_code: "8714200000000",
        description: "Servicios de reparación de carrocerías, pintura y detallado de vehículos",
        economic_activity: "452001",
        economic_activity_desc: "452001 - Mantenimiento y reparación de vehículos automotores",
        tax_rate: 13,
      },
      {
        id: "cab-luxx-4",
        cabys_code: "4530010000000",
        description: "Comercio de repuestos, accesorios, lubricantes y suministros para vehículos",
        economic_activity: "452001",
        economic_activity_desc: "452001 - Mantenimiento, diagnóstico y lavado de vehículos automotores",
        tax_rate: 13,
      },
    ];
  }

  if (isGasExpress(est)) {
    return [
      {
        id: "cab-gas-1",
        cabys_code: "3341000000000",
        description: "Gas Licuado de Petróleo (GLP) en cilindros para uso doméstico",
        economic_activity: "466101",
        economic_activity_desc: "466101 - Venta al por mayor de combustibles sólidos, líquidos y gaseosos",
        tax_rate: 13,
      },
      {
        id: "cab-gas-2",
        cabys_code: "4341000000000",
        description: "Accesorios, reguladores y válvulas de seguridad para cilindros de gas",
        economic_activity: "466101",
        economic_activity_desc: "466101 - Venta al por mayor de combustibles sólidos, líquidos y gaseosos",
        tax_rate: 13,
      },
    ];
  }

  if (est.code === "nexus_clinic") {
    return [
      {
        id: "cab-med-1",
        cabys_code: "8512100000000",
        description: "Servicios de médicos generales en consulta externa",
        economic_activity: "862001",
        economic_activity_desc: "862001 - Actividades de médicos y odontólogos",
        tax_rate: 4,
      },
      {
        id: "cab-med-2",
        cabys_code: "8512200000000",
        description: "Servicios de médicos especialistas en clínica privada",
        economic_activity: "862001",
        economic_activity_desc: "862001 - Actividades de médicos y odontólogos",
        tax_rate: 4,
      },
    ];
  }

  if (est.code === "barber_app") {
    return [
      {
        id: "cab-bar-1",
        cabys_code: "9721000000000",
        description: "Servicios de peluquería, corte de cabello y estética masculina",
        economic_activity: "960201",
        economic_activity_desc: "960201 - Peluquería y otros tratamientos de belleza",
        tax_rate: 13,
      },
    ];
  }

  // Por defecto para cualquier empresa nueva
  const act = est.economic_activity_code || "620901";
  return [];
}

// --------------------------------------------------------------------------
// REPOSITORIO DE PRODUCTOS (Totalmente Aislado por Empresa)
// --------------------------------------------------------------------------

export async function getCompanyProducts(est: EstablishmentRecord | null): Promise<Product[]> {
  if (!est?.id) return [];

  try {
    // 1. Si es Grupo G Tres, cargar sus productos de tecnología desde la base de datos Supabase
    if (isGrupoGTres(est)) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        const dbProducts: Product[] = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          sku: row.code || "",
          cabys: row.cabys_code || "",
          category: row.category || "Servicios",
          price: Number(row.price) || 0,
          cost: 0,
          stock: 0,
          minStock: 5,
          tax: Number(row.tax_rate) || 13,
          unit: row.unit || "Sp",
          description: row.description || "",
        }));

        let localCustom: Product[] = [];
        try {
          const stored = localStorage.getItem(`facturaos_custom_products_${est.id}`);
          if (stored) localCustom = JSON.parse(stored);
        } catch {}

        return [...localCustom, ...dbProducts];
      }
    }

    // 2. Para SRL. 3102832920 (Luxx Car Wash) y demás empresas: NUNCA mezclar con Grupo G Tres
    const baseCatalog = getBaseProductsForEstablishment(est);

    // Cargar productos creados o editados para este establecimiento
    let localCustom: Product[] = [];
    try {
      const stored = localStorage.getItem(`facturaos_custom_products_${est.id}`);
      if (stored) {
        localCustom = JSON.parse(stored);
      }
    } catch {}

    // Combinar sin duplicados por ID
    const customIds = new Set(localCustom.map((p) => p.id));
    const finalBase = baseCatalog.filter((p) => !customIds.has(p.id));

    return [...localCustom, ...finalBase];
  } catch (err) {
    console.error(`Error cargando productos para ${est.name}:`, err);
    return getBaseProductsForEstablishment(est);
  }
}

export async function saveCompanyProduct(
  est: EstablishmentRecord,
  productData: {
    name: string;
    sku: string;
    cabys: string;
    category: string;
    price: number;
    tax: number;
    unit?: string;
    stock?: number;
    minStock?: number;
    description?: string;
  },
  editingId?: string | null
): Promise<Product> {
  const isMaster = isGrupoGTres(est);

  if (isMaster) {
    if (editingId && !editingId.startsWith("local-")) {
      const { error } = await supabase
        .from("products")
        .update({
          name: productData.name.trim(),
          code: productData.sku.trim() || "",
          cabys_code: productData.cabys.trim().replace(/\D/g, ""),
          category: productData.category,
          price: Number(productData.price) || 0,
          tax_rate: Number(productData.tax) || 13,
        })
        .eq("id", editingId);
      if (error) throw error;
      return {
        id: editingId,
        name: productData.name.trim(),
        sku: productData.sku.trim(),
        cabys: productData.cabys.trim().replace(/\D/g, ""),
        category: productData.category,
        price: Number(productData.price) || 0,
        cost: 0,
        stock: productData.stock || 0,
        minStock: productData.minStock || 5,
        tax: Number(productData.tax) || 13,
        unit: productData.unit || "Sp",
        description: productData.description || "",
      };
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: productData.name.trim(),
          code: productData.sku.trim() || `PROD-${Math.floor(Math.random() * 900) + 100}`,
          cabys_code: productData.cabys.trim().replace(/\D/g, ""),
          category: productData.category,
          price: Number(productData.price) || 0,
          tax_rate: Number(productData.tax) || 13,
          unit: productData.unit || "Sp",
        })
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        sku: data.code || "",
        cabys: data.cabys_code || "",
        category: data.category || "Servicios",
        price: Number(data.price) || 0,
        cost: 0,
        stock: 0,
        minStock: 5,
        tax: Number(data.tax_rate) || 13,
        unit: data.unit || "Sp",
      };
    }
  }

  // Guardado aislado estrictamente por establecimiento
  let stored: Product[] = [];
  try {
    const raw = localStorage.getItem(`facturaos_custom_products_${est.id}`);
    if (raw) stored = JSON.parse(raw);
  } catch {}

  let updatedProduct: Product;

  if (editingId) {
    const exists = stored.findIndex((p) => p.id === editingId);
    updatedProduct = {
      id: editingId,
      name: productData.name.trim(),
      sku: productData.sku.trim(),
      cabys: productData.cabys.trim().replace(/\D/g, ""),
      category: productData.category,
      price: Number(productData.price) || 0,
      cost: 0,
      stock: productData.stock || 0,
      minStock: productData.minStock || 5,
      tax: Number(productData.tax) || 13,
      unit: productData.unit || "Sp",
      description: productData.description || "",
    };
    if (exists >= 0) {
      stored[exists] = updatedProduct;
    } else {
      stored.unshift(updatedProduct);
    }
  } else {
    updatedProduct = {
      id: `prod-${est.code || "est"}-${Date.now()}`,
      name: productData.name.trim(),
      sku: productData.sku.trim() || `PROD-${Math.floor(Math.random() * 900) + 100}`,
      cabys: productData.cabys.trim().replace(/\D/g, ""),
      category: productData.category,
      price: Number(productData.price) || 0,
      cost: 0,
      stock: productData.stock || 0,
      minStock: productData.minStock || 5,
      tax: Number(productData.tax) || 13,
      unit: productData.unit || "Sp",
      description: productData.description || "",
    };
    stored.unshift(updatedProduct);
  }

  localStorage.setItem(`facturaos_custom_products_${est.id}`, JSON.stringify(stored));
  return updatedProduct;
}

export async function deleteCompanyProduct(est: EstablishmentRecord, productId: string): Promise<void> {
  if (isGrupoGTres(est) && !productId.startsWith("local-") && !productId.startsWith("prod-")) {
    await supabase.from("products").delete().eq("id", productId);
  }

  try {
    const raw = localStorage.getItem(`facturaos_custom_products_${est.id}`);
    if (raw) {
      const stored: Product[] = JSON.parse(raw);
      const filtered = stored.filter((p) => p.id !== productId);
      localStorage.setItem(`facturaos_custom_products_${est.id}`, JSON.stringify(filtered));
    }
  } catch {}
}

// --------------------------------------------------------------------------
// REPOSITORIO DE CABYS (Totalmente Aislado por Empresa)
// --------------------------------------------------------------------------

export async function getCompanyCabys(est: EstablishmentRecord | null): Promise<CompanyCabysRow[]> {
  if (!est?.id) return [];

  try {
    // 1. Si es Grupo G Tres, cargar sus 12 CABYS de tecnología desde Supabase
    if (isGrupoGTres(est)) {
      const { data, error } = await supabase
        .from("company_cabys")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        let localCustom: CompanyCabysRow[] = [];
        try {
          const stored = localStorage.getItem(`facturaos_custom_cabys_${est.id}`);
          if (stored) localCustom = JSON.parse(stored);
        } catch {}
        return [...localCustom, ...data];
      }
    }

    // 2. Para SRL. 3102832920 (Luxx Car Wash) y demás empresas: CERO mezcla con Grupo G Tres
    const baseCabys = getBaseCabysForEstablishment(est);

    let localCustom: CompanyCabysRow[] = [];
    try {
      const stored = localStorage.getItem(`facturaos_custom_cabys_${est.id}`);
      if (stored) localCustom = JSON.parse(stored);
    } catch {}

    const customCodes = new Set(localCustom.map((c) => c.cabys_code));
    const finalBase = baseCabys.filter((c) => !customCodes.has(c.cabys_code));

    return [...localCustom, ...finalBase];
  } catch (err) {
    console.error(`Error cargando CABYS para ${est.name}:`, err);
    return getBaseCabysForEstablishment(est);
  }
}

export async function addCompanyCabys(
  est: EstablishmentRecord,
  item: CabysItem
): Promise<CompanyCabysRow> {
  const isMaster = isGrupoGTres(est);
  const actCode = est.economic_activity_code || "620901";
  const actDesc = `${actCode} - ${getActivityDescription(actCode)}`;

  if (isMaster) {
    const newRow = {
      cabys_code: item.codigo,
      description: item.descripcion,
      economic_activity: actCode,
      economic_activity_desc: actDesc,
      tax_rate: item.impuesto,
    };
    const { data, error } = await supabase.from("company_cabys").insert(newRow).select().single();
    if (!error && data) return data;
  }

  // Guardado aislado estrictamente por establecimiento
  let stored: CompanyCabysRow[] = [];
  try {
    const raw = localStorage.getItem(`facturaos_custom_cabys_${est.id}`);
    if (raw) stored = JSON.parse(raw);
  } catch {}

  const newCabys: CompanyCabysRow = {
    id: `cab-${est.code || "est"}-${Date.now()}`,
    cabys_code: item.codigo,
    description: item.descripcion,
    economic_activity: actCode,
    economic_activity_desc: actDesc,
    tax_rate: item.impuesto,
    created_at: new Date().toISOString(),
  };

  stored.unshift(newCabys);
  localStorage.setItem(`facturaos_custom_cabys_${est.id}`, JSON.stringify(stored));
  return newCabys;
}

export async function deleteCompanyCabys(est: EstablishmentRecord, cabysId: string, cabysCode: string): Promise<void> {
  if (isGrupoGTres(est) && !cabysId.startsWith("cab-")) {
    await supabase.from("company_cabys").delete().eq("id", cabysId);
  }

  try {
    const raw = localStorage.getItem(`facturaos_custom_cabys_${est.id}`);
    if (raw) {
      const stored: CompanyCabysRow[] = JSON.parse(raw);
      const filtered = stored.filter((c) => c.id !== cabysId && c.cabys_code !== cabysCode);
      localStorage.setItem(`facturaos_custom_cabys_${est.id}`, JSON.stringify(filtered));
    }
  } catch {}
}
