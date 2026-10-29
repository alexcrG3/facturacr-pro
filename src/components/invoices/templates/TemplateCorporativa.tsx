import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Building2, Phone, Mail, MapPin, ShieldCheck, CheckCircle2 } from "lucide-react";
import { formatCRC } from "@/lib/mock-data";
import { numeroALetras } from "@/lib/number-to-words";
import { OfficialSealBadge } from "./OfficialSealBadge";

export interface InvoiceTemplateProps {
  invoice: any;
  emisor: {
    name: string;
    legalId: string;
    legalIdType?: string;
    email?: string;
    phone?: string;
    address?: string;
    activityCode?: string;
    activityDesc?: string;
    logoUrl?: string;
    bankAccounts?: string;
    sinpePhone?: string;
  };
  client: {
    name: string;
    legalId?: string;
    legalIdType?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  consecutivo: string;
  clave: string;
  docTypeStr: "01" | "04" | "03" | "02";
  docTypeName: string;
  items: any[];
  subtotal: number;
  impuesto: number;
  total: number;
  currency?: "CRC" | "USD";
  condicionVenta?: string;
  medioPago?: string;
}

export function TemplateCorporativa({
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
  medioPago = "Transferencia Bancaria",
}: InvoiceTemplateProps) {
  const montoEnLetras = numeroALetras(total, currency);

  return (
    <div className="bg-white text-slate-800 p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none print:text-black print:m-0 text-xs">
      {/* ─── ENCABEZADO: EMISOR VS TIPO DE COMPROBANTE ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-5">
        {/* Emisor info */}
        <div className="flex items-start gap-4 max-w-md">
          {emisor.logoUrl ? (
            <img
              src={emisor.logoUrl}
              alt={emisor.name}
              className="h-16 w-auto max-w-[140px] object-contain rounded-lg border border-slate-100 p-1"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/20">
              {emisor.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="space-y-0.5">
            <h1 className="text-base font-black text-slate-900 leading-tight uppercase">
              {emisor.name}
            </h1>
            <p className="font-mono text-slate-600 font-semibold">
              Cédula: {emisor.legalId}
            </p>
            {emisor.activityCode && (
              <p className="text-[11px] text-slate-500">
                Actividad: <strong className="text-slate-700">{emisor.activityCode}</strong> {emisor.activityDesc ? `(${emisor.activityDesc})` : ""}
              </p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 pt-0.5">
              {emisor.phone && <span>Tel: {emisor.phone}</span>}
              {emisor.email && <span>Email: {emisor.email}</span>}
            </div>
            {emisor.address && <p className="text-[10px] text-slate-400">{emisor.address}</p>}
          </div>
        </div>

        {/* Bloque Comprobante */}
        <div className="rounded-xl border border-blue-600/30 bg-blue-50/50 p-4 text-right space-y-1 min-w-[260px] shrink-0 sm:self-auto self-stretch">
          <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 block">
            {docTypeName}
          </span>
          <div className="text-lg font-mono font-black text-slate-900">
            {invoice.number || consecutivo.slice(-10)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Consecutivo: <strong className="text-slate-800">{consecutivo}</strong>
          </div>
          <div className="text-[10px] text-slate-500">
            Fecha: <strong className="text-slate-800">{new Date(invoice.date || Date.now()).toLocaleString("es-CR")}</strong>
          </div>
          <div className="text-[10px] text-slate-500">
            Condición: <strong className="text-slate-800">{condicionVenta}</strong> · {medioPago}
          </div>
        </div>
      </div>

      {/* ─── CLAVE NUMÉRICA DE 50 DÍGITOS ─── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
          Clave Numérica Hacienda (50 dígitos):
        </span>
        <span className="font-mono text-xs font-bold text-blue-700 tracking-wider break-all select-all">
          {clave}
        </span>
      </div>

      {/* ─── RECEPTOR (CLIENTE) ─── */}
      <div className="rounded-xl border border-slate-200 p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Receptor / Cliente
          </span>
          <p className="font-bold text-slate-900 text-sm">{client.name || "Consumidor Final"}</p>
          <p className="font-mono text-slate-600 mt-0.5">
            Cédula: {client.legalId || "Sin Identificación"}
          </p>
          {client.address && <p className="text-[11px] text-slate-500 mt-0.5">{client.address}</p>}
        </div>
        <div className="sm:border-l sm:border-slate-100 sm:pl-4 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Datos Comerciales
          </span>
          {client.email && <p className="text-slate-600 truncate">Correo: <strong className="text-slate-800">{client.email}</strong></p>}
          {client.phone && <p className="text-slate-600">Teléfono: <strong className="text-slate-800">{client.phone}</strong></p>}
          <p className="text-slate-600">Moneda: <strong className="text-slate-800">{currency === "USD" ? "Dólares ($)" : "Colones (₡)"}</strong></p>
        </div>
      </div>

      {/* ─── TABLA DE DETALLE ─── */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800 text-white font-bold text-[11px]">
            <tr>
              <th className="p-2.5">CÓDIGO / CABYS</th>
              <th className="p-2.5">DESCRIPCIÓN</th>
              <th className="p-2.5 text-center">CANT.</th>
              <th className="p-2.5 text-right">PRECIO UNIT.</th>
              <th className="p-2.5 text-center">% IVA</th>
              <th className="p-2.5 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items && items.length > 0 ? (
              items.map((it: any, idx: number) => {
                const up = Number(it.unitPrice || it.precioUnitario || 0);
                const q = Number(it.quantity || 1);
                const lineSub = up * q;
                const lineTax = Number(it.taxAmount ?? (lineSub * 0.13));
                const lineTot = Number(it.totalAmount ?? (lineSub + lineTax));
                return (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-mono text-[11px] text-slate-500">
                      {it.cabysCode || it.cabys || "8311100000000"}
                    </td>
                    <td className="p-2.5 font-semibold text-slate-900">
                      {it.description || it.detalle || it.name || "Servicio / Producto"}
                    </td>
                    <td className="p-2.5 text-center font-mono font-medium">{q}</td>
                    <td className="p-2.5 text-right font-mono font-medium">{formatCRC(up)}</td>
                    <td className="p-2.5 text-center font-mono">13%</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatCRC(lineTot)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="p-2.5 font-mono text-[11px] text-slate-500">8311100000000</td>
                <td className="p-2.5 font-semibold text-slate-900">Servicios Comerciales Profesionales</td>
                <td className="p-2.5 text-center font-mono">1</td>
                <td className="p-2.5 text-right font-mono">{formatCRC(subtotal)}</td>
                <td className="p-2.5 text-center font-mono">13%</td>
                <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatCRC(total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── MONTO EN LETRAS ─── */}
      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 text-[11px] text-slate-700">
        <span className="font-bold text-slate-500 uppercase tracking-wider mr-2">Monto en Letras:</span>
        <strong className="text-slate-900 uppercase font-mono">{montoEnLetras}</strong>
      </div>

      {/* ─── CUENTAS BANCARIAS Y SINPE MÓVIL (ESTILO GTI / WALCAS) ─── */}
      <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-3 text-[11px]">
        <div>
          <span className="font-bold text-slate-700 uppercase tracking-wider block mb-0.5">
            Cuentas Bancarias para Depósito o Transferencia:
          </span>
          <p className="text-slate-600 font-mono">
            {emisor.bankAccounts || "BAC San José / BNCR / BCR · Cuenta IBAN disponible"}
          </p>
        </div>
        {emisor.sinpePhone && (
          <div className="sm:text-right shrink-0">
            <span className="font-bold text-emerald-700 uppercase tracking-wider block mb-0.5">
              SINPE Móvil Oficial:
            </span>
            <p className="text-slate-900 font-mono font-bold">{emisor.sinpePhone}</p>
          </div>
        )}
      </div>

      {/* ─── TOTALES, QR Y SELLO OFICIAL ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-200 pt-4">
        {/* QR y Leyenda Hacienda */}
        <div className="flex items-center gap-4">
          <div className="grid place-items-center rounded-xl border border-slate-200 bg-white p-2 shadow-xs shrink-0">
            <QRCodeSVG
              value={`https://tribunet.hacienda.go.cr/comprobante?clave=${clave}`}
              size={76}
              level="M"
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>
          <div className="space-y-1 max-w-[260px]">
            <span className="font-bold text-[11px] text-slate-900 block">
              Comprobante Electrónico Autorizado
            </span>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Autorizado mediante resolución <strong>N° DGT-R-033-2019</strong> de la Dirección General de Tributación.
              Versión 4.3.
            </p>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <CheckCircle2 className="h-3 w-3" /> Verificación Criptográfica SHA-256
            </span>
          </div>
        </div>

        {/* Totales desglosados */}
        <div className="w-full sm:w-64 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal Gravado:</span>
            <span className="font-mono font-semibold text-slate-800">{formatCRC(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Subtotal Exento:</span>
            <span className="font-mono font-semibold text-slate-800">₡ 0</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>IVA (13%):</span>
            <span className="font-mono font-semibold text-slate-800">{formatCRC(impuesto)}</span>
          </div>
          <div className="border-t-2 border-slate-900 pt-1.5 flex justify-between text-sm font-black text-slate-900">
            <span>TOTAL A PAGAR:</span>
            <span className="font-mono text-base text-blue-700">{formatCRC(total)}</span>
          </div>
        </div>
      </div>

      {/* Firma / Recibido conforme */}
      <div className="border-t border-dashed border-slate-200 pt-4 flex flex-col sm:flex-row justify-between items-end gap-4 text-[10px] text-slate-400">
        <p className="max-w-md">
          El recibido conforme de este documento electrónico da por aceptadas todas sus líneas y exime al emisor de todo reclamo posterior.
        </p>
        <div className="w-48 text-center pt-6 border-t border-slate-300">
          <span className="font-semibold text-slate-600 block">Firma / Recibido Conforme</span>
        </div>
      </div>
    </div>
  );
}
