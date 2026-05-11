'use client';

import { useEffect, useRef } from 'react';

export interface MapBuilding {
  id: number;
  name: string;
  lat: number;
  lng: number;
  discovered?: boolean;
  isActive?: boolean;
  imageUrl?: string | null;
  outlineImageUrl?: string | null;
}

export interface MapPlayer {
  userId: string;
  nickname: string | null;
  avatarUrl: string | null;
  lastLat: number;
  lastLng: number;
}

export interface MapHandle {
  panTo: (lat: number, lng: number, zoom?: number) => void;
  openBuilding: (id: number) => void;
  /** Update (or create) the user-location dot. Call from watchPosition success callback. */
  updateUserMarker: (lat: number, lng: number, avatarUrl?: string | null) => void;
}

interface Props {
  buildings: MapBuilding[];
  players?: MapPlayer[];
  center?: [number, number];
  zoom?: number;
  onBuildingClick?: (id: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
  showUserLocation?: boolean;
  interactive?: boolean;
  userAvatarUrl?: string | null;
  onMapReady?: (handle: MapHandle) => void;
  onUserLocation?: (lat: number, lng: number) => void;
}

const MAP_DEFAULT_CENTER: [number, number] = [54.828701688893595, 18.210140614060844];
const LOGO_URL = '/icons/speechflow-logo.png';

function getScale(zoom: number): number {
  // At zoom 15 → 0.65 · At zoom 16 → 0.80 · At zoom 18 → 1.00 · At zoom 21 → 1.50
  return Math.max(0.45, Math.min(1.8, Math.pow(1.22, zoom - 18)));
}

// ── Pin builders ─────────────────────────────────────────────────────────────

function dropShadow(opacity = 0.4) {
  return `drop-shadow(0 3px 8px rgba(0,0,0,${opacity}))`;
}

function photoCircle(src: string, sz: number, ring: string, ringW: number, grayscale = false) {
  return `
    <div style="
      width:${sz}px;height:${sz}px;border-radius:50%;overflow:hidden;
      outline:${ringW}px solid white;
      border:${ringW}px solid ${ring};
      box-sizing:border-box;background:#ccc;
      ${grayscale ? 'filter:grayscale(1) brightness(0.9);' : ''}
    ">
      <img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block;" />
    </div>`;
}

function svgPointer(color: string, w: number) {
  const hw = w / 2;
  return `<svg width="${w}" height="${Math.round(w * 0.65)}" viewBox="0 0 ${w} ${Math.round(w * 0.65)}" style="display:block;margin-top:-1px;overflow:visible">
    <path d="M0,0 Q${hw},${Math.round(w * 0.65)} ${w},0" fill="${color}" />
  </svg>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeIcon(L: any, b: MapBuilding, scale: number) {
  let html: string;
  let iconSize: [number, number];
  let iconAnchor: [number, number];

  if (b.isActive) {
    const sz  = Math.round(36 * scale);
    const tip = Math.round(11 * scale);
    const tipH = Math.round(7 * scale);
    const rw  = Math.max(2, Math.round(3 * scale));
    // Always show the logo (or building photo if available)
    const src = b.imageUrl ?? LOGO_URL;
    html = `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:${dropShadow(0.5)}">
      ${photoCircle(src, sz, '#F0A500', rw)}
      ${svgPointer('#F0A500', tip)}
    </div>`;
    iconSize   = [sz + 6, sz + tipH + 4];
    iconAnchor = [Math.round((sz + 6) / 2), sz + tipH + 4];

  } else if (b.discovered) {
    const sz  = Math.round(30 * scale);
    const tip = Math.round(10 * scale);
    const tipH = Math.round(6 * scale);
    const rw  = Math.max(1, Math.round(2 * scale));
    const src = b.imageUrl;
    const body = src
      ? photoCircle(src, sz, '#00C4D4', rw)
      : `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:#00C4D4;
           outline:${rw}px solid white;box-sizing:border-box;
           display:flex;align-items:center;justify-content:center;font-size:${Math.round(13 * scale)}px;color:white;font-weight:bold;">✓</div>`;
    html = `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:${dropShadow(0.35)}">
      ${body}
      ${svgPointer('#00C4D4', tip)}
    </div>`;
    iconSize   = [sz + 6, sz + tipH + 4];
    iconAnchor = [Math.round((sz + 6) / 2), sz + tipH + 4];

  } else {
    const sz  = Math.round(26 * scale);
    const tip = Math.round(8 * scale);
    const tipH = Math.round(5 * scale);
    const rw  = Math.max(1, Math.round(1.5 * scale));
    const src = b.outlineImageUrl ?? b.imageUrl;
    const body = src
      ? photoCircle(src, sz, '#9CA3AF', rw, true)
      : `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:#00C4D4;
           outline:${rw}px solid white;border:${rw}px solid #00C4D4;box-sizing:border-box;
           display:flex;align-items:center;justify-content:center;overflow:hidden;">
           <img src="${LOGO_URL}" style="width:70%;height:70%;object-fit:contain;display:block;filter:brightness(0) invert(1);opacity:0.7;" />
         </div>`;
    html = `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:${dropShadow(0.2)};opacity:0.85">
      ${body}
      ${svgPointer('#9CA3AF', tip)}
    </div>`;
    iconSize   = [sz + 6, sz + tipH + 4];
    iconAnchor = [Math.round((sz + 6) / 2), sz + tipH + 4];
  }

