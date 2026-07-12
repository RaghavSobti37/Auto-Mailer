'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './globals.css';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: 'O', group: 'top' },
  { href: '/campaigns', label: 'Campaigns', icon: 'C', group: 'Compose' },
  { href: '/templates', label: 'Templates', icon: 'T', group: 'Compose' },
  { href: '/audience', label: 'Audience', icon: 'A', group: 'Reach' },
  { href: '/senders', label: 'Senders', icon: 'S', group: 'Reach' },
  { href: '/whatsapp', label: 'WhatsApp', icon: 'W', group: 'Reach' },
  { href: '/analytics', label: 'Analytics', icon: 'R', group: 'Insight' },
  { href: '/system', label: 'System', icon: 'H', group: 'Insight' },
  { href: '/settings', label: 'Settings', icon: 'N', group: 'bottom' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
  }));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className="min-h-screen">
        <QueryClientProvider client={queryClient}>
          <div className="flex h-screen overflow-hidden">
            <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} flex shrink-0 flex-col border-r transition-all duration-200`} style={{ background: 'var(--ink)', borderColor: 'rgba(255,255,255,0.12)' }}>
              <div className="flex items-center justify-between border-b p-4" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                {sidebarOpen && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-white">
                    <span className="h-7 w-7 rounded-full border border-dashed border-white/60 grid place-items-center text-xs font-bold">AM</span>
                    <h1 className="text-sm font-bold tracking-tight">Auto-Mailer</h1>
                  </motion.div>
                )}
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10"><span>{sidebarOpen ? '<' : '>'}</span></button>
              </div>
              <nav className="flex-1 space-y-4 overflow-y-auto p-2">
                {['top', 'Compose', 'Reach', 'Insight'].map((group) => (
                  <div key={group} className="space-y-1">
                    {sidebarOpen && group !== 'top' && <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-white/36">{group}</div>}
                    {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                      const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                      return (
                        <Link key={item.href} href={item.href}
                          className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'bg-white/10 text-white font-semibold' : 'text-white/68 hover:bg-white/8 hover:text-white'}`}>
                          {isActive && <span className="absolute left-1 h-2 w-2 rounded-full" style={{ background: 'var(--postmark)' }} />}
                          <span className="mono w-5 text-center text-xs">{item.icon}</span>
                          {sidebarOpen && <span>{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
              <div className="border-t p-2" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                {NAV_ITEMS.filter((item) => item.group === 'bottom').map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href}
                      className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'bg-white/10 text-white font-semibold' : 'text-white/68 hover:bg-white/8 hover:text-white'}`}>
                      {isActive && <span className="absolute left-1 h-2 w-2 rounded-full" style={{ background: 'var(--postmark)' }} />}
                      <span className="mono w-5 text-center text-xs">{item.icon}</span>
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </aside>
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-6 py-6">
                <AnimatePresence mode="wait">
                  <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  );
}
