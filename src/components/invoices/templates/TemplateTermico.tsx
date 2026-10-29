import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { formatCRC } from "@/lib/mock-data";
import { numeroALetras } from "@/lib/number-to-words";
import { OfficialSealBadge } from "./OfficialSealBadge";
import type { InvoiceTemplateProps } from "./TemplateCorporativa";

export function TemplateTermico({
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
  medioPago = "Efectivo / SINPE",
}: InvoiceTemplateProps) {
  const montoEnLetras = numeroALetras(total, currency);

  return (
    <div className="mx-auto max-w-[340px] bg-white text-black p-4 border border-dashed border-slate-300 rounded-lg shadow-sm font-mono text-[11px] leading-tight print:max-w-none print:w-full print:border-none print:shadow-none print:p-0 print:m-0 space-y-2">
      {/* ─── ENCABEZADO CENTRADO ─── */}
      <div className="text-center space-y-1">
        {emisor.logoUrl ? (
          <img
            src={emisor.logoUrl}
            alt={emisor.name}
            className="h-12 w-auto max-w-[140px] object-contain mx-auto filter grayscale"
          />
        ) : null}
        <h1 className="text-xs font-black uppercase tracking-tight">{emisor.name}</h1>
        <p className="font-bold text-[10px]">CÉDULA: {emisor.legalId}</p>
        {emisor.activityCode && (
          <p className="text-[9px]">Act. Económica: {emisor.activityCode}</p>
        )}
        {emisor.phone && <p className="text-[9px]">Tel: {emisor.phone}</p>}
        {emisor.email && <p className="text-[9px]">{emisor.email}</p>}
        {emisor.address && <p className="text-[9px] text-slate-600">{emisor.address}</p>}
      </div>

      <div className="border-b border-dashed border-black/80 my-2" />

      {/* ─── DATOS COMPROBANTE ─── */}
      <div className="space-y-0.5 text-[10px]">
        <div className="text-center font-black uppercase text-xs">
          {docTypeName}
        </div>
        <div className="flex justify-between">
          <span>Número:</span>
          <span className="font-bold">{invoice.number}</span>
        </div>
        <div className="flex justify-between">
          <span>Consecutivo:</span>
          <span className="font-bold">{consecutivo}</span>
        </div>
        <div className="flex justify-between">
          <span>Fecha:</span>
          <span>{new Date(invoice.date || Date.now()).toLocaleString("es-CR")}</span>
        </div>
        <div className="flex justify-between">
          <span>Condición:</span>
          <span className="font-bold">{condicionVenta}</span>
        </div>
        <div className="flex justify-between">
          <span>Medio Pago:</span>
          <span className="font-bold">{medioPago}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-black/80 my-2" />

      {/* ─── CLIENTE / RECEPTOR ─── */}
      <div className="text-[10px] space-y-0.5">
        <div className="font-bold uppercase">Cliente: {client.name}</div>
        <div>Cédula: {client.legalId || "Consumidor Final"}</div>
        {client.email && <div>Email: {client.email}</div>}
      </div>

      <div className="border-b border-dashed border-black/80 my-2" />

      {/* ─── DETALLE DE ARTÍCULOS ─── */}
      <div>
        <div className="flex justify-between text-[10px] font-bold uppercase pb-1 border-b border-black">
          <span>Cant. Descripción</span>
          <span>Total</span>
        </div>
        <div className="divide-y divide-dashed divide-slate-200 py-1">
          {items.map((it: any, idx: number) => {
            const qty = it.quantity || it.cant || 1;
            const unitPrice = it.unitPrice || it.precio || 0;
            const lineTotal = it.total || qty * unitPrice;

            return (
              <div key={idx} className="py-1 text-[10px]">
                <div className="flex justify-between items-start">
                  <span className="font-bold pr-2">{qty}x {it.description || it.descripcion}</span>
                  <span className="font-bold shrink-0">{formatCRC(lineTotal)}</span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 pl-4">
                  <span>Unit: {formatCRC(unitPrice)}</span>
                  {it.cabys && <span>CABYS: {it.cabys}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-b border-dashed border-black/80 my-2" />

      {/* ─── TOTALES ─── */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCRC(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>IVA (13%):</span>
          <span>{formatCRC(impuesto)}</span>
        </div>
        <div className="flex justify-between text-sm font-black border-t-2 border-black pt-1">
          <span>TOTAL:</span>
          <span>{formatCRC(total)}</span>
        </div>
        <div className="text-[9px] font-bold uppercase pt-1 text-center">
          Son: {montoEnLetras}
        </div>
      </div>

      {/* Cuentas / SINPE */}
      {(emisor.bankAccounts || emisor.sinpePhone) && (
        <>
          <div className="border-b border-dashed border-black/80 my-1" />
          <div className="text-[9px] text-center space-y-0.5">
            {emisor.sinpePhone && (
              <p className="font-bold">SINPE Móvil: {emisor.sinpePhone}</p>
            )}
            {emisor.bankAccounts && (
              <p className="whitespace-pre-line text-[8px]">{emisor.bankAccounts}</p>
            )}
          </div>
        </>
      )}

      <div className="border-b border-dashed border-black/80 my-2" />

      {/* ─── CLAVE NUMÉRICA & QR ─── */}
      <div className="text-center space-y-1.5 pt-1">
        <div className="p-1.5 inline-block bg-white border border-slate-300 rounded">
          <QRCodeSVG
            value={`https://facturaelectronica.hacienda.go.cr/consulta?clave=${clave}`}
            size={80}
            level="M"
          />
        </div>
        <div className="text-[8px] break-all">
          <span className="font-bold block">CLAVE HACIENDA:</span>
          {clave}
        </div>
        <div className="text-[8px] text-slate-700 leading-tight">
          Autorizada mediante resoluciones DGT-R-033-2019 y MH-DGT-RES-0027-2024 de la Dirección General de Tributación.
        </div>
        <div className="text-[9px] font-bold uppercase pt-1">
          ¡Gracias por su compra!
        </div>
      </div>
    </div>
  );
}
