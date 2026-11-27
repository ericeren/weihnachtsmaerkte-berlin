import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useEffect, useMemo, useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BERLIN_REGION } from '../lib/geo';
import { fixedLegend, statusNow } from '../lib/format';
import type { StatusTone } from '../lib/time';
import { useStore } from '../state/Store';
import { colors, shadow } from '../theme';
import type { Market } from '../types';
import MarketPreview from './MarketPreview';

const PIN: Record<StatusTone, { bg: string; border: string; star: string }> = {
  open: { bg: colors.rot, border: colors.weiss, star: colors.weiss },
  soon: { bg: colors.weiss, border: colors.rot, star: colors.rot },
  later: { bg: '#6B7079', border: colors.weiss, star: colors.weiss },
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
      <View
        style={[
          styles.pin,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg, borderColor: c.border },
          selected && styles.pinSelected,
        ]}
      >
        <Text style={[styles.pinStar, { color: c.star, fontSize: selected ? 19 : klein ? 11 : 14 }]}>★</Text>
      </View>
    </Marker>
  );
});

export default function MarketMap() {
  const { result, now, pos, selectedId, setSelectedId, requestLocation, focusToken, filters } = useStore();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const lastMarkerPress = useRef(0);
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
    setSelectedId(id);
  };

  // Bei geänderter Auswahl durch Filter auf die Treffer zoomen
  const idsKey = markets.map((m) => m.id).join(',');
  const firstRun = useRef(true);
  useEffect(() => {
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

  // Aus der Detailansicht: "Auf der Karte zeigen"
  useEffect(() => {
    if (!focusToken || !selectedId) return;
    const m = markets.find((x) => x.id === selectedId);
    if (!m) return;
    mapRef.current?.animateToRegion(
      { latitude: m.lat - 0.004, longitude: m.lng, latitudeDelta: 0.025, longitudeDelta: 0.025 },
      450,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken]);

  const showBerlin = () => mapRef.current?.animateToRegion(BERLIN_REGION, 450);

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
    <View style={styles.wrap}>
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
          if (Date.now() - lastMarkerPress.current > 400) setSelectedId(null);
        }}
      >
        {markets.map((m) => (
          <Pin
            key={`${m.id}-${tones[m.id]}-${m.id === selectedId ? 1 : 0}`}
            m={m}
            tone={tones[m.id]}
            selected={m.id === selectedId}
            onPress={onMarker}
            name={namen[m.id]}
          />
        ))}
      </MapView>

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
        <View style={[styles.preview, { bottom: insets.bottom + 10 }]}>
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
  wrap: { flex: 1, backgroundColor: colors.flaeche },
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...shadow,
  },
  pinSelected: { borderWidth: 3 },
  pinStar: { fontWeight: '700', marginTop: -1 },
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
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 7 },
  legendDotKlein: { width: 9, height: 9, borderRadius: 4.5, marginLeft: 1.5, marginRight: 8.5 },
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
