import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clock, dayName } from '../lib/format';
import { ERSTER_TAG, LETZTER_TAG } from '../lib/saison';
import { addDays, dateToMoment, momentToDate } from '../lib/time';
import { useStore } from '../state/Store';
import { colors, radius } from '../theme';
import DateWheel from './DateWheel';

type Art = 'zeit' | 'tag';
type Schnell = 'jetzt' | 'stunde' | 'abend';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const round5 = (min: number) => min - (min % 5);

/** "heute", "morgen" oder "am Sa 5.12." */
function tagWort(date: string, today: string): string {
  const n = dayName(date, today);
  return n === 'Heute' || n === 'Morgen' ? n.toLowerCase() : `am ${n}`;
}

/**
 * Auswahl von Datum und Uhrzeit wie in der BVG-App: Blatt von unten, Rad für Tag, Stunde und Minute,
 * darunter Schnellwahl. „Offen um“ zeigt Märkte, die zu diesem Zeitpunkt offen haben,
 * „Offen am“ alle, die an dem Tag irgendwann offen haben.
 */
export default function WhenSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { filters, setFilters, now, setSelectedId } = useStore();
  const [mounted, setMounted] = useState(false);
  const [art, setArt] = useState<Art>('zeit');
  const [value, setValue] = useState<Date>(() => momentToDate(now.date, round5(now.minutes)));
  const [schnell, setSchnell] = useState<Schnell | null>('jetzt');
  const anim = useRef(new Animated.Value(0)).current;

  // Wählbar ist jeder Tag der Saison, auch ein vergangener. So lässt sich die Saison im Nachhinein ansehen.
  const minDate = useMemo(() => momentToDate(ERSTER_TAG < now.date ? ERSTER_TAG : now.date, 0), [now.date]);
  const maxDate = useMemo(
    () => momentToDate(LETZTER_TAG > now.date ? LETZTER_TAG : now.date, 23 * 60 + 55),
    [now.date],
  );
  const clamp = (d: Date) => new Date(Math.min(Math.max(d.getTime(), minDate.getTime()), maxDate.getTime()));
  const jetztDate = () => clamp(momentToDate(now.date, round5(now.minutes)));

  // Beim Öffnen die aktuelle Auswahl übernehmen und das Blatt hochfahren
  useEffect(() => {
    if (!visible) return;
    const w = filters.when;
    if (w.kind === 'tag') {
      setArt(filters.time === null ? 'tag' : 'zeit');
      setValue(clamp(momentToDate(w.date, filters.time ?? round5(now.minutes))));
      setSchnell(null);
    } else {
      setArt('zeit');
      setValue(jetztDate());
      setSchnell('jetzt');
    }
    setMounted(true);
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setMounted(false);
      onClose();
    });
  };

  const apply = () => {
    setSelectedId(null);
    if (art === 'zeit' && schnell === 'jetzt') {
      setFilters({ when: { kind: 'jetzt' }, time: null });
    } else {
      const m = dateToMoment(value);
      setFilters({ when: { kind: 'tag', date: m.date }, time: art === 'zeit' ? m.minutes : null });
    }
    close();
  };

  const abend =
    now.minutes < 18 * 60
      ? { date: now.date, label: 'Heute 18 Uhr' }
      : { date: addDays(now.date, 1), label: 'Morgen 18 Uhr' };

  const quick: { key: Schnell; label: string; date: () => Date }[] = [
    { key: 'jetzt', label: 'Jetzt', date: jetztDate },
    { key: 'stunde', label: 'In 1 Std', date: () => clamp(new Date(jetztDate().getTime() + 60 * 60 * 1000)) },
    { key: 'abend', label: abend.label, date: () => clamp(momentToDate(abend.date, 18 * 60)) },
  ];

  const sel = dateToMoment(value);
  const hint =
    art === 'zeit' && schnell === 'jetzt'
      ? 'Zeigt Märkte, die jetzt geöffnet haben.'
      : art === 'zeit'
        ? `Zeigt Märkte, die ${tagWort(sel.date, now.date)} um ${clock(sel.minutes)} Uhr geöffnet haben.`
        : `Zeigt Märkte, die ${tagWort(sel.date, now.date)} geöffnet haben.`;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={close}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: anim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Schließen" />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }],
            },
          ]}
        >
          <View style={styles.head}>
            <Pressable
              onPress={close}
              hitSlop={12}
              style={styles.headBtn}
              accessibilityRole="button"
              accessibilityLabel="Abbrechen"
            >
              <Ionicons name="close" size={30} color={colors.weiss} />
            </Pressable>
            <Text style={styles.headTitle} accessibilityRole="header">
              Datum und Uhrzeit
            </Text>
            <Pressable
              onPress={apply}
              hitSlop={12}
              style={styles.headBtn}
              accessibilityRole="button"
              accessibilityLabel="Übernehmen"
            >
              <Ionicons name="checkmark" size={32} color={colors.weiss} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <View style={styles.segment} accessibilityRole="tablist">
              {(['zeit', 'tag'] as const).map((a) => (
                <Pressable
                  key={a}
                  onPress={() => {
                    setArt(a);
                    if (a === 'tag') setSchnell(null);
                  }}
                  style={[styles.segBtn, art === a && styles.segOn]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: art === a }}
                >
                  <Text style={[styles.segText, art === a && styles.segTextOn]}>
                    {a === 'zeit' ? 'Offen um' : 'Offen am'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.hint}>{hint}</Text>

            <DateWheel
              value={value}
              mode={art === 'zeit' ? 'datetime' : 'date'}
              minimumDate={minDate}
              maximumDate={maxDate}
              onChange={(d) => {
                setValue(d);
                setSchnell(null);
              }}
            />

            <View style={styles.quick}>
              {quick.map((q) => {
                const on = art === 'zeit' && schnell === q.key;
                return (
                  <Pressable
                    key={q.key}
                    onPress={() => {
                      setArt('zeit');
                      setValue(q.date());
                      setSchnell(q.key);
                    }}
                    style={({ pressed }) => [
                      styles.quickBtn,
                      q.key === 'abend' && styles.quickWide,
                      on && styles.quickOn,
                      pressed && !on && styles.quickPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.quickText, on && styles.quickTextOn]} numberOfLines={1}>
                      {q.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.38)' },
  sheet: {
    backgroundColor: colors.weiss,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.tinte,
    minHeight: 60,
    paddingHorizontal: 12,
  },
  headBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headTitle: { color: colors.weiss, fontSize: 17, fontWeight: '600' },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  segment: { flexDirection: 'row', backgroundColor: colors.flaeche, borderRadius: 24, padding: 4 },
  segBtn: { flex: 1, minHeight: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.tinte },
  segText: { fontSize: 16, fontWeight: '500', color: colors.tinte },
  segTextOn: { color: colors.weiss },
  hint: { fontSize: 14, lineHeight: 19, color: colors.grau, textAlign: 'center', marginTop: 12, minHeight: 38 },
  quick: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quickBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.grauHell,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  // „Morgen 18 Uhr“ ist länger als die anderen beiden und wurde sonst abgeschnitten
  quickWide: { flex: 1.4 },
  quickOn: { backgroundColor: colors.tinte, borderColor: colors.tinte },
  quickPressed: { backgroundColor: colors.flaeche },
  quickText: { fontSize: 16, color: colors.tinte, fontWeight: '500' },
  quickTextOn: { color: colors.weiss },
});
