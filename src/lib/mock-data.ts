export type Branch = { id: string; name: string; address: string };
export type Company = { id: string; name: string; legalId: string; branches: Branch[] };

export const company: Company = {
  id: "c1",
  name: "GRUPO G TRES COMERCIALIZADORA INTERAMERICANA S.A.",
  legalId: "3-101-483899",
  branches: [
    { id: "b1", name: "Casa Matriz (San José)", address: "San José, Costa Rica" },
    { id: "b2", name: "Sucursal Alajuela", address: "Alajuela Centro, Costa Rica" },
  ],
};

export const kpis = {
  ventasHoy: 1842500,
  ventasMes: 38420750,
  facturasPendientes: 12,
  clientesActivos: 248,
  cambioHoy: 12.4,
  cambioMes: 8.2,
};

export const salesSeries = [
  { day: "Lun", ventas: 1240000, facturas: 18 },
  { day: "Mar", ventas: 1680000, facturas: 24 },
  { day: "Mié", ventas: 1420000, facturas: 21 },
  { day: "Jue", ventas: 1980000, facturas: 28 },
  { day: "Vie", ventas: 2310000, facturas: 35 },
  { day: "Sáb", ventas: 1750000, facturas: 26 },
  { day: "Dom", ventas: 980000, facturas: 14 },
];

export const recentActivity = [
  {
    id: "a1",
    type: "factura",
    title: "Factura #FE-00128 enviada a Hacienda",
    customer: "Constructora Río Azul",
    amount: 425000,
    time: "hace 2 min",
    status: "aceptada" as const,
  },
  {
    id: "a2",
    type: "cliente",
    title: "Nuevo cliente registrado",
    customer: "Mariana Soto Vargas",
    amount: null,
    time: "hace 18 min",
    status: null,
  },
  {
    id: "a3",
    type: "factura",
    title: "Tiquete electrónico #TE-04412",
    customer: "Venta al contado",
    amount: 18500,
    time: "hace 32 min",
    status: "aceptada" as const,
  },
  {
    id: "a4",
    type: "factura",
    title: "Factura #FE-00127 rechazada",
    customer: "Soluciones Verdes S.A.",
    amount: 96200,
    time: "hace 1 h",
    status: "rechazada" as const,
  },
  {
    id: "a5",
    type: "producto",
    title: "Producto agotado: Café Premium 1kg",
    customer: null,
    amount: null,
    time: "hace 2 h",
    status: null,
  },
];

export type Client = {
  id: string;
  name: string;
  type: "fisica" | "juridica";
  legalId: string;
  email: string;
  phone: string;
  city: string;
  totalSpent: number;
  invoices: number;
  economicActivity?: string;
};

export const clients: Client[] = [
  {
    id: "cl1",
    name: "Constructora Río Azul S.A.",
    type: "juridica",
    legalId: "3-101-234567",
    email: "facturacion@rioazul.cr",
    phone: "+506 2222-1100",
    city: "San José",
    totalSpent: 4820000,
    invoices: 24,
  },
  {
    id: "cl2",
    name: "Mariana Soto Vargas",
    type: "fisica",
    legalId: "1-1450-0789",
    email: "mariana.soto@gmail.com",
    phone: "+506 8888-2233",
    city: "Heredia",
    totalSpent: 348000,
    invoices: 6,
  },
  {
    id: "cl3",
    name: "Tecnologías del Norte S.A.",
    type: "juridica",
    legalId: "3-101-678912",
    email: "compras@tecnorte.cr",
    phone: "+506 2666-7788",
    city: "Liberia",
    totalSpent: 2150000,
    invoices: 14,
  },
  {
    id: "cl4",
    name: "Carlos Jiménez Mora",
    type: "fisica",
    legalId: "2-0780-0123",
    email: "cjimenez@outlook.com",
    phone: "+506 7012-3344",
    city: "Alajuela",
    totalSpent: 92500,
    invoices: 3,
  },
  {
    id: "cl5",
    name: "Pura Vida Coffee Co.",
    type: "juridica",
    legalId: "3-101-998877",
    email: "hello@puravidacoffee.com",
    phone: "+506 4001-2233",
    city: "San José",
    totalSpent: 1680000,
    invoices: 19,
  },
  {
    id: "cl6",
    name: "Soluciones Verdes S.A.",
    type: "juridica",
    legalId: "3-101-554433",
    email: "admin@solverdes.cr",
    phone: "+506 2233-4455",
    city: "Cartago",
    totalSpent: 720000,
    invoices: 9,
  },
];

