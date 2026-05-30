'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getOrCreateSessionId } from '@/lib/utils';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { siteConfig } from '@/config/site';

type Message = { role: 'user' | 'assistant'; content: string };

const WELCOME: Message = {
  role: 'assistant',
  content:
    'Hi! I’m the War on Retail assistant. Ask me about products, delivery, returns, or anything else — I’ll help or connect you to our team on WhatsApp.',
};

const FAB_OFFSET = 'calc(1.25rem + var(--cookie-banner-height, 0px) + env(safe-area-inset-bottom, 0px))';
const PANEL_OFFSET = 'calc(6rem + var(--cookie-banner-height, 0px) + env(safe-area-inset-bottom, 0px))';

/** Reduced-motion-aware smooth scroll to the bottom of a container. */
function scrollToBottom(el: HTMLElement | null) {
  if (!el) return;
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollTo({ top: el.scrollHeight, behavior: prefersReduced ? 'auto' : 'smooth' });
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [sending, setSending] = useState(false);
  const sessionId = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    setIsCoarsePointer(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  useBodyScrollLock(open && isCoarsePointer);

  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
  }, []);

  useEffect(() => {
    scrollToBottom(scrollRef.current);
  }, [messages, open]);

  // ESC closes the panel and returns focus to the toggle button.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Focus trap — keep Tab inside the open panel.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusables = panel!.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Desktop only — avoid pulling keyboard over content on mobile.
  useEffect(() => {
    if (!open) return;
    const prefersFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (prefersFinePointer) inputRef.current?.focus();
  }, [open]);

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
        `I’m having trouble responding right now. Please reach us on WhatsApp: https://wa.me/${siteConfig.whatsapp}`;
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
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        aria-expanded={open}
        aria-controls="wor-chat-panel"
        className="fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-shadow hover:bg-primary-700 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        style={{
          bottom: FAB_OFFSET,
          right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
        }}
      >
        {open ? (
          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
        ) : (
          <ChatBubbleLeftRightIcon className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          id="wor-chat-panel"
          role="dialog"
          aria-modal="true"
          aria-label="War on Retail assistant"
          className="fixed z-50 flex w-auto flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 focus:outline-none inset-x-4 sm:inset-x-auto sm:right-5 sm:w-[22rem] sm:max-w-[calc(100vw-2.5rem)]"
          style={{
            bottom: PANEL_OFFSET,
            height: 'min(32rem, calc(100dvh - var(--cookie-banner-height, 0px) - 7rem))',
          }}
        >
          <header className="bg-primary-600 px-4 py-3 text-white">
            <h2 className="font-semibold">War on Retail Assistant</h2>
            <p className="text-xs opacity-90">Usually replies in seconds</p>
          </header>

          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-atomic="false"
            className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-white px-3 py-3"
          >
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
              <div
                aria-label="Assistant is typing"
                className="mr-auto rounded-2xl bg-white px-3 py-2 text-sm text-gray-500 ring-1 ring-gray-200"
              >
                <span aria-hidden="true">…</span>
                <span className="sr-only">Assistant is typing…</span>
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
            <label htmlFor="wor-chat-input" className="sr-only">
              Message
            </label>
            <input
              ref={inputRef}
              id="wor-chat-input"
              name="message"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              autoComplete="off"
              enterKeyHint="send"
              className="flex-1 rounded-full border border-gray-300 px-3 py-2.5 text-base focus:border-primary-500 focus:ring-primary-500 sm:py-2 sm:text-sm"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              aria-label="Send message"
            >
              <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
