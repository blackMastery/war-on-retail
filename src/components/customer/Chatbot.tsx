'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getOrCreateSessionId } from '@/lib/utils';
import { siteConfig } from '@/config/site';

type Message = { role: 'user' | 'assistant'; content: string };

const WELCOME: Message = {
  role: 'assistant',
  content:
    "Hi! I'm the War on Retail assistant. Ask me about products, delivery, returns, or anything else — I'll help or connect you to our team on WhatsApp.",
};

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [sending, setSending] = useState(false);
  const sessionId = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setSending(true);
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId.current }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      const reply =
        data.reply ??
        `I'm having trouble responding right now. Please reach us on WhatsApp: https://wa.me/${siteConfig.whatsapp}`;
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `Sorry — connection error. Please try again or message us on WhatsApp: https://wa.me/${siteConfig.whatsapp}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition hover:bg-primary-700 hover:shadow-xl"
      >
        {open ? <XMarkIcon className="h-6 w-6" /> : <ChatBubbleLeftRightIcon className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200">
          <header className="bg-primary-600 px-4 py-3 text-white">
            <h2 className="font-semibold">War on Retail Assistant</h2>
            <p className="text-xs opacity-90">Usually replies in seconds</p>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'ml-auto bg-primary-600 text-white'
                    : 'mr-auto bg-white text-gray-900 ring-1 ring-gray-200'
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="mr-auto rounded-2xl bg-white px-3 py-2 text-sm text-gray-500 ring-1 ring-gray-200">
                …
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-gray-200 bg-white p-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              className="flex-1 rounded-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white disabled:opacity-50 hover:bg-primary-700"
              aria-label="Send"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
