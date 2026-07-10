'use client';

import { useState, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { live } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('auto_mailer_api_key');
    if (stored) {
      router.replace('/');
      return;
    }
    startTransition(() => setChecking(false));
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await live.auth.verify(apiKey);
      localStorage.setItem('auto_mailer_api_key', apiKey);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Invalid API key');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center text-gray-400">Checking session...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Auto-Mailer</h1>
            <p className="text-sm text-gray-500 mt-2">Sign in to manage your campaigns</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label" htmlFor="apiKey">API Key</label>
              <input id="apiKey" type="password" className="input" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter your API key" autoFocus />
            </div>
            {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</motion.p>}
            <button type="submit" disabled={loading || !apiKey} className="btn-primary w-full">{loading ? 'Verifying...' : 'Sign in'}</button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-6">Auto-Mailer v1.0</p>
        </div>
      </motion.div>
    </div>
  );
}
