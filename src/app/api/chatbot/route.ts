import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { answerMessage, logConversation } from '@/lib/ai/chatbot';

export const runtime = 'nodejs';

// Lightweight per-IP rate limit. In-process Map — works for a single instance;
// for multi-instance deploys, swap to Upstash/Redis.
const WINDOW_MS = 60_000;
const MAX_REQ = 20;
const hits = new Map<string, number[]>();

function rateLimit(key: string): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(key, list);
  return list.length <= MAX_REQ;
}

const Body = z.object({
  message: z.string().min(1).max(2000),
  session_id: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests — please slow down.' },
      { status: 429 },
    );
  }

  const result = await answerMessage(payload.message);

  // Fire-and-forget logging.
  logConversation({
    session_id: payload.session_id,
    user_message: payload.message,
    bot_response: result.reply,
    matched_faq_id: result.matchedFaqId,
    confidence_score: result.confidence,
  });

  return NextResponse.json({
    reply: result.reply,
    source: result.source,
  });
}
