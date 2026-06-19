import { createAdminClient } from '@/lib/supabase/admin';
import StoreSettingsForm from '@/components/admin/StoreSettingsForm';
import AuditInfo from '@/components/admin/AuditInfo';
import type { StoreSettings } from '@/types/database';

export const metadata = { title: 'Admin · Store settings' };
export const dynamic = 'force-dynamic';

/**
 * Single page covering everything that used to live in `src/config/site.ts`
 * + env vars + a new GPS pair. The form does the heavy lifting; this page
 * just fetches the singleton row and hands it in.
 */
export default async function AdminSettingsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle<StoreSettings>();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Store settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What the customer sees on the public site — name, contact channels,
          opening hours, the pickup map pin, and the social links in the footer.
        </p>
      </header>
      <StoreSettingsForm settings={data ?? null} />
      {data && (
        <AuditInfo
          createdBy={data.created_by}
          modifiedBy={data.modified_by}
          createdAt={data.created_at}
          updatedAt={data.updated_at}
        />
      )}
    </div>
  );
}
