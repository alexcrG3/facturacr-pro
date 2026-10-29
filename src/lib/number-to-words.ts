// Utilidad oficial para convertir montos numéricos a texto legal en comprobantes de Costa Rica

export function numeroALetras(monto: number, moneda: "CRC" | "USD" = "CRC"): string {
  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const especiales: Record<number, string> = {
    11: "ONCE",
    12: "DOCE",
    13: "TRECE",
    14: "CATORCE",
    15: "QUINCE",
    16: "DIECISÉIS",
    17: "DIECISIETE",
    18: "DIECIOCHO",
    19: "DIECINUEVE",
    21: "VEINTIÚN",
    22: "VEINTIDÓS",
    23: "VEINTITRÉS",
    24: "VEINTICUATRO",
    25: "VEINTICINCO",
    26: "VEINTISÉIS",
    27: "VEINTISIETE",
    28: "VEINTIOCHO",
    29: "VEINTINUEVE",
  };
  const centenas = [
    "",
    "CIENTO",
    "DOSCIENTOS",
    "TRESCIENTOS",
    "CUATROCIENTOS",
    "QUINIENTOS",
    "SEISCIENTOS",
    "SETECIENTOS",
    "OCHOCIENTOS",
    "NOVECIENTOS",
  ];

  function convertirCentenas(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "CIEN";
    if (especiales[n]) return especiales[n];

    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    let res = "";
    if (c > 0) res += centenas[c] + " ";

    const du = n % 100;
    if (especiales[du]) {
      res += especiales[du];
    } else {
      if (d > 0) {
        res += decenas[d];
        if (u > 0) res += " Y " + unidades[u];
      } else if (u > 0) {
        res += unidades[u];
      }
    }
    return res.trim();
  }

  function convertirMiles(n: number): string {
    if (n === 0) return "";
    if (n === 1) return "MIL";
    return convertirCentenas(n) + " MIL";
  }

  function convertirMillones(n: number): string {
    if (n === 0) return "";
    if (n === 1) return "UN MILLÓN";
    return convertirCentenas(n) + " MILLONES";
  }

  const parteEntera = Math.floor(Math.abs(monto));
  const parteDecimal = Math.round((Math.abs(monto) - parteEntera) * 100);

  if (parteEntera === 0) {
    const sufijoMoneda = moneda === "USD" ? "DÓLARES" : "COLONES";
    return `CERO ${sufijoMoneda} CON ${parteDecimal.toString().padStart(2, "0")}/100`;
  }

  let texto = "";
  const millones = Math.floor(parteEntera / 1000000);
  const miles = Math.floor((parteEntera % 1000000) / 1000);
  const cientos = parteEntera % 1000;

  if (millones > 0) {
    texto += convertirMillones(millones) + " ";
  }

  if (miles > 0) {
    texto += (miles === 1 ? "MIL" : convertirCentenas(miles) + " MIL") + " ";
  }

  if (cientos > 0) {
    texto += convertirCentenas(cientos) + " ";
  }

  const sufijo = moneda === "USD" ? "DÓLARES" : "COLONES";
  const textoLimpio = texto.trim();

  return `${textoLimpio} ${sufijo} CON ${parteDecimal.toString().padStart(2, "0")}/100`;
}
