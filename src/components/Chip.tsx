import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  count?: number;
  disabled?: boolean;
  compact?: boolean;
  /** Kreuz rechts im Chip, zum Beispiel um einen gewählten Zeitpunkt zu entfernen */
  onClear?: () => void;
  clearLabel?: string;
}

export default function Chip({ label, selected, onPress, icon, count, disabled, compact, onClear, clearLabel }: Props) {
  const fg = selected ? colors.weiss : disabled ? colors.grauHell : colors.tinte;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.compact,
        selected && styles.selected,
        pressed && !selected && styles.pressed,
      ]}
      hitSlop={4}
    >
      {icon ? <Ionicons name={icon} size={16} color={fg} style={styles.icon} /> : null}
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      {count ? (
        <View style={[styles.badge, selected && styles.badgeSel]}>
          <Text style={[styles.badgeText, selected && styles.badgeTextSel]}>{count}</Text>
        </View>
      ) : null}
      {onClear ? (
        <Pressable
          onPress={onClear}
          hitSlop={10}
          style={styles.clear}
          accessibilityRole="button"
          accessibilityLabel={clearLabel ?? 'Entfernen'}
        >
          <Ionicons name="close" size={17} color={fg} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.linie,
    backgroundColor: colors.weiss,
  },
  compact: { minHeight: 34, paddingHorizontal: 12 },
  selected: { backgroundColor: colors.rot, borderColor: colors.rot },
  pressed: { backgroundColor: colors.flaeche },
  icon: { marginRight: 6 },
  clear: { marginLeft: 8, marginRight: -4, paddingLeft: 6, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(255,255,255,0.6)' },
  label: { fontSize: 15, fontWeight: '500' },
  badge: {
    marginLeft: 6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.rot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSel: { backgroundColor: colors.weiss },
  badgeText: { color: colors.weiss, fontSize: 12, fontWeight: '700' },
  badgeTextSel: { color: colors.rot },
});
