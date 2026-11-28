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
import type { Market } from '../types';
import BlasenListe from './BlasenListe';
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
  later: { bg: colors.grauZu, border: colors.weiss, star: colors.weiss },
  ended: { bg: colors.grauHell, border: colors.weiss, star: colors.weiss },
};

const Z: Record<StatusTone, number> = { open: 300, soon: 200, later: 100, ended: 0 };

/** Ab dieser Kartenbreite stehen Vorschau und Liste einer Blase links und schmaler, etwa am Computer */
const BREIT = 760;
const KARTE_MAX = 520;

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
  zu: { bg: colors.grauZu, border: colors.weiss, text: colors.weiss },
};

/** Ist die Liste einer Blase offen, bekommt sie einen dunklen Ring, damit man sieht, zu welcher Blase die Liste gehört */
function blasenIcon(n: number, stand: BlasenStand, aktiv: boolean): L.DivIcon {
  const c = BLASE[stand];
  const s = n >= 10 ? 38 : 34;
  const schatten = aktiv ? `0 0 0 3px ${colors.tinte},0 3px 10px rgba(0,0,0,.35)` : '0 3px 10px rgba(0,0,0,.25)';
  const html =
    `<div style="width:${s}px;height:${s}px;box-sizing:border-box;border-radius:50%;background:${c.bg};` +
    `border:3px solid ${c.border};box-shadow:${schatten};` +
    `display:flex;align-items:center;justify-content:center;color:${c.text};` +
    `font:800 ${n >= 10 ? 14 : 15}px/1 system-ui,sans-serif;cursor:pointer" aria-hidden="true">${n}</div>`;
  return L.divIcon({ className: 'wm-blase', html, iconSize: [s, s], iconAnchor: [s / 2, s / 2] });
}

