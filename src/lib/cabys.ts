export interface CabysItem {
  codigo: string;
  descripcion: string;
  impuesto: number;
  categorias?: string[];
  estado?: string;
}

export const COMMON_CABYS_CATALOG: CabysItem[] = [
  {
    codigo: '8313100000100',
    descripcion: 'Servicios de consultoría en software',
    impuesto: 13,
    categorias: ['Servicios prestados a las empresas', 'Tecnología de la información', 'Consultoría en software'],
  },
  {
    codigo: '8314100000000',
    descripcion: 'Servicios de diseño y desarrollo de tecnología de la información (TI)',
    impuesto: 13,
    categorias: ['Servicios prestados a las empresas', 'Tecnología de la información', 'Desarrollo TI'],
  },
  {
    codigo: '8311100000000',
    descripcion: 'Servicios de consultoría en administración y gestión empresarial',
    impuesto: 13,
    categorias: ['Servicios prestados a las empresas', 'Consultoría y gestión'],
  },
  {
    codigo: '8211100000000',
    descripcion: 'Servicios de asesoramiento y representación jurídica (abogados)',
    impuesto: 13,
    categorias: ['Servicios jurídicos y de contabilidad', 'Servicios legales'],
  },
  {
    codigo: '8221100000000',
    descripcion: 'Servicios de contabilidad, teneduría de libros y auditoría',
    impuesto: 13,
    categorias: ['Servicios jurídicos y de contabilidad', 'Servicios contables'],
  },
  {
    codigo: '9312100000000',
    descripcion: 'Servicios de atención médica general y especializada',
    impuesto: 4,
    categorias: ['Servicios de salud', 'Servicios médicos'],
  },
  {
    codigo: '9312200000000',
    descripcion: 'Servicios odontológicos y de ortodoncia',
    impuesto: 4,
    categorias: ['Servicios de salud', 'Servicios odontológicos'],
  },
  {
    codigo: '9211000000000',
    descripcion: 'Servicios de enseñanza primaria, secundaria y universitaria privada',
    impuesto: 2,
    categorias: ['Servicios de educación', 'Servicios de enseñanza'],
  },
  {
    codigo: '2399901000000',
    descripcion: 'Café tostado y molido',
    impuesto: 1,
    categorias: ['Canasta Básica Tributaria (CBT)', 'Alimentos y Bebidas', 'Café'],
  },
  {
    codigo: '0161001010000',
    descripcion: 'Café cereza, orgánico',
    impuesto: 1,
    categorias: ['Productos de la agricultura', 'Cultivos estimulantes', 'Café'],
  },
  {
    codigo: '2111101010100',
    descripcion: 'Carne de bovino fresca o refrigerada (CBT)',
    impuesto: 1,
    categorias: ['Canasta Básica Tributaria', 'Carnes frescas'],
  },
  {
    codigo: '2211001010000',
    descripcion: 'Leche pasteurizada y homogeneizada',
    impuesto: 1,
    categorias: ['Canasta Básica Tributaria', 'Lácteos'],
  },
  {
    codigo: '2316101010000',
    descripcion: 'Arroz blanco empacado',
    impuesto: 1,
    categorias: ['Canasta Básica Tributaria', 'Granos básicos'],
  },
  {
    codigo: '2317001010000',
    descripcion: 'Frijoles negros y rojos empacados',
    impuesto: 1,
    categorias: ['Canasta Básica Tributaria', 'Granos básicos'],
  },
  {
    codigo: '8523499000000',
    descripcion: 'Dispositivos de almacenamiento USB y accesorios electrónicos',
    impuesto: 13,
    categorias: ['Electrónica y cómputo', 'Accesorios'],
  },
  {
    codigo: '2823700000000',
    descripcion: 'Prendas de vestir y confección textil',
    impuesto: 13,
    categorias: ['Textiles y confección', 'Prendas de vestir'],
  },
  {
    codigo: '3532200000000',
    descripcion: 'Productos y artículos de limpieza para el hogar o industria',
    impuesto: 13,
    categorias: ['Productos químicos', 'Artículos de limpieza'],
  },
  {
    codigo: '7211100000000',
    descripcion: 'Servicios de alquiler o arrendamiento de bienes inmuebles residenciales',
    impuesto: 13,
    categorias: ['Servicios inmobiliarios', 'Alquiler'],
  },
  {
    codigo: '6411100000000',
    descripcion: 'Servicios de transporte terrestre de carga y mensajería',
    impuesto: 13,
    categorias: ['Transporte y logística', 'Carga'],
  },
  {
    codigo: '6339900000000',
    descripcion: 'Servicios de preparación y suministro de comidas y bebidas en restaurantes',
    impuesto: 13,
    categorias: ['Servicios de alojamiento y restaurantes', 'Alimentación'],
  },
];

export async function buscarCabys(query: string, top: number = 20): Promise<{
  items: CabysItem[];
  total: number;
  source: 'hacienda_bccr' | 'offline_catalog';
}> {
  const cleanQ = query.trim();
  if (!cleanQ) {
    return {
      items: COMMON_CABYS_CATALOG.slice(0, top),
      total: COMMON_CABYS_CATALOG.length,
      source: 'offline_catalog',
    };
  }

  try {
    const isCode = /^\d+$/.test(cleanQ);
    const param = isCode && cleanQ.length === 13 ? `codigo=${encodeURIComponent(cleanQ)}` : `q=${encodeURIComponent(cleanQ)}`;
    const url = `https://api.hacienda.go.cr/fe/cabys?${param}&top=${top}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.cabys)) {
        return {
          items: data.cabys.map((item: any) => ({
            codigo: String(item.codigo),
            descripcion: String(item.descripcion),
            impuesto: typeof item.impuesto === 'number' ? item.impuesto : 13,
            categorias: Array.isArray(item.categorias) ? item.categorias : [],
            estado: item.estado || '',
          })),
          total: typeof data.total === 'number' ? data.total : data.cabys.length,
          source: 'hacienda_bccr',
        };
      }
    }
  } catch (err) {
    console.warn('No se pudo contactar el API de Hacienda CABYS, usando catalogo de respaldo:', err);
  }

  const lowerQ = cleanQ.toLowerCase();
  const filtered = COMMON_CABYS_CATALOG.filter((item) => {
    return (
      item.codigo.includes(lowerQ) ||
      item.descripcion.toLowerCase().includes(lowerQ) ||
      (item.categorias && item.categorias.some((c: string) => c.toLowerCase().includes(lowerQ)))
    );
  });

  return {
    items: filtered.slice(0, top),
    total: filtered.length,
    source: 'offline_catalog',
  };
}
