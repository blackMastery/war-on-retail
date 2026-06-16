'use client';

import { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

/**
 * Thin wrapper around react-quill-new. Imported only via `dynamic(ssr:false)`
 * from EmailHtmlEditor — Quill touches `document` at import time, so it must
 * never load on the server.
 *
 * Variable insertion is driven by an `insertSignal` prop (a token + a changing
 * nonce) rather than an imperative ref, because `next/dynamic` doesn't forward
 * refs. A useEffect watching the nonce inserts the token at the caret.
 */
const MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

type Props = {
  value: string;
  onChange: (html: string) => void;
  insertSignal?: { token: string; nonce: number };
};

export default function QuillEditor({ value, onChange, insertSignal }: Props) {
  const quillRef = useRef<ReactQuill>(null);
  const lastNonce = useRef<number>(0);

  useEffect(() => {
    if (!insertSignal || insertSignal.nonce === lastNonce.current) return;
    lastNonce.current = insertSignal.nonce;
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = editor.getSelection(true);
    const index = range ? range.index : editor.getLength();
    editor.insertText(index, insertSignal.token, 'user');
    editor.setSelection(index + insertSignal.token.length, 0);
  }, [insertSignal]);

  return (
    <ReactQuill
      ref={quillRef}
      theme="snow"
      value={value}
      onChange={onChange}
      modules={MODULES}
    />
  );
}
