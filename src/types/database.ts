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
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
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
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
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
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
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
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  created_at?: string;
  updated_at?: string;
};
type BrandUpdate = Partial<BrandInsert>;

// ---------- Products ----------
/**
 * Per-image metadata, looked up by image URL. Stored on the product row in
 * the `image_meta` jsonb column. The featured image gets an extra column
 * (`featured_image_alt`) but its caption/keywords also live here for
 * lookup-by-URL consistency on the customer side.
 */
export type ProductImageMeta = {
  alt: string | null;
  caption: string | null;
  keywords: string | null;
};

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
  featured_image_alt: string | null;
  image_urls: string[];
  image_meta: Record<string, ProductImageMeta>;
  specifications: Json;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  /** When true, an out-of-stock product is offered as a pre-order rather than blocked. */
  is_pre_order_enabled: boolean;
  /** Optional admin blurb shown beside the customer Pre-order CTA. */
  pre_order_message: string | null;
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
  featured_image_alt?: string | null;
  image_urls?: string[];
  image_meta?: Record<string, ProductImageMeta>;
  specifications?: Json;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  is_pre_order_enabled?: boolean;
  pre_order_message?: string | null;
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

// ---------- Promotions ----------
export type PromotionRow = {
  id: string;
  title: string;
  image_url: string;
  /** Optional click target. Internal path (`/...`) or full https URL. NULL = display-only. */
  link_url: string | null;
  is_featured: boolean;
  display_order: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
type PromotionInsert = {
  id?: string;
  title: string;
  image_url: string;
  link_url?: string | null;
  is_featured?: boolean;
  display_order?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};
type PromotionUpdate = Partial<PromotionInsert>;

// ---------- Customers ----------
export type CustomerRow = {
  id: string;
  name: string;
  /** Normalised: leading `+` if present, otherwise digits-only. See `normalise_phone()` in SQL. */
  phone: string;
  created_at: string;
  updated_at: string;
};
type CustomerInsert = {
  id?: string;
  name: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
};
type CustomerUpdate = Partial<CustomerInsert>;

// ---------- Payment methods ----------
export type PaymentMethodRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};
type PaymentMethodInsert = {
  id?: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
};
type PaymentMethodUpdate = Partial<PaymentMethodInsert>;

// ---------- Orders ----------
export type OrderStatus = 'pending' | 'approved' | 'fulfilled' | 'cancelled';
export type FulfillmentType = 'delivery' | 'pickup';

export type OrderRow = {
  id: string;
  /** Human-readable, year-tagged: e.g. WOR-2026-000042. */
  order_number: string;
  customer_id: string;
  fulfillment_type: FulfillmentType;
  delivery_city: string | null;
  delivery_address: string | null;
  payment_method_id: string;
  subtotal: number;
  status: OrderStatus;
  admin_notes: string | null;
  placed_at: string;
  created_at: string;
  updated_at: string;
};
type OrderInsert = {
  id?: string;
  order_number?: string;
  customer_id: string;
  fulfillment_type: FulfillmentType;
  delivery_city?: string | null;
  delivery_address?: string | null;
  payment_method_id: string;
  subtotal: number;
  status?: OrderStatus;
  admin_notes?: string | null;
  placed_at?: string;
  created_at?: string;
  updated_at?: string;
};
type OrderUpdate = Partial<OrderInsert>;

// ---------- Order items ----------
export type OrderItemRow = {
  id: string;
  order_id: string;
  /** NULL after the source product is hard-deleted; snapshot fields below survive. */
  product_id: string | null;
  product_slug: string;
  product_name: string;
  product_sku: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  /** True when this line was placed as a pre-order (stock was insufficient + product allowed it). */
  is_pre_order: boolean;
  created_at: string;
};
type OrderItemInsert = {
  id?: string;
  order_id: string;
  product_id?: string | null;
  product_slug: string;
  product_name: string;
  product_sku?: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  is_pre_order?: boolean;
  created_at?: string;
};
type OrderItemUpdate = Partial<OrderItemInsert>;

