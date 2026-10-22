import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff, Zap, Loader2 } from "lucide-react";
import { getFacturaOSConfig, saveFacturaOSConfig, probarConexionFacturaOS } from "@/lib/facturaos";

export function FacturaOSConfigCard() {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    const cfg = getFacturaOSConfig();
    setApiUrl(cfg.apiUrl);
    setApiKey(cfg.apiKey);
  }, []);

  const handleProbar = async () => {
    setLoading(true);
    try {
      const res = await probarConexionFacturaOS(apiUrl, apiKey);
      setStatus("ok");
      setDetails(res.establishment);
      alert(`¡Conectado exitosamente con ${res.establishment.name}!`);
    } catch (err: any) {
      setStatus("error");
      alert(err.message || "Error al conectar con FacturaOS");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = () => {
    saveFacturaOSConfig(apiUrl, apiKey);
    alert("¡Credenciales de FacturaOS guardadas!");
  };

  return (
    <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-50/20 via-white to-slate-50/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Facturación Electrónica (FacturaOS)</CardTitle>
            <CardDescription className="text-xs">Conexión con Ministerio de Hacienda Costa Rica (v4.4)</CardDescription>
          </div>
        </div>

        <div>
          {status === "ok" ? (
            <Badge className="bg-emerald-600 text-white font-bold gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" /> Conectado
            </Badge>
          ) : status === "error" ? (
            <Badge variant="destructive" className="font-bold gap-1 text-xs">
              <AlertCircle className="h-3 w-3" /> Sin Conexión
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-600 border-slate-300 gap-1 text-xs">
              <ShieldCheck className="h-3 w-3 text-indigo-600" /> Bóveda FacturaOS
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">URL del Servidor FacturaOS</Label>
            <Input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="font-mono text-xs"
              placeholder="http://localhost:3000/api/v1/invoices"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Clave API Secreta (API Key)</Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-xs pr-10"
                placeholder="fct_live_..."
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {details && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <strong>Vinculado a:</strong> {details.name} (Cédula: {details.legalId}) | Ambiente: {details.environment}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleProbar}
            disabled={loading}
            className="text-indigo-700 border-indigo-200 gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
            {loading ? "Probando..." : "⚡ Probar Conexión con FacturaOS"}
          </Button>

          <Button type="button" size="sm" onClick={handleGuardar} className="bg-indigo-600 text-white font-bold">
            Guardar Configuración
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
