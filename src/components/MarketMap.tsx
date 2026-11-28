import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BERLIN_REGION } from '../lib/geo';
import { fixedLegend, statusNow } from '../lib/format';
import {
  blasenStand,
  blasenText,
  gruppieren,
  sternRadius,
  zoomAusBreite,
  type BlasenStand,
  type Gruppe,
} from '../lib/gruppen';
import type { StatusTone } from '../lib/time';
import { useStore } from '../state/Store';
import { colors, shadow } from '../theme';
import type { Market } from '../types';
import BlasenListe from './BlasenListe';
import MarketPreview from './MarketPreview';

const PIN: Record<StatusTone, { bg: string; border: string; star: string }> = {
  // Jetzt offen ist grün, im selben Grün wie „Jetzt geöffnet“ in der Liste, so hat Eric es gewählt
  open: { bg: colors.gruen, border: colors.weiss, star: colors.weiss },
  // Wie alle Markierungen: gefüllter Kreis, weißer Rand, weißer Stern, nur die Füllung zeigt den Stand
  soon: { bg: colors.rot, border: colors.weiss, star: colors.weiss },
  later: { bg: colors.grauZu, border: colors.weiss, star: colors.weiss },
  ended: { bg: colors.grauHell, border: colors.weiss, star: colors.weiss },
};

const Pin = memo(function Pin({
  m,
  tone,
  selected,
  onPress,
  name,
}: {
  m: Market;
  tone: StatusTone;
  selected: boolean;
  onPress: (id: string) => void;
  /** Name mit Stand für VoiceOver */
  name: string;
}) {
  const c = PIN[tone];
  // Zweites Merkmal neben der Farbe: Märkte an anderen Tagen sind kleiner
  const klein = tone === 'later' || tone === 'ended';
  const size = selected ? 38 : klein ? 22 : 28;
  return (
    <Marker
      coordinate={{ latitude: m.lat, longitude: m.lng }}
      onPress={() => onPress(m.id)}
      tracksViewChanges={false}
      zIndex={selected ? 1000 : tone === 'open' ? 3 : tone === 'soon' ? 2 : 1}
      accessibilityLabel={name}
    >
      {/* Tippfläche mindestens 24 Punkte, auch wenn der Stern kleiner gezeichnet ist */}
      <View style={[styles.pinFlaeche, { width: Math.max(size, 24), height: Math.max(size, 24) }]}>
        <View
          style={[
            styles.pin,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg, borderColor: c.border },
            selected && styles.pinSelected,
          ]}
        >
          <Text style={[styles.pinStar, { color: c.star, fontSize: selected ? 19 : klein ? 11 : 14 }]}>★</Text>
        </View>
      </View>
    </Marker>
  );
});

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

/** Zahlenblase auf der Karte, Farben aus BLASE. Ist ihre Liste offen, hat sie einen dunklen Ring. */
const Blase = memo(function Blase({
  g,
  stand,
  aktiv,
  name,
  onPress,
}: {
  g: Gruppe;
  stand: BlasenStand;
  aktiv: boolean;
  /** Anzahl und Stand für VoiceOver */
  name: string;
  onPress: (g: Gruppe) => void;
}) {
  const n = g.ids.length;
  const size = n >= 10 ? 38 : 34;
  const c = BLASE[stand];
  return (
    <Marker
      coordinate={{ latitude: g.lat, longitude: g.lng }}
      onPress={() => onPress(g)}
      tracksViewChanges={false}
      zIndex={stand === 'offen' ? 4 : stand === 'heute' ? 3 : 2}
      accessibilityLabel={name}
    >
      <View style={aktiv ? [styles.blaseRing, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }] : null}>
        <View
          style={[
            styles.blase,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg, borderColor: c.border },
          ]}
        >
          <Text style={[styles.blaseText, { color: c.text, fontSize: n >= 10 ? 14 : 15 }]}>{n}</Text>
        </View>
      </View>
    </Marker>
  );
});

