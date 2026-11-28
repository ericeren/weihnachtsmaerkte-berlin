import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import StatusPill from '../../src/components/StatusPill';
import { BILDER, BY_ID, IMAGES, STAND } from '../../src/data';
import { openRoute, openWebsite, routeUrl, shareMarket, webLink } from '../../src/lib/actions';
import {
  dateNum,
  dateShort,
  distanceText,
  hoursText,
  isShortRun,
  seasonText,
  statusNow,
  weeklyRows,
} from '../../src/lib/format';
import { EINTRITT_LABEL, TYP_LABEL } from '../../src/lib/labels';
import { IS_WEB } from '../../src/lib/notify';
import { openingDays } from '../../src/lib/time';
import { useStore } from '../../src/state/Store';
import { colors, radius } from '../../src/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function Section({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={18} color={colors.rot} />
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLeft}>{left}</Text>
      <Text style={styles.rowRight}>{right}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  url,
  primary,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Ziel nach außen: auf der Webseite wird der Knopf damit ein echter Link */
  url?: string;
  primary?: boolean;
}) {
  const link = url ? webLink(url) : undefined;
  return (
    <Pressable
      {...link}
      onPress={link ? undefined : onPress}
      style={({ pressed }) => [styles.action, primary && styles.actionPrimary, pressed && { opacity: 0.75 }]}
      accessibilityRole={link ? 'link' : 'button'}
    >
      <Ionicons name={icon} size={18} color={primary ? colors.weiss : colors.rot} />
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

export default function MarketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { now, pos, result, focusOn } = useStore();
  const insets = useSafeAreaInsets();
  const m = id ? BY_ID[id] : undefined;

  // Auf der Webseite trägt der Tab den Namen des Markts. So steht er auch in der Besucherstatistik.
  useEffect(() => {
    if (!IS_WEB || !m) return;
    const vorher = document.title;
    document.title = `${m.name} | Weihnachtsmärkte Berlin`;
    return () => {
      document.title = vorher;
    };
  }, [m]);

  if (!m) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Markt nicht gefunden' }} />
        <Text style={styles.missingText}>Diesen Markt gibt es nicht mehr in der Liste.</Text>
      </View>
    );
  }

  const st = statusNow(m, now);
  const img = m.bild ? IMAGES[m.bild] : undefined;
  const credit = m.bild ? BILDER[m.bild] : undefined;
  const short = isShortRun(m);
  const days = openingDays(m, now.date, 12);
  const futureSpecial = Object.entries(m.sonder)
    .filter(([d]) => d >= now.date)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  const futureClosed = m.zu.filter((d) => d >= now.date && d >= m.von && d <= m.bis);
  const dist = pos ? result.distances[m.id] : undefined;
  const inResult = result.list.some((x) => x.id === m.id);

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      {/* Im grünen Kopf steht der Name neben dem Pfeil, wie auf den anderen Seiten. Lange Namen enden dort mit „…“. */}
      <Stack.Screen options={{ title: m.name }} />
      {img ? (
        <View>
          <Image source={img} style={styles.hero} contentFit="cover" transition={200} accessibilityLabel={`Foto: ${m.name}`} />
          {credit ? (
            <Pressable onPress={() => Linking.openURL(credit.lizenzUrl)} accessibilityRole="link">
              <Text style={styles.credit}>
                Foto: {credit.urheber}, {credit.lizenz}, via Wikimedia Commons
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.body}>
        <Text style={styles.kicker}>
          {TYP_LABEL[m.typ]}, {m.bezirk}
        </Text>
        {/* Hier steht der Name ganz. Als Überschrift zählt für Bildschirmleser schon der Kopf, also nicht doppelt. */}
        <Text style={styles.title}>{m.name}</Text>
        <View style={styles.statusRow}>
          <StatusPill tone={st.tone} label={st.label} />
          {dist !== undefined ? <Text style={styles.dist}>{distanceText(dist)} entfernt</Text> : null}
        </View>

        <Text style={styles.text}>{m.text}</Text>

        {m.hinweis ? (
          <View style={styles.note}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.gelb} />
            <Text style={styles.noteText}>{m.hinweis}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {m.web ? (
            <ActionButton
              primary
              icon="globe-outline"
              label={m.web.art === 'veranstalter' ? 'Webseite des Veranstalters' : 'Infoseite auf berlin.de'}
              onPress={() => openWebsite(m.web!.url)}
              url={m.web.url}
            />
          ) : null}
          <View style={styles.actionRow}>
            <ActionButton icon="navigate-outline" label="Route" onPress={() => openRoute(m)} url={routeUrl(m)} />
            {inResult ? (
              <ActionButton
                icon="map-outline"
                label="Karte"
                onPress={() => {
                  focusOn(m.id);
                  router.back();
                }}
              />
            ) : null}
            <ActionButton icon="share-outline" label="Teilen" onPress={() => shareMarket(m, now)} />
          </View>
        </View>

        <Section icon="calendar-outline" title="Termine und Öffnungszeiten">
          <Row left="Zeitraum" right={seasonText(m)} />
          {short ? (
            days.length ? (
              days.map((d) => <Row key={d.date} left={dateShort(d.date)} right={hoursText(d.iv)} />)
            ) : (
              <Text style={styles.plain}>Keine weiteren Termine in dieser Saison.</Text>
            )
          ) : (
            <>
              {weeklyRows(m).map(([d, h]) => (
                <Row key={d} left={d} right={h} />
              ))}
              {futureSpecial.length ? (
                <>
                  <Text style={styles.subHead}>Abweichende Zeiten</Text>
                  {futureSpecial.map(([d, iv]) => (
                    <Row key={d} left={dateShort(d)} right={hoursText(iv)} />
                  ))}
                </>
              ) : null}
              {futureClosed.length ? (
                <>
                  <Text style={styles.subHead}>Geschlossen</Text>
                  <Text style={styles.plain}>{futureClosed.map(dateShort).join(', ')}</Text>
                </>
              ) : null}
            </>
          )}
        </Section>

        <Section icon="ticket-outline" title="Eintritt">
          <Text style={styles.plain}>
            {m.eintritt.art === 'unbekannt'
              ? `${EINTRITT_LABEL.unbekannt}. Im Zweifel auf der Seite des Veranstalters nachsehen.`
              : m.eintritt.text}
          </Text>
        </Section>

        <Section icon="location-outline" title="Adresse und Anfahrt">
          <Text style={styles.plain}>{m.adresse}</Text>
          {m.oepnv ? <Text style={[styles.plain, styles.muted]}>Nahverkehr: {m.oepnv}</Text> : null}
          {m.barrierefrei ? (
            <Text style={[styles.plain, styles.muted]}>Laut Veranstalter barrierefrei zugänglich.</Text>
          ) : null}
        </Section>

        <Text style={styles.footer}>
          Angaben ohne Gewähr, Stand {dateNum(STAND)}. Zeiten und Preise können sich ändern, bitte vor dem Besuch beim
          Veranstalter prüfen.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.creme },
  hero: { width: '100%', aspectRatio: 3 / 2, backgroundColor: colors.flaeche },
  credit: { fontSize: 12, color: colors.grau, paddingHorizontal: 16, paddingTop: 6 },
  body: { paddingHorizontal: 16, paddingTop: 14 },
  kicker: { fontSize: 14, fontWeight: '600', color: colors.rot },
  title: { fontSize: 26, fontWeight: '800', color: colors.tinte, lineHeight: 31, marginTop: 4, letterSpacing: -0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  dist: { fontSize: 14, color: colors.grau },
  text: { fontSize: 16, lineHeight: 23, color: colors.tinte, marginTop: 14 },
  note: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.gelbHell,
    borderRadius: radius,
    padding: 12,
    marginTop: 14,
  },
  noteText: { flex: 1, fontSize: 15, color: colors.gelb, lineHeight: 20 },
  actions: { marginTop: 18, gap: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 10,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.linie,
    backgroundColor: colors.weiss,
  },
  actionPrimary: { backgroundColor: colors.rot, borderColor: colors.rot },
  actionText: { fontSize: 15, fontWeight: '600', color: colors.rot },
  actionTextPrimary: { color: colors.weiss },
  section: { marginTop: 26, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.linie, paddingTop: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.tinte },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.flaeche,
    gap: 12,
  },
  rowLeft: { fontSize: 15, color: colors.grau, flexShrink: 0 },
  rowRight: { fontSize: 15, color: colors.tinte, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  subHead: { fontSize: 14, fontWeight: '700', color: colors.grau, marginTop: 12, marginBottom: 2 },
  plain: { fontSize: 15, lineHeight: 21, color: colors.tinte },
  muted: { color: colors.grau, marginTop: 6 },
  footer: { fontSize: 13, lineHeight: 18, color: colors.grau, marginTop: 28 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  missingText: { fontSize: 16, color: colors.grau, textAlign: 'center' },
});
