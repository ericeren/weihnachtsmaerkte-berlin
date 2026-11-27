import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { MARKETS } from '../data';
import { applyFilters, DEFAULT_FILTERS, type FilterResult } from '../lib/filter';
import { berlinNow } from '../lib/time';
import type { Filters, LatLng, Moment } from '../types';

export type LocStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error';
export type View = 'karte' | 'liste';

interface StoreValue {
  filters: Filters;
  setFilters: (update: Partial<Filters> | ((f: Filters) => Filters)) => void;
  resetFilters: () => void;
  now: Moment;
  pos: LatLng | null;
  locStatus: LocStatus;
  requestLocation: () => Promise<LatLng | null>;
  view: View;
  setView: (v: View) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  /** Markt auf der Karte zeigen und auswählen */
  focusOn: (id: string) => void;
  focusToken: number;
  result: FilterResult;
}

const StoreContext = createContext<StoreValue | null>(null);

async function readPosition(): Promise<LatLng | null> {
  const last = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000 });
  const p = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return p ? { latitude: p.coords.latitude, longitude: p.coords.longitude } : null;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  const [now, setNow] = useState<Moment>(() => berlinNow());
  const [pos, setPos] = useState<LatLng | null>(null);
  const [locStatus, setLocStatus] = useState<LocStatus>('idle');
  const [view, setView] = useState<View>('karte');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const busy = useRef(false);

  const focusOn = useCallback((id: string) => {
    setSelectedId(id);
    setView('karte');
    setFocusToken((t) => t + 1);
  }, []);

  // Uhr jede halbe Minute und beim Zurückkehren in die App aktualisieren
  useEffect(() => {
    const tick = () =>
      setNow((prev) => {
        const n = berlinNow();
        return n.date === prev.date && n.minutes === prev.minutes ? prev : n;
      });
    const timer = setInterval(tick, 30 * 1000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  // Wenn der Standort früher schon freigegeben wurde, ohne Nachfrage holen
  useEffect(() => {
    let alive = true;
    Location.getForegroundPermissionsAsync()
      .then(async (perm) => {
        if (!alive || perm.status !== 'granted') return;
        setLocStatus('loading');
        const p = await readPosition();
        if (!alive) return;
        setPos(p);
        setLocStatus(p ? 'granted' : 'error');
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const requestLocation = useCallback(async (): Promise<LatLng | null> => {
    if (busy.current) return pos;
    busy.current = true;
    try {
      setLocStatus('loading');
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setLocStatus('denied');
        return null;
      }
      const p = await readPosition();
      setPos(p);
      setLocStatus(p ? 'granted' : 'error');
      return p;
    } catch {
      setLocStatus('error');
      return null;
    } finally {
      busy.current = false;
    }
  }, [pos]);

  const setFilters = useCallback((update: Partial<Filters> | ((f: Filters) => Filters)) => {
    setFiltersState((f) => (typeof update === 'function' ? update(f) : { ...f, ...update }));
  }, []);

  const resetFilters = useCallback(() => setFiltersState(DEFAULT_FILTERS), []);

  const result = useMemo(() => applyFilters(MARKETS, filters, now, pos), [filters, now, pos]);

  // Auswahl auf der Karte aufheben, wenn der Markt herausgefiltert wurde
  useEffect(() => {
    if (selectedId && !result.list.some((m) => m.id === selectedId)) setSelectedId(null);
  }, [result, selectedId]);

  const value = useMemo<StoreValue>(
    () => ({
      filters,
      setFilters,
      resetFilters,
      now,
      pos,
      locStatus,
      requestLocation,
      view,
      setView,
      selectedId,
      setSelectedId,
      focusOn,
      focusToken,
      result,
    }),
    [filters, setFilters, resetFilters, now, pos, locStatus, requestLocation, view, selectedId, focusOn, focusToken, result],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore außerhalb von StoreProvider');
  return v;
}
