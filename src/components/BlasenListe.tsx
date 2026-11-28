import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentRef, useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { StatusTone } from '../lib/time';
import { colors, radius, shadow } from '../theme';
import type { Market, Moment } from '../types';
import MarketRow from './MarketRow';

/**
 * Liste, die ein Tipp auf eine Zahlenblase öffnet. Die Karte bleibt dabei stehen, damit nichts verschwindet:
 * Eric hat beobachtet, dass Zoomen beim Antippen verwirrt, weil die Blase danach weg ist und man neu suchen muss.
 * Ein Tipp auf einen Markt zeigt ihn auf der Karte mit der Vorschau, „Heranzoomen“ zoomt wie früher hinein.
 */

interface Props {
  maerkte: Market[];
  /** Stand je Markt wie auf der Karte, danach wird sortiert: offen, heute noch, geschlossen */
  tones: Record<string, StatusTone>;
  /** Legt der Filter einen Zeitpunkt fest, steht dieser Text statt der Zählung, z. B. „Offen um 18 Uhr“ */
  fest: string | null;
  now: Moment;
  day: string | null;
  distances?: Record<string, number>;
  maxHeight: number;
  /** Per Tastatur geöffnet: Fokus in die Liste setzen (nur Webseite) */
  fokus: boolean;
  onWaehlen: (id: string) => void;
  onHeranzoomen: () => void;
  onSchliessen: () => void;
}

const RANG: Record<StatusTone, number> = { open: 0, soon: 1, later: 2, ended: 3 };

export default function BlasenListe(p: Props) {
  const { maerkte, tones, fest, distances } = p;
  const titel = `${maerkte.length} Märkte an dieser Stelle`;

  const sortiert = useMemo(
    () =>
      [...maerkte].sort(
        (a, b) =>
          RANG[tones[a.id]] - RANG[tones[b.id]] ||
          (distances ? (distances[a.id] ?? 0) - (distances[b.id] ?? 0) : 0) ||
          a.name.localeCompare(b.name, 'de'),
      ),
    [maerkte, tones, distances],
  );

  const offen = maerkte.filter((m) => tones[m.id] === 'open').length;
  const heute = maerkte.filter((m) => tones[m.id] === 'soon').length;
  const stand = fest
    ? fest
    : [
        offen ? `${offen} jetzt offen` : '',
        heute ? `${heute} ${heute === 1 ? 'öffnet' : 'öffnen'} heute noch` : '',
      ]
        .filter(Boolean)
        .join(', ') || 'Heute öffnet hier keiner mehr';

  // Webseite: per Tastatur geöffnet, landet der Fokus in der Liste, damit man mit Tab weitergehen kann
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (Platform.OS === 'web' && p.fokus) (ref.current as unknown as HTMLElement | null)?.focus?.();
  }, [p.fokus]);
  const webProps = Platform.OS === 'web' ? { role: 'region', 'aria-label': titel, tabIndex: -1 } : {};

  return (
    <View ref={ref} style={[styles.card, { maxHeight: p.maxHeight }]} {...(webProps as object)}>
      <View style={styles.kopf}>
        <Text style={styles.titel} accessibilityRole="header">
          {titel}
        </Text>
        <Pressable onPress={p.onSchliessen} style={styles.close} hitSlop={10} accessibilityLabel="Liste schließen">
          <Ionicons name="close" size={20} color={colors.grau} />
        </Pressable>
      </View>
      {/* Stand und „Heranzoomen“ in einer Zeile, damit mehr Märkte sichtbar sind. Wird es eng, bricht der Stand um. */}
      <View style={styles.zeile}>
        <Text style={styles.stand}>{stand}</Text>
        <Pressable onPress={p.onHeranzoomen} style={styles.zoomBtn} accessibilityRole="button">
          <Ionicons name="search-outline" size={16} color={colors.rot} />
          <Text style={styles.zoomText}>Heranzoomen</Text>
        </Pressable>
      </View>
      <View style={styles.linie} />
      <ScrollView style={styles.liste} contentContainerStyle={styles.listeInhalt}>
        {sortiert.map((m, i) => (
          <View key={m.id}>
            {i ? <View style={styles.sep} /> : null}
            <MarketRow
              m={m}
              now={p.now}
              day={p.day}
              distanceKm={distances ? distances[m.id] : undefined}
              onPress={() => p.onWaehlen(m.id)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.weiss, borderRadius: 14, overflow: 'hidden', ...shadow },
  kopf: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 14, paddingHorizontal: 14 },
  titel: { flex: 1, minWidth: 0, paddingRight: 8, fontSize: 18, fontWeight: '700', color: colors.tinte, lineHeight: 23 },
  zeile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
  },
  stand: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 19, color: colors.grau },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.flaeche,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
    marginRight: -6,
  },
  zoomBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 40,
    paddingHorizontal: 11,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.linie,
  },
  zoomText: { fontSize: 14, fontWeight: '600', color: colors.rot },
  linie: { height: StyleSheet.hairlineWidth, backgroundColor: colors.linie },
  liste: { flexGrow: 0, flexShrink: 1 },
  listeInhalt: { paddingBottom: 6 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.linie, marginLeft: 24 },
});
