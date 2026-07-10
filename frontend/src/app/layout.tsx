'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: 'O' },
  { href: '/campaigns', label: 'Campaigns', icon: 'C' },
  { href: '/templates', label: 'Templates', icon: 'T' },
  { href: '/senders', label: 'Senders', icon: 'S' },
  { href: '/audience', label: 'Audience', icon: 'A' },
  { href: '/whatsapp', label: 'WhatsApp', icon: 'W' },
  { href: '/analytics', label: 'Analytics', icon: 'R' },
  { href: '/system', label: 'System', icon: 'H' },
  { href: '/settings', label: 'Settings', icon: 'N' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
  }));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const hasKey = !!localStorage.getItem('auto_mailer_api_key');
    if (!hasKey && pathname !== '/login') router.push('/login');
    if (hasKey && pathname === '/login') router.push('/');
  }, [pathname]);

  if (pathname === '/login') return <>{children}</>;

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <QueryClientProvider client={queryClient}>
          <div className="flex h-screen overflow-hidden">
            <aside className={`${sidebarOpen ? 'w-56' : 'w-14'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 shrink-0`}>
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                {sidebarOpen && <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold tracking-tight">Auto-Mailer</motion.h1>}
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><span className="text-gray-500">{sidebarOpen ? '<' : '>'}</span></button>
              </div>
              <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
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
