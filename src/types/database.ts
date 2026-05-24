/**
 * Typed schema for the Supabase tables created in
 * `supabase/migrations/20260101000000_init_schema.sql`.
 *
 * Keep in sync with the SQL, or regenerate with:
 *   supabase gen types typescript --linked > src/types/database.ts
 *
 * Note: Insert/Update types are written WITHOUT self-references back to
 * Database[...]['Row'], because Supabase's type inference can't resolve those
 * cycles and falls back to `never`, which kills .select() typing.
 */

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

// ---------- Categories ----------
export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
type CategoryInsert = {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  parent_id?: string | null;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};
type CategoryUpdate = Partial<CategoryInsert>;

// ---------- Brands ----------
export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
type BrandInsert = {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};
type BrandUpdate = Partial<BrandInsert>;

// ---------- Products ----------
export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  cost: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  category_id: string | null;
  brand_id: string | null;
  featured_image_url: string | null;
  image_urls: string[];
  specifications: Json;
  meta_title: string | null;
  meta_description: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};
type ProductInsert = {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  sku?: string | null;
  price: number;
  compare_at_price?: number | null;
  cost?: number | null;
  stock_quantity?: number;
  low_stock_threshold?: number;
  track_inventory?: boolean;
  category_id?: string | null;
  brand_id?: string | null;
  featured_image_url?: string | null;
  image_urls?: string[];
  specifications?: Json;
  meta_title?: string | null;
  meta_description?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  created_at?: string;
  updated_at?: string;
};
type ProductUpdate = Partial<ProductInsert>;

// ---------- FAQ categories ----------
export type FAQCategoryRow = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
};
type FAQCategoryInsert = {
  id?: string;
  name: string;
  slug: string;
  display_order?: number;
  created_at?: string;
};
type FAQCategoryUpdate = Partial<FAQCategoryInsert>;

// ---------- FAQs ----------
export type FAQRow = {
  id: string;
  category_id: string | null;
  question: string;
  answer: string;
  keywords: string[];
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
type FAQInsert = {
  id?: string;
  category_id?: string | null;
  question: string;
  answer: string;
  keywords?: string[];
  usage_count?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};
type FAQUpdate = Partial<FAQInsert>;

// ---------- Chatbot conversations ----------
export type ChatbotConversationRow = {
  id: string;
  session_id: string;
  user_message: string;
  bot_response: string;
  matched_faq_id: string | null;
  confidence_score: number | null;
  was_helpful: boolean | null;
  created_at: string;
};
type ChatbotConversationInsert = {
  id?: string;
  session_id: string;
  user_message: string;
  bot_response: string;
  matched_faq_id?: string | null;
  confidence_score?: number | null;
  was_helpful?: boolean | null;
  created_at?: string;
};
type ChatbotConversationUpdate = Partial<ChatbotConversationInsert>;

// ---------- Admin users ----------
export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
type AdminUserInsert = {
  id: string;
  email: string;
  full_name: string;
  role?: 'admin' | 'super_admin';
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};
type AdminUserUpdate = Partial<AdminUserInsert>;

// ---------- Database root ----------
// Each Table needs `Relationships: []` — @supabase/postgrest-js >=2.x requires
// it to satisfy the `GenericTable` constraint, otherwise typed selects collapse
// to `never`. Leaving them empty is fine; FK joins still work at runtime.
type Empty = [];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: CategoryRow;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
        Relationships: Empty;
      };
      brands: {
        Row: BrandRow;
        Insert: BrandInsert;
        Update: BrandUpdate;
        Relationships: Empty;
      };
      products: {
        Row: ProductRow;
        Insert: ProductInsert;
        Update: ProductUpdate;
        Relationships: Empty;
      };
      faq_categories: {
        Row: FAQCategoryRow;
        Insert: FAQCategoryInsert;
        Update: FAQCategoryUpdate;
        Relationships: Empty;
      };
      faqs: {
        Row: FAQRow;
        Insert: FAQInsert;
        Update: FAQUpdate;
        Relationships: Empty;
      };
      chatbot_conversations: {
        Row: ChatbotConversationRow;
        Insert: ChatbotConversationInsert;
        Update: ChatbotConversationUpdate;
        Relationships: Empty;
      };
      admin_users: {
        Row: AdminUserRow;
        Insert: AdminUserInsert;
        Update: AdminUserUpdate;
        Relationships: Empty;
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_products: {
        Args: { q: string; max_rows?: number; page_offset?: number };
        Returns: ProductRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience aliases used throughout the app.
export type Product = ProductRow;
export type Category = CategoryRow;
export type Brand = BrandRow;
export type FAQ = FAQRow;
export type FAQCategory = FAQCategoryRow;
export type ChatbotConversation = ChatbotConversationRow;
export type AdminUser = AdminUserRow;
