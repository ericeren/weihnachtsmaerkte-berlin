import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Chip from '../src/components/Chip';
import WhenSheet from '../src/components/WhenSheet';
import { BEZIRKE } from '../src/data';
import { momentText, plural } from '../src/lib/format';
import { SORT_LABEL, TYP_LABEL, TYP_ORDER } from '../src/lib/labels';
import { IS_WEB, LOC_HELP, LOC_OFF, notify } from '../src/lib/notify';
import { useStore } from '../src/state/Store';
import { colors, radius } from '../src/theme';
import type { SortMode, Typ, When } from '../src/types';

const RADII = [1, 2, 3, 5, 10];
const SORTS: SortMode[] = ['status', 'start', 'name', 'distanz'];

function Block({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle} accessibilityRole="header">
        {title}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      {/* Eingeschaltet rot wie die gewählten Filter, der Knopf immer weiß, so wollte Eric es.
          activeThumbColor gibt es nur im Browser, ohne ihn wäre der Knopf dort türkis. */}
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.rot, false: colors.linie }}
        thumbColor={colors.weiss}
        ios_backgroundColor={colors.linie}
        {...({ activeThumbColor: colors.weiss } as object)}
        accessibilityLabel={label}
      />
    </View>
  );
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function FilterScreen() {
  const insets = useSafeAreaInsets();
  const { filters, setFilters, resetFilters, now, result, pos, locStatus, requestLocation } = useStore();
  const [sheet, setSheet] = useState(false);
  const w = filters.when;
  const moment = w.kind === 'tag' ? momentText(w.date, filters.time, now.date) : null;

  const setWhen = (when: When) => setFilters({ when, time: null });

  const pickRadius = async (r: number | null) => {
    if (r === null) return setFilters({ radiusKm: null });
    const p = pos ?? (await requestLocation());
    if (!p) {
      notify('Standort nicht verfügbar', LOC_HELP);
      return;
    }
    setFilters({ radiusKm: r });
  };

  const pickSort = async (s: SortMode) => {
    if (s === 'distanz' && !pos && !(await requestLocation())) return;
    setFilters({ sort: s });
  };

  const locText =
    locStatus === 'granted'
      ? 'Standort bekannt, Entfernungen werden angezeigt.'
      : locStatus === 'denied'
        ? LOC_OFF
        : locStatus === 'loading'
          ? 'Standort wird bestimmt.'
          : 'Für Entfernungen fragt die App einmal nach deinem Standort. Er bleibt auf dem Gerät.';

  return (
    <View style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Block title="Wann?">
          <View style={styles.wrap}>
            <Chip label="Alle Termine" selected={w.kind === 'alle'} onPress={() => setWhen({ kind: 'alle' })} />
            <Chip label="Jetzt geöffnet" selected={w.kind === 'jetzt'} onPress={() => setWhen({ kind: 'jetzt' })} />
            <Chip label="Wochenende" selected={w.kind === 'wochenende'} onPress={() => setWhen({ kind: 'wochenende' })} />
          </View>
          <View style={[styles.when, moment !== null && styles.whenOn]}>
            <Pressable
              onPress={() => setSheet(true)}
              style={styles.whenMain}
              accessibilityRole="button"
              accessibilityHint="Öffnet die Auswahl für Datum und Uhrzeit"
            >
              <Ionicons name="calendar-outline" size={24} color={moment ? colors.rot : colors.tinte} />
              <View style={styles.whenTexts}>
                <Text style={styles.whenLabel}>Datum und Uhrzeit</Text>
                <Text style={[styles.whenValue, moment !== null && styles.whenValueOn]} numberOfLines={1}>
                  {moment ?? 'Eigenen Zeitpunkt wählen'}
                </Text>
              </View>
              {moment === null ? <Ionicons name="chevron-forward" size={20} color={colors.grau} /> : null}
            </Pressable>
            {moment !== null ? (
              <Pressable
                onPress={() => setWhen({ kind: 'alle' })}
                hitSlop={10}
                style={styles.whenClear}
                accessibilityRole="button"
                accessibilityLabel="Zeitpunkt entfernen"
              >
                <Ionicons name="close-circle" size={24} color={colors.grau} />
              </Pressable>
            ) : null}
          </View>
        </Block>

        <Block title="Art des Markts">
          <View style={styles.wrap}>
            {TYP_ORDER.map((t: Typ) => (
              <Chip
                key={t}
                label={TYP_LABEL[t]}
                selected={filters.typen.includes(t)}
                onPress={() => setFilters((f) => ({ ...f, typen: toggle(f.typen, t) }))}
              />
            ))}
          </View>
        </Block>

        <Block title="Bezirk">
          <View style={styles.wrap}>
            {BEZIRKE.map((b) => (
              <Chip
                key={b}
                label={b}
                selected={filters.bezirke.includes(b)}
                onPress={() => setFilters((f) => ({ ...f, bezirke: toggle(f.bezirke, b) }))}
              />
            ))}
          </View>
        </Block>

        <Block title="Eintritt und Zugang">
          <SwitchRow label="Nur ohne Eintritt" value={filters.frei} onChange={(v) => setFilters({ frei: v })} />
          <SwitchRow
            label="Nur barrierefrei (laut Veranstalter)"
            value={filters.barrierefrei}
            onChange={(v) => setFilters({ barrierefrei: v })}
          />
        </Block>

        <Block title="Entfernung" hint={locText}>
          <View style={styles.wrap}>
            <Chip label="Egal" selected={filters.radiusKm === null} onPress={() => pickRadius(null)} />
            {RADII.map((r) => (
              <Chip key={r} label={`bis ${r} km`} selected={filters.radiusKm === r} onPress={() => pickRadius(r)} />
            ))}
          </View>
        </Block>

        <Block title="Sortierung der Liste">
          <View style={styles.wrap}>
            {SORTS.map((s) => (
              <Chip key={s} label={SORT_LABEL[s]} selected={filters.sort === s} onPress={() => pickSort(s)} />
            ))}
          </View>
        </Block>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable onPress={resetFilters} style={styles.barReset} accessibilityRole="button">
          <Text style={styles.barResetText}>Zurücksetzen</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.barGo} accessibilityRole="button">
          <Text style={styles.barGoText}>{plural(result.list.length, 'Markt', 'Märkte')} anzeigen</Text>
        </Pressable>
      </View>
      <WhenSheet visible={sheet} onClose={() => setSheet(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.creme },
  content: { padding: 16, paddingBottom: 32 },
  block: { marginBottom: 26 },
  blockTitle: { fontSize: 18, fontWeight: '700', color: colors.tinte, marginBottom: 10 },
  hint: { fontSize: 14, color: colors.grau, marginTop: -4, marginBottom: 10, lineHeight: 19 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  when: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    minHeight: 64,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.linie,
    backgroundColor: colors.weiss,
  },
  whenOn: { borderColor: colors.rot, backgroundColor: colors.rotHell },
  whenMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  whenTexts: { flex: 1 },
  whenLabel: { fontSize: 13, color: colors.grau, fontWeight: '600' },
  whenValue: { fontSize: 17, color: colors.tinte, fontWeight: '600', marginTop: 2 },
  whenValueOn: { color: colors.rotDunkel },
  whenClear: { paddingHorizontal: 14, alignSelf: 'stretch', justifyContent: 'center' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.linie,
  },
  switchLabel: { fontSize: 16, color: colors.tinte, flex: 1, marginRight: 12 },
  bar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.linie,
    backgroundColor: colors.creme,
  },
  barReset: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.linie,
    backgroundColor: colors.weiss,
    justifyContent: 'center',
  },
  barResetText: { fontSize: 16, fontWeight: '600', color: colors.tinte },
  barGo: { flex: 1, minHeight: 48, borderRadius: radius, backgroundColor: colors.rot, alignItems: 'center', justifyContent: 'center' },
  barGoText: { fontSize: 16, fontWeight: '700', color: colors.weiss },
});