export default function MarketMap() {
  const { result, now, pos, selectedId, setSelectedId, requestLocation, focusOn, focusToken, filters } = useStore();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const lastMarkerPress = useRef(0);
  // Zoomstufe aus dem Kartenausschnitt, danach richten sich die Zahlenblasen. Die Karte ist so breit wie der Bildschirm.
  const { width } = useWindowDimensions();
  const [zoom, setZoom] = useState(() => zoomAusBreite(BERLIN_REGION.longitudeDelta, width));
  // Zuletzt gezeigter Ausschnitt, für Plus und Minus
  const ausschnitt = useRef<Region>(BERLIN_REGION);
  // Höhe von Karte und Vorschaukarte, damit Plus und Minus über der Vorschau stehen
  const [hoehe, setHoehe] = useState({ karte: 0, vorschau: 0, legende: 0, liste: 0 });
  const hoeheRef = useRef(hoehe);
  hoeheRef.current = hoehe;
  // Offene Liste einer Zahlenblase. Ein Tipp auf die Blase zoomt nicht mehr, sondern zeigt ihre Märkte als Liste.
  const [blase, setBlase] = useState<string[] | null>(null);
  const blasenKey = blase ? blase.join('.') : '';
  const markets = result.list;
  const selected = markets.find((m) => m.id === selectedId) ?? null;
  const day = filters.when.kind === 'tag' ? filters.when.date : null;

  const fest = fixedLegend(filters, now);
  const tones = useMemo(() => {
    const t: Record<string, StatusTone> = {};
    for (const m of markets) t[m.id] = fest ? 'open' : statusNow(m, now).tone;
    return t;
  }, [markets, now, fest]);
  // Was die Farbe zeigt, steht auch im Namen des Sterns, für VoiceOver
  const namen = useMemo(() => {
    const t: Record<string, string> = {};
    for (const m of markets) t[m.id] = `${m.name}, ${fest ?? statusNow(m, now).label}`;
    return t;
  }, [markets, now, fest]);

  const onMarker = (id: string) => {
    lastMarkerPress.current = Date.now();
    setBlase(null);
    setSelectedId(id);
  };

  // Märkte, deren Sterne sich berühren, kommen in eine Zahlenblase. Der ausgewählte Markt bleibt immer einzeln.
  const byId = useMemo(() => new Map(markets.map((m) => [m.id, m])), [markets]);
  const gruppen = useMemo(
    () =>
      gruppieren(
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

  // Ein Tipp auf die Blase öffnet die Liste ihrer Märkte. Die Karte zoomt nicht. Liegt die Blase dort,
  // wo die Liste aufgeht, rückt die Karte nur nach oben, damit die Blase sichtbar bleibt.
  const oeffnen = useCallback(
    (g: Gruppe) => {
      lastMarkerPress.current = Date.now();
      setSelectedId(null);
      setBlase(g.ids);
      const r = ausschnitt.current;
      const vonOben = (r.latitude + r.latitudeDelta / 2 - g.lat) / r.latitudeDelta;
      if (vonOben > 0.4) mapRef.current?.animateToRegion({ ...r, latitude: g.lat - 0.25 * r.latitudeDelta }, 350);
    },
    [setSelectedId],
  );

  // „Heranzoomen“ in der Liste zoomt so weit hinein, dass die Märkte der Blase auseinanderrücken
  const heranzoomen = useCallback((ms: Market[]) => {
    lastMarkerPress.current = Date.now();
    mapRef.current?.fitToCoordinates(
      ms.map((m) => ({ latitude: m.lat, longitude: m.lng })),
      { edgePadding: { top: 110, right: 70, bottom: 110, left: 70 }, animated: true },
    );
  }, []);

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
    if (!markets.length) return;
    if (markets.length === 1) {
      mapRef.current?.animateToRegion(
        { latitude: markets[0].lat, longitude: markets[0].lng, latitudeDelta: 0.03, longitudeDelta: 0.03 },
        400,
      );
      return;
    }
    mapRef.current?.fitToCoordinates(
      markets.map((m) => ({ latitude: m.lat, longitude: m.lng })),
      { edgePadding: { top: 70, right: 50, bottom: 60, left: 50 }, animated: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // Die Vorschaukarte darf den gewählten Markt nicht verdecken. Er kommt in die Mitte der freien Fläche über ihr,
  // gerechnet mit der gemessenen Höhe von Karte und Vorschau.
  // zoomen: „Auf der Karte zeigen“ und Markt aus der Liste einer Blase. Sonst, beim Antippen eines Sterns,
  // rückt die Karte nur, wenn die Vorschau ihn verdecken würde.
  const ausrichten = useRef<string | null>(null);
  const vorschauFuer = useRef<string | null>(null);
  const legeFrei = (m: Market, vorschau: number, zoomen: boolean) => {
    const karte = hoeheRef.current.karte;
    if (!karte) return;
    const frei = karte - (insets.bottom + 10) - vorschau - 10;
    const anteil = Math.max(40, frei / 2) / karte;
    if (zoomen) {
      mapRef.current?.animateToRegion(
        { latitude: m.lat + (anteil - 0.5) * 0.025, longitude: m.lng, latitudeDelta: 0.025, longitudeDelta: 0.025 },
        450,
      );
      return;
    }
    const r = ausschnitt.current;
    const vonOben = (r.latitude + r.latitudeDelta / 2 - m.lat) / r.latitudeDelta;
    if (vonOben * karte > frei - 20) mapRef.current?.animateToRegion({ ...r, latitude: m.lat + (anteil - 0.5) * r.latitudeDelta }, 300);
  };

  // Aus der Detailansicht „Auf der Karte zeigen“ und aus der Liste einer Blase
  useEffect(() => {
    if (!focusToken || !selectedId) return;
    const m = byId.get(selectedId);
    if (!m) return;
    if (vorschauFuer.current === m.id && hoeheRef.current.vorschau) {
      legeFrei(m, hoeheRef.current.vorschau, true);
      return;
    }
    // Die Vorschau ist noch nicht gemessen: erst grob setzen, genau ausgerichtet wird, sobald sie gemessen ist
    ausrichten.current = m.id;
    legeFrei(m, Math.round(hoeheRef.current.karte * 0.6), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken]);

  const showBerlin = () => mapRef.current?.animateToRegion(BERLIN_REGION, 450);

  // Plus und Minus unten rechts wie früher bei Google Maps: halber oder doppelter Ausschnitt.
  // Ist zwischen Vorschaukarte und den Knöpfen oben rechts kein Platz, bleiben sie weg.
  const zoomen = (rein: boolean) => {
    const r = ausschnitt.current;
    const f = rein ? 0.5 : 2;
    mapRef.current?.animateToRegion(
      {
        latitude: r.latitude,
        longitude: r.longitude,
        latitudeDelta: Math.min(r.latitudeDelta * f, 3),
        longitudeDelta: Math.min(r.longitudeDelta * f, 3),
      },
      250,
    );
  };
  const zoomUnten = insets.bottom + 10 + (selected ? hoehe.vorschau + 10 : 0);
  // Die Legende wird nie halb verdeckt: Reicht die Vorschau oder die Liste einer Blase bis an sie heran,
  // ist sie so lange ganz weg.
  const kartenHoehe = selected ? hoehe.vorschau : blase ? hoehe.liste : 0;
  const legendeSichtbar = !kartenHoehe || hoehe.karte - (insets.bottom + 10) - kartenHoehe >= 10 + hoehe.legende + 8;
  // Bei offener Liste einer Blase bleiben Plus und Minus weg, dort gibt es „Heranzoomen“
  const zoomSichtbar = !blase && (!selected || hoehe.karte - zoomUnten - 88 >= 112);
  const blasenMaerkte = blase ? blase.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])) : [];

  const showMe = async () => {
    const p = pos ?? (await requestLocation());
    if (!p) {
      Alert.alert(
        'Standort nicht verfügbar',
        'Erlaube der App den Standortzugriff in den iOS-Einstellungen, dann zeigt sie Märkte in deiner Nähe.',
      );
      return;
    }
    mapRef.current?.animateToRegion(
      { latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.06, longitudeDelta: 0.06 },
      450,
    );
  };

  return (
    <View style={styles.wrap} onLayout={(e) => setHoehe((h) => ({ ...h, karte: e.nativeEvent.layout.height }))}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={BERLIN_REGION}
        showsUserLocation={!!pos}
        showsPointsOfInterests={false}
        showsBuildings={false}
        showsCompass={false}
        pitchEnabled={false}
        rotateEnabled={false}
        toolbarEnabled={false}
        userInterfaceStyle="light"
        onPress={() => {
          if (Date.now() - lastMarkerPress.current > 400) {
            setSelectedId(null);
            setBlase(null);
          }
        }}
        onRegionChangeComplete={(r) => {
          ausschnitt.current = r;
          const z = Math.round(zoomAusBreite(r.longitudeDelta, width) * 4) / 4;
          setZoom((alt) => (alt === z ? alt : z));
        }}
      >
        {gruppen.map((g) => {
          if (g.ids.length === 1) {
            const m = byId.get(g.ids[0])!;
            return (
              <Pin
                key={`${m.id}-${tones[m.id]}-0`}
                m={m}
                tone={tones[m.id]}
                selected={false}
                onPress={onMarker}
                name={namen[m.id]}
              />
            );
          }
          const { stand, offen, heute } = blasenStand(g.ids, tones);
          return (
            <Blase
              key={`b-${g.ids.join('.')}-${stand}-${g.ids.join('.') === blasenKey ? 1 : 0}`}
              g={g}
              stand={stand}
              aktiv={g.ids.join('.') === blasenKey}
              name={blasenText(g.ids.length, offen, fest, heute)}
              onPress={oeffnen}
            />
          );
        })}
        {selected ? (
          <Pin
            key={`${selected.id}-${tones[selected.id]}-1`}
            m={selected}
            tone={tones[selected.id]}
            selected
            onPress={onMarker}
            name={namen[selected.id]}
          />
        ) : null}
      </MapView>

      <View
        style={[styles.legend, !legendeSichtbar && styles.versteckt]}
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
          style={[styles.preview, { bottom: insets.bottom + 10 }]}
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
          style={[styles.preview, { bottom: insets.bottom + 10 }]}
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
            fokus={false}
            onWaehlen={(id) => {
              setBlase(null);
              focusOn(id);
            }}
            onHeranzoomen={() => {
              setBlase(null);
              heranzoomen(blasenMaerkte);
            }}
            onSchliessen={() => setBlase(null)}
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
  wrap: { flex: 1, backgroundColor: colors.flaeche },
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...shadow,
  },
  pinSelected: { borderWidth: 3 },
  pinFlaeche: { alignItems: 'center', justifyContent: 'center' },
  pinStar: { fontWeight: '700', marginTop: -1 },
  blase: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    ...shadow,
  },
  blaseText: { fontWeight: '800' },
  blaseRing: { borderWidth: 3, borderColor: colors.tinte, alignItems: 'center', justifyContent: 'center' },
  legend: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    ...shadow,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  // Unsichtbar statt entfernt, damit die gemessene Höhe bleibt und nichts flackert
  versteckt: { opacity: 0 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 7 },
  legendText: { fontSize: 13, color: colors.tinte },
  tools: { position: 'absolute', right: 10, top: 10, gap: 8 },
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
  preview: { position: 'absolute', left: 10, right: 10 },
  empty: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    backgroundColor: colors.weiss,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    ...shadow,
  },
  emptyText: { fontSize: 15, color: colors.tinte, fontWeight: '600' },
});
