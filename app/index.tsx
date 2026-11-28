import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Chip from '../src/components/Chip';
import Logo from '../src/components/Logo';
import MarketList from '../src/components/MarketList';
import MarketMap from '../src/components/MarketMap';
import Skyline from '../src/components/Skyline';
import WhenSheet from '../src/components/WhenSheet';
import { clock, dateShort, momentText, plural } from '../src/lib/format';
import { extraFilterCount, isDefault } from '../src/lib/filter';
import { BESTER_MOMENT, HAUPTSAISON_ENDE } from '../src/lib/saison';
import { LOC_HELP, notify } from '../src/lib/notify';
import { useStore } from '../src/state/Store';
import { colors, font, kopfHoehe } from '../src/theme';

export default function Home() {
  const insets = useSafeAreaInsets();
  // Logo, Titel und die beiden Knöpfe teilen sich die Breite, unter 360 Punkt wird das Logo kleiner.
  // „Weihnachtsmärkte“ braucht bei 26 Punkt Schrift rund 245 Punkte. Die Schrift wird so groß, wie der
  // Platz erlaubt: 21 Punkt bei 375, 22 bei 390 und 26 ab 430 Punkt Breite.
  // Der Kopf ist so hoch wie auf den Unterseiten, das Logo lässt oben und unten je 10 Punkte frei.
  // Unter 360 Punkt wird auch der Untertitel kleiner, damit er in eine Zeile passt.
  const { width } = useWindowDimensions();
  const schmal = width < 360;
  const logoGroesse = schmal ? 46 : 54;
  const titelPlatz = width - 16 - logoGroesse - 12 - 78 - 16;
  const titelGroesse = Math.max(15, Math.min(font.title, Math.floor((font.title * titelPlatz) / 245)));
  const { view, setView, filters, setFilters, resetFilters, result, now, requestLocation, setSelectedId } = useStore();
  // Nach der Hauptsaison hilft ein Rückblick auf den Moment, an dem die meisten Märkte offen hatten
  const nachSaison = now.date > HAUPTSAISON_ENDE && filters.when.kind !== 'tag';
  const [sheet, setSheet] = useState(false);
  // Höhe des grünen Kopfs, danach richtet sich die Skyline
  const [kopfH, setKopfH] = useState(0);
  const w = filters.when;
  const isToday = w.kind === 'tag' && w.date === now.date && filters.time === null;
  // eigener Zeitpunkt aus der Datums- und Uhrzeitwahl, alles außer „Heute“ ohne Uhrzeit
  const moment = w.kind === 'tag' && !isToday ? momentText(w.date, filters.time, now.date) : null;
  const extra = extraFilterCount(filters);

  const toggleWhen = (kind: 'jetzt' | 'heute' | 'wochenende') => {
    setSelectedId(null);
    if (kind === 'jetzt') setFilters({ when: w.kind === 'jetzt' ? { kind: 'alle' } : { kind: 'jetzt' }, time: null });
    else if (kind === 'heute')
      setFilters({ when: isToday ? { kind: 'alle' } : { kind: 'tag', date: now.date }, time: null });
    else setFilters({ when: w.kind === 'wochenende' ? { kind: 'alle' } : { kind: 'wochenende' }, time: null });
  };

  const toggleNear = async () => {
    if (filters.radiusKm !== null) {
      setFilters({ radiusKm: null, sort: filters.sort === 'distanz' ? 'status' : filters.sort });
      return;
    }
    const p = await requestLocation();
    if (!p) {
      notify('Standort nicht verfügbar', LOC_HELP);
      return;
    }
    setFilters({ radiusKm: 3, sort: 'distanz' });
  };

  let summary = plural(result.list.length, 'Markt', 'Märkte');
  if (w.kind === 'alle' || w.kind === 'jetzt') summary += `, ${result.openNow} jetzt geöffnet`;
  if (w.kind === 'tag') {
    summary += w.date === now.date ? ' heute' : ` am ${dateShort(w.date)}`;
    if (filters.time !== null) summary += ` um ${clock(filters.time)} Uhr`;
  }
  if (w.kind === 'wochenende') summary += ' am Wochenende';
  if (filters.radiusKm !== null) summary += `, bis ${filters.radiusKm} km`;

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <View
          style={[styles.kopf, { paddingTop: insets.top }]}
          onLayout={(e) => setKopfH(Math.round(e.nativeEvent.layout.height))}
        >
          {kopfH ? <Skyline height={kopfH} /> : null}
          <View style={styles.header}>
            <Logo size={logoGroesse} />
            <View style={styles.titleBox}>
              <Text
                style={[styles.title, { fontSize: titelGroesse }]}
                accessibilityRole="header"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Weihnachtsmärkte
              </Text>
              <Text style={[styles.subtitle, schmal && styles.subtitleSchmal]}>Berlin, Saison 2026/27</Text>
            </View>
            <Pressable
              onPress={() => router.push('/saison')}
              hitSlop={10}
              style={styles.statsBtn}
              accessibilityRole="button"
              accessibilityLabel="Saison in Zahlen"
            >
              <Ionicons name="stats-chart-outline" size={31} color={colors.weiss} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/info')}
              hitSlop={10}
              style={styles.infoBtn}
              accessibilityRole="button"
              accessibilityLabel="Über die App und Impressum"
            >
              <Ionicons name="information-circle-outline" size={35} color={colors.weiss} />
            </Pressable>
          </View>
        </View>
        <View style={styles.rule} />

        <View style={styles.toolbar}>
          <View style={styles.segment} accessibilityRole="tablist">
            {(['karte', 'liste'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => setView(v)}
                style={[styles.segBtn, view === v && styles.segBtnOn]}
                accessibilityRole="tab"
                aria-selected={view === v}
              >
                <Ionicons
                  name={v === 'karte' ? 'map-outline' : 'list-outline'}
                  size={18}
                  color={view === v ? colors.weiss : colors.tinte}
                />
                <Text style={[styles.segText, view === v && styles.segTextOn]}>{v === 'karte' ? 'Karte' : 'Liste'}</Text>
              </Pressable>
            ))}
          </View>
          <Chip label="Filter" icon="options-outline" count={extra || undefined} onPress={() => router.push('/filter')} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Jetzt offen" icon="time-outline" selected={w.kind === 'jetzt'} onPress={() => toggleWhen('jetzt')} />
          <Chip label="Heute" icon="today-outline" selected={isToday} onPress={() => toggleWhen('heute')} />
          <Chip
            label="Wochenende"
            icon="star-outline"
            selected={w.kind === 'wochenende'}
            onPress={() => toggleWhen('wochenende')}
          />
          <Chip
            label={moment ?? 'Datum & Uhrzeit'}
            icon="calendar-outline"
            selected={!!moment}
            onPress={() => setSheet(true)}
            onClear={moment ? () => setFilters({ when: { kind: 'alle' }, time: null }) : undefined}
            clearLabel="Zeitpunkt entfernen"
          />
          <Chip
            label="Eintritt frei"
            icon="ticket-outline"
            selected={filters.frei}
            onPress={() => setFilters({ frei: !filters.frei })}
          />
          <Chip
            label="In der Nähe"
            icon="navigate-outline"
            selected={filters.radiusKm !== null}
            onPress={toggleNear}
          />
        </ScrollView>

        <View style={styles.summaryRow}>
          <Text style={styles.summary} numberOfLines={1}>
            {summary}
          </Text>
          {!isDefault(filters) ? (
            <Pressable onPress={resetFilters} hitSlop={8} accessibilityRole="button">
              <Text style={styles.reset}>Zurücksetzen</Text>
            </Pressable>
          ) : null}
        </View>

        {nachSaison ? (
          <View style={styles.rueckblick}>
            <Ionicons name="time-outline" size={18} color={colors.gelb} />
            <Text style={styles.rueckblickText}>
              Die Hauptsaison ist vorbei, die meisten Märkte haben geschlossen.{' '}
              <Text
                style={styles.rueckblickLink}
                onPress={() => setFilters({ when: { kind: 'tag', date: BESTER_MOMENT.date }, time: BESTER_MOMENT.minutes })}
                accessibilityRole="button"
              >
                Rückblick: {dateShort(BESTER_MOMENT.date)}, {BESTER_MOMENT.minutes / 60} Uhr, als {BESTER_MOMENT.offen} Märkte offen hatten
              </Text>
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>{view === 'karte' ? <MarketMap /> : <MarketList />}</View>
      <WhenSheet visible={sheet} onClose={() => setSheet(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.creme },
  top: { backgroundColor: colors.creme, zIndex: 2 },
  kopf: { backgroundColor: colors.tanne, overflow: 'hidden' },
  // Mindesthöhe statt fester Höhe: Bei sehr großer Schrift wächst der Kopf mit, statt Text abzuschneiden
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: kopfHoehe },
  titleBox: { flex: 1, marginLeft: 12 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.weiss, letterSpacing: -0.4 },
  subtitle: { fontSize: 15, color: colors.kopfGrau, marginTop: 2 },
  subtitleSchmal: { fontSize: 13 },
  infoBtn: { width: 42, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -6 },
  statsBtn: { width: 42, height: 48, alignItems: 'center', justifyContent: 'center' },
  rule: { height: 3, backgroundColor: colors.rot },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.cremeDunkel,
    borderRadius: 10,
    padding: 3,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    borderRadius: 8,
  },
  segBtnOn: { backgroundColor: colors.tanne },
  segText: { fontSize: 15, fontWeight: '600', color: colors.tinte },
  segTextOn: { color: colors.weiss },
  chips: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 8 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.linieWarm,
  },
  summary: { fontSize: font.small, color: colors.grau, flex: 1 },
  reset: { fontSize: font.small, color: colors.rot, fontWeight: '600', marginLeft: 12 },
  rueckblick: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.gelbHell,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rueckblickText: { flex: 1, fontSize: font.small, lineHeight: 20, color: colors.gelb },
  rueckblickLink: { fontWeight: '700', textDecorationLine: 'underline' },
  content: { flex: 1 },
});
