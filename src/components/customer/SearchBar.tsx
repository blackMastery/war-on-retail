'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function SearchBar({ placeholder = 'Search for products, brands, SKUs…' }: { placeholder?: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full" role="search">
      <label htmlFor="site-search" className="sr-only">
        Search
      </label>
      <input
        id="site-search"
        name="q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        className="w-full rounded-full border border-gray-300 bg-white py-3 pl-4 pr-14 text-base shadow-sm focus:border-primary-500 focus:ring-primary-500 md:py-2.5 md:text-sm"
      />
      <button
        type="submit"
        className="absolute right-1 top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700"
        aria-label="Search"
      >
        <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
