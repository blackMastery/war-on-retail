import { requirePageAccess } from '@/lib/admin/auth';

/** Enforces the `chatbot` permission for the FAQ management route. */
export default async function ChatbotSectionLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('chatbot');
  return <>{children}</>;
}
