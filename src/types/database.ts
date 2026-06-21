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
  created_by: string | null;
  modified_by: string | null;
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
  created_by?: string | null;
  modified_by?: string | null;
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
  created_by: string | null;
  modified_by: string | null;
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
  created_by?: string | null;
  modified_by?: string | null;
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

// ---------- Products (audit: created_by/modified_by) ----------
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
  created_by: string | null;
  modified_by: string | null;
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
  created_by?: string | null;
  modified_by?: string | null;
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
  created_by: string | null;
  modified_by: string | null;
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
  created_by?: string | null;
  modified_by?: string | null;
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

// ---------- Admin page permissions ----------
export type AdminUserPageRow = {
  admin_user_id: string;
  page_key: string;
  created_at: string;
};
type AdminUserPageInsert = {
  admin_user_id: string;
  page_key: string;
  created_at?: string;
};
type AdminUserPageUpdate = Partial<AdminUserPageInsert>;

// ---------- Promotions ----------
export type PromotionRow = {
  id: string;
  created_by: string | null;
  modified_by: string | null;
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
  created_by?: string | null;
  modified_by?: string | null;
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
  /** Optional — checkout never asks for it; admins add it for email receipts. */
  email: string | null;
  /** Linked Supabase auth user, if this customer owns an account. Null for guests. */
  user_id: string | null;
  created_at: string;
  updated_at: string;
};
type CustomerInsert = {
  id?: string;
  name: string;
  phone: string;
  email?: string | null;
  user_id?: string | null;
  created_at?: string;
  updated_at?: string;
};
type CustomerUpdate = Partial<CustomerInsert>;

// ---------- Wishlist items (DB-backed, per signed-in customer) ----------
export type WishlistItemRow = {
  user_id: string;
  product_slug: string;
  created_at: string;
};
type WishlistItemInsert = {
  user_id: string;
  product_slug: string;
  created_at?: string;
};
type WishlistItemUpdate = Partial<WishlistItemInsert>;

// ---------- Cart items (DB-backed, per signed-in customer) ----------
export type CartItemRow = {
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
};
type CartItemInsert = {
  user_id: string;
  product_id: string;
  quantity: number;
  created_at?: string;
  updated_at?: string;
};
type CartItemUpdate = Partial<CartItemInsert>;

// ---------- Payment methods ----------
export type PaymentMethodRow = {
  id: string;
  created_by: string | null;
  modified_by: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};
