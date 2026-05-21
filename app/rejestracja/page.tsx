'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { fetchMe } from '@/lib/useAuth';

export default function Rejestracja() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('speechflow_user_id', data.userId);
      await fetchMe();
      router.push('/profil');
    } else {
      const err = await res.json();
      setError(err.error ?? 'Błąd rejestracji');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-12">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 mb-8 self-start">
        <ArrowLeft size={18} /> Wróć
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-ocean-900">Utwórz konto</h1>
        <p className="text-gray-400 text-sm mt-1">Dołącz do gry i zapisz postępy.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Imię"
          value={form.firstName}
          onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          autoComplete="given-name"
          required
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400"
        />
        <input
          type="text"
          placeholder="Nazwisko"
          value={form.lastName}
          onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          autoComplete="family-name"
          required
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400"
        />
        <input
          type="email"
          placeholder="Adres e-mail"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          autoComplete="email"
          required
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400"
        />

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-ocean-500 shrink-0"
          />
          <span className="text-sm text-gray-500 leading-snug">
            Akceptuję{' '}
            <Link href="/regulamin" className="text-ocean-500 underline" target="_blank" rel="noopener noreferrer">Regulamin</Link>
            {' '}i{' '}
            <Link href="/polityka-prywatnosci" className="text-ocean-500 underline" target="_blank" rel="noopener noreferrer">Politykę prywatności</Link>
          </span>
        </label>

        {error && <p className="text-red-500 text-sm px-1">{error}</p>}

        <button
          type="submit"
          disabled={loading || !termsAccepted}
          className="w-full flex items-center justify-center gap-2 bg-ocean-500 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-ocean-500/30 disabled:opacity-60 mt-2"
        >
          <UserPlus size={16} />
          {loading ? 'Tworzę konto…' : 'Zarejestruj się'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400 mt-6">
        Masz już konto?{' '}
        <Link href="/login" className="text-ocean-500 font-semibold">Zaloguj się</Link>
      </p>
    </div>
  );
}
