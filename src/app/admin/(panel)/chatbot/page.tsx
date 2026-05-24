import { createAdminClient } from '@/lib/supabase/admin';
import FaqEditor from './FaqEditor';

export const metadata = { title: 'Admin · Chatbot FAQs' };

export default async function ChatbotAdminPage() {
  const supabase = createAdminClient();
  const [{ data: cats }, { data: faqs }, { data: recent }] = await Promise.all([
    supabase.from('faq_categories').select('*').order('display_order'),
    supabase.from('faqs').select('*').order('created_at'),
    supabase
      .from('chatbot_conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Chatbot FAQs</h1>
      <p className="text-sm text-gray-600">
        FAQs feed the assistant. Be concise — the bot rewrites or quotes them as needed.
      </p>

      <FaqEditor categories={cats ?? []} faqs={faqs ?? []} />

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-bold">Recent conversations</h2>
        <p className="text-xs text-gray-500">Use these to find new FAQs worth adding.</p>
        <ul className="mt-3 space-y-3">
          {(recent ?? []).length === 0 && (
            <li className="text-sm text-gray-500">No chats logged yet.</li>
          )}
          {recent?.map((c) => (
            <li key={c.id} className="rounded-md bg-gray-50 p-3 text-sm">
              <p className="font-medium">› {c.user_message}</p>
              <p className="mt-1 text-gray-700">{c.bot_response}</p>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(c.created_at).toLocaleString()} ·{' '}
                {c.matched_faq_id ? 'matched FAQ' : 'no FAQ match'}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
