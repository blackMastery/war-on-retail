'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

/**
 * `@uiw/react-md-editor` accesses `window` at module-evaluation time, so it
 * has to be loaded client-only. `ssr: false` keeps it out of the server
 * render; the placeholder below holds the layout until hydration.
 */
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] items-center justify-center rounded-md border border-dashed border-border bg-muted text-sm text-muted-foreground">
        Loading editor…
      </div>
    ),
  },
);

type Props = {
  /** Form field name — the resolved value is submitted via a hidden input. */
  name: string;
  /** Initial Markdown content. */
  defaultValue?: string;
  /** Editor height in pixels. */
  height?: number;
  /** `live` (split), `edit` (textarea only), `preview` (rendered only). */
  preview?: 'live' | 'edit' | 'preview';
  /** Visible textarea height when in `live` mode — defaults to height-50. */
  visibleDragbar?: boolean;
};

/**
 * Markdown editor used by the admin Pages form (and reusable elsewhere).
 *
 * Pattern: keep the value in local state, mirror it into a hidden `<input>`
 * with the supplied `name` so the surrounding `<form action={…}>` picks it
 * up via FormData — works seamlessly with `useActionState`.
 *
 * Theming: the wrapper has `data-color-mode="light"` so MDEditor picks the
 * light palette (the admin chrome is light-mode only).
 */
export default function MarkdownEditor({
  name,
  defaultValue = '',
  height = 500,
  preview = 'live',
  visibleDragbar = true,
}: Props) {
  const [value, setValue] = useState<string>(defaultValue);
  return (
    <div data-color-mode="light" className="rounded-md">
      <input type="hidden" name={name} value={value} />
      <MDEditor
        value={value}
        onChange={(v) => setValue(v ?? '')}
        height={height}
        preview={preview}
        visibleDragbar={visibleDragbar}
        // Soft-wrap long lines so policy text doesn't horizontally scroll.
        textareaProps={{ spellCheck: false }}
      />
    </div>
  );
}
