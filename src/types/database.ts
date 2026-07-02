// Hand-written types matching the Supabase schema.
// You may regenerate with: supabase gen types typescript --project-id <ref> > src/types/database.ts

export type Role = 'owner' | 'employee'
export type RevenueType = 'food' | 'drink'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: Role
  can_view_finance: boolean
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  phone: string | null
  address: string | null
  contact_person: string | null
  remark: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface ExpenseCategory {
  id: string
  name: string
  icon: string | null
  is_system: boolean
  created_at: string
}

export interface Purchase {
  id: string
  purchase_date: string
  supplier_id: string | null
  category_id: string | null
  quantity: number
  unit: string | null
  unit_price: number
  total_price: number
  remark: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // joined
  supplier?: Pick<Supplier, 'id' | 'name'> | null
  category?: Pick<Category, 'id' | 'name'> | null
}

export interface RawMaterialPurchase extends Purchase {
  material_name: string
}
export interface DrinkPurchase extends Purchase {
  drink_name: string
}

export interface Expense {
  id: string
  expense_date: string
  category_id: string | null
  supplier_id: string | null
  title: string
  amount: number
  remark: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  category?: Pick<ExpenseCategory, 'id' | 'name' | 'icon'> | null
  supplier?: Pick<Supplier, 'id' | 'name'> | null
}

export interface Repair {
  id: string
  repair_date: string
  repair_name: string
  repair_cost: number
  material_cost: number
  total_cost: number
  supplier_id: string | null
  remark: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Revenue {
  id: string
  revenue_date: string
  type: RevenueType
  amount: number
  remark: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Settings {
  id: number
  restaurant_name: string
  logo_url: string | null
  currency: string
  language: string
  daily_expense_target: number | null
  monthly_expense_budget: number | null
  low_profit_threshold: number | null
  updated_at: string
}

export interface ActivityLog {
  id: number
  user_id: string | null
  action: string
  entity: string
  entity_id: string | null
  detail: Record<string, unknown> | null
  created_at: string
}

// Minimal Database generic so the typed client compiles.
export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