  return L.divIcon({ html, iconSize, iconAnchor, className: '' });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MapComponent({
  buildings,
  players = [],
  center = MAP_DEFAULT_CENTER,
  zoom = 17,
  onBuildingClick,
  onMapClick,
  height = '400px',
  showUserLocation = false,
  interactive = true,
  userAvatarUrl: _userAvatarUrlRaw,
  onMapReady,
  onUserLocation,
}: Props) {
  // Never pass blob: URLs into Leaflet HTML strings — they can be revoked and crash marker rendering
  const userAvatarUrl = _userAvatarUrlRaw?.startsWith('blob:') ? null : _userAvatarUrlRaw;

  const containerRef        = useRef<HTMLDivElement>(null);
  const mapRef              = useRef<import('leaflet').Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef          = useRef<{ marker: any; building: MapBuilding }[]>([]);
  // Ref to the add-markers function; set once Leaflet has loaded
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addMarkersRef       = useRef<((b: MapBuilding[]) => void) | null>(null);
  // Always reflects the latest buildings array, used inside Leaflet async closure
  const buildingsRef        = useRef(buildings);
  // Always reflects the latest onBuildingClick, used inside marker handlers
  const onBuildingClickRef  = useRef(onBuildingClick);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerMarkersRef    = useRef<Map<string, any>>(new Map());
  const playersRef          = useRef(players);

  // Keep refs in sync with props
  useEffect(() => { buildingsRef.current = buildings; }, [buildings]);
  useEffect(() => { onBuildingClickRef.current = onBuildingClick; }, [onBuildingClick]);
  useEffect(() => { playersRef.current = players; }, [players]);

  // Re-add building markers whenever the buildings array changes (covers the case where
  // the Leaflet chunk was already cached and the effect ran before the API responded)
  useEffect(() => {
    addMarkersRef.current?.(buildings);
  }, [buildings]);

  // Update player markers whenever players array changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import('leaflet').then((L) => {
      const seen = new Set<string>();

      for (const p of players) {
        seen.add(p.userId);
        const initials = (p.nickname ?? '?').slice(0, 2).toUpperCase();
        const avatar = p.avatarUrl && !p.avatarUrl.startsWith('blob:') ? p.avatarUrl : null;
        const html = `<div style="
          width:32px;height:32px;border-radius:6px;overflow:hidden;
          border:2.5px solid #22c55e;background:#fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;color:#15803d;
        ">${avatar
          ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
          : initials
        }</div>`;
        const icon = L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });

