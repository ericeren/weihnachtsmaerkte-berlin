import 'leaflet/dist/leaflet.css';

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import L from 'leaflet';
import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fixedLegend, statusNow } from '../lib/format';
import { BERLIN_REGION } from '../lib/geo';
import {
  BLASE_MAX_ZOOM,
  blasenStand,
  blasenText,
  gruppieren,
  sternRadius,
  type BlasenStand,
  type Gruppe,
} from '../lib/gruppen';
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
  // Jetzt offen ist grün, im selben Grün wie „Jetzt geöffnet“ in der Liste, so hat Eric es gewählt
  open: { bg: colors.gruen, border: colors.weiss, star: colors.weiss },
  // Wie alle Markierungen: gefüllter Kreis, weißer Rand, weißer Stern, nur die Füllung zeigt den Stand
  soon: { bg: colors.rot, border: colors.weiss, star: colors.weiss },
  later: { bg: '#6B7079', border: colors.weiss, star: colors.weiss },
  ended: { bg: colors.grauHell, border: colors.weiss, star: colors.weiss },
};

const Z: Record<StatusTone, number> = { open: 300, soon: 200, later: 100, ended: 0 };

function pinIcon(tone: StatusTone, selected: boolean): L.DivIcon {
  const c = PIN[tone];
  // Zweites Merkmal neben der Farbe: Märkte an anderen Tagen sind kleiner
  const klein = tone === 'later' || tone === 'ended';
  const s = selected ? 38 : klein ? 22 : 28;
  // Tippfläche mindestens 24 Punkte, auch wenn der Stern kleiner gezeichnet ist
  const box = Math.max(s, 24);
  const html =
    `<div style="width:${box}px;height:${box}px;display:flex;align-items:center;justify-content:center;cursor:pointer" aria-hidden="true">` +
    `<div style="width:${s}px;height:${s}px;box-sizing:border-box;border-radius:50%;` +
    `background:${c.bg};border:${selected ? 3 : 2}px solid ${c.border};` +
    `box-shadow:0 3px 10px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;` +
    `color:${c.star};font:700 ${selected ? 19 : klein ? 11 : 14}px/1 system-ui,sans-serif">★</div></div>`;
  return L.divIcon({ className: 'wm-pin', html, iconSize: [box, box], iconAnchor: [box / 2, box / 2] });
}

/**
 * Zahlenblase für mehrere Märkte, gezeichnet wie die Sterne: grün gefüllt, wenn einer davon jetzt offen hat,
 * rot gefüllt, wenn sonst einer heute noch öffnet, grau gefüllt, wenn heute keiner mehr öffnet. Rand und Zahl
 * sind immer weiß, so hat Eric es gewählt. Bei Rot-Grün-Schwäche sehen Grün und Rot ähnlich aus.
 */
const BLASE: Record<BlasenStand, { bg: string; border: string; text: string }> = {
  offen: { bg: colors.gruen, border: colors.weiss, text: colors.weiss },
  heute: { bg: colors.rot, border: colors.weiss, text: colors.weiss },
  zu: { bg: '#6B7079', border: colors.weiss, text: colors.weiss },
};

