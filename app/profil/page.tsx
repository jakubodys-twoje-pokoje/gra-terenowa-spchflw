'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { User, Save, Check, Camera, Loader2, LogOut, Lock, Mail, RefreshCw, Key, Trash2, Eye, EyeOff, AlertTriangle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, logout, fetchMe } from '@/lib/useAuth';
import PartnerLogos from '@/components/PartnerLogos';

// Generate a stable display number from UUID
function guestNumber(userId: string): string {
  const hex = userId.replace(/-/g, '').slice(-6);
  const num = parseInt(hex, 16) % 999999;
  return String(num).padStart(6, '0');
}

function getUserId(): string {
  let id = localStorage.getItem('speechflow_user_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('speechflow_user_id', id); }
  return id;
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'Jak zeskanować kod QR?', a: 'Otwórz zakładkę „Skanuj" w dolnym menu i skieruj aparat telefonu na tabliczkę z kodem QR przy danym miejscu. Aplikacja automatycznie rozpozna kod i otworzy stronę budynku.' },
  { q: 'Jaką przeglądarkę wybrać?', a: 'Zalecamy Google Chrome — zapewnia najlepszą obsługę skanowania QR, GPS i funkcji aplikacji. Na iPhone\'ie najlepiej sprawdza się Safari. Inne przeglądarki mogą nie obsługiwać skanera.' },
  { q: 'Czy aplikacja działa bez internetu?', a: 'Mapa i skanowanie wymagają aktywnego połączenia z internetem (WiFi lub mobilny internet). Zalecamy sprawdzić zasięg przed wyjściem na eksplorację.' },
  { q: 'Nie mogę znaleźć miejsca na mapie — co zrobić?', a: 'Użyj przycisku „Najbliżej" na mapie — GPS wyznaczy najbliższe nieodkryte miejsce. Upewnij się, że aplikacja ma uprawnienie do lokalizacji. Możesz też przeglądać pełną Bazę Budynków w menu.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3"
      >
        <span className="font-semibold text-ocean-900 text-sm leading-snug">{q}</span>
        <span className={`text-ocean-400 text-lg leading-none transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <p className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

// ── GUEST VIEW ────────────────────────────────────────────────────────────────
function GuestView({ onRegister }: { onRegister: () => void }) {
  const [showPopup, setShowPopup] = useState(false);
  const [guestId, setGuestId] = useState('');
  const router = useRouter();

  useEffect(() => { setGuestId(getUserId()); }, []);

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
          <User size={22} className="text-gray-400" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-ocean-900">Profil</h1>
          <p className="text-gray-400 text-xs">Tryb gościa</p>
        </div>
      </div>

      {/* Guest avatar */}
      <div className="flex justify-center mb-6">
        <button onClick={() => setShowPopup(true)} className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-gray-200 flex items-center justify-center">
            <User size={36} className="text-gray-300" />
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center border-2 border-white">
            <Lock size={12} className="text-white" />
          </div>
        </button>
      </div>

      {/* Guest ID */}
      <div className="bg-gray-50 rounded-3xl p-5 mb-5 text-center">
        <p className="text-xs text-gray-400 mb-1">Twój numer gościa</p>
        <p className="text-3xl font-extrabold text-gray-700 tracking-widest">#{guestId ? guestNumber(guestId) : '…'}</p>
        <p className="text-xs text-gray-400 mt-2">Zarejestruj się, by wybrać własny pseudonim</p>
      </div>

      {/* Locked fields */}
      {['Pseudonim', 'Adres e-mail', 'Miejscowość'].map((label) => (
        <button key={label} onClick={() => setShowPopup(true)}
          className="w-full flex items-center gap-3 border border-gray-100 rounded-2xl px-4 py-3 mb-3 bg-gray-50 text-left">
          <Lock size={14} className="text-gray-300 shrink-0" />
          <span className="text-sm text-gray-300">{label}</span>
        </button>
      ))}

      <button onClick={onRegister}
        className="w-full mt-4 bg-ocean-500 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-ocean-500/30 flex items-center justify-center gap-2">
        Zarejestruj się, by zapisać dane
      </button>

      <button onClick={() => router.push('/login')}
        className="w-full mt-2 bg-ocean-50 text-ocean-700 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
        Zaloguj się
      </button>

      {/* FAQ */}
      <div className="mt-6 mb-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ocean-500 mb-3">Najczęstsze pytania</h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item) => <FaqItem key={item.q} q={item.q} a={item.a} />)}
        </div>
      </div>

      <PartnerLogos logoHeight="h-8" />

      {/* Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-[900] flex items-end justify-center p-4 bg-black/40"
          onClick={() => setShowPopup(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-ocean-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock size={24} className="text-ocean-500" />
              </div>
              <h2 className="font-extrabold text-ocean-900 text-lg">Zarejestruj się</h2>
              <p className="text-gray-400 text-sm mt-1">
                Dane profilu są dostępne tylko dla zarejestrowanych użytkowników. Twoje odkrycia zostaną przeniesione na nowe konto.
              </p>
            </div>
            <button onClick={onRegister}
              className="w-full bg-ocean-500 text-white py-3 rounded-2xl font-bold text-sm mb-2">
              Utwórz konto
            </button>
            <button onClick={() => setShowPopup(false)}
              className="w-full py-3 rounded-2xl text-gray-400 text-sm">
              Zostań gościem
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── UNVERIFIED VIEW ───────────────────────────────────────────────────────────
function UnverifiedView({ email }: { email: string }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  const resend = async () => {
    setResending(true); setError('');
    const res = await fetch('/api/auth/send-verification', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    if (res.ok) setResent(true);
    else { const d = await res.json(); setError(d.error ?? 'Błąd'); }
    setResending(false);
  };

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center">
          <Mail size={22} className="text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-ocean-900">Potwierdź email</h1>
          <p className="text-gray-400 text-xs">Konto nieaktywne</p>
        </div>
      </div>

      <div className="text-center py-8 px-4">
        <div className="text-6xl mb-4">📬</div>
        <h2 className="font-bold text-ocean-900 text-lg mb-2">Sprawdź swoją skrzynkę</h2>
        <p className="text-gray-400 text-sm mb-1">
          Wysłaliśmy link aktywacyjny na adres:
        </p>
        <p className="font-semibold text-ocean-700 text-sm mb-6">{email}</p>
        <p className="text-gray-400 text-xs mb-6">
          Kliknij link w emailu, aby aktywować konto i odblokować profil. Link jest ważny przez 24h.
        </p>

        {resent ? (
          <p className="text-green-600 font-semibold text-sm">Nowy link wysłany!</p>
        ) : (
          <button onClick={resend} disabled={resending}
            className="inline-flex items-center gap-2 text-ocean-500 bg-ocean-50 px-5 py-2.5 rounded-xl font-semibold text-sm">
            <RefreshCw size={15} className={resending ? 'animate-spin' : ''} />
            {resending ? 'Wysyłam…' : 'Wyślij link ponownie'}
          </button>
        )}
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>
    </div>
  );
}

// ── VERIFIED VIEW ─────────────────────────────────────────────────────────────
function VerifiedView({ user, onLogout }: { user: { email: string; nickname: string | null; city: string | null; avatarUrl: string | null; showOnMap: boolean }, onLogout: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ nickname: user.nickname ?? '', city: user.city ?? '' });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl ?? null);
  const [showOnMap, setShowOnMap] = useState(user.showOnMap);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null); // null = not uploading
  const [uploadError, setUploadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change password
  const [showChangePw, setShowChangePw] = useState(false);
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfPw, setShowConfPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Delete account
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePw, setShowDeletePw] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const uploadingAvatar = uploadProgress !== null;

  // Warn user before leaving while upload is in progress
  useEffect(() => {
    if (!uploadingAvatar) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [uploadingAvatar]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    if (!file.type.startsWith('image/')) {
      setUploadError('Nieobsługiwany format pliku — użyj JPG, PNG lub WebP.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(`Zdjęcie jest za duże (${(file.size / (1024 * 1024)).toFixed(1)} MB) — limit to 5 MB.`);
      e.target.value = '';
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);
    setUploadProgress(0);
    const userId = getUserId();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('userId', userId);

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const { url, dataUrl, error: apiErr } = JSON.parse(xhr.responseText);
          if (apiErr || !url) {
            setUploadError(apiErr ?? 'Błąd serwera przy uploading');
            setAvatarUrl(user.avatarUrl ?? null);
          } else {
            // Show processed image immediately via data URL (already in memory,
            // no second HTTP request → no PM2 cluster race condition).
            // The plain `url` path is what gets persisted to the DB.
            setAvatarUrl(dataUrl ?? `${url}?t=${Date.now()}`);
            URL.revokeObjectURL(preview);
            const saveRes = await fetch('/api/profil', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ avatarUrl: url, nickname: form.nickname, city: form.city }),
            });
            if (saveRes.ok) {
              // Refresh global auth cache so map/navbar get the new avatar URL
              await fetchMe();
            } else {
              const d = await saveRes.json().catch(() => ({}));
              setUploadError(d.error ?? `Błąd zapisu profilu (${saveRes.status})`);
            }
          }
        } catch {
          setTimeout(() => URL.revokeObjectURL(preview), 100);
          setUploadError('Nieprawidłowa odpowiedź serwera');
          setAvatarUrl(user.avatarUrl ?? null);
        }
      } else {
        setTimeout(() => URL.revokeObjectURL(preview), 100);
        let msg = `Błąd uploadu (${xhr.status})`;
        try { const d = JSON.parse(xhr.responseText); msg = d.error ?? msg; } catch { /* ignore */ }
        setUploadError(msg);
        setAvatarUrl(user.avatarUrl ?? null);
      }
      setUploadProgress(null);
    };
    xhr.onerror = () => {
      setTimeout(() => URL.revokeObjectURL(preview), 500);
      setAvatarUrl(user.avatarUrl ?? null);
      setUploadProgress(null);
      setUploadError('Błąd sieci — sprawdź połączenie');
    };
    xhr.open('POST', '/api/upload/avatar');
    xhr.send(fd);
    e.target.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/profil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, avatarUrl, showOnMap }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.next.length < 6) { setPwError('Nowe hasło musi mieć min. 6 znaków'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Nowe hasła nie są identyczne'); return; }
    setPwSaving(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    });
    if (res.ok) {
      setPwSaved(true);
      setPwForm({ current: '', next: '', confirm: '' });
      setShowChangePw(false);
      setTimeout(() => setPwSaved(false), 3000);
    } else {
      const d = await res.json().catch(() => ({}));
      setPwError(d.error ?? 'Błąd zmiany hasła');
    }
    setPwSaving(false);
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    setDeleting(true);
    const res = await fetch('/api/auth/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: deletePassword }),
    });
    if (res.ok) {
      localStorage.removeItem('speechflow_user_id');
      router.push('/');
    } else {
      const d = await res.json().catch(() => ({}));
      setDeleteError(d.error ?? 'Błąd usuwania konta');
    }
    setDeleting(false);
  };

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-ocean-100 flex items-center justify-center">
            <User size={22} className="text-ocean-500" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-ocean-900">Profil</h1>
            <p className="text-gray-500 text-xs">{user.email}</p>
          </div>
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-100 px-3 py-2 rounded-xl">
          <LogOut size={14} /> Wyloguj
        </button>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-6 gap-3">
        <button type="button" onClick={() => fileInputRef.current?.click()} className="relative group" disabled={uploadingAvatar}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border-4 border-ocean-200 shadow-lg"
              onError={() => {
                if (avatarUrl?.startsWith('blob:')) {
                  // Blob revoked before React re-rendered — silently fall back, upload error already set
                  setAvatarUrl(null);
                } else {
                  // Saved URL broken (e.g. file deleted from server)
                  setAvatarUrl(null);
                  setUploadError('Nie udało się załadować zdjęcia — spróbuj wgrać nowe.');
                }
              }}
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-ocean-100 border-4 border-ocean-200 shadow-lg flex items-center justify-center">
              <User size={36} className="text-ocean-300" />
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-ocean-500 rounded-full flex items-center justify-center shadow-md border-2 border-white">
            {uploadingAvatar ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
          </div>
        </button>

        {/* Upload progress */}
        {uploadProgress !== null && (
          <div className="w-full max-w-[220px]">
            <div className="flex justify-between text-xs text-ocean-500 font-semibold mb-1">
              <span>Wysyłanie zdjęcia…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-ocean-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-ocean-500 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 text-center mt-1.5">Nie zamykaj tej strony</p>
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-2xl w-full max-w-[280px]">
            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-500" />
            <span className="flex-1 leading-snug">{uploadError}</span>
            <button type="button" onClick={() => setUploadError('')} className="shrink-0 text-red-400 hover:text-red-600 ml-1">
              <X size={14} />
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 px-1">Pseudonim</label>
          <input type="text" placeholder="Jak chcesz być nazywany?"
            value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 px-1">Adres e-mail</label>
          <input type="email" value={user.email} disabled
            className="w-full border border-gray-100 rounded-2xl px-4 py-3 text-sm bg-gray-50 text-gray-400" />
          <p className="text-[11px] text-gray-400 px-1 mt-1">Email konta nie można zmienić tutaj.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 px-1">Miejscowość</label>
          <input type="text" placeholder="Skąd jesteś?"
            value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400" />
        </div>
        {/* showOnMap toggle */}
        <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ocean-900">Pokaż mnie na mapie</p>
            <p className="text-xs text-gray-400 mt-0.5">Inni gracze zobaczą Twój avatar w czasie rzeczywistym</p>
          </div>
          <button
            type="button"
            onClick={() => setShowOnMap(v => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${showOnMap ? 'bg-ocean-500' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showOnMap ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <button type="submit" disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-ocean-500 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-ocean-500/30 disabled:opacity-60">
          {saved ? <><Check size={16} /> Zapisano!</> : saving ? 'Zapisuję…' : <><Save size={16} /> Zapisz profil</>}
        </button>
      </form>

      {/* ── Zmiana hasła — button ─────────────────────────────────────────── */}
      <div className="mt-6 mb-0">
        <button
          type="button"
          onClick={() => { setShowChangePw(true); setPwError(''); setPwForm({ current: '', next: '', confirm: '' }); }}
          className="w-full flex items-center justify-center gap-2 text-ocean-600 border border-ocean-200 bg-ocean-50 py-3 rounded-2xl text-sm font-semibold"
        >
          <Key size={15} /> Zmień hasło
          {pwSaved && <span className="text-green-600 text-xs flex items-center gap-1 ml-1"><Check size={12} /> Zmieniono!</span>}
        </button>
      </div>

      {/* Change password dialog */}
      {showChangePw && (
        <div className="fixed inset-0 z-[900] flex items-end justify-center p-4 bg-black/50"
          onClick={() => setShowChangePw(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-ocean-100 flex items-center justify-center shrink-0">
                <Key size={20} className="text-ocean-500" />
              </div>
              <div>
                <h2 className="font-extrabold text-gray-900 text-base">Zmiana hasła</h2>
                <p className="text-gray-400 text-xs">Podaj aktualne i nowe hasło</p>
              </div>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="relative">
                <input type={showCurPw ? 'text' : 'password'} placeholder="Aktualne hasło"
                  value={pwForm.current} onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                  required autoComplete="current-password"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400 pr-10" />
                <button type="button" onClick={() => setShowCurPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showCurPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <input type={showNewPw ? 'text' : 'password'} placeholder="Nowe hasło (min. 6 znaków)"
                  value={pwForm.next} onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                  required autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400 pr-10" />
                <button type="button" onClick={() => setShowNewPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <input type={showConfPw ? 'text' : 'password'} placeholder="Powtórz nowe hasło"
                  value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                  required autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400 pr-10" />
                <button type="button" onClick={() => setShowConfPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showConfPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwError && <p className="text-red-500 text-xs px-1">{pwError}</p>}
              <button type="submit" disabled={pwSaving}
                className="w-full bg-ocean-500 text-white py-3 rounded-2xl font-bold text-sm disabled:opacity-60">
                {pwSaving ? 'Zapisuję…' : 'Zmień hasło'}
              </button>
              <button type="button" onClick={() => setShowChangePw(false)}
                className="w-full py-2.5 rounded-2xl text-gray-400 text-sm">
                Anuluj
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Usuń konto ────────────────────────────────────────────────────── */}
      <div className="mt-3 mb-2">
        <button
          type="button"
          onClick={() => { setShowDeleteDialog(true); setDeleteError(''); setDeletePassword(''); }}
          className="w-full flex items-center justify-center gap-2 text-red-400 border border-red-100 bg-red-50 py-3 rounded-2xl text-sm font-semibold"
        >
          <Trash2 size={15} /> Usuń konto
        </button>
      </div>

      {/* Delete account dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-[900] flex items-end justify-center p-4 bg-black/50"
          onClick={() => setShowDeleteDialog(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h2 className="font-extrabold text-gray-900 text-base">Usuń konto</h2>
                <p className="text-gray-400 text-xs">Tej operacji nie można cofnąć</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              Zostaną usunięte wszystkie Twoje dane: profil, odkrycia i avatar. Aby potwierdzić, wpisz swoje hasło.
            </p>
            <form onSubmit={handleDeleteAccount} className="space-y-3">
              <div className="relative">
                <input type={showDeletePw ? 'text' : 'password'} placeholder="Twoje hasło"
                  value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                  required autoComplete="current-password"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 pr-10" />
                <button type="button" onClick={() => setShowDeletePw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showDeletePw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {deleteError && <p className="text-red-500 text-xs px-1">{deleteError}</p>}
              <button type="submit" disabled={deleting}
                className="w-full bg-red-500 text-white py-3 rounded-2xl font-bold text-sm disabled:opacity-60">
                {deleting ? 'Usuwam…' : 'Tak, usuń moje konto'}
              </button>
              <button type="button" onClick={() => setShowDeleteDialog(false)}
                className="w-full py-2.5 rounded-2xl text-gray-400 text-sm">
                Anuluj
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="px-4 mt-6 mb-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ocean-500 mb-3">Najczęstsze pytania</h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item) => <FaqItem key={item.q} q={item.q} a={item.a} />)}
        </div>
      </div>

      <PartnerLogos logoHeight="h-8" />

      <p className="text-center text-[11px] text-gray-300 mb-6 leading-relaxed">
        <Link href="/regulamin" className="text-gray-400 underline">Regulamin</Link>
        {' · '}
        <Link href="/polityka-prywatnosci" className="text-gray-400 underline">Polityka prywatności</Link>
      </p>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ProfilPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    await logout();
    localStorage.removeItem('speechflow_user_id');
    router.push('/');
  }, [router]);

  const handleRegister = useCallback(() => {
    const guestId = typeof window !== 'undefined' ? getUserId() : '';
    router.push(`/rejestracja?guest=${guestId}`);
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 size={28} className="animate-spin text-ocean-400" />
      </div>
    );
  }

  if (!user) return <GuestView onRegister={handleRegister} />;
  if (!user.emailVerified) return <UnverifiedView email={user.email} />;
  return <VerifiedView user={user} onLogout={handleLogout} />;
}
