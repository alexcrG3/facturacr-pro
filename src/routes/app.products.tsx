import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, AlertTriangle, Package, Copy, Check, X, Tag, Pencil, Trash2, Sparkles, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { formatCRC, type Product } from "@/lib/mock-data";
import { CabysFinderModal } from "@/components/common/CabysFinderModal";
import { type CabysItem } from "@/lib/cabys";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/app/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const { activeEstablishment } = useApp();
  const [productList, setProductList] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCabys, setCopiedCabys] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Modal CABYS BCCR / Hacienda
  const [isCabysModalOpen, setIsCabysModalOpen] = useState(false);
  const [cabysSearchTarget, setCabysSearchTarget] = useState<"form" | "catalog_add">("form");

  // Form State
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [cabys, setCabys] = useState("");
  const [category, setCategory] = useState("Servicios");
  const [price, setPrice] = useState<number>(0);
  const [tax, setTax] = useState<number>(13);
  const [stock, setStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(5);

  const [isLoading, setIsLoading] = useState(false);

  const loadProducts = async () => {
    if (!activeEstablishment?.id) {
      setProductList([]);
      return;
    }
    setIsLoading(true);
    try {
      let baseCatalog: Product[] = [];

      if (activeEstablishment.code === "nexus_clinic") {
        baseCatalog = [
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
          },
          {
            id: "med-3",
            name: "Certificado Médico Oficial",
            sku: "MED-CERT",
            cabys: "8519900000000",
            category: "Procedimientos",
            price: 15000,
            cost: 0,
            stock: 0,
            minStock: 0,
            tax: 4,
          },
        ];
      } else if (activeEstablishment.code === "barber_app") {
        baseCatalog = [
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
          },
        ];
      } else if (activeEstablishment.code === "gas_express") {
        baseCatalog = [
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
          },
        ];
      } else if (activeEstablishment.code === "athletix_os") {
        baseCatalog = [
          {
            id: "ath-1",
            name: "Membresía Mensual Completa",
            sku: "MEM-MES",
            cabys: "9651000000000",
            category: "Membresías",
            price: 35000,
            cost: 0,
            stock: 0,
            minStock: 0,
            tax: 13,
          },
        ];
      } else if (activeEstablishment.code === "avalcar_cr") {
        baseCatalog = [
          {
            id: "av-1",
            name: "Alineación y Tramado Completo",
            sku: "ALIN-01",
            cabys: "8714100000000",
            category: "Taller",
            price: 24000,
            cost: 0,
            stock: 0,
            minStock: 0,
            tax: 13,
          },
        ];
      } else {
        // Grupo G Tres (matriz de software y tecnología)
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        baseCatalog = (data || []).map((row: any) => ({
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
        }));
      }

      // Añadir productos locales personalizados guardados exclusivamente para este establecimiento
      let localCustom: Product[] = [];
      try {
        const stored = localStorage.getItem(`facturaos_custom_products_${activeEstablishment.id}`);
        if (stored) localCustom = JSON.parse(stored);
      } catch {}

      setProductList([...baseCatalog, ...localCustom]);
    } catch (err) {
      console.error("Error cargando productos de Supabase:", err);
      setProductList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [activeEstablishment]);

  const lowStock = productList.filter((p) => p.stock > 0 && p.stock < p.minStock).length;

  const handleCopyCabys = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCabys(code);
    toast.success(`Código CABYS ${code} copiado al portapapeles`);
    setTimeout(() => setCopiedCabys(null), 2000);
  };

  const handleOpenCreate = () => {
    setEditingProductId(null);
    setName("");
    setSku("");
    setCabys("");
    setCategory("Servicios");
    setPrice(0);
    setTax(13);
    setStock(0);
    setMinStock(5);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProductId(p.id);
    setName(p.name);
    setSku(p.sku);
    setCabys(p.cabys || "");
    setCategory(p.category);
    setPrice(p.price);
    setTax(p.tax);
    setStock(p.stock);
    setMinStock(p.minStock || 5);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar "${prodName}" del catálogo?`)) {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        toast.error("Error al eliminar producto");
        return;
      }
      setProductList((prev) => prev.filter((p) => p.id !== id));
      toast.success(`Producto "${prodName}" eliminado correctamente`);
    }
  };

  const handleSelectCabysItem = (item: CabysItem) => {
    if (cabysSearchTarget === "catalog_add") {
      // Crear nuevo producto directamente desde catálogo CABYS
      setEditingProductId(null);
      setName(item.descripcion);
      setSku(`CAB-${item.codigo.slice(-4)}`);
      setCabys(item.codigo);
      setCategory(item.descripcion.toLowerCase().includes("servicio") || item.descripcion.toLowerCase().includes("consultor") ? "Servicios" : "Alimentos");
      setPrice(0);
      setTax(item.impuesto);
      setStock(0);
      setMinStock(5);
      setIsModalOpen(true);
      toast.success(`Código CABYS ${item.codigo} y tarifa de IVA ${item.impuesto}% cargados`);
    } else {
      // Aplicar al formulario que ya está abierto
      setCabys(item.codigo);
      setTax(item.impuesto);
      if (!name.trim()) {
        setName(item.descripcion);
      }
      toast.success(`Código CABYS ${item.codigo} aplicado (IVA ${item.impuesto}%)`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre del producto o servicio es obligatorio");
      return;
    }
    if (!cabys.trim() || cabys.replace(/\D/g, "").length !== 13) {
      toast.error("El código CABYS debe tener exactamente 13 dígitos numéricos");
      return;
    }

    const cabysClean = cabys.trim().replace(/\D/g, "");

    if (editingProductId) {
      // Editar en Supabase
      const { error } = await supabase
        .from("products")
        .update({
          name: name.trim(),
          code: sku.trim() || "",
          cabys_code: cabysClean,
          category,
          price: Number(price) || 0,
          tax_rate: Number(tax) || 13,
        })
        .eq("id", editingProductId);

      if (error) {
        toast.error("Error al actualizar producto");
        return;
      }
      toast.success(`Producto "${name.trim()}" actualizado con éxito`);
    } else {
      // Crear nuevo en Supabase
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: name.trim(),
          code: sku.trim() || `PROD-${Math.floor(Math.random() * 900) + 100}`,
          cabys_code: cabysClean,
          category,
          price: Number(price) || 0,
          tax_rate: Number(tax) || 13,
          unit: "Sp",
        })
        .select()
        .single();

      if (error) {
        toast.error("Error al registrar producto");
        return;
      }
      const newProduct: Product = {
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
      };
      setProductList((prev) => [newProduct, ...prev]);
      toast.success("Producto registrado exitosamente con su código CABYS");
    }

    await loadProducts();
    setIsModalOpen(false);
  };

  const filtered = productList.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.cabys && p.cabys.includes(q)) ||
      p.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Productos y Servicios"
        description="Catálogo de artículos y códigos CABYS (13 dígitos) autorizados por el Ministerio de Hacienda y BCCR."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setCabysSearchTarget("catalog_add");
                setIsCabysModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-all shadow-sm"
            >
              <Sparkles className="h-4 w-4" /> Buscar en Catálogo CABYS (BCCR)
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:shadow-glow transition-all"
            >
              <Plus className="h-4 w-4" /> Nuevo producto o servicio
            </button>
          </div>
        }
      />

      {lowStock > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning-foreground" />
          <span className="text-warning-foreground">
            {lowStock} productos tienen stock por debajo del mínimo.
          </span>
        </div>
      )}

      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, SKU o código CABYS…"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Producto / Servicio</th>
                <th className="px-5 py-3 text-left font-medium">Código CABYS (13 dígitos)</th>
                <th className="px-5 py-3 text-left font-medium">SKU</th>
                <th className="px-5 py-3 text-left font-medium">Categoría</th>
                <th className="px-5 py-3 text-right font-medium">Precio</th>
                <th className="px-5 py-3 text-right font-medium">Stock</th>
                <th className="px-5 py-3 text-left font-medium">Estado</th>
                <th className="px-5 py-3 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const low = p.stock > 0 && p.stock < p.minStock;
                const out = p.stock === 0 && p.category !== "Servicios";
                const isCopied = copiedCabys === p.cabys;
                return (
                  <tr key={p.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-md bg-primary-soft text-primary">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{p.name}</div>
                          <div className="text-xs text-muted-foreground">IVA {p.tax}%</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="rounded bg-muted px-2 py-0.5 font-semibold text-foreground">
                          {p.cabys || "8523499000000"}
                        </span>
                        <button
                          onClick={() => handleCopyCabys(p.cabys || "8523499000000")}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Copiar código CABYS"
                        >
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{p.sku}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-foreground">
                      {formatCRC(p.price)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">
                      {p.category === "Servicios" ? (
                        <span>—</span>
                      ) : (
                        p.stock
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.category === "Servicios" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                          Servicio
                        </span>
                      ) : out ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive-soft px-2.5 py-0.5 text-xs font-medium text-destructive">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> Agotado
                        </span>
                      ) : low ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Stock bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" /> En stock
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                          title="Editar producto"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar / Editar Producto o Servicio */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Tag className="h-4 w-4" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {editingProductId ? "Editar Producto o Servicio" : "Registrar Producto / Servicio y CABYS"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Nombre del Producto o Servicio <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Consultoría informática o Cargador USB-C"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Código CABYS (13 dígitos) <span className="text-destructive">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCabysSearchTarget("form");
                        setIsCabysModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <Sparkles className="h-3 w-3" /> Buscar en BCCR
                    </button>
                  </div>
                  <input
                    required
                    maxLength={13}
                    value={cabys}
                    onChange={(e) => setCabys(e.target.value)}
                    placeholder="8523499000000"
                    list="cabys-modal-list"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-xs focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                  <datalist id="cabys-modal-list">
                    <option value="8523499000000">8523499000000 · Electrónica y partes</option>
                    <option value="8311100000000">8311100000000 · Servicios y asesorías</option>
                    <option value="2399901000000">2399901000000 · Café tostado o molido</option>
                    <option value="2823700000000">2823700000000 · Textiles y ropa</option>
                    <option value="3532200000000">3532200000000 · Productos de limpieza</option>
                  </datalist>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    SKU / Código Interno
                  </label>
                  <input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Ej: SRV-001 o ELE-100"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-xs focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    <option value="Servicios">Servicios</option>
                    <option value="Alimentos">Alimentos</option>
                    <option value="Electrónica">Electrónica</option>
                    <option value="Textil">Textil</option>
                    <option value="Hogar">Hogar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Precio (CRC) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={price}
                    onChange={(e) => setPrice(+e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Tarifa IVA
                  </label>
                  <select
                    value={tax}
                    onChange={(e) => setTax(+e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    <option value={13}>13% (General)</option>
                    <option value={4}>4% (Reducida)</option>
                    <option value={2}>2% (Reducida)</option>
                    <option value={1}>1% (Canasta)</option>
                    <option value={0}>0% (Exento)</option>
                  </select>
                </div>
              </div>

              {category !== "Servicios" && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Cantidad en Stock
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={stock}
                      onChange={(e) => setStock(+e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Stock Mínimo de Alerta
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={minStock}
                      onChange={(e) => setMinStock(+e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {editingProductId ? "Guardar Cambios" : "Guardar en Catálogo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Buscador Oficial de CABYS BCCR / Hacienda */}
      <CabysFinderModal
        isOpen={isCabysModalOpen}
        onClose={() => setIsCabysModalOpen(false)}
        onSelect={handleSelectCabysItem}
        actionLabel={cabysSearchTarget === "catalog_add" ? "Registrar Producto" : "Usar en Formulario"}
      />
    </div>
  );
}