export default function MarketMapWeb() {
  const { result, now, pos, selectedId, setSelectedId, requestLocation, focusOn, focusToken, filters } = useStore();
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
  const [hoehe, setHoehe] = useState({ karte: 0, vorschau: 0, breite: 0, legende: 0, liste: 0 });
  const hoeheRef = useRef(hoehe);
  hoeheRef.current = hoehe;
  // Offene Liste einer Zahlenblase. Ein Tipp auf die Blase zoomt nicht mehr, sondern zeigt ihre Märkte als Liste.
  const [blase, setBlase] = useState<{ ids: string[]; perTastatur: boolean } | null>(null);
  const blasenKey = blase ? blase.ids.join('.') : '';
  const markets = result.list;
  const byId = useMemo(() => new Map(markets.map((m) => [m.id, m])), [markets]);
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
      if (Date.now() - lastMarkerPress.current > 400) {
        setSelectedId(null);
        setBlase(null);
      }
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
          setBlase(null);
          setSelectedId(m.id);
        })
        // Tastatur: Leaflet macht die Sterne fokussierbar, öffnet aber nur Popups mit Enter. Hier öffnet Enter oder die Leertaste die Vorschau.
        .on('keypress', (e: L.LeafletKeyboardEvent) => {
          const k = e.originalEvent.key;
          if (k === 'Enter' || k === ' ') {
            e.originalEvent.preventDefault();
            lastMarkerPress.current = Date.now();
            setBlase(null);
            setSelectedId(m.id);
          }
        })
        .addTo(layer)
        .getElement()
        ?.setAttribute('aria-label', namen[m.id]);
    };

    // Ein Tipp auf die Blase öffnet die Liste ihrer Märkte. Die Karte zoomt nicht. Liegt die Blase dort,
    // wo die Liste aufgeht, rückt die Karte nur so weit, dass die Blase sichtbar bleibt.
    const oeffnen = (g: Gruppe, perTastatur: boolean) => {
      lastMarkerPress.current = Date.now();
      setSelectedId(null);
      setBlase({ ids: g.ids, perTastatur });
      const { x: W, y: H } = map.getSize();
      const p = map.latLngToContainerPoint([g.lat, g.lng]);
      if (W >= BREIT) {
        const rechts = 10 + Math.min(KARTE_MAX, W - 20);
        if (p.x < rechts + 20 && p.y > H * 0.4 - 20) map.panBy([p.x - (rechts + W - 64) / 2, p.y - H / 2], { animate: true, duration: 0.35 });
      } else if (p.y > H * 0.4) map.panBy([0, p.y - H * 0.25], { animate: true, duration: 0.35 });
    };

    const blase = (g: Gruppe) => {
      const { stand, offen, heute } = blasenStand(g.ids, tones);
      L.marker([g.lat, g.lng], {
        icon: blasenIcon(g.ids.length, stand, g.ids.join('.') === blasenKey),
        title: `${g.ids.length} Märkte`,
        zIndexOffset: stand === 'offen' ? 400 : stand === 'heute' ? 250 : 150,
        riseOnHover: true,
      })
        .on('click', () => oeffnen(g, false))
        .on('keypress', (e: L.LeafletKeyboardEvent) => {
          const k = e.originalEvent.key;
          if (k === 'Enter' || k === ' ') {
            e.originalEvent.preventDefault();
            oeffnen(g, true);
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
  }, [byId, gruppen, tones, namen, fest, selectedId, setSelectedId, blasenKey, div]);

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
    // Mit anderen Treffern passt eine offene Liste nicht mehr
    setBlase(null);
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

  // Die Vorschaukarte darf den gewählten Markt nicht verdecken. Er kommt in die Mitte der freien Fläche über ihr.
  // Am Computer ist die Karte niedrig und die Vorschau hoch, deshalb zählt die gemessene Höhe, nicht ein fester Wert.
  // zoomen: „Auf der Karte zeigen“ und Markt aus der Liste einer Blase, mit Zoomstufe 15.
  // Sonst, beim Antippen eines Sterns, rückt die Karte nur, wenn die Vorschau ihn verdecken würde.
  const ausrichten = useRef<string | null>(null);
  const vorschauFuer = useRef<string | null>(null);
  // Auf breiten Bildschirmen steht die Vorschau links unten, schmaler. Dann kommt der Markt rechts daneben.
  const legeFrei = (m: Market, vorschau: number, zoomen: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    const { x: W, y: H } = map.getSize();
    const oben = H - (insets.bottom + 26) - vorschau;
    let zielX: number;
    let zielY: number;
    let verdeckt: (p: L.Point) => boolean;
    if (W >= BREIT) {
      const rechts = 10 + Math.min(KARTE_MAX, W - 20);
      zielX = Math.round((rechts + W - 64) / 2);
      zielY = Math.round(H / 2);
      verdeckt = (p) => p.x < rechts + 20 && p.y > oben - 20;
    } else {
      zielX = Math.round(W / 2);
      zielY = Math.max(40, Math.round((oben - 10) / 2));
      verdeckt = (p) => p.y > oben - 30;
    }
    if (zoomen) {
      map.setView(map.unproject(map.project([m.lat, m.lng], 15).add([W / 2 - zielX, H / 2 - zielY]), 15), 15, { animate: false });
      return;
    }
    const p = map.latLngToContainerPoint([m.lat, m.lng]);
    if (verdeckt(p)) map.panBy([p.x - zielX, p.y - zielY], { animate: true, duration: 0.3 });
  };

  // Aus der Detailansicht „Auf der Karte zeigen“ und aus der Liste einer Blase
  useEffect(() => {
    if (!focusToken || !selectedId) return;
    const m = byId.get(selectedId);
    const map = mapRef.current;
    if (!m || !map) return;
    fitLater.current = false;
    if (vorschauFuer.current === m.id && hoeheRef.current.vorschau) {
      legeFrei(m, hoeheRef.current.vorschau, true);
      return;
    }
    // Die Vorschau ist noch nicht gemessen: erst grob setzen, genau ausgerichtet wird, sobald sie gemessen ist
    ausrichten.current = m.id;
    legeFrei(m, Math.round(map.getSize().y * 0.6), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken]);

  const showBerlin = () => mapRef.current?.fitBounds(BERLIN);

  // Liste einer Zahlenblase: Markt wählen, Heranzoomen wie früher beim Antippen, Schließen.
  // Wer sie per Tastatur geöffnet hat, landet danach wieder auf der Karte.
  const zurKarte = (perTastatur: boolean) => {
    if (perTastatur) mapRef.current?.getContainer().focus();
  };
  const waehlen = (id: string) => {
    const perTastatur = !!blase?.perTastatur;
    setBlase(null);
    focusOn(id);
    zurKarte(perTastatur);
  };
  const heranzoomen = () => {
    const map = mapRef.current;
    if (!map || !blase) return;
    const punkte = blase.ids.flatMap((id) => {
      const m = byId.get(id);
      return m ? [[m.lat, m.lng] as [number, number]] : [];
    });
    const perTastatur = blase.perTastatur;
    setBlase(null);
    if (perTastatur) map.once('moveend', () => map.getContainer().focus());
    if (punkte.length) map.flyToBounds(L.latLngBounds(punkte), { padding: [70, 70], maxZoom: BLASE_MAX_ZOOM, duration: 0.45 });
  };
  const schliessen = () => {
    const perTastatur = !!blase?.perTastatur;
    setBlase(null);
    zurKarte(perTastatur);
  };
  // Escape schließt die Liste
  useEffect(() => {
    if (!blase) return;
    const taste = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setBlase(null);
      if (blase.perTastatur) mapRef.current?.getContainer().focus();
    };
    document.addEventListener('keydown', taste);
    return () => document.removeEventListener('keydown', taste);
  }, [blase]);
  const blasenMaerkte = blase ? blase.ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])) : [];

  // Plus und Minus unten rechts wie früher bei Google Maps, über der Vorschaukarte, wenn eine offen ist.
  // Ist dafür zwischen Vorschau und den Knöpfen oben rechts kein Platz, bleiben sie weg.
  const zoomen = (rein: boolean) => (rein ? mapRef.current?.zoomIn(1) : mapRef.current?.zoomOut(1));
  const breit = hoehe.breite >= BREIT;
  // Vorschau und Liste einer Blase: schmal über die ganze Breite, breit links mit höchstens KARTE_MAX Punkten
  const kartenPlatz = breit ? { left: 10, width: Math.min(KARTE_MAX, hoehe.breite - 20) } : { left: 10, right: 10 };
  const zoomUnten = insets.bottom + 26 + (selected && !breit ? hoehe.vorschau + 10 : 0);
  // Die Legende wird nie halb verdeckt: Reicht die Vorschau oder die Liste einer Blase bis an sie heran,
  // ist sie so lange ganz weg. Am Computer steht sie in einer Zeile, dann passiert das kaum.
  const kartenHoehe = selected ? hoehe.vorschau : blase ? hoehe.liste : 0;
  const legendeSichtbar = !kartenHoehe || hoehe.karte - (insets.bottom + 26) - kartenHoehe >= 10 + hoehe.legende + 8;
  // Bei offener Liste einer Blase bleiben Plus und Minus weg, dort gibt es „Heranzoomen“
  const zoomSichtbar = breit || (!blase && (!selected || hoehe.karte - zoomUnten - 88 >= 112));

  const showMe = async () => {
    const p = pos ?? (await requestLocation());
    if (!p) {
      notify('Standort nicht verfügbar', LOC_HELP);
      return;
    }
    mapRef.current?.setView([p.latitude, p.longitude], 14);
  };

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        const { height, width } = e.nativeEvent.layout;
        setHoehe((h) => ({ ...h, karte: height, breite: width }));
      }}
    >
      {createElement('div', {
        ref: setDiv,
        style: { position: 'absolute', inset: 0, zIndex: 0, isolation: 'isolate', background: colors.flaeche },
      })}

      <View
        style={[styles.legend, breit && styles.legendZeile, !legendeSichtbar && styles.versteckt]}
        pointerEvents="none"
        aria-hidden={!legendeSichtbar}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setHoehe((x) => (x.legende === h ? x : { ...x, legende: h }));
        }}
      >
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
              <View style={[styles.legendDot, { backgroundColor: colors.grauZu }]} />
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
          key={selected.id}
          style={[styles.preview, kartenPlatz, { bottom: insets.bottom + 26 }]}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setHoehe((x) => ({ ...x, vorschau: h }));
            const neu = vorschauFuer.current !== selected.id;
            vorschauFuer.current = selected.id;
            if (ausrichten.current === selected.id) {
              ausrichten.current = null;
              legeFrei(selected, h, true);
            } else if (neu) legeFrei(selected, h, false);
          }}
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

      {blase && blasenMaerkte.length ? (
        <View
          style={[styles.preview, kartenPlatz, { bottom: insets.bottom + 26 }]}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setHoehe((x) => (x.liste === h ? x : { ...x, liste: h }));
          }}
        >
          <BlasenListe
            maerkte={blasenMaerkte}
            tones={tones}
            fest={fest}
            now={now}
            day={day}
            distances={pos ? result.distances : undefined}
            maxHeight={Math.max(220, Math.round(hoehe.karte * 0.6))}
            fokus={blase.perTastatur}
            onWaehlen={waehlen}
            onHeranzoomen={heranzoomen}
            onSchliessen={schliessen}
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
  legendZeile: { flexDirection: 'row', alignItems: 'center', columnGap: 14 },
  // Unsichtbar statt entfernt, damit die gemessene Höhe bleibt und nichts flackert
  versteckt: { opacity: 0 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 7 },
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
  preview: { position: 'absolute', zIndex: 3 },
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
