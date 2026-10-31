import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Building2, Phone, Mail, MapPin, ShieldCheck, Sparkles, CreditCard, Landmark } from "lucide-react";
import { formatCRC } from "@/lib/mock-data";
import { numeroALetras } from "@/lib/number-to-words";
import { OfficialSealBadge } from "./OfficialSealBadge";
import type { InvoiceTemplateProps } from "./TemplateCorporativa";

export function TemplateModerna({
  invoice,
  emisor,
  client,
  consecutivo,
  clave,
  docTypeName,
  items,
  subtotal,
  impuesto,
  total,
  currency = "CRC",
  condicionVenta = "Contado",
  medioPago = "Transferencia Bancaria / SINPE",
}: InvoiceTemplateProps) {
  const montoEnLetras = numeroALetras(total, currency);

  return (
    <div className="relative bg-white text-slate-800 p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none print:text-black print:m-0 text-xs overflow-hidden">
      {/* Decorative modern top accent inspired by modern curved layout */}
      <div className="absolute top-0 right-0 w-80 h-32 bg-gradient-to-bl from-slate-900 via-indigo-950 to-transparent rounded-bl-[100px] pointer-events-none opacity-95 print:opacity-100 flex items-start justify-end p-6">
        <div className="text-right text-white">
          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block">
            {docTypeName}
          </span>
          <div className="text-xl font-black font-mono tracking-tight">{invoice.number}</div>
        </div>
      </div>

      {/* Decorative top-left small circle */}
      <div className="absolute -top-6 -left-6 w-20 h-20 bg-amber-500/15 rounded-full pointer-events-none" />

      {/* ─── ENCABEZADO: LOGO Y DATOS DE LA EMPRESA ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2 pb-4 border-b border-slate-100 relative z-10">
        <div className="flex items-center gap-4 max-w-sm">
          {emisor.logoUrl ? (
            <img
              src={emisor.logoUrl}
              alt={emisor.name}
              className="h-16 w-auto max-w-[150px] object-contain rounded-xl border border-slate-100 p-1 shadow-sm"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-700 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md">
              {emisor.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="space-y-0.5">
            <h1 className="text-base font-black text-slate-900 leading-tight uppercase tracking-tight">
              {emisor.name}
            </h1>
            <p className="font-mono text-slate-600 font-bold text-[11px]">
              Cédula: {emisor.legalId}
            </p>
            {emisor.activityCode && (
              <p className="text-[10px] text-slate-500">
                Actividad: <strong className="text-slate-700">{emisor.activityCode}</strong> {emisor.activityDesc ? `(${emisor.activityDesc})` : ""}
              </p>
            )}
            <div className="flex flex-wrap gap-x-2 text-[10px] text-slate-500">
              {emisor.phone && <span>Tel: {emisor.phone}</span>}
              {emisor.email && <span>• {emisor.email}</span>}
            </div>
            {emisor.address && <p className="text-[10px] text-slate-400">{emisor.address}</p>}
          </div>
        </div>

        {/* Info lateral derecha con detalles fecha y consecutivo */}
        <div className="text-right sm:pt-14 space-y-1">
          <div className="text-[10px] text-slate-500">
            Consecutivo Oficial: <span className="font-mono font-bold text-slate-800">{consecutivo}</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Fecha de Emisión: <span className="font-semibold text-slate-800">{new Date(invoice.date || Date.now()).toLocaleString("es-CR")}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Autorizado por Hacienda (v4.4)
          </div>
        </div>
      </div>

      {/* ─── CLAVE NUMÉRICA DE 50 DÍGITOS ─── */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 block">
            Clave Numérica de Hacienda (50 dígitos reglamentarios):
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-800 break-all">
            {clave}
          </span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[9px] font-semibold text-slate-500 uppercase">Moneda: </span>
          <span className="font-bold text-indigo-900 text-xs">{currency}</span>
        </div>
      </div>

      {/* ─── DATOS DEL RECEPTOR & CONDICIONES ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Facturado a (Receptor):
          </span>
          <div className="text-sm font-black text-slate-900 leading-snug">{client.name}</div>
          <div className="text-xs font-mono text-slate-700 font-semibold">
            {client.legalId ? `Cédula: ${client.legalId}` : "Consumidor Final"}
          </div>
          {client.email && <div className="text-[11px] text-slate-600">{client.email}</div>}
          {client.phone && <div className="text-[11px] text-slate-500">Tel: {client.phone}</div>}
          {client.address && <div className="text-[10px] text-slate-400">{client.address}</div>}
        </div>

        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2 text-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-indigo-600" /> Condiciones Comerciales
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div>
              <span className="text-slate-400 block text-[10px]">Condición Venta:</span>
              <span className="font-bold text-slate-800">{condicionVenta}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Medio de Pago:</span>
              <span className="font-bold text-slate-800">{medioPago}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Tipo de Cambio:</span>
              <span className="font-mono font-semibold text-slate-700">₡1.00</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Plazo de Crédito:</span>
              <span className="font-medium text-slate-700">Inmediato</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TABLA DE LÍNEAS / PRODUCTOS ─── */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">Descripción / Servicio</th>
              <th className="py-2.5 px-2 text-center w-16">Cant.</th>
              <th className="py-2.5 px-3 text-right w-24">Precio Unit.</th>
              <th className="py-2.5 px-2 text-center w-16">IVA %</th>
              <th className="py-2.5 px-3 text-right w-28">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it: any, idx: number) => {
              const qty = it.quantity || it.cant || 1;
              const unitPrice = it.unitPrice || it.precio || 0;
              const lineTotal = it.total || qty * unitPrice;
              const ivaRate = it.ivaRate !== undefined ? it.ivaRate : 13;

              return (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <div className="font-bold text-slate-900">{it.description || it.descripcion || "Servicio Profesional"}</div>
                    {it.cabys && (
                      <span className="text-[9px] font-mono text-indigo-600 block">CAByS: {it.cabys}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-slate-700">{qty}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">{formatCRC(unitPrice)}</td>
                  <td className="py-2 px-2 text-center font-mono text-slate-600">{ivaRate}%</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCRC(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── TOTALES Y MONTO EN LETRAS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
        {/* Lado izquierdo: Monto en letras y cuentas bancarias */}
        <div className="sm:col-span-7 space-y-3">
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 block">
              Monto Total en Letras:
            </span>
            <div className="text-xs font-black text-slate-900 uppercase pt-0.5">
              {montoEnLetras}
            </div>
          </div>

          {(emisor.bankAccounts || emisor.sinpePhone) && (
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 text-[11px] space-y-1">
              <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                <Landmark className="h-3 w-3 text-indigo-600" /> Cuentas para Pago / Transferencia:
              </span>
              {emisor.bankAccounts && (
                <div className="font-mono text-[10px] text-slate-600 whitespace-pre-line">
                  {emisor.bankAccounts}
                </div>
              )}
              {emisor.sinpePhone && (
                <div className="font-semibold text-emerald-700 text-[11px]">
                  SINPE Móvil: {emisor.sinpePhone}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lado derecho: Desglose de totales */}
        <div className="sm:col-span-5 rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal Neto:</span>
            <span className="font-mono font-semibold">{formatCRC(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Impuesto IVA (13%):</span>
            <span className="font-mono font-semibold">{formatCRC(impuesto)}</span>
          </div>
          <div className="border-t border-slate-300 pt-2 flex justify-between items-center">
            <span className="text-sm font-black text-slate-900 uppercase">Total a Pagar:</span>
            <span className="text-base font-black font-mono text-indigo-950 bg-amber-400 px-2.5 py-0.5 rounded-lg shadow-sm">
              {formatCRC(total)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── PIE: SELLO OFICIAL DE HACIENDA + QR + RESOLUCIÓN ─── */}
      <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
            <QRCodeSVG
              value={`https://facturaelectronica.hacienda.go.cr/consulta?clave=${clave}`}
              size={72}
              level="M"
            />
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="text-[10px] text-slate-500 leading-snug">
              Autorizada mediante resolución de la DGT Nº <strong>DGT-R-033-2019</strong> y <strong>MH-DGT-RES-0027-2024</strong>. Versión 4.4 (v2).
            </p>
            <p className="text-[9px] text-slate-400">
              Este comprobante electrónico goza de validez jurídica y tributaria plena en Costa Rica conforme al artículo 83 del Código de Normas y Procedimientos Tributarios.
            </p>
          </div>
        </div>

        <div className="shrink-0 self-stretch sm:self-auto flex items-center justify-end">
          <OfficialSealBadge />
        </div>
      </div>
    </div>
  );
}
