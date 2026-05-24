import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { siteConfig } from '@/config/site';
import type { FAQ, Product } from '@/types/database';

// OpenAI is loaded lazily — only when we actually need the fallback — so the
// package never ships to client bundles or admin pages that don't touch chat.
async function getOpenAI() {
  const { default: OpenAI } = await import('openai');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const FAQ_CONFIDENCE_THRESHOLD = 0.55;

export type ChatReply = {
  reply: string;
  matchedFaqId: string | null;
  confidence: number;
  source: 'faq' | 'llm' | 'fallback';
};

/**
 * Naive keyword overlap score in [0,1]. Cheap, deterministic, good enough as a
 * pre-filter before falling back to the LLM.
 */
function scoreFaq(message: string, faq: FAQ): number {
  const tokens = new Set(message.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  if (!tokens.size) return 0;
  const targets = [
    ...(faq.keywords ?? []),
    ...((faq.question ?? '').toLowerCase().match(/[a-z0-9]+/g) ?? []),
  ];
  if (!targets.length) return 0;
  let hits = 0;
  for (const t of targets) if (tokens.has(t.toLowerCase())) hits++;
  return Math.min(1, hits / Math.max(targets.length, tokens.size));
}

function bestFaq(message: string, faqs: FAQ[]): { faq: FAQ | null; score: number } {
  let best: FAQ | null = null;
  let bestScore = 0;
  for (const f of faqs) {
    const s = scoreFaq(message, f);
    if (s > bestScore) {
      best = f;
      bestScore = s;
    }
  }
  return { faq: best, score: bestScore };
}

/** Pull products whose name/description loosely matches the message. */
async function searchProducts(message: string, limit = 5): Promise<Product[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.rpc('search_products', { q: message, max_rows: limit });
  return (data ?? []) as Product[];
}

function fallbackReply(): string {
  return `I'm not sure off the top of my head — but our team is fast. WhatsApp us at https://wa.me/${siteConfig.whatsapp} or call ${siteConfig.phone} and we'll sort you out.`;
}

function buildSystemPrompt(faqs: FAQ[], products: Product[]): string {
  const faqContext = faqs
    .slice(0, 20)
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n\n');
  const productContext = products
    .slice(0, 8)
    .map(
      (p) =>
        `• ${p.name} (GYD $${p.price.toLocaleString()}) — ${p.short_description ?? ''} [/products/${p.slug}]`,
    )
    .join('\n');

  return `You are the customer-service assistant for ${siteConfig.name}, an electronics and home-appliance retailer in Guyana.

Rules:
- Be concise — 1–3 short sentences. Friendly, factual.
- Prices are in Guyanese dollars (GYD).
- If the answer is in the FAQs below, quote or lightly rephrase it.
- If you recommend products, list 1–3 from the catalogue below with names and links (relative paths like /products/slug).
- If you don't know, say so and direct the user to WhatsApp ${siteConfig.whatsapp} or phone ${siteConfig.phone}.
- Never invent products, prices, stock, or policies.

FAQs:
${faqContext || '(none)'}

Catalogue matches for this query:
${productContext || '(none)'}`;
}

async function askAnthropic(opts: {
  message: string;
  faqs: FAQ[];
  products: Product[];
}): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const client = new Anthropic({ apiKey: key });
  const system = buildSystemPrompt(opts.faqs, opts.products);

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: opts.message }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return text || null;
  } catch (err) {
    console.error('[chatbot] Anthropic error', err);
    return null;
  }
}

async function askOpenAI(opts: {
  message: string;
  faqs: FAQ[];
  products: Product[];
}): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const client = await getOpenAI();
  const system = buildSystemPrompt(opts.faqs, opts.products);

  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: opts.message },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error('[chatbot] OpenAI error', err);
    return null;
  }
}

export async function answerMessage(message: string): Promise<ChatReply> {
  const supabase = createAdminClient();
  const { data: faqs } = await supabase.from('faqs').select('*').eq('is_active', true);
  const allFaqs = (faqs ?? []) as FAQ[];

  // 1) Try direct FAQ retrieval first — fastest, cheapest, deterministic.
  const { faq, score } = bestFaq(message, allFaqs);
  if (faq && score >= FAQ_CONFIDENCE_THRESHOLD) {
    // Bump usage counter, fire-and-forget.
    supabase
      .from('faqs')
      .update({ usage_count: faq.usage_count + 1 })
      .eq('id', faq.id)
      .then(() => undefined);
    return { reply: faq.answer, matchedFaqId: faq.id, confidence: score, source: 'faq' };
  }

  // 2) Search products for any catalogue references, then ask the LLM.
  //    Anthropic preferred; OpenAI used only when ANTHROPIC_API_KEY is absent.
  const products = await searchProducts(message);
  const llm =
    (await askAnthropic({ message, faqs: allFaqs, products })) ??
    (await askOpenAI({ message, faqs: allFaqs, products }));
  if (llm) {
    return { reply: llm, matchedFaqId: null, confidence: score, source: 'llm' };
  }

  // 3) Last-resort fallback — no key configured or the API errored.
  return {
    reply: fallbackReply(),
    matchedFaqId: null,
    confidence: 0,
    source: 'fallback',
  };
}

export async function logConversation(args: {
  session_id: string;
  user_message: string;
  bot_response: string;
  matched_faq_id: string | null;
  confidence_score: number | null;
}): Promise<void> {
  const supabase = createAdminClient();
  try {
    await supabase.from('chatbot_conversations').insert({
      session_id: args.session_id,
      user_message: args.user_message,
      bot_response: args.bot_response,
      matched_faq_id: args.matched_faq_id,
      confidence_score: args.confidence_score,
    });
  } catch (err) {
    console.error('[chatbot] failed to log conversation', err);
  }
}
