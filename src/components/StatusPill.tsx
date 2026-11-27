import { StyleSheet, Text, View } from 'react-native';

import type { StatusTone } from '../lib/time';
import { colors } from '../theme';

const TONES: Record<StatusTone, { bg: string; fg: string; dot: string }> = {
  open: { bg: colors.gruenHell, fg: colors.gruen, dot: colors.gruen },
  soon: { bg: colors.gelbHell, fg: colors.gelb, dot: '#D08A00' },
  later: { bg: colors.flaeche, fg: colors.grau, dot: colors.grauHell },
  ended: { bg: colors.flaeche, fg: colors.grauHell, dot: colors.grauHell },
};

export default function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <View style={[styles.dot, { backgroundColor: t.dot }]} />
      <Text style={[styles.text, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export const TONE_COLOR: Record<StatusTone, string> = {
  open: colors.gruen,
  soon: '#D08A00',
  later: colors.linie,
  ended: colors.linie,
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: '100%',
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  text: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
});
