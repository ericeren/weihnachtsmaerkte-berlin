import 'leaflet/dist/leaflet.css';

import Ionicons from '@expo/vector-icons/Ionicons';
import L from 'leaflet';
import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fixedLegend, statusNow } from '../lib/format';
import { BERLIN_REGION } from '../lib/geo';
import { LOC_HELP, notify } from '../lib/notify';
import type { StatusTone } from '../lib/time';
import { useStore } from '../state/Store';
import { colors, shadow } from '../theme';
import MarketPreview from './MarketPreview';

/**
 * Karte für die Webfassung: OpenStreetMap über Leaflet, weil es Apple Karten im Browser nicht gibt.
 * Aufbau, Farben und Knöpfe wie in der iPhone-App.
 */

/** Gleicher Ausschnitt wie in der iPhone-App */
const BERLIN: L.LatLngBoundsExpression = [
  [BERLIN_REGION.latitude - BERLIN_REGION.latitudeDelta / 2, BERLIN_REGION.longitude - BERLIN_REGION.longitudeDelta / 2],
  [BERLIN_REGION.latitude + BERLIN_REGION.latitudeDelta / 2, BERLIN_REGION.longitude + BERLIN_REGION.longitudeDelta / 2],
];

const PIN: Record<StatusTone, { bg: string; border: string; star: string }> = {
  open: { bg: colors.rot, border: colors.weiss, star: colors.weiss },
  soon: { bg: colors.weiss, border: colors.rot, star: colors.rot },
  later: { bg: '#6B7079', border: colors.weiss, star: colors.weiss },
  ended: { bg: colors.grauHell, border: colors.weiss, star: colors.weiss },
};

const Z: Record<StatusTone, number> = { open: 300, soon: 200, later: 100, ended: 0 };

function pinIcon(tone: StatusTone, selected: boolean): L.DivIcon {
  const c = PIN[tone];
  // Zweites Merkmal neben der Farbe: Märkte an anderen Tagen sind kleiner
  const klein = tone === 'later' || tone === 'ended';
  const s = selected ? 38 : klein ? 22 : 28;
  const html =
    `<div style="width:${s}px;height:${s}px;box-sizing:border-box;border-radius:50%;` +
    `background:${c.bg};border:${selected ? 3 : 2}px solid ${c.border};` +
    `box-shadow:0 3px 10px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;` +
    `color:${c.star};font:700 ${selected ? 19 : klein ? 11 : 14}px/1 system-ui,sans-serif;cursor:pointer" aria-hidden="true">★</div>`;
  return L.divIcon({ className: 'wm-pin', html, iconSize: [s, s], iconAnchor: [s / 2, s / 2] });
}

