import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Building2, Landmark, Check } from "lucide-react";
import { formatCRC } from "@/lib/mock-data";
import { numeroALetras } from "@/lib/number-to-words";
import { OfficialSealBadge } from "./OfficialSealBadge";
import type { InvoiceTemplateProps } from "./TemplateCorporativa";

export function TemplateClasica({
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
  medioPago = "Transferencia",
}: InvoiceTemplateProps) {
  const montoEnLetras = numeroALetras(total, currency);

  return (
    <div className="bg-white text-black p-7 rounded-lg border border-slate-300 shadow-sm space-y-4 print:p-0 print:border-none print:shadow-none print:m-0 text-xs font-sans">
      {/* ─── BARRA SUPERIOR VERDE TRIBUTARIA (ESTILO FACTURELE / COMERCIAL CR) ─── */}
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-b border-slate-200 pb-1">
        <span>REPÚBLICA DE COSTA RICA • MINISTERIO DE HACIENDA</span>
        <span className="font-mono">Página 1 / 1</span>
      </div>

      {/* ─── BANNER PRINCIPAL: TIPO Y CONSECUTIVO ─── */}
      <div className="rounded border-2 border-emerald-600 bg-emerald-600/10 p-2 text-center">
        <h2 className="text-sm font-black uppercase tracking-wider text-emerald-900">
          {docTypeName} Nº {invoice.number}
        </h2>
        <div className="text-[11px] font-mono text-emerald-800 font-bold">
          Consecutivo: {consecutivo}
        </div>
      </div>

      {/* ─── CABECERA: EMISOR VS CLAVE HACIENDA ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        {/* Emisor */}
        <div className="flex items-start gap-3">
          {emisor.logoUrl ? (
            <img
              src={emisor.logoUrl}
              alt={emisor.name}
              className="h-14 w-auto max-w-[130px] object-contain rounded border border-slate-200 p-0.5"
            />
          ) : (
            <div className="h-14 w-14 rounded bg-emerald-700 text-white font-black text-lg flex items-center justify-center shrink-0">
              {emisor.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="space-y-0.5">
            <h1 className="text-sm font-black uppercase text-slate-900 leading-tight">
              {emisor.name}
            </h1>
            <p className="font-mono font-bold text-slate-700 text-xs">
              Cédula: {emisor.legalId}
            </p>
            {emisor.activityCode && (
              <p className="text-[10px] text-slate-600">
                Actividad: <strong className="font-mono">{emisor.activityCode}</strong>
              </p>
            )}
            <div className="text-[10px] text-slate-600">
              {emisor.phone && <span>Tel: {emisor.phone} </span>}
              {emisor.email && <span>• {emisor.email}</span>}
            </div>
            {emisor.address && <p className="text-[10px] text-slate-500">{emisor.address}</p>}
          </div>
        </div>

        {/* Clave y Fechas */}
        <div className="space-y-1.5 sm:text-right text-[11px]">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
              Clave Numérica de Hacienda (50 dígitos):
            </span>
            <span className="font-mono font-bold text-slate-900 text-[10px] break-all block">
              {clave}
            </span>
          </div>
          <div className="text-slate-600 text-[10px]">
            Fecha: <span className="font-bold text-slate-900">{new Date(invoice.date || Date.now()).toLocaleString("es-CR")}</span>
          </div>
          <div className="text-slate-600 text-[10px]">
            Condición Venta: <span className="font-bold text-slate-900">{condicionVenta}</span> • Medio: <span className="font-bold text-slate-900">{medioPago}</span>
          </div>
        </div>
      </div>

      <div className="border-t-2 border-dashed border-emerald-600/40 my-1" />

      {/* ─── DATOS DEL RECEPTOR ─── */}
      <div className="rounded border border-slate-300 p-2.5 bg-slate-50/70 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Receptor / Cliente:</span>
            <span className="font-bold text-slate-900 text-xs">{client.name}</span>
            <div className="font-mono text-slate-700 text-[11px]">
              Cédula: {client.legalId || "Consumidor Final"}
            </div>
          </div>
          <div className="text-[11px] space-y-0.5 sm:text-right">
            {client.email && <div>Correo: <span className="font-medium text-slate-900">{client.email}</span></div>}
            {client.phone && <div>Teléfono: <span className="font-medium text-slate-900">{client.phone}</span></div>}
            {client.address && <div>Dirección: <span className="text-slate-600">{client.address}</span></div>}
          </div>
        </div>
      </div>

      {/* ─── TABLA DE ARTÍCULOS ─── */}
      <div className="border border-emerald-800 rounded overflow-hidden">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="bg-emerald-700 text-white font-bold text-[10px] uppercase">
              <th className="py-1.5 px-2.5 w-10 text-center">CÓD</th>
              <th className="py-1.5 px-2.5">DESCRIPCIÓN</th>
              <th className="py-1.5 px-2 text-center w-14">CANT</th>
              <th className="py-1.5 px-2.5 text-right w-24">PR UNIT</th>
              <th className="py-1.5 px-2 text-center w-14">% IVA</th>
              <th className="py-1.5 px-2.5 text-right w-28">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((it: any, idx: number) => {
              const qty = it.quantity || it.cant || 1;
              const unitPrice = it.unitPrice || it.precio || 0;
              const lineTotal = it.total || qty * unitPrice;
              const ivaRate = it.ivaRate !== undefined ? it.ivaRate : 13;

              return (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-emerald-50/20"}>
                  <td className="py-1.5 px-2.5 text-center font-mono text-[10px] text-slate-500">
                    {it.code || idx + 1}
                  </td>
                  <td className="py-1.5 px-2.5 font-medium text-slate-900">
                    {it.description || it.descripcion || "Servicio / Producto"}
                    {it.cabys && (
                      <span className="text-[9px] font-mono text-emerald-700 block">CAByS: {it.cabys}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center font-mono">{qty}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono">{formatCRC(unitPrice)}</td>
                  <td className="py-1.5 px-2 text-center font-mono">{ivaRate}%</td>
                  <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">{formatCRC(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── TOTALES, RECIBIDO CONFORME & RESOLUCIÓN ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start pt-1">
        {/* QR y texto legal */}
        <div className="sm:col-span-7 flex items-start gap-3">
          <div className="border border-slate-300 p-1 rounded shrink-0 bg-white">
            <QRCodeSVG
              value={`https://facturaelectronica.hacienda.go.cr/consulta?clave=${clave}`}
              size={64}
              level="M"
            />
          </div>
          <div className="space-y-1 text-[10px] text-slate-600 leading-snug">
            <p>
              El recibido conforme de este documento electrónico da por aceptado que se recibieron todas sus líneas y servicios a entera satisfacción.
            </p>
            <p className="font-bold text-slate-700">
              Autorizada mediante Resoluciones DGT-R-033-2019 y MH-DGT-RES-0027-2024 de la Dirección General de Tributación. Versión 4.4 (v2).
            </p>
            <div className="pt-1 font-bold uppercase text-[11px] text-slate-900 font-mono">
              TOTAL EN LETRAS: {montoEnLetras}
            </div>
          </div>
        </div>

        {/* Desglose de totales */}
        <div className="sm:col-span-5 border border-slate-300 rounded p-3 bg-slate-50 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-600">
            <span>Sub-Total:</span>
            <span className="font-mono font-semibold">{formatCRC(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Total IVA:</span>
            <span className="font-mono font-semibold">{formatCRC(impuesto)}</span>
          </div>
          <div className="border-t border-slate-300 pt-1 flex justify-between items-center text-sm font-black text-slate-900">
            <span>TOTAL:</span>
            <span className="font-mono text-base text-emerald-800">{formatCRC(total)}</span>
          </div>
        </div>
      </div>

      {/* ─── FIRMA Y CUENTAS BANCARIAS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-slate-200 text-[10px]">
        <div>
          <div className="pt-4 border-t border-slate-400 w-48 text-center text-slate-600">
            Recibido Conforme / Firma Cliente
          </div>
        </div>

        <div className="text-right space-y-0.5">
          {(emisor.bankAccounts || emisor.sinpePhone) && (
            <div>
              <span className="font-bold text-slate-700 block">Cuentas Bancarias / Transferencias:</span>
              {emisor.bankAccounts && <p className="font-mono text-[9px] text-slate-600">{emisor.bankAccounts}</p>}
              {emisor.sinpePhone && <p className="font-bold text-emerald-700 text-[10px]">SINPE Móvil: {emisor.sinpePhone}</p>}
            </div>
          )}
          <div className="pt-1">
            <OfficialSealBadge />
          </div>
        </div>
      </div>
    </div>
  );
}
