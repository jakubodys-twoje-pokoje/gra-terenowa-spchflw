'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Trash2, Edit3, Check, X, Images, Users, Building2, CheckCircle, XCircle, Lock, LogOut, MapPin, FileText, Save, Upload, AlertCircle, Tag, Trophy, Egg, Download, BarChart3, QrCode, Eye, UserCheck } from 'lucide-react';
import clsx from 'clsx';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

interface BuildingImage { id: number; url: string; title: string | null; alt: string | null; order: number; }
interface GalleryItem { url: string; title: string; alt: string; }

interface Building {
  id: number; number: number | null; name: string; description: string; address?: string;
  lat: number; lng: number; imageUrl?: string; outlineImageUrl?: string;
  qrUrl: string; category: string; images: BuildingImage[];
  hidden: boolean; published: boolean;
}

interface UserEntry {
  userId: string; nickname: string | null; email: string | null;
  city: string | null; avatarUrl: string | null;
  emailVerified: boolean; registeredAt: string; discoveryCount: number;
}

interface CategoryEntry { id: number; value: string; label: string; icon: string; order: number; }
interface AchievementEntry { id: number; name: string; description: string; icon: string; color: string; conditionType: string; conditionValue: number; conditionCategory: string | null; buildingIds: string | null; order: number; }
interface EasterEggEntry { id: number; name: string; title: string; description: string | null; mediaType: string; mediaUrl: string | null; triggerType: string; triggerValue: number | null; triggerBuildingId: number | null; active: boolean; }

const CONDITION_TYPES = [
  { value: 'total_count',        label: 'Liczba odkryć (≥ N)' },
  { value: 'total_all',          label: 'Odkryj wszystkie' },
  { value: 'category_count',     label: 'Odkrycia kategorii (≥ N)' },
  { value: 'building_set',       label: 'Konkretne budynki (N z listy)' },
  { value: 'days_active',        label: 'Aktywność przez N dni' },
  { value: 'all_in_one_day',     label: 'Wszystkie budynki w 1 dzień' },
  { value: 'return_after_break', label: 'Powrót po przerwie (7+ dni)' },
];

const EMPTY_CAT_FORM = { value: '', label: '', icon: '', order: 0 };
const EMPTY_ACH_FORM = { name: '', description: '', icon: '🏆', color: '#0F5F92', conditionType: 'total_count', conditionValue: 1, conditionCategory: '', buildingIds: '', order: 0 };
const EMPTY_EGG_FORM = { name: '', title: '', description: '', mediaType: 'none', mediaUrl: '', triggerType: 'discovery_count', triggerValue: 1, triggerBuildingId: '', active: true };
const TRIGGER_TYPES = [
  { value: 'discovery_count', label: 'Po dokładnie N odkryciach' },
  { value: 'every_n',         label: 'Co każde N odkrycia' },
  { value: 'building',        label: 'Odkrycie konkretnego budynku' },
];

const CATEGORIES = [
  { value: 'checza',    label: '🛖 Chëcza' },
  { value: 'zagroda',   label: '🏡 Zagroda' },
  { value: 'karczma',   label: '🍺 Karczma' },
  { value: 'pensjonat', label: '🛏️ Pensjonat' },
  { value: 'sakralny',  label: '⛪ Sakralny' },
  { value: 'natura',    label: '🌲 Natura' },
  { value: 'morze',     label: '🐟 Morze' },
  { value: 'historia',  label: '🏛️ Historia' },
];

