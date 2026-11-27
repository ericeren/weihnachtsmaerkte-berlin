import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IMAGES } from '../data';
import { openRoute, openWebsite, routeUrl, webLink } from '../lib/actions';
import { distanceText, hoursOn, scheduleText, statusNow } from '../lib/format';
import { EINTRITT_LABEL } from '../lib/labels';
import { colors, radius, shadow } from '../theme';
import type { Market, Moment } from '../types';
import StatusPill from './StatusPill';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  m: Market;
  now: Moment;
  day: string | null;
  distanceKm?: number;
  onClose: () => void;
}

function Line({ icon, text, lines = 1 }: { icon: IconName; text: string; lines?: number }) {
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={16} color={colors.grau} style={styles.lineIcon} />
      <Text style={styles.lineText} numberOfLines={lines}>
        {text}
      </Text>
    </View>
  );
}

/** Kurzinfo, die auf der Karte nach dem Antippen eines Markts erscheint. */
export default function MarketPreview({ m, now, day, distanceKm, onClose }: Props) {
  const st = statusNow(m, now);
  const img = m.bild ? IMAGES[m.bild] : undefined;
  const hours = day && day !== now.date ? hoursOn(m, day, now.date) : scheduleText(m, now.date);
  const fee = m.eintritt.art === 'unbekannt' ? EINTRITT_LABEL.unbekannt : m.eintritt.text;
  const siteLink = m.web ? webLink(m.web.url) : undefined;
  const routeLink = webLink(routeUrl(m));

  return (
    <View style={styles.card}>
      <Pressable onPress={onClose} style={styles.close} hitSlop={10} accessibilityLabel="Schließen">
        <Ionicons name="close" size={20} color={colors.grau} />
      </Pressable>

      <Pressable onPress={() => router.push(`/markt/${m.id}`)} accessibilityRole="button">
        <View style={styles.head}>
          {img ? <Image source={img} style={styles.thumb} contentFit="cover" transition={150} /> : null}
          <View style={styles.headText}>
            <Text style={styles.name} numberOfLines={2}>
              {m.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {m.bezirk}
              {distanceKm !== undefined ? `, ${distanceText(distanceKm)} entfernt` : ''}
            </Text>
            <View style={styles.pill}>
              <StatusPill tone={st.tone} label={st.label} />
            </View>
          </View>
        </View>

        <Text style={styles.text} numberOfLines={2}>
          {m.text}
        </Text>
        <Line icon="time-outline" text={hours} lines={3} />
        <Line icon="location-outline" text={m.adresse} />
        <Line icon="ticket-outline" text={fee} />
      </Pressable>

      <View style={styles.actions}>
        {m.web ? (
          <Pressable
            {...siteLink}
            style={styles.btn}
            onPress={siteLink ? undefined : () => openWebsite(m.web!.url)}
            accessibilityRole="link"
          >
            <Ionicons name="globe-outline" size={17} color={colors.rot} />
            <Text style={styles.btnText}>Webseite</Text>
          </Pressable>
        ) : null}
        <Pressable
          {...routeLink}
          style={styles.btn}
          onPress={routeLink ? undefined : () => openRoute(m)}
          accessibilityRole={routeLink ? 'link' : 'button'}
        >
          <Ionicons name="navigate-outline" size={17} color={colors.rot} />
          <Text style={styles.btnText}>Route</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnMain]}
          onPress={() => router.push(`/markt/${m.id}`)}
          accessibilityRole="button"
        >
          <Text style={[styles.btnText, styles.btnMainText]}>Details</Text>
          <Ionicons name="chevron-forward" size={17} color={colors.weiss} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.weiss,
    borderRadius: 14,
    padding: 14,
    ...shadow,
  },
  close: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.flaeche,
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: { flexDirection: 'row', paddingRight: 34 },
  thumb: { width: 84, height: 84, borderRadius: 8, marginRight: 12, backgroundColor: colors.flaeche },
  headText: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontWeight: '700', color: colors.tinte, lineHeight: 23 },
  meta: { fontSize: 14, color: colors.grau, marginTop: 2 },
  pill: { marginTop: 6 },
  text: { fontSize: 15, color: colors.tinte, lineHeight: 20, marginTop: 10, marginBottom: 6 },
  line: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  lineIcon: { marginTop: 1, marginRight: 8 },
  lineText: { flex: 1, fontSize: 14, color: colors.tinte, lineHeight: 19 },
  actions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.linie,
  },
  btnText: { fontSize: 15, fontWeight: '600', color: colors.rot },
  btnMain: { flex: 1, backgroundColor: colors.rot, borderColor: colors.rot },
  btnMainText: { color: colors.weiss },
});
