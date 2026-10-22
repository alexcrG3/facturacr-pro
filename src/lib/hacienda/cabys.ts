import { CabysItem } from "./types";

export const CATALOGO_CABYS_POPULARES: CabysItem[] = [
  {
    codigo: "8311100000000",
    descripcion: "Servicios de desarrollo de software y aplicaciones informáticas",
    categoria: "Tecnología y Software",
    impuestoSugerido: 13,
  },
  {
    codigo: "8314100000000",
    descripcion: "Servicios de consultoría en tecnologías de la información (TI)",
    categoria: "Tecnología y Software",
    impuestoSugerido: 13,
  },
  {
    codigo: "8311500000000",
    descripcion: "Servicios de diseño web y desarrollo de páginas de internet",
    categoria: "Tecnología y Software",
    impuestoSugerido: 13,
  },
  {
    codigo: "8211000000000",
    descripcion: "Servicios de contabilidad, auditoría y teneduría de libros",
    categoria: "Servicios Profesionales",
    impuestoSugerido: 13,
  },
  {
    codigo: "8219100000000",
    descripcion: "Servicios de asesoría fiscal y tributaria",
    categoria: "Servicios Profesionales",
    impuestoSugerido: 13,
  },
  {
    codigo: "8213000000000",
    descripcion: "Servicios jurídicos y asesoría legal",
    categoria: "Servicios Profesionales",
    impuestoSugerido: 13,
  },
  {
    codigo: "8313100000000",
    descripcion: "Servicios de soporte y mantenimiento de sistemas informáticos",
    categoria: "Tecnología y Soporte",
    impuestoSugerido: 13,
  },
  {
    codigo: "8361000000000",
    descripcion: "Servicios de publicidad, mercadeo y marketing digital",
    categoria: "Marketing y Publicidad",
    impuestoSugerido: 13,
  },
  {
    codigo: "9311100000000",
    descripcion: "Servicios de consulta médica general (Servicio de Salud)",
    categoria: "Salud Humana",
    impuestoSugerido: 4,
  },
  {
    codigo: "9312100000000",
    descripcion: "Servicios de odontología general y especializada",
    categoria: "Salud Humana",
    impuestoSugerido: 4,
  },
  {
    codigo: "6339900000000",
    descripcion: "Servicios de restaurante y comidas preparadas",
    categoria: "Alimentos y Bebidas",
    impuestoSugerido: 13,
  },
  {
    codigo: "6339100000000",
    descripcion: "Servicios de cafetería y sodas",
    categoria: "Alimentos y Bebidas",
    impuestoSugerido: 13,
  },
  {
    codigo: "0111100000000",
    descripcion: "Arroz en grano para consumo (Canasta Básica Tributaria)",
    categoria: "Canasta Básica",
    impuestoSugerido: 1,
  },
  {
    codigo: "0112100000000",
    descripcion: "Frijoles secos negros y rojos (Canasta Básica Tributaria)",
    categoria: "Canasta Básica",
    impuestoSugerido: 1,
  },
  {
    codigo: "4529000000000",
    descripcion: "Computadoras portátiles, laptops y accesorios informáticos",
    categoria: "Equipos y Hardware",
    impuestoSugerido: 13,
  },
  {
    codigo: "4511000000000",
    descripcion: "Teléfonos inteligentes, celulares y equipos de comunicación",
    categoria: "Equipos y Hardware",
    impuestoSugerido: 13,
  },
  {
    codigo: "8715100000000",
    descripcion: "Servicios de mantenimiento y reparación de vehículos automotores",
    categoria: "Talleres y Mecánica",
    impuestoSugerido: 13,
  },
  {
    codigo: "7211100000000",
    descripcion: "Servicios de alquiler de locales comerciales u oficinas",
    categoria: "Bienes Raíces",
    impuestoSugerido: 13,
  },
];

export function buscarCabys(termino: string): CabysItem[] {
  if (!termino || termino.trim().length === 0) {
    return CATALOGO_CABYS_POPULARES.slice(0, 8);
  }

  const query = termino.toLowerCase().trim();
  return CATALOGO_CABYS_POPULARES.filter(
    (item) =>
      item.codigo.includes(query) ||
      item.descripcion.toLowerCase().includes(query) ||
      item.categoria.toLowerCase().includes(query),
  );
}
