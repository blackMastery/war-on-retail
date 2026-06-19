import { createClient } from '@/lib/supabase/server';
import { pageMetadata } from '@/lib/page-seo';

export const revalidate = 300;

export async function generateMetadata() {
  return pageMetadata('faq', { title: 'FAQ' });
}

export default async function FAQPage() {
  const supabase = await createClient();
  const { data: cats } = await supabase
    .from('faq_categories')
    .select('*')
    .order('display_order');
  const { data: faqs } = await supabase
    .from('faqs')
    .select('*')
    .eq('is_active', true)
    .order('created_at');

  const grouped =
    cats?.map((c) => ({
      ...c,
      items: (faqs ?? []).filter((f) => f.category_id === c.id),
    })) ?? [];
  const uncategorised = (faqs ?? []).filter((f) => !f.category_id);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Frequently asked questions</h1>
      <p className="mt-1 text-muted-foreground">Can't find what you're looking for? Use the chat in the corner.</p>

      <div className="mt-8 space-y-10">
        {grouped.map(
          (g) =>
            g.items.length > 0 && (
              <section key={g.id}>
                <h2 className="text-xl font-bold">{g.name}</h2>
                <dl className="mt-3 divide-y divide-border rounded-lg bg-card ring-1 ring-border">
                  {g.items.map((f) => (
                    <details key={f.id} className="group p-4">
                      <summary className="cursor-pointer list-none font-medium text-foreground">
                        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
                        {f.question}
                      </summary>
                      <p className="mt-2 pl-6 text-secondary-foreground">{f.answer}</p>
                    </details>
                  ))}
                </dl>
              </section>
            ),
        )}
        {uncategorised.length > 0 && (
          <section>
            <h2 className="text-xl font-bold">Other</h2>
            <dl className="mt-3 divide-y divide-border rounded-lg bg-card ring-1 ring-border">
              {uncategorised.map((f) => (
                <details key={f.id} className="group p-4">
                  <summary className="cursor-pointer list-none font-medium text-foreground">
                    {f.question}
                  </summary>
                  <p className="mt-2 text-secondary-foreground">{f.answer}</p>
                </details>
              ))}
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}
