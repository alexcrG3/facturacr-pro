import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Roles y perfiles de usuario
export type Role = 'super_admin' | 'admin' | 'cajero' | 'vendedor' | 'contador'

export type UserProfile = {
  id: string
  email: string
  full_name: string
  role: Role
  created_at?: string
  updated_at?: string
}

// Tipos de las tablas principales
export type Client = {
  id: string
  name: string
  legal_id: string
  legal_id_type: string
  email: string
  phone: string
  address: string
  province: string
  canton: string
  district: string
  economic_activity?: string
  created_at?: string
  updated_at?: string
}

export type Product = {
  id: string
  code: string
  name: string
  description: string
  unit: string
  price: number
  tax_rate: number
  cabys_code: string
  category: string
  created_at?: string
  updated_at?: string
}

export type Invoice = {
  id: string
  clave: string
  consecutive_number: string
  issue_date: string
  status: string
  total: number
  subtotal: number
  tax_total: number
  client_id: string
  client_name: string
  client_legal_id: string
  items: InvoiceItem[]
  payment_method: string
  currency: string
  exchange_rate: number
  notes: string
  created_at?: string
  updated_at?: string
}

export type InvoiceItem = {
  id?: string
  invoice_id?: string
  product_id?: string
  line_number: number
  code: string
  name: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  discount_percentage: number
  discount_amount: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  cabys_code: string
}

export type Compra = {
  id: string
  clave: string
  numero_consecutivo: string
  fecha_emision: string
  emisor_nombre: string
  emisor_cedula: string
  receptor_nombre: string
  receptor_cedula: string
  total_comprobante: number
  total_impuesto: number
  total_gravado: number
  total_exento: number
  moneda: string
  tipo_cambio: number
  condicion_venta: string
  medio_pago: string
  actividad_economica: string
  tipo_documento: string
  estado: string
  xml_content: string
  gmail_message_id: string
  gmail_thread_id: string
  processed_at: string
  created_at?: string
}

export type CompanySettings = {
  id: string
  company_name: string
  legal_id: string
  legal_id_type: string
  email: string
  phone: string
  address: string
  province: string
  canton: string
  district: string
  economic_activity: string
  economic_activity_code: string
  logo_url: string
  atv_username: string
  atv_password: string
  atv_pin: string
  atv_environment: string
  consecutive_counter: number
  created_at?: string
  updated_at?: string
}