export default function MarketMapWeb() {
  const { result, now, pos, selectedId, setSelectedId, requestLocation, focusToken, filters } = useStore();
  const insets = useSafeAreaInsets();
  const [div, setDiv] = useState<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinsRef = useRef<L.LayerGroup | null>(null);
  const meRef = useRef<L.CircleMarker | null>(null);
  const lastMarkerPress = useRef(0);
  const fitLater = useRef(false);
  const markets = result.list;
  const selected = markets.find((m) => m.id === selectedId) ?? null;
  const day = filters.when.kind === 'tag' ? filters.when.date : null;

  const fest = fixedLegend(filters, now);
  const tones = useMemo(() => {
    const t: Record<string, StatusTone> = {};
    for (const m of markets) t[m.id] = fest ? 'open' : statusNow(m, now).tone;
    return t;
  }, [markets, now, fest]);
  // Was die Farbe zeigt, steht auch im Namen des Sterns, für Bildschirmleser
  const namen = useMemo(() => {
    const t: Record<string, string> = {};
    for (const m of markets) t[m.id] = `${m.name}, ${fest ?? statusNow(m, now).label}`;
    return t;
  }, [markets, now, fest]);

  // Karte einmal anlegen, sobald das Element im Dokument ist
  useEffect(() => {
    if (!div) return;
    const map = L.map(div, { zoomControl: false, minZoom: 9, maxZoom: 18, zoomSnap: 0.25, zoomDelta: 0.5 });
    // Bei einem Direktlink auf einen Markt liegt die Karte zuerst verdeckt unter der Detailseite
    // und hat keine Größe. Berlin wird dann eingepasst, sobald sie sichtbar wird.
    fitLater.current = div.clientWidth === 0 || div.clientHeight === 0;
    map.fitBounds(BERLIN);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>-Mitwirkende',
    }).addTo(map);
    map.attributionControl.setPrefix(false);
    map.attributionControl.setPosition('bottomleft');
    map.on('click', () => {
      if (Date.now() - lastMarkerPress.current > 400) setSelectedId(null);
    });
    pinsRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      if (fitLater.current && div.clientWidth > 0 && div.clientHeight > 0) {
        fitLater.current = false;
        map.fitBounds(BERLIN);
      }
    });
    ro.observe(div);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      pinsRef.current = null;
      meRef.current = null;
    };
  }, [div, setSelectedId]);

  // Sterne zeichnen
  useEffect(() => {
    const layer = pinsRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const m of markets) {
      const sel = m.id === selectedId;
      const tone = tones[m.id];
      L.marker([m.lat, m.lng], {
        icon: pinIcon(tone, sel),
        title: m.name,
        alt: m.name,
        zIndexOffset: sel ? 1000 : Z[tone],
        riseOnHover: true,
      })
        .on('click', () => {
          lastMarkerPress.current = Date.now();
          setSelectedId(m.id);
        })
        // Tastatur: Leaflet macht die Sterne fokussierbar, öffnet aber nur Popups mit Enter. Hier öffnet Enter oder die Leertaste die Vorschau.
        .on('keypress', (e: L.LeafletKeyboardEvent) => {
          const k = e.originalEvent.key;
          if (k === 'Enter' || k === ' ') {
            e.originalEvent.preventDefault();
            lastMarkerPress.current = Date.now();
            setSelectedId(m.id);
          }
        })
        .addTo(layer)
        .getElement()
        ?.setAttribute('aria-label', namen[m.id]);
    }
  }, [markets, tones, namen, selectedId, setSelectedId, div]);

  // Eigener Standort als blauer Punkt
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    meRef.current?.remove();
    meRef.current = pos
      ? L.circleMarker([pos.latitude, pos.longitude], {
          radius: 7,
          color: colors.weiss,
          weight: 2,
          fillColor: '#1A73E8',
          fillOpacity: 1,
          interactive: false,
        }).addTo(map)
      : null;
  }, [pos, div]);

  // Bei geänderter Auswahl durch Filter auf die Treffer zoomen
  const idsKey = markets.map((m) => m.id).join(',');
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map || !markets.length) return;
    if (markets.length === 1) map.setView([markets[0].lat, markets[0].lng], 15);
    else map.fitBounds(L.latLngBounds(markets.map((m) => [m.lat, m.lng] as [number, number])), { padding: [50, 50] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // Aus der Detailansicht: „Auf der Karte zeigen“
  useEffect(() => {
    if (!focusToken || !selectedId) return;
    const m = markets.find((x) => x.id === selectedId);
    const map = mapRef.current;
    if (!m || !map) return;
    fitLater.current = false;
    // Wie auf dem iPhone rückt der Markt etwas nach oben, damit die Vorschaukarte ihn nicht verdeckt.
    const shift = Math.min(150, window.innerHeight * 0.18);
    map.setView(map.unproject(map.project([m.lat, m.lng], 15).add([0, shift]), 15), 15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken]);

  const showBerlin = () => mapRef.current?.fitBounds(BERLIN);

  const showMe = async () => {
    const p = pos ?? (await requestLocation());
    if (!p) {
      notify('Standort nicht verfügbar', LOC_HELP);
      return;
    }
    mapRef.current?.setView([p.latitude, p.longitude], 14);
  };

  return (
    <View style={styles.wrap}>
      {createElement('div', {
        ref: setDiv,
        style: { position: 'absolute', inset: 0, zIndex: 0, isolation: 'isolate', background: colors.flaeche },
      })}

      <View style={styles.legend} pointerEvents="none">
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.rot }]} />
          <Text style={styles.legendText}>{fest ?? 'Jetzt offen'}</Text>
        </View>
        {fest ? null : (
          <>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.weiss, borderColor: colors.rot, borderWidth: 2 }]} />
              <Text style={styles.legendText}>Heute später</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.legendDotKlein, { backgroundColor: '#6B7079' }]} />
              <Text style={styles.legendText}>Andere Tage</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.tools}>
        <Pressable style={styles.tool} onPress={showMe} accessibilityLabel="Mein Standort">
          <Ionicons name="locate" size={22} color={colors.rot} />
        </Pressable>
        <Pressable style={styles.tool} onPress={showBerlin} accessibilityLabel="Ganz Berlin zeigen">
          <Ionicons name="scan-outline" size={21} color={colors.tinte} />
        </Pressable>
      </View>

      {selected ? (
        <View style={[styles.preview, { bottom: insets.bottom + 26 }]}>
          <MarketPreview
            m={selected}
            now={now}
            day={day}
            distanceKm={pos ? result.distances[selected.id] : undefined}
            onClose={() => setSelectedId(null)}
          />
        </View>
      ) : null}

      {!markets.length ? (
        <View style={styles.empty} pointerEvents="none">
          <Text style={styles.emptyText}>Keine Märkte für diese Auswahl</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.flaeche, overflow: 'hidden' },
  legend: {
    position: 'absolute',
    left: 10,
    top: 10,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    ...shadow,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 7 },
  legendDotKlein: { width: 9, height: 9, borderRadius: 4.5, marginLeft: 1.5, marginRight: 8.5 },
  legendText: { fontSize: 13, color: colors.tinte },
  tools: { position: 'absolute', right: 10, top: 10, gap: 8, zIndex: 2 },
  tool: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.weiss,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  preview: { position: 'absolute', left: 10, right: 10, zIndex: 3 },
  empty: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    zIndex: 2,
    backgroundColor: colors.weiss,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    ...shadow,
  },
  emptyText: { fontSize: 15, color: colors.tinte, fontWeight: '600' },
});