export type Product = {
  id: string;
  sku: string;
  cabys: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  tax: number;
};

export const products: Product[] = [
  {
    id: "p1",
    sku: "CAF-001",
    cabys: "2399901000000",
    name: "Café Premium 1kg",
    category: "Alimentos",
    price: 8500,
    cost: 5200,
    stock: 4,
    minStock: 10,
    tax: 13,
  },
  {
    id: "p2",
    sku: "CAF-002",
    cabys: "2399901000000",
    name: "Café Molido 500g",
    category: "Alimentos",
    price: 4200,
    cost: 2400,
    stock: 84,
    minStock: 20,
    tax: 13,
  },
  {
    id: "p3",
    sku: "SRV-010",
    cabys: "8311100000000",
    name: "Servicio de consultoría (hora)",
    category: "Servicios",
    price: 35000,
    cost: 0,
    stock: 0,
    minStock: 0,
    tax: 13,
  },
  {
    id: "p4",
    sku: "TXT-201",
    cabys: "2823700000000",
    name: "Camiseta algodón orgánico",
    category: "Textil",
    price: 9800,
    cost: 4500,
    stock: 142,
    minStock: 30,
    tax: 13,
  },
  {
    id: "p5",
    sku: "ELE-300",
    cabys: "8523499000000",
    name: "Cargador USB-C 65W",
    category: "Electrónica",
    price: 18900,
    cost: 11200,
    stock: 38,
    minStock: 15,
    tax: 13,
  },
  {
    id: "p6",
    sku: "LIM-100",
    cabys: "3532200000000",
    name: "Limpiador multiusos 1L",
    category: "Hogar",
    price: 2400,
    cost: 1100,
    stock: 7,
    minStock: 12,
    tax: 13,
  },
];

export type InvoiceStatus = "borrador" | "pendiente" | "enviada" | "aceptada" | "rechazada";

export type Invoice = {
  id: string;
  number: string;
  client: string;
  date: string;
  total: number;
  status: InvoiceStatus;
  type: "FE" | "TE" | "NC" | "ND";
};

export const invoices: Invoice[] = [
  {
    id: "i1",
    number: "FE-00128",
    client: "Constructora Río Azul S.A.",
    date: "2026-05-16",
    total: 425000,
    status: "aceptada",
    type: "FE",
  },
  {
    id: "i2",
    number: "TE-04412",
    client: "Venta al contado",
    date: "2026-05-16",
    total: 18500,
    status: "aceptada",
    type: "TE",
  },
  {
    id: "i3",
    number: "FE-00127",
    client: "Soluciones Verdes S.A.",
    date: "2026-05-16",
    total: 96200,
    status: "rechazada",
    type: "FE",
  },
  {
    id: "i4",
    number: "FE-00126",
    client: "Pura Vida Coffee Co.",
    date: "2026-05-15",
    total: 182400,
    status: "enviada",
    type: "FE",
  },
  {
    id: "i5",
    number: "FE-00125",
    client: "Tecnologías del Norte S.A.",
    date: "2026-05-15",
    total: 348900,
    status: "aceptada",
    type: "FE",
  },
  {
    id: "i6",
    number: "NC-00012",
    client: "Constructora Río Azul S.A.",
    date: "2026-05-14",
    total: 45000,
    status: "aceptada",
    type: "NC",
  },
  {
    id: "i7",
    number: "FE-00124",
    client: "Mariana Soto Vargas",
    date: "2026-05-14",
    total: 67800,
    status: "pendiente",
    type: "FE",
  },
  {
    id: "i8",
    number: "FE-DRAFT-09",
    client: "Sin definir",
    date: "2026-05-13",
    total: 0,
    status: "borrador",
    type: "FE",
  },
];

export const topProducts = [
  { name: "Café Premium 1kg", unidades: 142, total: 1207000 },
  { name: "Cargador USB-C 65W", unidades: 86, total: 1625400 },
  { name: "Servicio consultoría", unidades: 24, total: 840000 },
  { name: "Camiseta algodón", unidades: 68, total: 666400 },
  { name: "Café Molido 500g", unidades: 198, total: 831600 },
];

export const formatCRC = (n: number) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(n);