function blasenIcon(n: number, stand: BlasenStand): L.DivIcon {
  const c = BLASE[stand];
  const s = n >= 10 ? 38 : 34;
  const html =
    `<div style="width:${s}px;height:${s}px;box-sizing:border-box;border-radius:50%;background:${c.bg};` +
    `border:3px solid ${c.border};box-shadow:0 3px 10px rgba(0,0,0,.25);` +
    `display:flex;align-items:center;justify-content:center;color:${c.text};` +
    `font:800 ${n >= 10 ? 14 : 15}px/1 system-ui,sans-serif;cursor:pointer" aria-hidden="true">${n}</div>`;
  return L.divIcon({ className: 'wm-blase', html, iconSize: [s, s], iconAnchor: [s / 2, s / 2] });
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
  // Zoomstufe der Karte, danach richten sich die Zahlenblasen
  const [zoom, setZoom] = useState<number | null>(null);
  // Höhe von Karte und Vorschaukarte, damit Plus und Minus über der Vorschau stehen
  const [hoehe, setHoehe] = useState({ karte: 0, vorschau: 0 });
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
    // Impressum leicht erreichbar: als Link vor der Quellenangabe, öffnet die Seite „Über die App“ ohne Neuladen
    map.attributionControl.setPrefix('<a href="/info">Impressum</a>');
    map.attributionControl.getContainer()?.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href="/info"]');
      if (!a) return;
      e.preventDefault();
      router.push('/info');
    });
    map.attributionControl.setPosition('bottomleft');
    map.on('click', () => {
      if (Date.now() - lastMarkerPress.current > 400) setSelectedId(null);
    });
    map.on('zoomend', () => setZoom(map.getZoom()));
    setZoom(map.getZoom());
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

  // Märkte, deren Sterne sich berühren, kommen in eine Zahlenblase. Der ausgewählte Markt bleibt immer einzeln.
  const gruppen = useMemo(
    () =>
      zoom === null
        ? []
        : gruppieren(
            markets
              .filter((m) => m.id !== selectedId)
              .map((m) => ({
                id: m.id,
                lat: m.lat,
                lng: m.lng,
                r: sternRadius(tones[m.id] === 'later' || tones[m.id] === 'ended'),
              })),
            zoom,
          ),
    [markets, selectedId, zoom, tones],
  );

  // Sterne und Blasen zeichnen
  useEffect(() => {
    const layer = pinsRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    const byId = new Map(markets.map((m) => [m.id, m]));

    const stern = (m: (typeof markets)[number], sel: boolean) => {
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
    };

    // Ein Tipp auf die Blase zoomt so weit hinein, dass ihre Märkte auseinanderrücken
    const aufklappen = (g: Gruppe, perTastatur: boolean) => {
      lastMarkerPress.current = Date.now();
      const punkte = g.ids.map((id) => byId.get(id)!).map((m) => [m.lat, m.lng] as [number, number]);
      if (perTastatur) map.once('moveend', () => map.getContainer().focus());
      map.flyToBounds(L.latLngBounds(punkte), { padding: [70, 70], maxZoom: BLASE_MAX_ZOOM, duration: 0.45 });
    };

    const blase = (g: Gruppe) => {
      const { stand, offen, heute } = blasenStand(g.ids, tones);
      L.marker([g.lat, g.lng], {
        icon: blasenIcon(g.ids.length, stand),
        title: `${g.ids.length} Märkte`,
        zIndexOffset: stand === 'offen' ? 400 : stand === 'heute' ? 250 : 150,
        riseOnHover: true,
      })
        .on('click', () => aufklappen(g, false))
        .on('keypress', (e: L.LeafletKeyboardEvent) => {
          const k = e.originalEvent.key;
          if (k === 'Enter' || k === ' ') {
            e.originalEvent.preventDefault();
            aufklappen(g, true);
          }
        })
        .addTo(layer)
        .getElement()
        ?.setAttribute('aria-label', blasenText(g.ids.length, offen, fest, heute));
    };

    for (const g of gruppen) {
      if (g.ids.length === 1) stern(byId.get(g.ids[0])!, false);
      else blase(g);
    }
    const sel = selectedId ? byId.get(selectedId) : undefined;
    if (sel) stern(sel, true);
  }, [markets, gruppen, tones, namen, fest, selectedId, setSelectedId, div]);

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

  // Plus und Minus unten rechts wie früher bei Google Maps, über der Vorschaukarte, wenn eine offen ist.
  // Ist dafür zwischen Vorschau und den Knöpfen oben rechts kein Platz, bleiben sie weg.
  const zoomen = (rein: boolean) => (rein ? mapRef.current?.zoomIn(1) : mapRef.current?.zoomOut(1));
  const zoomUnten = insets.bottom + 26 + (selected ? hoehe.vorschau + 10 : 0);
  const zoomSichtbar = !selected || hoehe.karte - zoomUnten - 88 >= 112;

  const showMe = async () => {
    const p = pos ?? (await requestLocation());
    if (!p) {
      notify('Standort nicht verfügbar', LOC_HELP);
      return;
    }
    mapRef.current?.setView([p.latitude, p.longitude], 14);
  };

  return (
    <View style={styles.wrap} onLayout={(e) => setHoehe((h) => ({ ...h, karte: e.nativeEvent.layout.height }))}>
      {createElement('div', {
        ref: setDiv,
        style: { position: 'absolute', inset: 0, zIndex: 0, isolation: 'isolate', background: colors.flaeche },
      })}

      <View style={styles.legend} pointerEvents="none">
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.gruen }]} />
          <Text style={styles.legendText}>{fest ?? 'Jetzt offen'}</Text>
        </View>
        {/* Die Farben gelten immer für jetzt und heute, auch wenn ein Filter wie „Wochenende“ an ist.
            Die Zahlenblasen erklärt die Legende bewusst nicht: Eine Zahl auf der Karte versteht man so, und die
            Farben zeigen wie bei den Sternen, ob dort jetzt einer offen hat oder heute noch einer öffnet. */}
        {fest ? null : (
          <>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.rot }]} />
              <Text style={styles.legendText}>Öffnet heute noch</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.legendDotKlein, { backgroundColor: '#6B7079' }]} />
              <Text style={styles.legendText}>Heute geschlossen</Text>
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
        <View
          style={[styles.preview, { bottom: insets.bottom + 26 }]}
          onLayout={(e) => setHoehe((h) => ({ ...h, vorschau: e.nativeEvent.layout.height }))}
        >
          <MarketPreview
            m={selected}
            now={now}
            day={day}
            distanceKm={pos ? result.distances[selected.id] : undefined}
            onClose={() => setSelectedId(null)}
          />
        </View>
      ) : null}

      {zoomSichtbar ? (
        <View style={[styles.zoom, { bottom: zoomUnten }]}>
          <Pressable
            style={styles.zoomBtn}
            onPress={() => zoomen(true)}
            accessibilityRole="button"
            accessibilityLabel="Hineinzoomen"
          >
            <Ionicons name="add" size={26} color={colors.tinte} />
          </Pressable>
          <View style={styles.zoomLinie} />
          <Pressable
            style={styles.zoomBtn}
            onPress={() => zoomen(false)}
            accessibilityRole="button"
            accessibilityLabel="Herauszoomen"
          >
            <Ionicons name="remove" size={26} color={colors.tinte} />
          </Pressable>
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
  zoom: {
    position: 'absolute',
    right: 10,
    zIndex: 2,
    width: 44,
    borderRadius: 22,
    backgroundColor: colors.weiss,
    ...shadow,
  },
  zoomBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zoomLinie: { height: StyleSheet.hairlineWidth, backgroundColor: colors.linie, marginHorizontal: 8 },
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