// ---------- Store settings (singleton row, id='default') ----------
export type StoreSettingsRow = {
  id: string;
  name: string;
  description: string;
  url: string;
  email: string;
  phone: string;
  /** Digits only, no leading `+`. Used in `https://wa.me/{whatsapp}` URLs. */
  whatsapp: string;
  admin_email: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  hours_weekdays: string;
  hours_saturday: string;
  hours_sunday: string;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  created_at: string;
  updated_at: string;
};
type StoreSettingsInsert = {
  id?: string;
  name?: string;
  description?: string;
  url?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  admin_email?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  hours_weekdays?: string;
  hours_saturday?: string;
  hours_sunday?: string;
  facebook_url?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  created_at?: string;
  updated_at?: string;
};
type StoreSettingsUpdate = Partial<StoreSettingsInsert>;

// ---------- Page SEO (one row per static customer route) ----------
export type PageSeoRow = {
  /** Stable slug-style id, e.g. `home`, `about`, `policies-privacy`. */
  id: string;
  /** Canonical URL path the row corresponds to (`/`, `/about`, …). Read-only on the admin side. */
  path: string;
  /** Human label rendered in the admin pages list. */
  label: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  /** Default true; flipped to false for cart/wishlist/checkout/search. */
  robots_index: boolean;
  /**
   * Admin-editable Markdown body for long-form pages (`/about` + policies).
   * `null` for rows whose page doesn't render a body (home, products list,
   * cart, etc.). Supports `{{site_name}}` / `{{site_phone}}` / `{{site_email}}`
   * / `{{site_address}}` / `{{site_whatsapp}}` placeholders that the body
   * renderer substitutes at request time.
   */
  body_markdown: string | null;
  created_at: string;
  updated_at: string;
};
type PageSeoInsert = {
  id: string;
  path: string;
  label: string;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  robots_index?: boolean;
  body_markdown?: string | null;
  created_at?: string;
  updated_at?: string;
};
type PageSeoUpdate = Partial<PageSeoInsert>;

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
      promotions: {
        Row: PromotionRow;
        Insert: PromotionInsert;
        Update: PromotionUpdate;
        Relationships: Empty;
      };
      customers: {
        Row: CustomerRow;
        Insert: CustomerInsert;
        Update: CustomerUpdate;
        Relationships: Empty;
      };
      payment_methods: {
        Row: PaymentMethodRow;
        Insert: PaymentMethodInsert;
        Update: PaymentMethodUpdate;
        Relationships: Empty;
      };
      orders: {
        Row: OrderRow;
        Insert: OrderInsert;
        Update: OrderUpdate;
        Relationships: Empty;
      };
      order_items: {
        Row: OrderItemRow;
        Insert: OrderItemInsert;
        Update: OrderItemUpdate;
        Relationships: Empty;
      };
      store_settings: {
        Row: StoreSettingsRow;
        Insert: StoreSettingsInsert;
        Update: StoreSettingsUpdate;
        Relationships: Empty;
      };
      page_seo: {
        Row: PageSeoRow;
        Insert: PageSeoInsert;
        Update: PageSeoUpdate;
        Relationships: Empty;
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_products: {
        Args: { q: string; max_rows?: number; page_offset?: number };
        Returns: ProductRow[];
      };
      place_order: {
        Args: {
          p_customer: { name: string; phone: string };
          p_fulfillment:
            | { type: 'delivery'; city?: string | null; address: string }
            | { type: 'pickup' };
          p_payment_method_id: string;
          p_items: Array<{ product_id: string; quantity: number }>;
        };
        // Note: `order_id` not `id` — see the function definition for why.
        Returns: Array<{ order_id: string; order_number: string }>;
      };
      cancel_order: {
        Args: { p_id: string };
        Returns: OrderRow;
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
export type Promotion = PromotionRow;
export type Customer = CustomerRow;
export type PaymentMethod = PaymentMethodRow;
export type Order = OrderRow;
export type OrderItem = OrderItemRow;
export type StoreSettings = StoreSettingsRow;
export type PageSeo = PageSeoRow;