type PaymentMethodInsert = {
  id?: string;
  created_by?: string | null;
  modified_by?: string | null;
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
  /** Last admin to change the order status, and when (NULL until first transition). */
  status_updated_by: string | null;
  status_updated_at: string | null;
  /** Human-readable, year-tagged: e.g. WOR-2026-000042. */
  order_number: string;
  customer_id: string;
  fulfillment_type: FulfillmentType;
  delivery_city: string | null;
  delivery_address: string | null;
  payment_method_id: string;
  subtotal: number;
  /** FK to the redeemed discount_codes row; NULL if none / code later deleted. */
  discount_code_id: string | null;
  /** Snapshot of the code text at placement (survives a later code rename/delete). */
  discount_code: string | null;
  /** GYD taken off the subtotal. Payable total = subtotal - discount_amount. */
  discount_amount: number;
  status: OrderStatus;
  admin_notes: string | null;
  placed_at: string;
  created_at: string;
  updated_at: string;
};
type OrderInsert = {
  id?: string;
  status_updated_by?: string | null;
  status_updated_at?: string | null;
  order_number?: string;
  customer_id: string;
  fulfillment_type: FulfillmentType;
  delivery_city?: string | null;
  delivery_address?: string | null;
  payment_method_id: string;
  subtotal: number;
  discount_code_id?: string | null;
  discount_code?: string | null;
  discount_amount?: number;
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

// ---------- Discount codes ----------
/** The three supported discount mechanics. See `src/types/discount.ts`. */
export type DiscountType = 'percentage' | 'fixed_amount' | 'bogo';

export type DiscountCodeRow = {
  id: string;
  modified_by: string | null;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  /** Meaning depends on type: percent (0–100) for percentage/bogo, GYD for fixed_amount. */
  discount_value: number;
  min_purchase_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  applicable_category_ids: string[] | null;
  applicable_product_ids: string[] | null;
  exclude_product_ids: string[] | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  usage_count: number;
  total_discount_given: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
type DiscountCodeInsert = {
  id?: string;
  modified_by?: string | null;
  code: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_purchase_amount?: number | null;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  per_customer_limit?: number | null;
  applicable_category_ids?: string[] | null;
  applicable_product_ids?: string[] | null;
  exclude_product_ids?: string[] | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
  usage_count?: number;
  total_discount_given?: number;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
type DiscountCodeUpdate = Partial<DiscountCodeInsert>;

// ---------- Discount code usage (one row per redemption) ----------
export type DiscountCodeUsageRow = {
  id: string;
  discount_code_id: string;
  /** Customer identity is the normalised phone (the app's dedup key). */
  customer_phone: string | null;
  customer_session_id: string | null;
  /** Human-readable order number (WOR-YYYY-NNNNNN). */
  order_id: string | null;
  amount_discounted: number;
  original_total: number;
  final_total: number;
  used_at: string;
  ip_address: string | null;
  user_agent: string | null;
};
type DiscountCodeUsageInsert = {
  id?: string;
  discount_code_id: string;
  customer_phone?: string | null;
  customer_session_id?: string | null;
  order_id?: string | null;
  amount_discounted: number;
  original_total: number;
  final_total: number;
  used_at?: string;
  ip_address?: string | null;
  user_agent?: string | null;
};
type DiscountCodeUsageUpdate = Partial<DiscountCodeUsageInsert>;

// ---------- Store settings (singleton row, id='default') ----------
export type StoreSettingsRow = {
  id: string;
  created_by: string | null;
  modified_by: string | null;
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
  created_by?: string | null;
  modified_by?: string | null;
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
  created_by: string | null;
  modified_by: string | null;
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
  created_by?: string | null;
  modified_by?: string | null;
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

// ---------- Email templates ----------
// Admin-editable subject + HTML body keyed by a stable `slug`. Bodies use the
// same {{placeholder}} convention as page bodies (see src/lib/email/render.ts).
export type EmailTemplateRow = {
  id: string;
  slug: string;
  name: string;
  subject: string;
  body_html: string;
  is_active: boolean;
  /** System templates back the automatic order emails — editable, never deletable. */
  is_system: boolean;
  created_by: string | null;
  modified_by: string | null;
  created_at: string;
  updated_at: string;
};
type EmailTemplateInsert = {
  id?: string;
  slug: string;
  name: string;
  subject: string;
  body_html?: string;
  is_active?: boolean;
  is_system?: boolean;
  created_by?: string | null;
  modified_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
type EmailTemplateUpdate = Partial<EmailTemplateInsert>;

// ---------- Email log ----------
export type EmailLogStatus = 'sent' | 'failed' | 'logged';
export type EmailLogRow = {
  id: string;
  template_slug: string | null;
  to_email: string;
  subject: string;
  status: EmailLogStatus;
  /** Resend message id when status === 'sent'. */
  provider_id: string | null;
  error: string | null;
  order_id: string | null;
  created_by: string | null;
  created_at: string;
};
type EmailLogInsert = {
  id?: string;
  template_slug?: string | null;
  to_email: string;
  subject: string;
  status: EmailLogStatus;
  provider_id?: string | null;
  error?: string | null;
  order_id?: string | null;
  created_by?: string | null;
  created_at?: string;
};
type EmailLogUpdate = Partial<EmailLogInsert>;

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
      admin_user_pages: {
        Row: AdminUserPageRow;
        Insert: AdminUserPageInsert;
        Update: AdminUserPageUpdate;
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
      discount_codes: {
        Row: DiscountCodeRow;
        Insert: DiscountCodeInsert;
        Update: DiscountCodeUpdate;
        Relationships: Empty;
      };
      discount_code_usage: {
        Row: DiscountCodeUsageRow;
        Insert: DiscountCodeUsageInsert;
        Update: DiscountCodeUsageUpdate;
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
      email_templates: {
        Row: EmailTemplateRow;
        Insert: EmailTemplateInsert;
        Update: EmailTemplateUpdate;
        Relationships: Empty;
      };
      email_log: {
        Row: EmailLogRow;
        Insert: EmailLogInsert;
        Update: EmailLogUpdate;
        Relationships: Empty;
      };
      wishlist_items: {
        Row: WishlistItemRow;
        Insert: WishlistItemInsert;
        Update: WishlistItemUpdate;
        Relationships: Empty;
      };
      cart_items: {
        Row: CartItemRow;
        Insert: CartItemInsert;
        Update: CartItemUpdate;
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
          /** Optional discount code, re-validated authoritatively inside the RPC. */
          p_discount_code?: string | null;
        };
        // Note: `order_id` not `id` — see the function definition for why.
        Returns: Array<{ order_id: string; order_number: string }>;
      };
      cancel_order: {
        Args: { p_id: string };
        Returns: OrderRow;
      };
      lookup_customer_by_phone: {
        Args: { p_phone: string };
        Returns: Array<{
          name: string;
          email_masked: string | null;
          last_delivery_city: string | null;
          last_delivery_address: string | null;
        }>;
      };
      make_admin: {
        Args: { p_email: string; p_full_name?: string; p_role?: 'admin' | 'super_admin' };
        Returns: AdminUserRow;
      };
      revoke_admin: {
        Args: { p_email: string };
        Returns: AdminUserRow;
      };
      /** Links the caller's existing customer rows by verified email. Returns the row count linked. */
      link_customer_account: {
        Args: Record<string, never>;
        Returns: number;
      };
      /** Renames the caller's linked customer rows. Returns the row count updated. */
      update_my_profile: {
        Args: { p_name: string };
        Returns: number;
      };
      /** Sets the caller's phone (claims/renames/creates a customer row). Returns the normalised phone. */
      set_my_phone: {
        Args: { p_phone: string };
        Returns: string;
      };
      /** Bulk-merges localStorage wishlist slugs into the caller's account. Returns inserted count. */
      merge_wishlist: {
        Args: { p_slugs: string[] };
        Returns: number;
      };
      /** Bulk-merges localStorage cart lines into the caller's account. Returns affected row count. */
      merge_cart: {
        Args: { p_items: Array<{ product_id: string; quantity: number }> };
        Returns: number;
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
export type DiscountCode = DiscountCodeRow;
export type DiscountCodeUsage = DiscountCodeUsageRow;
export type Customer = CustomerRow;
export type WishlistItem = WishlistItemRow;
export type DbCartItem = CartItemRow;
export type PaymentMethod = PaymentMethodRow;
export type Order = OrderRow;
export type OrderItem = OrderItemRow;
export type StoreSettings = StoreSettingsRow;
export type PageSeo = PageSeoRow;
