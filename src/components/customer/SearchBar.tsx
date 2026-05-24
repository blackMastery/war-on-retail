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
        className="w-full rounded-full border border-gray-300 bg-white py-2.5 pl-4 pr-12 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
      />
      <button
        type="submit"
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-primary-600 p-2 text-white hover:bg-primary-700"
        aria-label="Search"
      >
        <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
