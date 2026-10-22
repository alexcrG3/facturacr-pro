import { useState, useEffect } from "react";
import { Search, Loader2, Check, Copy, Sparkles, X, ShieldCheck, Tag } from "lucide-react";
import { toast } from "sonner";
import { buscarCabys, type CabysItem } from "@/lib/cabys";

interface CabysFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: CabysItem) => void;
  initialQuery?: string;
  actionLabel?: string;
}

const QUICK_SEARCHES = [
  { label: "Software y TI", q: "software" },
  { label: "Café", q: "cafe" },
  { label: "Servicios Legales", q: "abogados" },
  { label: "Médico", q: "medico" },
  { label: "Contabilidad", q: "contabilidad" },
  { label: "Alquiler", q: "alquiler" },
  { label: "Canasta Básica", q: "arroz" },
  { label: "Transporte", q: "transporte" },
];

export function CabysFinderModal({
  isOpen,
  onClose,
  onSelect,
  initialQuery = "",
  actionLabel = "Seleccionar",
}: CabysFinderModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CabysItem[]>([]);
  const [source, setSource] = useState<"hacienda_bccr" | "offline_catalog">("hacienda_bccr");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const performSearch = async (term: string) => {
    setLoading(true);
    try {
      const res = await buscarCabys(term, 25);
      setResults(res.items);
      setSource(res.source);
    } catch {
      toast.error("Error al consultar catálogo CABYS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [isOpen, initialQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleCopy = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Código CABYS ${code} copiado`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Encabezado */}
        <div className="border-b border-border bg-muted/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  Buscador Oficial CABYS (BCCR / Hacienda)
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 border border-emerald-500/20">
                    <ShieldCheck className="h-3 w-3" />
                    {source === "hacienda_bccr" ? "API Hacienda / BCCR En Vivo" : "Catálogo de Respaldo"}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Catálogo de Bienes y Servicios de Costa Rica. Consulta código de 13 dígitos y tarifa oficial de IVA.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Barra de búsqueda */}
          <form onSubmit={handleSearchSubmit} className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.length > 2) {
                    performSearch(e.target.value);
                  }
                }}
                placeholder="Escribe una palabra clave o código (ej: café, consultoría, software, arroz, 8313100000100)..."
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm font-medium focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-xs text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </form>

          {/* Búsquedas Rápidas */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Sugerencias:</span>
            {QUICK_SEARCHES.map((qs) => (
              <button
                key={qs.label}
                type="button"
                onClick={() => {
                  setQuery(qs.q);
                  performSearch(qs.q);
                }}
                className="rounded-md border border-border/80 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                {qs.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de resultados */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 max-h-[450px]">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-xs font-medium text-muted-foreground">Consultando catálogo oficial de Hacienda y BCCR...</p>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Tag className="h-10 w-10 stroke-1 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-foreground">No se encontraron códigos CABYS</p>
              <p className="text-xs mt-1">Intenta buscar con palabras más generales (ej: "computadora", "servicio", "carne").</p>
            </div>
          )}

          {!loading &&
            results.map((item) => {
              const isCopied = copiedCode === item.codigo;
              const taxBadgeColor =
                item.impuesto === 13
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  : item.impuesto === 1
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : item.impuesto === 4
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : item.impuesto === 2
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                  : "bg-muted text-muted-foreground border-border";

              const taxLabel =
                item.impuesto === 13
                  ? "IVA 13% (General)"
                  : item.impuesto === 1
                  ? "IVA 1% (Canasta Básica)"
                  : item.impuesto === 4
                  ? "IVA 4% (Servicios Médicos)"
                  : item.impuesto === 2
                  ? "IVA 2% (Educación / Medicamentos)"
                  : `IVA ${item.impuesto}% (Exento / Reducido)`;

              return (
                <div
                  key={item.codigo}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-muted/10 transition-all shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {item.codigo}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(item.codigo, e)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Copiar código CABYS"
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${taxBadgeColor}`}>
                        {taxLabel}
                      </span>
                    </div>

                    <h4 className="mt-1.5 text-sm font-semibold text-foreground leading-snug">
                      {item.descripcion}
                    </h4>

                    {item.categorias && item.categorias.length > 0 && (
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                        {item.categorias.slice(-2).join(" › ")}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors shrink-0 self-end sm:self-center"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {actionLabel}
                  </button>
                </div>
              );
            })}
        </div>

        {/* Pie */}
        <div className="border-t border-border bg-muted/20 px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{results.length} resultados encontrados</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-4 py-1.5 font-medium hover:bg-muted transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
