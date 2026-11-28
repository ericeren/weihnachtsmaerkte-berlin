import { StyleSheet, Text, View } from 'react-native';

import type { StatusTone } from '../lib/time';
import { colors } from '../theme';

const TONES: Record<StatusTone, { bg: string; fg: string; dot: string }> = {
  open: { bg: colors.gruenHell, fg: colors.gruen, dot: colors.gruen },
  // „Heute noch“ rot wie auf der Karte, so hat Eric es gewählt
  soon: { bg: colors.rotHell, fg: colors.rot, dot: colors.rot },
  // Punkt im Grau der Karte. Die Schrift bleibt etwas dunkler, damit sie auf der Fläche gut lesbar ist.
  later: { bg: colors.flaeche, fg: colors.grau, dot: colors.grauZu },
  ended: { bg: colors.flaeche, fg: colors.grau, dot: colors.grauHell },
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
  soon: colors.rot,
  later: colors.grauZu,
  ended: colors.grauHell,
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