        if (playerMarkersRef.current.has(p.userId)) {
          const m = playerMarkersRef.current.get(p.userId);
          m.setLatLng([p.lastLat, p.lastLng]);
          m.setIcon(icon);
        } else {
          const m = L.marker([p.lastLat, p.lastLng], { icon, zIndexOffset: 50 }).addTo(map);
          playerMarkersRef.current.set(p.userId, m);
        }
      }

      // Remove stale markers
      Array.from(playerMarkersRef.current.entries()).forEach(([uid, m]) => {
        if (!seen.has(uid)) { m.remove(); playerMarkersRef.current.delete(uid); }
      });
    });
  }, [players]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (!containerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapOptions: any = {
        zoomControl: false,
        dragging:        interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom:       interactive,
        keyboard:        interactive,
        tap:             interactive,
      };
      const map = L.map(containerRef.current, mapOptions).setView(center, zoom);
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        maxNativeZoom: 19,
        maxZoom: 21,
        subdomains: 'abcd',
      }).addTo(map);

      if (onMapClick) {
        map.on('click', (e) => onMapClick(e.latlng.lat, e.latlng.lng));
      }

      // ── Marker management ────────────────────────────────────────────────────
      // Define addMarkers here so it can reference L and map, then register it
      // on addMarkersRef so the buildings-change effect can call it anytime.
      const addMarkers = (bs: MapBuilding[]) => {
        // Remove all existing building markers from the Leaflet layer first
        markersRef.current.forEach(({ marker }) => marker.remove());
        markersRef.current = [];

        const scale = getScale(map.getZoom());
        bs.forEach((b) => {
          const icon   = makeIcon(L, b, scale);
          const marker = L.marker([b.lat, b.lng], { icon }).addTo(map);

          if (onBuildingClickRef.current) {
            marker.on('click', (e: unknown) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              L.DomEvent.stopPropagation(e as any);
              onBuildingClickRef.current!(b.id);
            });
          } else {
            marker.bindPopup(
              `<strong style="font-family:Kanit,sans-serif">${b.name}</strong>` +
              (b.discovered ? '<br/><span style="color:#00C4D4;font-size:12px">✓ Odkryty</span>' : ''),
            );
          }
          markersRef.current.push({ marker, building: b });
        });
      };

      // Register so the buildings-change effect can call addMarkers after init
      addMarkersRef.current = addMarkers;

      // Initial population — use buildingsRef.current (not the stale closure value)
      // because Leaflet loads asynchronously and buildings may have already arrived
      // from the API by the time this .then() fires.
      addMarkers(buildingsRef.current);

      // Rescale markers on zoom change
      map.on('zoomend', () => {
        const scale = getScale(map.getZoom());
        markersRef.current.forEach(({ marker, building }) => {
          marker.setIcon(makeIcon(L, building, scale));
        });
      });

      // ── User-location dot ────────────────────────────────────────────────────
      // GPS tracking lives in page.tsx (direct onClick = iOS user gesture).
      // MapComponent only renders the dot when told to via updateUserMarker().
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let userMarker: any = null;
      let firstFix = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buildUserIcon = (avatarUrl?: string | null) => {
        const inner = avatarUrl
          ? `<div style="width:28px;height:28px;border-radius:50%;overflow:hidden;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);background:#ddd">
               <img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" />
             </div>`
          : `<div style="width:28px;height:28px;border-radius:50%;background:#4A90E2;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
               </svg>
             </div>`;
        return L.divIcon({
          html: `<div style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.3))">${inner}</div>`,
          iconSize: [28, 28], iconAnchor: [14, 14], className: '',
        });
      };

      // Expose imperative handle via callback — works reliably through dynamic()
      if (onMapReady) {
        onMapReady({
          panTo(lat, lng, z) {
            const c = map.getCenter();
            const dLat = lat - c.lat;
            const dLng = lng - c.lng;
            const approxKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;

            if (approxKm < 0.3) {
              map.panTo([lat, lng], { animate: true, duration: 0.3 });
            } else if (approxKm < 2) {
              map.flyTo([lat, lng], z ?? map.getZoom(), { duration: 0.5 });
            } else {
              map.flyTo([lat, lng], z ?? 15, { duration: 1.1 });
            }
          },
          openBuilding(id) {
            const entry = markersRef.current.find((e) => e.building.id === id);
            if (entry) {
              if (onBuildingClickRef.current) {
                onBuildingClickRef.current(id);
              } else {
                entry.marker.openPopup?.();
              }
            }
          },
          updateUserMarker(lat, lng, avatarUrl) {
            try {
              if (!userMarker) {
                userMarker = L.marker([lat, lng], {
                  icon: buildUserIcon(avatarUrl), zIndexOffset: -100,
                }).addTo(map);
              } else {
                userMarker.setLatLng([lat, lng]);
              }
              if (firstFix) {
                firstFix = false;
                map.setView([lat, lng], map.getZoom());
              }
            } catch { /* never crash building pins */ }
          },
        });
      }
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ height, width: '100%' }} className="z-0" />;
}
