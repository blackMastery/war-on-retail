'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bars3Icon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { siteConfig } from '@/config/site';
import { primaryNav } from '@/config/navigation';
import SearchBar from './SearchBar';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Utility bar */}
      <div className="bg-gray-900 text-white">
        <div className="container flex items-center justify-between py-2 text-xs sm:text-sm">
          <div className="flex items-center gap-4">
            <a href={`tel:${siteConfig.phone}`} className="hover:text-primary-300">
              📞 {siteConfig.phone}
            </a>
            <span className="hidden md:inline opacity-50">|</span>
            <span className="hidden md:inline opacity-80">{siteConfig.hours.weekdays}</span>
          </div>
          <a
            href={`https://wa.me/${siteConfig.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-300"
          >
            WhatsApp us
          </a>
        </div>
      </div>

      {/* Main bar */}
      <div className="container flex items-center gap-4 py-4">
        <Link href="/" className="flex items-center text-xl font-extrabold tracking-tight">
          <span className="text-primary-600">War on</span>
          <span className="ml-1">Retail</span>
        </Link>

        <div className="ml-4 hidden flex-1 md:flex">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="Toggle search"
            className="rounded-full p-2 hover:bg-gray-100 md:hidden"
          >
            <MagnifyingGlassIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
            className="rounded-full p-2 hover:bg-gray-100 md:hidden"
          >
            {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="container pb-3 md:hidden">
          <SearchBar />
        </div>
      )}

      {/* Primary nav */}
      <nav className="bg-primary-600 text-white">
        <div className="container hidden items-center gap-6 py-3 text-sm font-medium md:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`hover:text-primary-100 ${item.highlight ? 'font-bold' : ''}`}
            >
              {item.highlight ? '🔥 ' : ''}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="border-t bg-white md:hidden">
          <div className="container flex flex-col gap-1 py-3 text-sm">
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-2 py-2 hover:bg-gray-100"
              >
                {item.highlight ? '🔥 ' : ''}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
