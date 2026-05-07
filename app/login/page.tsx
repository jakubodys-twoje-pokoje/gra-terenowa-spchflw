'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, LogIn } from 'lucide-react';
import Link from 'next/link';
import { fetchMe } from '@/lib/useAuth';

function getGuestUserId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('speechflow_user_id') ?? '';
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    fetch('/api/auth/me').then(async (r) => {
      if (r.ok && await r.json()) router.replace('/profil');
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      // Store the account userId in localStorage so all screens use it
      localStorage.setItem('speechflow_user_id', data.userId);
      await fetchMe();
      router.push('/');
    } else {
      const err = await res.json();
      if (err.needsVerification) {
        router.push('/weryfikacja');
        return;
      }
      setError(err.error ?? 'Błąd logowania');
    }
    setLoading(false);
  };

  const field = (key: 'email' | 'password', placeholder: string, type = 'text') => (
    <div className="relative">
      <input
        type={key === 'password' ? (showPass ? 'text' : 'password') : type}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        autoComplete={key === 'email' ? 'email' : 'current-password'}
        required
        className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400 pr-10"
      />
      {key === 'password' && (
        <button type="button" onClick={() => setShowPass((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col px-6 pt-12">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 mb-8 self-start">
        <ArrowLeft size={18} /> Wróć
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-ocean-900">Zaloguj się</h1>
        <p className="text-gray-400 text-sm mt-1">Witaj z powrotem, Odkrywco!</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {field('email', 'Adres e-mail', 'email')}
        {field('password', 'Hasło')}

        {error && <p className="text-red-500 text-sm px-1">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-ocean-500 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-ocean-500/30 disabled:opacity-60 mt-2"
        >
          <LogIn size={16} />
          {loading ? 'Logowanie…' : 'Zaloguj się'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400 mt-6">
        Nie masz konta?{' '}
        <Link href={`/rejestracja?guest=${getGuestUserId()}`} className="text-ocean-500 font-semibold">
          Zarejestruj się
        </Link>
      </p>
    </div>
  );
}
