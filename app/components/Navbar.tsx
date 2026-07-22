'use client';

import { useState } from 'react';
import { Menu, X, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/', label: 'How it Works' },
    { href: '', label: 'Network' },
  ];

  return (
    <nav
      style={{ backgroundColor: '#fff', borderBottom: '1px solid #E8EFF7' }}
      className="sticky top-0 z-50 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 no-underline">
          <ShieldCheck size={24} style={{ color: 'var(--terracotta)' }} />
          <span
            className="font-display font-700 text-lg tracking-tight"
            style={{ color: 'var(--navy)', fontFamily: 'Sora, sans-serif', fontWeight: 700 }}
          >
            PharmaCheck
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                style={{ color: 'var(--slate)', fontWeight: 500, fontSize: '0.9rem' }}
                className="no-underline hover:opacity-70 transition-opacity"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <a
          href="#scan"
          className="hidden md:inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--navy)',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
            textDecoration: 'none',
          }}
        >
          Scan Now
        </a>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          style={{ color: 'var(--navy)' }}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden px-6 pb-5 pt-2 flex flex-col gap-4"
          style={{ backgroundColor: '#fff', borderTop: '1px solid #E8EFF7' }}
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{ color: 'var(--navy)', fontWeight: 500, textDecoration: 'none' }}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#scan"
            className="text-center py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: 'var(--navy)', color: '#fff', textDecoration: 'none' }}
            onClick={() => setOpen(false)}
          >
            Scan Now
          </a>
        </div>
      )}
    </nav>
  );
}