async function fetchWpTitle(imageUrl: string): Promise<{ title: string; alt: string } | null> {
  try {
    const u = new URL(imageUrl);
    const filename = u.pathname.split('/').pop()?.replace(/\.[^.]+$/, '');
    if (!filename) return null;
    const api = `${u.origin}/wp-json/wp/v2/media?slug=${encodeURIComponent(filename)}&_fields=title,alt_text`;
    const res = await fetch(api);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const title = (data[0].title?.rendered as string ?? '').replace(/&#8211;/g, '–').replace(/&amp;/g, '&').replace(/&#[0-9]+;/g, (m: string) => String.fromCharCode(parseInt(m.slice(2, -1)))).trim();
    const alt = (data[0].alt_text as string ?? '').trim();
    return { title, alt };
  } catch {
    return null;
  }
}

const EMPTY_FORM = {
  name: '', description: '', address: '',
  lat: '54.7505', lng: '17.8670',
  imageUrl: '', outlineImageUrl: '', qrUrl: '', category: 'historia',
  hidden: false, published: true,
};

// ──────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [password, setPassword]     = useState('');
  const [authed, setAuthed]         = useState(false);
  const [activeTab, setActiveTab]   = useState<'budynki' | 'uzytkownicy' | 'tresci' | 'kategorie' | 'osiagniecia' | 'easter-eggi' | 'analityka'>('budynki');
  const [contentReg, setContentReg]   = useState('');
  const [contentPol, setContentPol]   = useState('');
  const [contentSaving, setContentSaving] = useState<string | null>(null);
  const [contentSaved, setContentSaved]   = useState<string | null>(null);
  const [buildings, setBuildings]   = useState<Building[]>([]);
  const [users, setUsers]           = useState<UserEntry[]>([]);
  const [guestCount, setGuestCount] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [gallery, setGallery]       = useState<GalleryItem[]>([]);
  const [galleryFetching, setGalleryFetching] = useState<boolean[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [formError, setFormError]   = useState('');
  const [success, setSuccess]       = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [pickingCoords, setPickingCoords] = useState(false);
  const [showDms, setShowDms]       = useState(false);
  const [dmsLat, setDmsLat]         = useState({ d: '', m: '', s: '' });
  const [dmsLng, setDmsLng]         = useState({ d: '', m: '', s: '' });
  const formRef    = useRef<HTMLDivElement>(null);

  // ── Categories state ─────────────────────────────────────────────────────────
  const [categories, setCategories]     = useState<CategoryEntry[]>([]);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catForm, setCatForm]           = useState(EMPTY_CAT_FORM);
  const [showCatForm, setShowCatForm]   = useState(false);

  // ── Achievements state ───────────────────────────────────────────────────────
  const [achievements, setAchievements]   = useState<AchievementEntry[]>([]);
  const [editingAchId, setEditingAchId]   = useState<number | null>(null);
  const [achForm, setAchForm]             = useState(EMPTY_ACH_FORM);
  const [showAchForm, setShowAchForm]     = useState(false);

  // ── Easter Eggs state ────────────────────────────────────────────────────────
  const [easterEggs, setEasterEggs]         = useState<EasterEggEntry[]>([]);
  const [editingEggId, setEditingEggId]     = useState<number | null>(null);
  const [eggForm, setEggForm]               = useState(EMPTY_EGG_FORM);
  const [showEggForm, setShowEggForm]       = useState(false);

  // ── Analytics state ──────────────────────────────────────────────────────────
  interface AnalyticsData {
    totals: { discoveries: number; users: number; pageViews: number; scansToday: number; viewsToday: number; activeUsers7: number };
    series: { discoveries: Record<string,number>; pageViews: Record<string,number>; registrations: Record<string,number> };
    topBuildings: { buildingId: number; count: number; name: string; number: number|null }[];
    topPaths: { path: string; count: number }[];
  }
  const [analytics, setAnalytics]         = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/admin/analytics', { headers: { 'x-admin-password': password } });
      if (res.ok) setAnalytics(await res.json());
    } finally {
      setAnalyticsLoading(false);
    }
  }, [password]);

  // ── CSV import ──────────────────────────────────────────────────────────────
  type CsvStatus = 'pending' | 'importing' | 'ok' | string; // string = error msg
  interface CsvRow {
    name: string; description: string; address: string;
    lat: string; lng: string; imageUrl: string; outlineImageUrl: string;
    qrUrl: string; category: string; hidden: boolean; published: boolean;
    gallery: string[];
    status: CsvStatus;
  }
  const [csvRows, setCsvRows]         = useState<CsvRow[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let i = 0;
    while (i <= line.length) {
      if (i === line.length) { result.push(''); break; }
      if (line[i] === '"') {
        let field = ''; i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { field += line[i++]; }
        }
        result.push(field);
        if (line[i] === ',') i++;
      } else {
        let field = '';
        while (i < line.length && line[i] !== ',') field += line[i++];
        result.push(field.trim());
        if (line[i] === ',') i++;
      }
    }
    return result;
  }

  const EXPECTED_HEADERS = ['name','description','address','lat','lng','imageUrl','outlineImageUrl','qrUrl','category','hidden','published','gallery'];

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? '';
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim());
      if (lines.length < 2) return;
      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
      const idx = (col: string) => headers.indexOf(col);
      const get = (row: string[], col: string) => row[idx(col)]?.trim() ?? '';
      const parseBool = (v: string, def: boolean) => v === '' ? def : (v === 'true' || v === '1');

      const rows: CsvRow[] = lines.slice(1).map((line) => {
        const cols = parseCsvLine(line);
        return {
          name: get(cols, 'name'),
          description: get(cols, 'description'),
          address: get(cols, 'address'),
          lat: get(cols, 'lat'),
          lng: get(cols, 'lng'),
          imageUrl: get(cols, 'imageurl'),
          outlineImageUrl: get(cols, 'outlineimageurl'),
          qrUrl: get(cols, 'qrurl'),
          category: get(cols, 'category') || 'landmark',
          hidden: parseBool(get(cols, 'hidden'), false),
          published: parseBool(get(cols, 'published'), true),
          gallery: get(cols, 'gallery').split('|').map((u) => u.trim()).filter(Boolean),
          status: 'pending',
        };
      }).filter((r) => r.name || r.qrUrl);
      setCsvRows(rows);
      e.target.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  };

  const runCsvImport = async () => {
    setCsvImporting(true);
    for (let i = 0; i < csvRows.length; i++) {
      if (csvRows[i].status === 'ok') continue;
      setCsvRows((prev) => prev.map((r, idx) => idx === i ? { ...r, status: 'importing' } : r));
      const row = csvRows[i];
      const body = { name: row.name, description: row.description, address: row.address, lat: parseFloat(row.lat), lng: parseFloat(row.lng), imageUrl: row.imageUrl || null, outlineImageUrl: row.outlineImageUrl || null, qrUrl: row.qrUrl, category: row.category, hidden: row.hidden, published: row.published, gallery: row.gallery };
      const res = await fetch('/api/budynki', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify(body) });
      const msg = res.ok ? 'ok' : ((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      setCsvRows((prev) => prev.map((r, idx) => idx === i ? { ...r, status: msg } : r));
    }
    setCsvImporting(false);
    loadBuildings(password);
  };

  const loadBuildings = useCallback(async (pwd: string) => {
    setLoading(true);
    const res = await fetch('/api/budynki', { headers: { 'x-admin-password': pwd } });
    if (res.ok) setBuildings(await res.json());
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async (pwd: string) => {
    const res = await fetch('/api/admin/users', { headers: { 'x-admin-password': pwd } });
    if (res.ok) { const d = await res.json(); setUsers(d.users); setGuestCount(d.guestCount); }
  }, []);

  const loadCategories = useCallback(async (pwd: string) => {
    const res = await fetch('/api/admin/categories', { headers: { 'x-admin-password': pwd } });
    if (res.ok) setCategories(await res.json());
  }, []);

  const loadAchievements = useCallback(async (pwd: string) => {
    const res = await fetch('/api/admin/achievements', { headers: { 'x-admin-password': pwd } });
    if (res.ok) setAchievements(await res.json());
  }, []);

  const loadEasterEggs = useCallback(async (pwd: string) => {
    const res = await fetch('/api/admin/easter-eggs', { headers: { 'x-admin-password': pwd } });
    if (res.ok) setEasterEggs(await res.json());
  }, []);

  const loadContent = useCallback(async () => {
    const [r, p] = await Promise.all([
      fetch('/api/content?key=regulamin').then((x) => x.json()),
      fetch('/api/content?key=polityka-prywatnosci').then((x) => x.json()),
    ]);
    setContentReg(r.html ?? '');
    setContentPol(p.html ?? '');
  }, []);

  const saveContent = async (key: string, html: string) => {
    setContentSaving(key);
    const res = await fetch(`/api/content?key=${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ html }),
    });
    if (res.ok) {
      setContentSaved(key);
      setTimeout(() => setContentSaved(null), 3000);
    }
    setContentSaving(null);
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_pass');
    if (stored) { setPassword(stored); setAuthed(true); loadBuildings(stored); loadUsers(stored); loadContent(); loadCategories(stored); loadAchievements(stored); loadEasterEggs(stored); }
  }, [loadBuildings, loadUsers, loadContent, loadCategories, loadAchievements, loadEasterEggs]);

  const analyticsFetchedRef = useRef(false);
  useEffect(() => {
    if (activeTab === 'analityka' && authed && !analyticsFetchedRef.current) {
      analyticsFetchedRef.current = true;
      fetchAnalytics();
    }
  }, [activeTab, authed, fetchAnalytics]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem('admin_pass', password);
    setAuthed(true);
    loadBuildings(password);
    loadUsers(password);
    loadContent();
    loadCategories(password);
    loadAchievements(password);
    loadEasterEggs(password);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!pickingCoords) return;
    setForm((f) => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
    setPickingCoords(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const body = { ...form, lat: parseFloat(form.lat), lng: parseFloat(form.lng), outlineImageUrl: form.outlineImageUrl || null, gallery: gallery.filter((g) => g.url.trim()) };
    const url    = editingId ? `/api/budynki/${editingId}` : '/api/budynki';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify(body) });
    if (res.ok) {
      setSuccess(editingId ? 'Budynek zaktualizowany!' : 'Budynek dodany!');
      cancelForm(); setTimeout(() => setSuccess(''), 3000);
      loadBuildings(password);
    } else { const err = await res.json(); setFormError(err.error || 'Błąd zapisu'); }
  };

  const fetchAllBuildingTitles = async () => {
    const DELAY_MS = 400;
    const toProcess = buildings
      .map((b) => ({ id: b.id, images: b.images.filter((img) => img.url && !img.title) }))
      .filter((b) => b.images.length > 0);
    const totalImages = toProcess.reduce((s, b) => s + b.images.length, 0);
    if (totalImages === 0) return;
    setBatchProgress({ done: 0, total: totalImages });
    let done = 0;
    for (const { id, images } of toProcess) {
      const building = buildings.find((b) => b.id === id)!;
      const updatedImages = building.images.map((img) => ({ url: img.url, title: img.title ?? '', alt: img.alt ?? '' }));
      for (const img of images) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
        const meta = await fetchWpTitle(img.url);
        if (meta) {
          const idx = updatedImages.findIndex((u) => u.url === img.url);
          if (idx !== -1) { updatedImages[idx] = { ...updatedImages[idx], title: meta.title || updatedImages[idx].title, alt: meta.alt || updatedImages[idx].alt }; }
        }
        done++;
        setBatchProgress({ done, total: totalImages });
      }
      // Save updated gallery back to DB
      await fetch(`/api/budynki/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ gallery: updatedImages }),
      });
      // Update local state
      setBuildings((prev) => prev.map((b) => b.id !== id ? b : {
        ...b,
        images: b.images.map((img) => {
          const u = updatedImages.find((u) => u.url === img.url);
          return u ? { ...img, title: u.title || img.title, alt: u.alt || img.alt } : img;
        }),
      }));
    }
    setBatchProgress(null);
    flash('Tytuły zdjęć zaktualizowane!');
  };

  const fetchAllTitles = async (items: GalleryItem[]) => {
    const updated = [...items];
    const fetching = items.map((_, i) => i);
    setGalleryFetching(items.map(() => true));
    await Promise.all(fetching.map(async (i) => {
      if (!updated[i].url.trim() || updated[i].title) return;
      const meta = await fetchWpTitle(updated[i].url.trim());
      if (meta) { updated[i] = { ...updated[i], title: meta.title || updated[i].title, alt: meta.alt || updated[i].alt }; }
    }));
    setGallery(updated);
    setGalleryFetching(items.map(() => false));
  };

  const handleEdit = (b: Building) => {
    setForm({ name: b.name, description: b.description, address: b.address ?? '', lat: String(b.lat), lng: String(b.lng), imageUrl: b.imageUrl ?? '', outlineImageUrl: b.outlineImageUrl ?? '', qrUrl: b.qrUrl, category: b.category, hidden: b.hidden, published: b.published });
    const items = b.images.map((i) => ({ url: i.url, title: i.title ?? '', alt: i.alt ?? '' }));
    setGallery(items);
    setEditingId(b.id); setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    // Auto-fetch titles for images that don't have one yet
    const missing = items.filter((it) => it.url && !it.title);
    if (missing.length > 0) fetchAllTitles(items);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Usunąć "${name}"?`)) return;
    const res = await fetch(`/api/budynki/${id}`, { method: 'DELETE', headers: { 'x-admin-password': password } });
    if (res.ok) { setBuildings((b) => b.filter((x) => x.id !== id)); flash('Usunięto!'); }
  };

  const handleDeleteUser = async (userId: string, email: string | null) => {
    if (!confirm(`Usunąć "${email ?? userId}" i wszystkie jego odkrycia?`)) return;
    const res = await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify({ userId }) });
    if (res.ok) { setUsers((u) => u.filter((x) => x.userId !== userId)); flash('Użytkownik usunięty'); }
  };

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const downloadCsv = (filename: string, rows: any[]) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v).replace(/"/g, '""');
      return /[",\n\r]/.test(s) ? `"${s}"` : s;
    };
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = filename;
    a.click();
  };

  // ── Category CRUD ────────────────────────────────────────────────────────────
  const cancelCatForm = () => { setCatForm(EMPTY_CAT_FORM); setEditingCatId(null); setShowCatForm(false); setFormError(''); };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    const url    = editingCatId ? `/api/admin/categories/${editingCatId}` : '/api/admin/categories';
    const method = editingCatId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify(catForm) });
    if (res.ok) { flash(editingCatId ? 'Kategoria zaktualizowana!' : 'Kategoria dodana!'); cancelCatForm(); loadCategories(password); }
    else { const err = await res.json(); setFormError(err.error || 'Błąd zapisu'); }
  };

  const handleCatEdit = (c: CategoryEntry) => {
    setCatForm({ value: c.value, label: c.label, icon: c.icon, order: c.order });
    setEditingCatId(c.id); setShowCatForm(true);
  };

  const handleCatDelete = async (id: number, label: string) => {
    if (!confirm(`Usunąć kategorię "${label}"?`)) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE', headers: { 'x-admin-password': password } });
    if (res.ok) { setCategories((prev) => prev.filter((c) => c.id !== id)); flash('Kategoria usunięta'); }
  };

  // ── Achievement CRUD ─────────────────────────────────────────────────────────
  const cancelAchForm = () => { setAchForm(EMPTY_ACH_FORM); setEditingAchId(null); setShowAchForm(false); setFormError(''); };

  const handleAchSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    const body = {
      ...achForm,
      conditionValue: Number(achForm.conditionValue),
      conditionCategory: achForm.conditionCategory || null,
      buildingIds: achForm.buildingIds?.trim() || null,
    };
    const url    = editingAchId ? `/api/admin/achievements/${editingAchId}` : '/api/admin/achievements';
    const method = editingAchId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify(body) });
    if (res.ok) { flash(editingAchId ? 'Osiągnięcie zaktualizowane!' : 'Osiągnięcie dodane!'); cancelAchForm(); loadAchievements(password); }
    else { const err = await res.json(); setFormError(err.error || 'Błąd zapisu'); }
  };

  const handleAchEdit = (a: AchievementEntry) => {
    setAchForm({ name: a.name, description: a.description, icon: a.icon, color: a.color, conditionType: a.conditionType, conditionValue: a.conditionValue, conditionCategory: a.conditionCategory ?? '', buildingIds: a.buildingIds ?? '', order: a.order });
    setEditingAchId(a.id); setShowAchForm(true);
  };

  const handleAchDelete = async (id: number, name: string) => {
    if (!confirm(`Usunąć osiągnięcie "${name}"?`)) return;
    const res = await fetch(`/api/admin/achievements/${id}`, { method: 'DELETE', headers: { 'x-admin-password': password } });
    if (res.ok) { setAchievements((prev) => prev.filter((a) => a.id !== id)); flash('Osiągnięcie usunięte'); }
  };

  // ── Easter Egg CRUD ──────────────────────────────────────────────────────────
  const cancelEggForm = () => { setEggForm(EMPTY_EGG_FORM); setEditingEggId(null); setShowEggForm(false); setFormError(''); };

  const handleEggSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    const body = {
      ...eggForm,
      triggerValue: eggForm.triggerType !== 'building' ? Number(eggForm.triggerValue) : null,
      triggerBuildingId: eggForm.triggerType === 'building' ? Number(eggForm.triggerBuildingId) : null,
      mediaUrl: eggForm.mediaUrl || null,
      description: eggForm.description || null,
    };
    const url    = editingEggId ? `/api/admin/easter-eggs/${editingEggId}` : '/api/admin/easter-eggs';
    const method = editingEggId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify(body) });
    if (res.ok) { flash(editingEggId ? 'Easter egg zaktualizowany!' : 'Easter egg dodany!'); cancelEggForm(); loadEasterEggs(password); }
    else { const err = await res.json(); setFormError(err.error || 'Błąd zapisu'); }
  };

  const handleEggEdit = (egg: EasterEggEntry) => {
    setEggForm({ name: egg.name, title: egg.title, description: egg.description ?? '', mediaType: egg.mediaType, mediaUrl: egg.mediaUrl ?? '', triggerType: egg.triggerType, triggerValue: egg.triggerValue ?? 1, triggerBuildingId: egg.triggerBuildingId?.toString() ?? '', active: egg.active });
    setEditingEggId(egg.id); setShowEggForm(true);
  };

  const handleEggDelete = async (id: number, name: string) => {
    if (!confirm(`Usunąć easter egg "${name}"?`)) return;
    const res = await fetch(`/api/admin/easter-eggs/${id}`, { method: 'DELETE', headers: { 'x-admin-password': password } });
    if (res.ok) { setEasterEggs((prev) => prev.filter((e) => e.id !== id)); flash('Easter egg usunięty'); }
  };

  const cancelForm = () => {
    setForm(EMPTY_FORM); setGallery([]); setEditingId(null); setShowForm(false); setFormError('');
    setShowDms(false); setDmsLat({ d: '', m: '', s: '' }); setDmsLng({ d: '', m: '', s: '' });
  };

  // Convert degrees/minutes/seconds → decimal degrees string
  const dmsToDecimal = (d: string, m: string, s: string): string | null => {
    const deg = parseFloat(d.replace(',', '.'));
    if (isNaN(deg)) return null;
    const min = parseFloat(m.replace(',', '.')) || 0;
    const sec = parseFloat(s.replace(',', '.')) || 0;
    if (min < 0 || min >= 60 || sec < 0 || sec >= 60) return null;
    const abs = Math.abs(deg) + min / 60 + sec / 3600;
    return (deg < 0 ? -abs : abs).toFixed(6);
  };

  const handleDmsChange = (
    field: 'lat' | 'lng',
    part: 'd' | 'm' | 's',
    value: string,
  ) => {
    const next = field === 'lat'
      ? { ...dmsLat, [part]: value }
      : { ...dmsLng, [part]: value };
    if (field === 'lat') setDmsLat(next);
    else setDmsLng(next);
    const decimal = dmsToDecimal(next.d, next.m, next.s);
    if (decimal) setForm((f) => ({ ...f, [field]: decimal }));
  };

  const mapBuildings = buildings.map((b) => ({ id: b.id, name: b.name, lat: b.lat, lng: b.lng, discovered: true }));

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <Lock size={32} className="text-ocean-500 mx-auto mb-2" />
            <h1 className="font-extrabold text-ocean-900 text-xl">Panel Administracyjny</h1>
            <p className="text-gray-400 text-sm mt-1">SpeechFlow – Logopedyczna Gra Terenowa</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="password" placeholder="Hasło administratora" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400" />
            <button type="submit" className="w-full bg-ocean-500 text-white py-3 rounded-2xl font-bold hover:bg-ocean-600 transition">Zaloguj</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Authenticated ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      {/* ── Top bar ── */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-extrabold text-ocean-900 text-lg leading-tight">Panel Admina</h1>
            <p className="text-gray-400 text-xs">
              {buildings.length} budynków · {users.length} kont · {guestCount} gości
            </p>
          </div>
          {/* Tabs inline in header on desktop */}
          <div className="hidden md:flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
            {([
              ['budynki',     <Building2  key="b" size={13} />, 'Budynki'],
              ['uzytkownicy', <Users      key="u" size={13} />, 'Użytkownicy'],
              ['tresci',      <FileText   key="t" size={13} />, 'Treści'],
              ['kategorie',   <Tag        key="k" size={13} />, 'Kategorie'],
              ['osiagniecia', <Trophy     key="o" size={13} />, 'Osiągnięcia'],
              ['easter-eggi', <Egg        key="e" size={13} />, 'Easter Eggi'],
              ['analityka',   <BarChart3  key="a" size={13} />, 'Analityka'],
            ] as [string, React.ReactNode, string][]).map(([tab, icon, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab as typeof activeTab)}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all', activeTab === tab ? 'bg-white text-ocean-600 shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'budynki' && (<>
            <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
            <button
              onClick={fetchAllBuildingTitles}
              disabled={!!batchProgress}
              className="flex items-center gap-2 border border-purple-300 text-purple-600 px-3 py-2 rounded-xl text-sm font-bold hover:bg-purple-50 transition disabled:opacity-50"
              title="Pobierz tytuły zdjęć z metadanych WordPress dla wszystkich budynków"
            >
              {batchProgress
                ? <><div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> {batchProgress.done}/{batchProgress.total}</>
                : 'Pobierz tytuły zdjęć'}
            </button>
            <button onClick={() => csvInputRef.current?.click()}
              className="flex items-center gap-2 border border-ocean-300 text-ocean-600 px-3 py-2 rounded-xl text-sm font-bold hover:bg-ocean-50 transition">
              <Upload size={14} /> Import CSV
            </button>
            <button onClick={() => downloadCsv('budynki.csv', buildings.map(({ images, ...b }) => ({ ...b, gallery: images.map((i) => i.url).join('|') })))}
              className="flex items-center gap-2 border border-ocean-300 text-ocean-600 px-3 py-2 rounded-xl text-sm font-bold hover:bg-ocean-50 transition">
              <Download size={14} /> Eksport CSV
            </button>
            <button onClick={() => { cancelForm(); setShowForm(true); }}
              className="flex items-center gap-2 bg-ocean-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-ocean-600 transition">
              <Plus size={15} /> Dodaj budynek
            </button>
          </>)}
          {activeTab === 'kategorie' && (<>
            <button onClick={() => downloadCsv('kategorie.csv', categories)}
              className="flex items-center gap-2 border border-ocean-300 text-ocean-600 px-3 py-2 rounded-xl text-sm font-bold hover:bg-ocean-50 transition">
              <Download size={14} /> CSV
            </button>
            <button onClick={() => { cancelCatForm(); setShowCatForm(true); }}
              className="flex items-center gap-2 bg-ocean-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-ocean-600 transition">
              <Plus size={15} /> Dodaj kategorię
            </button>
          </>)}
          {activeTab === 'osiagniecia' && (<>
            <button onClick={() => downloadCsv('osiagniecia.csv', achievements)}
              className="flex items-center gap-2 border border-ocean-300 text-ocean-600 px-3 py-2 rounded-xl text-sm font-bold hover:bg-ocean-50 transition">
              <Download size={14} /> CSV
            </button>
            <button onClick={() => { cancelAchForm(); setShowAchForm(true); }}
              className="flex items-center gap-2 bg-ocean-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-ocean-600 transition">
              <Plus size={15} /> Dodaj osiągnięcie
            </button>
          </>)}
          {activeTab === 'easter-eggi' && (
            <button onClick={() => { cancelEggForm(); setShowEggForm(true); }}
              className="flex items-center gap-2 bg-ocean-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-ocean-600 transition">
              <Plus size={15} /> Dodaj easter egg
            </button>
          )}
          <button onClick={() => { sessionStorage.removeItem('admin_pass'); setAuthed(false); }}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition" title="Wyloguj">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Mobile tabs – scrollable */}
      <div className="md:hidden flex bg-gray-100 rounded-xl p-0.5 gap-0.5 mx-4 my-3 shrink-0 overflow-x-auto">
        {([
          ['budynki',     <Building2  key="b" size={12} />, 'Budynki'],
          ['uzytkownicy', <Users      key="u" size={12} />, 'Użytkownicy'],
          ['tresci',      <FileText   key="t" size={12} />, 'Treści'],
          ['kategorie',   <Tag        key="k" size={12} />, 'Kategorie'],
          ['osiagniecia', <Trophy     key="o" size={12} />, 'Osiągnięcia'],
          ['easter-eggi', <Egg        key="e" size={12} />, 'Easter Eggi'],
          ['analityka',   <BarChart3  key="a" size={12} />, 'Analityka'],
        ] as [string, React.ReactNode, string][]).map(([tab, icon, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as typeof activeTab)}
            className={clsx('flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all', activeTab === tab ? 'bg-white text-ocean-600 shadow-sm' : 'text-gray-400')}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Success banner */}
      {success && (
        <div className="mx-4 md:mx-6 mt-0 mb-0 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 shrink-0">
          <Check size={15} /> {success}
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel (list + form) */}
        <aside className="w-full md:w-[420px] lg:w-[480px] overflow-y-auto shrink-0 border-r border-gray-100">

          {/* ── Mobile map ── */}
          <div className="md:hidden mx-4 mt-3 rounded-2xl overflow-hidden shadow-sm">
            <MapComponent buildings={mapBuildings} center={[54.7505, 17.8670]} zoom={13} height="180px" onMapClick={handleMapClick} />
          </div>

          {/* ── CSV import panel ── */}
          {csvRows.length > 0 && (
            <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-ocean-900 text-sm flex items-center gap-2">
                  <Upload size={14} className="text-ocean-400" />
                  Import CSV
                  <span className="text-xs font-normal text-gray-400">({csvRows.length} wierszy)</span>
                </h2>
                <button onClick={() => setCsvRows([])} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>

              {/* legend */}
              <p className="text-xs text-gray-400 mb-2">
                Wymagane: <code className="bg-gray-100 px-1 rounded">name, description, lat, lng, qrUrl</code><br />
                Zdjęcia: <code className="bg-gray-100 px-1 rounded">imageUrl</code> (okładka) &nbsp;·&nbsp;
                <code className="bg-gray-100 px-1 rounded">outlineImageUrl</code> (sylwetka nieodkrytego) &nbsp;·&nbsp;
                <code className="bg-gray-100 px-1 rounded">gallery</code> (URL-e oddzielone <code className="bg-gray-100 px-1 rounded">|</code>)
              </p>

              <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5 text-gray-400 font-semibold w-6">#</th>
                      <th className="text-left px-2 py-1.5 text-gray-400 font-semibold">Nazwa</th>
                      <th className="text-left px-2 py-1.5 text-gray-400 font-semibold">QR URL</th>
                      <th className="text-left px-2 py-1.5 text-gray-400 font-semibold w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-2 py-1 text-gray-300">{i + 1}</td>
                        <td className="px-2 py-1 truncate max-w-[140px]">{row.name || <span className="text-red-400 italic">brak</span>}</td>
                        <td className="px-2 py-1 truncate max-w-[140px] text-gray-400">{row.qrUrl || <span className="text-red-400 italic">brak</span>}</td>
                        <td className="px-2 py-1">
                          {row.status === 'pending'   && <span className="text-gray-300">–</span>}
                          {row.status === 'importing' && <span className="text-ocean-400 animate-pulse">…</span>}
                          {row.status === 'ok'        && <span className="text-green-500 flex items-center gap-1"><Check size={11} /> OK</span>}
                          {row.status !== 'pending' && row.status !== 'importing' && row.status !== 'ok' && (
                            <span className="text-red-400 flex items-center gap-1 truncate" title={row.status}><AlertCircle size={11} /> {row.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={runCsvImport}
                  disabled={csvImporting || csvRows.every((r) => r.status === 'ok')}
                  className="flex items-center gap-2 bg-ocean-500 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-ocean-600 transition"
                >
                  {csvImporting ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Importuję…</> : <><Upload size={13} />Importuj {csvRows.filter((r) => r.status !== 'ok').length} wierszy</>}
                </button>
                {!csvImporting && csvRows.some((r) => r.status === 'ok') && (
                  <span className="text-green-600 text-xs flex items-center gap-1">
                    <Check size={12} /> {csvRows.filter((r) => r.status === 'ok').length} zaimportowano
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Form ── */}
          {showForm && (
            <div ref={formRef} className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-ocean-900">{editingId ? 'Edytuj budynek' : 'Nowy budynek'}</h2>
                <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input required placeholder="Nazwa budynku" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" />
                <div>
                  <p className="text-xs text-gray-400 mb-1 px-1">Opis (widoczny po odkryciu)</p>
                  <RichTextEditor value={form.description} onChange={(html) => setForm((f) => ({ ...f, description: html }))} placeholder="Opis budynku…" />
                </div>
                <input placeholder="Adres (opcjonalnie)" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input" />

                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input">
                  {(categories.length > 0 ? categories : CATEGORIES).map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <input required placeholder="Szer. (lat) np. 54.8287" value={form.lat}
                    onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value.replace(',', '.') }))}
                    className="input" />
                  <input required placeholder="Dług. (lng) np. 18.2101" value={form.lng}
                    onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value.replace(',', '.') }))}
                    className="input" />
                </div>

                {/* DMS converter */}
                <button
                  type="button"
                  onClick={() => setShowDms((v) => !v)}
                  className="text-xs text-ocean-400 hover:text-ocean-600 flex items-center gap-1 px-1"
                >
                  {showDms ? '▲' : '▼'} Wpisz w stopniach/minutach/sekundach (°′″)
                </button>
                {showDms && (
                  <div className="border border-ocean-100 rounded-xl p-3 bg-ocean-50/40 space-y-2 text-xs">
                    <p className="text-gray-400">Wypełnij poniżej — pola Lat/Lng zostaną przeliczone automatycznie.</p>
                    {(['lat', 'lng'] as const).map((field) => {
                      const val = field === 'lat' ? dmsLat : dmsLng;
                      const label = field === 'lat' ? 'Szerokość (N/S)' : 'Długość (E/W)';
                      return (
                        <div key={field}>
                          <p className="text-gray-500 font-semibold mb-1">{label}</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            <div>
                              <label className="text-gray-400 block mb-0.5">Stopnie °</label>
                              <input
                                placeholder="54"
                                value={val.d}
                                onChange={(e) => handleDmsChange(field, 'd', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ocean-400"
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 block mb-0.5">Minuty ′</label>
                              <input
                                placeholder="49"
                                value={val.m}
                                onChange={(e) => handleDmsChange(field, 'm', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ocean-400"
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 block mb-0.5">Sekundy ″</label>
                              <input
                                placeholder="59.08"
                                value={val.s}
                                onChange={(e) => handleDmsChange(field, 's', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ocean-400"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-ocean-500 text-[11px]">
                      Wynik: lat = <strong>{form.lat}</strong> · lng = <strong>{form.lng}</strong>
                    </p>
                  </div>
                )}

                <button type="button" onClick={() => setPickingCoords(true)}
                  className={clsx('w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition flex items-center justify-center gap-2', pickingCoords ? 'bg-ocean-500 text-white border-ocean-500' : 'border-dashed border-ocean-300 text-ocean-500 hover:border-ocean-500')}>
                  <MapPin size={14} />
                  {pickingCoords ? 'Kliknij na mapie po prawej…' : 'Wybierz lokalizację na mapie'}
                </button>

                <input required placeholder="URL kodu QR (np. https://gra.speechflow.org/qr/11)" value={form.qrUrl} onChange={(e) => {
                  const url = e.target.value;
                  const match = /(\d+)\/?$/.exec(url);
                  setForm((f) => ({ ...f, qrUrl: url }));
                }} className="input" />
                <p className="text-xs text-gray-400 px-1">💡 Zeskanuj swój kod QR telefonem i wklej otworzony adres URL tutaj.</p>

                <input placeholder="URL zdjęcia okładkowego (opcjonalnie)" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} className="input" />
                <input placeholder="URL sylwetki (nieodkryte – opcjonalnie)" value={form.outlineImageUrl} onChange={(e) => setForm((f) => ({ ...f, outlineImageUrl: e.target.value }))} className="input" />

                {/* Gallery */}
                <div className="border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ocean-800">
                      <Images size={15} /> Galeria
                      {gallery.length > 0 && <span className="bg-ocean-100 text-ocean-600 text-xs px-1.5 py-0.5 rounded-full">{gallery.length}</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      {gallery.some((g) => g.url && !g.title) && (
                        <button type="button" onClick={() => fetchAllTitles(gallery)} className="flex items-center gap-1 text-xs text-purple-500 font-semibold hover:text-purple-700">
                          Pobierz tytuły
                        </button>
                      )}
                      <button type="button" onClick={() => setGallery((g) => [...g, { url: '', title: '', alt: '' }])} className="flex items-center gap-1 text-xs text-ocean-500 font-semibold hover:text-ocean-700">
                        <Plus size={13} /> Dodaj
                      </button>
                    </div>
                  </div>
                  {gallery.length === 0 && <p className="text-xs text-gray-400 text-center py-1">Brak zdjęć — kliknij Dodaj</p>}
                  {gallery.map((item, i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-2 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <input
                          placeholder={`URL zdjęcia ${i + 1}`}
                          value={item.url}
                          onChange={(e) => setGallery((g) => g.map((it, idx) => idx === i ? { ...it, url: e.target.value } : it))}
                          onBlur={async (e) => {
                            const url = e.target.value.trim();
                            if (!url || item.title) return;
                            setGalleryFetching((f) => { const n = [...f]; n[i] = true; return n; });
                            const meta = await fetchWpTitle(url);
                            setGalleryFetching((f) => { const n = [...f]; n[i] = false; return n; });
                            if (meta) setGallery((g) => g.map((it, idx) => idx === i ? { ...it, title: meta.title || it.title, alt: meta.alt || it.alt } : it));
                          }}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ocean-400 bg-white"
                        />
                        {galleryFetching[i] && <div className="w-3.5 h-3.5 border-2 border-ocean-400 border-t-transparent rounded-full animate-spin shrink-0" />}
                        <button type="button" onClick={() => setGallery((g) => g.filter((_, idx) => idx !== i))} className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 shrink-0"><X size={13} /></button>
                      </div>
                      {item.title && <p className="text-xs text-gray-400 mt-1 px-1 truncate" title={item.title}>{item.title}</p>}
                    </div>
                  ))}
                </div>

                {/* Toggles */}
                <div className="border border-gray-200 rounded-xl p-3 space-y-2.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-ocean-900">Opublikowany</p>
                      <p className="text-xs text-gray-400">Draft nie pojawia się publicznie</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, published: !f.published }))}
                      className={clsx('relative inline-flex w-10 h-6 rounded-full transition-colors duration-200 shrink-0', form.published ? 'bg-ocean-500' : 'bg-gray-300')}
                    >
                      <span className={clsx('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200', form.published ? 'translate-x-4' : 'translate-x-0')} />
                    </button>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-ocean-900">Ukryj na mapie</p>
                      <p className="text-xs text-gray-400">Widoczny dopiero po zeskanowaniu QR</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, hidden: !f.hidden }))}
                      className={clsx('relative inline-flex w-10 h-6 rounded-full transition-colors duration-200 shrink-0', form.hidden ? 'bg-amber-500' : 'bg-gray-300')}
                    >
                      <span className={clsx('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200', form.hidden ? 'translate-x-4' : 'translate-x-0')} />
                    </button>
                  </label>
                </div>

                {formError && <p className="text-red-500 text-sm">{formError}</p>}

                <div className="flex gap-2 pt-1">
                  <button type="submit" className="flex-1 bg-ocean-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-ocean-600 transition">
                    {editingId ? 'Zapisz zmiany' : 'Dodaj budynek'}
                  </button>
                  <button type="button" onClick={cancelForm} className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50">Anuluj</button>
                </div>
              </form>
            </div>
          )}

          {/* ── BUDYNKI list ── */}
          {activeTab === 'budynki' && (
            <div className="px-4 py-4">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-ocean-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {buildings.map((b) => (
                    <div key={b.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-ocean-50 shrink-0">
                        {b.imageUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xl">🏛️</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-ocean-900 text-sm truncate">{b.name}</p>
                          {!b.published && <span className="shrink-0 text-[10px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">draft</span>}
                          {b.hidden && <span className="shrink-0 text-[10px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">ukryty</span>}
                        </div>
                        <p className="text-gray-400 text-xs truncate">{b.qrUrl}</p>
                        <p className="text-gray-300 text-xs">{b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                          {b.images.length > 0 && <span className="text-ocean-400 ml-1.5"><Images size={10} className="inline" /> {b.images.length}</span>}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleEdit(b)} className="p-1.5 rounded-lg bg-ocean-50 text-ocean-500 hover:bg-ocean-100 transition"><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(b.id, b.name)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                  {buildings.length === 0 && !loading && (
                    <div className="text-center py-10 text-gray-400 text-sm">Brak budynków — kliknij &quot;Dodaj budynek&quot;</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── UŻYTKOWNICY list ── */}
          {activeTab === 'uzytkownicy' && (
            <div className="px-4 py-4">
              <div className="bg-white rounded-xl px-4 py-2.5 mb-3 text-xs text-gray-500 flex gap-4 shadow-sm items-center">
                <span><strong className="text-ocean-700">{users.length}</strong> zarejestrowanych</span>
                <span><strong className="text-green-600">{users.filter((u) => u.emailVerified).length}</strong> zweryfikowanych</span>
                <span><strong className="text-gray-400">{guestCount}</strong> gości</span>
                <button
                  className="ml-auto flex items-center gap-1.5 bg-ocean-50 hover:bg-ocean-100 text-ocean-700 font-semibold px-3 py-1.5 rounded-lg transition"
                  onClick={() => {
                    const rows = ['email,nickname,city,registeredAt,emailVerified,discoveries'];
                    users.filter((u) => u.email).forEach((u) => {
                      rows.push([u.email, u.nickname, u.city, u.registeredAt, u.emailVerified, u.discoveryCount]
                        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
                        .join(','));
                    });
                    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `speechflow-users-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download size={13} />
                  Eksportuj CSV
                </button>
              </div>

              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.userId} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-ocean-100 shrink-0">
                      {u.avatarUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Users size={16} className="text-ocean-400" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-ocean-900 text-sm truncate">{u.nickname ?? <span className="text-gray-400 font-normal italic">Bez pseudonimu</span>}</p>
                        {u.emailVerified ? <CheckCircle size={12} className="text-green-500 shrink-0" /> : <XCircle size={12} className="text-orange-400 shrink-0" />}
                      </div>
                      <p className="text-gray-400 text-xs truncate">{u.email ?? '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {u.city && <span className="text-gray-300 text-xs">{u.city}</span>}
                        <span className="text-ocean-500 text-xs font-semibold">{u.discoveryCount} odkryć</span>
                        <span className="text-gray-300 text-xs">{new Date(u.registeredAt).toLocaleDateString('pl')}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteUser(u.userId, u.email)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition shrink-0"><Trash2 size={14} /></button>
                  </div>
                ))}
                {users.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">Brak zarejestrowanych użytkowników</div>}
              </div>
            </div>
          )}

          {/* ── OSIĄGNIĘCIA ── */}
          {activeTab === 'osiagniecia' && (
            <div className="px-4 py-4 space-y-4">
              {showAchForm && (
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-ocean-900">{editingAchId ? 'Edytuj osiągnięcie' : 'Nowe osiągnięcie'}</h2>
                    <button onClick={cancelAchForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleAchSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Ikona (emoji)</label>
                        <input placeholder="🏆" value={achForm.icon} onChange={(e) => setAchForm((f) => ({ ...f, icon: e.target.value }))} className="input text-2xl text-center" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Kolor (hex)</label>
                        <div className="flex gap-2 items-center">
                          <input type="color" value={achForm.color} onChange={(e) => setAchForm((f) => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                          <input value={achForm.color} onChange={(e) => setAchForm((f) => ({ ...f, color: e.target.value }))} className="input flex-1 font-mono text-xs" />
                        </div>
                      </div>
                    </div>
                    <input required placeholder="Nazwa osiągnięcia" value={achForm.name} onChange={(e) => setAchForm((f) => ({ ...f, name: e.target.value }))} className="input" />
                    <textarea placeholder="Opis (widoczny dla gracza)" rows={2} value={achForm.description} onChange={(e) => setAchForm((f) => ({ ...f, description: e.target.value }))} className="input resize-none" />

                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Warunek odblokowania</label>
                      <select value={achForm.conditionType} onChange={(e) => setAchForm((f) => ({ ...f, conditionType: e.target.value }))} className="input">
                        {CONDITION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>

                    {achForm.conditionType !== 'total_all' && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Wymagana liczba (N)</label>
                        <input type="number" min={1} value={achForm.conditionValue} onChange={(e) => setAchForm((f) => ({ ...f, conditionValue: Number(e.target.value) }))} className="input" />
                      </div>
                    )}

                    {achForm.conditionType === 'category_count' && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Kategoria</label>
                        <select value={achForm.conditionCategory} onChange={(e) => setAchForm((f) => ({ ...f, conditionCategory: e.target.value }))} className="input">
                          <option value="">— wybierz —</option>
                          {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                    )}

                    {achForm.conditionType === 'building_set' && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">IDs budynków (JSON, np. [1,2,3])</label>
                        <textarea rows={2} placeholder='[43, 44, 45]' value={achForm.buildingIds} onChange={(e) => setAchForm((f) => ({ ...f, buildingIds: e.target.value }))} className="input font-mono text-xs resize-none" />
                        <p className="text-xs text-gray-400 mt-1">Wymagana liczba N powyżej — użytkownik musi odkryć N budynków z tej listy</p>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Kolejność na liście</label>
                      <input type="number" value={achForm.order} onChange={(e) => setAchForm((f) => ({ ...f, order: Number(e.target.value) }))} className="input" />
                    </div>

                    {/* Preview */}
                    <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                      <p className="text-xs text-gray-400 mb-2">Podgląd odznaki</p>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ background: `${achForm.color}22` }}>
                          {achForm.icon || '🏆'}
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: achForm.color }}>{achForm.name || 'Nazwa osiągnięcia'}</p>
                          <p className="text-gray-400 text-xs">{achForm.description || 'Opis osiągnięcia'}</p>
                        </div>
                      </div>
                    </div>

                    {formError && <p className="text-red-500 text-sm">{formError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button type="submit" className="flex-1 bg-ocean-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-ocean-600 transition">
                        {editingAchId ? 'Zapisz zmiany' : 'Dodaj osiągnięcie'}
                      </button>
                      <button type="button" onClick={cancelAchForm} className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50">Anuluj</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-2">
                {achievements.map((a) => (
                  <div key={a.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0" style={{ background: `${a.color}22` }}>{a.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: a.color }}>{a.name}</p>
                      <p className="text-gray-400 text-xs truncate">{a.description}</p>
                      <p className="text-gray-300 text-xs mt-0.5">
                        {a.conditionType === 'total_count'        && `Odkryj ≥ ${a.conditionValue} miejsc`}
                        {a.conditionType === 'total_all'          && 'Odkryj wszystkie miejsca'}
                        {a.conditionType === 'category_count'     && `Kat. "${a.conditionCategory}" ≥ ${a.conditionValue}`}
                        {a.conditionType === 'building_set'       && `${a.conditionValue} z ${JSON.parse(a.buildingIds ?? '[]').length} budynków`}
                        {a.conditionType === 'days_active'        && `Aktywność przez ${a.conditionValue} dni`}
                        {a.conditionType === 'all_in_one_day'     && 'Wszystkie w 1 dzień'}
                        {a.conditionType === 'return_after_break' && 'Powrót po 7+ dniach przerwy'}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleAchEdit(a)} className="p-1.5 rounded-lg bg-ocean-50 text-ocean-500 hover:bg-ocean-100 transition"><Edit3 size={14} /></button>
                      <button onClick={() => handleAchDelete(a.id, a.name)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
                {achievements.length === 0 && (
                  <div className="text-center py-10 text-gray-400 text-sm">Brak osiągnięć — kliknij &quot;Dodaj osiągnięcie&quot;</div>
                )}
              </div>
            </div>
          )}

          {/* ── KATEGORIE ── */}
          {activeTab === 'kategorie' && (
            <div className="px-4 py-4 space-y-4">
              {showCatForm && (
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-ocean-900">{editingCatId ? 'Edytuj kategorię' : 'Nowa kategoria'}</h2>
                    <button onClick={cancelCatForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleCatSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Ikona (emoji)</label>
                        <input placeholder="🏖️" value={catForm.icon} onChange={(e) => setCatForm((f) => ({ ...f, icon: e.target.value }))} className="input text-2xl text-center" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Kolejność</label>
                        <input type="number" value={catForm.order} onChange={(e) => setCatForm((f) => ({ ...f, order: Number(e.target.value) }))} className="input" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Identyfikator (np. beach)</label>
                      <input required placeholder="beach" value={catForm.value} onChange={(e) => setCatForm((f) => ({ ...f, value: e.target.value.toLowerCase().replace(/\s/g, '_') }))} className="input font-mono" disabled={!!editingCatId} />
                      {editingCatId && <p className="text-xs text-gray-400 mt-1">Identyfikator nie może być zmieniany po utworzeniu</p>}
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Etykieta (np. 🏖️ Plaża)</label>
                      <input required placeholder="🏖️ Plaża" value={catForm.label} onChange={(e) => setCatForm((f) => ({ ...f, label: e.target.value }))} className="input" />
                    </div>
                    {formError && <p className="text-red-500 text-sm">{formError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button type="submit" className="flex-1 bg-ocean-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-ocean-600 transition">
                        {editingCatId ? 'Zapisz zmiany' : 'Dodaj kategorię'}
                      </button>
                      <button type="button" onClick={cancelCatForm} className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50">Anuluj</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-2">
                {categories.map((c) => (
                  <div key={c.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-ocean-50 flex items-center justify-center text-xl shrink-0">{c.icon || '🏷️'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ocean-900 text-sm">{c.label}</p>
                      <p className="text-gray-400 text-xs font-mono">{c.value} · kolejność: {c.order}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleCatEdit(c)} className="p-1.5 rounded-lg bg-ocean-50 text-ocean-500 hover:bg-ocean-100 transition"><Edit3 size={14} /></button>
                      <button onClick={() => handleCatDelete(c.id, c.label)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="text-center py-10 text-gray-400 text-sm">Brak kategorii — kliknij &quot;Dodaj kategorię&quot;</div>
                )}
              </div>
            </div>
          )}

          {/* ── EASTER EGGI ── */}
          {activeTab === 'easter-eggi' && (
            <div className="px-4 py-4">
              {showEggForm && (
                <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
                  <h3 className="font-bold text-ocean-900 text-sm mb-3">{editingEggId ? 'Edytuj easter egg' : 'Nowy easter egg'}</h3>
                  <form onSubmit={handleEggSubmit} className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nazwa wewnętrzna (tylko dla admina)</label>
                      <input required placeholder="np. Sekret plażowicza" value={eggForm.name} onChange={(e) => setEggForm((f) => ({ ...f, name: e.target.value }))} className="input" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tytuł (widoczny dla użytkownika)</label>
                      <input required placeholder="np. Znalazłeś ukrytą perełkę!" value={eggForm.title} onChange={(e) => setEggForm((f) => ({ ...f, title: e.target.value }))} className="input" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Opis (opcjonalny)</label>
                      <textarea rows={2} placeholder="Dodatkowy tekst pokazywany w popupie…" value={eggForm.description} onChange={(e) => setEggForm((f) => ({ ...f, description: e.target.value }))} className="input resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Typ mediów</label>
                        <select value={eggForm.mediaType} onChange={(e) => setEggForm((f) => ({ ...f, mediaType: e.target.value }))} className="input">
                          <option value="none">Brak</option>
                          <option value="image">Zdjęcie</option>
                          <option value="video">Wideo</option>
                          <option value="audio">Audio</option>
                        </select>
                      </div>
                      {eggForm.mediaType !== 'none' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">URL mediów</label>
                          <input placeholder="https://…" value={eggForm.mediaUrl} onChange={(e) => setEggForm((f) => ({ ...f, mediaUrl: e.target.value }))} className="input" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Wyzwalacz</label>
                      <select value={eggForm.triggerType} onChange={(e) => setEggForm((f) => ({ ...f, triggerType: e.target.value }))} className="input">
                        {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    {eggForm.triggerType !== 'building' && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          {eggForm.triggerType === 'discovery_count' ? 'Liczba odkryć (N)' : 'Co każde N odkrycie'}
                        </label>
                        <input type="number" min={1} required value={eggForm.triggerValue} onChange={(e) => setEggForm((f) => ({ ...f, triggerValue: Number(e.target.value) }))} className="input" />
                      </div>
                    )}
                    {eggForm.triggerType === 'building' && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Budynek (ID lub wybierz z listy)</label>
                        <select value={eggForm.triggerBuildingId} onChange={(e) => setEggForm((f) => ({ ...f, triggerBuildingId: e.target.value }))} className="input">
                          <option value="">— wybierz budynek —</option>
                          {buildings.map((b) => <option key={b.id} value={b.id}>{b.id}: {b.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="eggActive" checked={eggForm.active} onChange={(e) => setEggForm((f) => ({ ...f, active: e.target.checked }))} className="rounded" />
                      <label htmlFor="eggActive" className="text-xs text-gray-600">Aktywny</label>
                    </div>
                    {formError && <p className="text-red-500 text-sm">{formError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button type="submit" className="flex-1 bg-ocean-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-ocean-600 transition">
                        {editingEggId ? 'Zapisz zmiany' : 'Dodaj easter egg'}
                      </button>
                      <button type="button" onClick={cancelEggForm} className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50">Anuluj</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-2">
                {easterEggs.map((egg) => (
                  <div key={egg.id} className="bg-white rounded-xl shadow-sm p-3 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl shrink-0">🥚</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-ocean-900 text-sm">{egg.name}</p>
                        {!egg.active && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-bold">nieaktywny</span>}
                      </div>
                      <p className="text-gray-500 text-xs truncate">{egg.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {egg.triggerType === 'discovery_count' && `Wyzwalacz: po ${egg.triggerValue} odkryciach`}
                        {egg.triggerType === 'every_n'         && `Wyzwalacz: co ${egg.triggerValue}. odkrycie`}
                        {egg.triggerType === 'building'        && `Wyzwalacz: budynek #${egg.triggerBuildingId}`}
                        {egg.mediaType !== 'none' && ` · ${egg.mediaType}`}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleEggEdit(egg)} className="p-1.5 rounded-lg bg-ocean-50 text-ocean-500 hover:bg-ocean-100 transition"><Edit3 size={14} /></button>
                      <button onClick={() => handleEggDelete(egg.id, egg.name)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
                {easterEggs.length === 0 && !showEggForm && (
                  <div className="text-center py-10 text-gray-400 text-sm">Brak easter eggów — kliknij &quot;Dodaj easter egg&quot;</div>
                )}
              </div>
            </div>
          )}

          {/* ── ANALITYKA ── */}
          {activeTab === 'analityka' && (
            <div className="px-4 py-4 space-y-4">
              {analyticsLoading && (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-ocean-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!analyticsLoading && analytics && (() => {
                const { totals, series, topBuildings, topPaths } = analytics;

                function BarChart({ data, color }: { data: Record<string,number>; color: string }) {
                  const entries = Object.entries(data);
                  const max = Math.max(...entries.map(([,v]) => v), 1);
                  const H = 64;
                  return (
                    <svg viewBox={`0 0 ${entries.length * 9} ${H + 14}`} className="w-full" preserveAspectRatio="none" style={{ height: 80 }}>
                      {entries.map(([date, val], i) => {
                        const h = Math.round((val / max) * H);
                        const x = i * 9;
                        const isMonday = new Date(date).getDay() === 1;
                        return (
                          <g key={date}>
                            <rect x={x + 1} y={H - h} width={7} height={h} fill={color} rx={1.5} opacity={0.85} />
                            {isMonday && <line x1={x} y1={0} x2={x} y2={H} stroke="#e5e7eb" strokeWidth={0.5} />}
                          </g>
                        );
                      })}
                    </svg>
                  );
                }

                return (
                  <>
                    {/* Metric cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { icon: <QrCode size={18} className="text-ocean-500"/>, label: 'Skanowania łącznie', value: totals.discoveries },
                        { icon: <QrCode size={18} className="text-green-500"/>, label: 'Skanowania dziś', value: totals.scansToday },
                        { icon: <Eye size={18} className="text-purple-500"/>, label: 'Odsłony dziś', value: totals.viewsToday },
                        { icon: <Users size={18} className="text-ocean-500"/>, label: 'Użytkownicy łącznie', value: totals.users },
                        { icon: <UserCheck size={18} className="text-green-500"/>, label: 'Aktywni (7 dni)', value: totals.activeUsers7 },
                        { icon: <Eye size={18} className="text-gray-400"/>, label: 'Odsłony łącznie', value: totals.pageViews },
                      ].map(({ icon, label, value }) => (
                        <div key={label} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">{icon}</div>
                          <div>
                            <p className="text-2xl font-extrabold text-ocean-900 leading-none">{value.toLocaleString('pl-PL')}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-bold text-ocean-900">Skanowania — ostatnie 30 dni</p>
                          <button onClick={fetchAnalytics} className="text-xs text-ocean-400 hover:text-ocean-600">Odśwież</button>
                        </div>
                        <BarChart data={series.discoveries} color="#0F5F92" />
                        <p className="text-xs text-gray-400 mt-1 text-right">Pionowe linie = poniedziałki</p>
                      </div>
                      <div className="bg-white rounded-2xl shadow-sm p-4">
                        <p className="text-sm font-bold text-ocean-900 mb-3">Odsłony stron — ostatnie 30 dni</p>
                        <BarChart data={series.pageViews} color="#8b5cf6" />
                      </div>
                      <div className="bg-white rounded-2xl shadow-sm p-4">
                        <p className="text-sm font-bold text-ocean-900 mb-3">Rejestracje — ostatnie 30 dni</p>
                        <BarChart data={series.registrations} color="#10b981" />
                      </div>
                    </div>

                    {/* Top buildings */}
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                      <p className="text-sm font-bold text-ocean-900 mb-3">Top 10 najczęściej skanowanych budynków</p>
                      <div className="space-y-2">
                        {topBuildings.map((b, i) => {
                          const pct = Math.round((b.count / (topBuildings[0]?.count || 1)) * 100);
                          return (
                            <div key={b.buildingId} className="flex items-center gap-3">
                              <span className="w-5 text-xs font-bold text-gray-400 text-right shrink-0">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-ocean-800 truncate">
                                  {b.number != null ? `${b.number}. ` : ''}{b.name}
                                </p>
                                <div className="mt-0.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-ocean-400 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                              <span className="text-xs font-bold text-ocean-600 shrink-0">{b.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Top pages */}
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                      <p className="text-sm font-bold text-ocean-900 mb-3">Top 10 stron (ostatnie 30 dni)</p>
                      <div className="space-y-2">
                        {topPaths.map((p, i) => {
                          const pct = Math.round((p.count / (topPaths[0]?.count || 1)) * 100);
                          return (
                            <div key={p.path} className="flex items-center gap-3">
                              <span className="w-5 text-xs font-bold text-gray-400 text-right shrink-0">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono text-gray-600 truncate">{p.path}</p>
                                <div className="mt-0.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-purple-400 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                              <span className="text-xs font-bold text-purple-600 shrink-0">{p.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ── TREŚCI ── */}
          {activeTab === 'tresci' && (
            <div className="px-4 py-4 space-y-6">
              {/* Regulamin */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-ocean-900 text-sm flex items-center gap-2"><FileText size={15} className="text-ocean-400" /> Regulamin</h3>
                  {contentSaved === 'regulamin' && <span className="text-green-600 text-xs flex items-center gap-1"><Check size={12} /> Zapisano</span>}
                </div>
                <textarea
                  value={contentReg}
                  onChange={(e) => setContentReg(e.target.value)}
                  rows={12}
                  placeholder="Wklej tu treść regulaminu (HTML lub zwykły tekst)…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ocean-400 resize-y"
                />
                <button
                  onClick={() => saveContent('regulamin', contentReg)}
                  disabled={contentSaving === 'regulamin'}
                  className="mt-2 flex items-center gap-2 bg-ocean-500 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-60"
                >
                  <Save size={12} /> {contentSaving === 'regulamin' ? 'Zapisuję…' : 'Zapisz regulamin'}
                </button>
              </div>

              {/* Polityka prywatności */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-ocean-900 text-sm flex items-center gap-2"><FileText size={15} className="text-ocean-400" /> Polityka prywatności</h3>
                  {contentSaved === 'polityka-prywatnosci' && <span className="text-green-600 text-xs flex items-center gap-1"><Check size={12} /> Zapisano</span>}
                </div>
                <textarea
                  value={contentPol}
                  onChange={(e) => setContentPol(e.target.value)}
                  rows={12}
                  placeholder="Wklej tu treść polityki prywatności (HTML lub zwykły tekst)…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ocean-400 resize-y"
                />
                <button
                  onClick={() => saveContent('polityka-prywatnosci', contentPol)}
                  disabled={contentSaving === 'polityka-prywatnosci'}
                  className="mt-2 flex items-center gap-2 bg-ocean-500 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-60"
                >
                  <Save size={12} /> {contentSaving === 'polityka-prywatnosci' ? 'Zapisuję…' : 'Zapisz politykę'}
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* ── Right panel: large map (desktop only) ── */}
        <main className="hidden md:block flex-1 relative">
          {pickingCoords && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-ocean-600 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
              <MapPin size={15} /> Kliknij na mapie, żeby wybrać lokalizację
            </div>
          )}
          <MapComponent
            buildings={mapBuildings}
            center={[54.7505, 17.8670]}
            zoom={14}
            height="100%"
            onMapClick={handleMapClick}
          />
        </main>
      </div>
    </div>
  );
}
