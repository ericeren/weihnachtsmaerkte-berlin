import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { distanceText, hoursOn, statusNow } from '../lib/format';
import { TYP_LABEL } from '../lib/labels';
import { colors } from '../theme';
import type { Market, Moment } from '../types';
import { TONE_COLOR } from './StatusPill';

interface Props {
  m: Market;
  now: Moment;
  /** bei Datumsfilter: Zeiten an diesem Tag zeigen */
  day: string | null;
  distanceKm?: number;
  /** Ohne Angabe öffnet ein Tipp die Detailseite, in der Liste einer Zahlenblase zeigt er den Markt auf der Karte */
  onPress?: () => void;
}

function MarketRow({ m, now, day, distanceKm, onPress }: Props) {
  const st = statusNow(m, now);
  const dayText = day && day !== now.date ? hoursOn(m, day, now.date) : null;
  const free = m.eintritt.art === 'frei' || m.eintritt.art === 'spende';
  const toneText =
    st.tone === 'open' ? colors.gruen : st.tone === 'soon' ? colors.rot : colors.grauZu;

  return (
    <Pressable
      onPress={onPress ?? (() => router.push(`/markt/${m.id}`))}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={[styles.bar, { backgroundColor: TONE_COLOR[st.tone] }]} />
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={2}>
          {m.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {m.bezirk}, {TYP_LABEL[m.typ]}
        </Text>
        <Text style={[styles.status, { color: toneText }]} numberOfLines={1}>
          {st.label}
        </Text>
        {dayText ? (
          <Text style={styles.day} numberOfLines={1}>
            {dayText}
          </Text>
        ) : null}
      </View>
      <View style={styles.side}>
        {distanceKm !== undefined ? <Text style={styles.dist}>{distanceText(distanceKm)}</Text> : null}
        <Text style={[styles.fee, free ? styles.feeFree : null]} numberOfLines={1}>
          {m.eintritt.art === 'frei'
            ? 'frei'
            : m.eintritt.art === 'spende'
              ? 'Spende'
              : m.eintritt.art === 'ticket'
                ? 'Ticket'
                : m.eintritt.art === 'kosten'
                  ? 'kostet'
                  : ''}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.grauHell} />
      </View>
    </Pressable>
  );
}

export default memo(MarketRow);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.weiss,
    paddingVertical: 12,
    paddingRight: 12,
    minHeight: 76,
  },
  pressed: { backgroundColor: colors.flaeche },
  bar: { width: 4, borderRadius: 2, marginLeft: 8, marginRight: 12 },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '600', color: colors.tinte, lineHeight: 22 },
  meta: { fontSize: 14, color: colors.grau, marginTop: 2 },
  status: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  day: { fontSize: 14, color: colors.tinte, marginTop: 2 },
  side: { alignItems: 'flex-end', justifyContent: 'space-between', marginLeft: 8, minWidth: 54 },
  dist: { fontSize: 14, color: colors.tinte, fontWeight: '600', fontVariant: ['tabular-nums'] },
  fee: { fontSize: 13, color: colors.grau },
  feeFree: { color: colors.gruen, fontWeight: '600' },
});
