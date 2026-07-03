import { ShieldCheck } from 'lucide-react';

const footerLinks = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Regulatory Compliance', href: '#' },
  { label: 'Contact Security', href: '#' },
];

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#080E18', paddingTop: '3rem', paddingBottom: '3rem' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={20} style={{ color: 'var(--terracotta-light)' }} />
              <span
                className="font-bold text-lg"
                style={{ fontFamily: 'Sora, sans-serif', color: '#fff' }}
              >
                PharmaCheck
              </span>
            </div>
            <p className="text-sm m-0" style={{ color: 'var(--muted)', maxWidth: '260px', lineHeight: 1.6 }}>
              AI-powered pharmaceutical packaging authentication for Rwanda. Protecting patients
              through on-device CNN verification.
            </p>
          </div>

          {/* Links + copyright */}
          <div className="flex flex-col items-start md:items-end gap-4">
            <ul className="flex flex-wrap gap-5 list-none m-0 p-0">
              {footerLinks.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm no-underline hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--muted)' }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs m-0" style={{ color: '#3D5470' }}>
              © 2025 PharmaCheck — Rwanda Pharmaceutical Authentication Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}