import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, kopfHoehe } from '../theme';
import Skyline from './Skyline';

/**
 * Kopf der Unterseiten im Stil der Übersicht: grün, mit derselben Skyline an derselben Stelle,
 * also am rechten Rand auf dem Boden des Kopfs, darunter die rote Linie. Gleich hoch wie der Kopf
 * der Übersicht. Auf jeder Unterseite links der Pfeil zurück und direkt daneben die Überschrift.
 * Ersetzt den Kopf des Systems auf dem iPhone und im Browser gleichermaßen.
 */

export interface SeitenkopfProps {
  options: {
    title?: string;
    headerRight?: (props: { tintColor?: string; canGoBack: boolean }) => ReactNode;
  };
  back?: unknown;
  navigation: { goBack: () => void };
}

export default function Seitenkopf({ options, back, navigation }: SeitenkopfProps) {
  const insets = useSafeAreaInsets();
  const [hoehe, setHoehe] = useState(0);
  const zurueck = !!back;
  const rechts = options.headerRight?.({ tintColor: colors.weiss, canGoBack: zurueck });

  return (
    <View>
      <View style={styles.kopf} onLayout={(e) => setHoehe(Math.round(e.nativeEvent.layout.height))}>
        {hoehe ? <Skyline height={hoehe} /> : null}
        {/* Mindesthöhe wie auf der Übersicht, bei sehr großer Schrift wächst der Kopf mit */}
        <View style={[styles.zeile, { paddingTop: insets.top, minHeight: insets.top + kopfHoehe }]}>
          {zurueck ? (
            <Pressable
              onPress={navigation.goBack}
              hitSlop={8}
              style={styles.zurueck}
              accessibilityRole="button"
              accessibilityLabel="Zurück"
            >
              <Ionicons name="arrow-back" size={26} color={colors.weiss} />
            </Pressable>
          ) : null}
          {/* Lange Titel, etwa der Name eines Markts, enden mit „…“. Bildschirmleser lesen den ganzen Titel. */}
          {options.title ? (
            <Text
              style={[styles.titel, !zurueck && styles.titelOhneZurueck]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {options.title}
            </Text>
          ) : (
            <View style={styles.titel} />
          )}
          {rechts ? <View style={styles.rechts}>{rechts}</View> : null}
        </View>
      </View>
      <View style={styles.linie} />
    </View>
  );
}

const styles = StyleSheet.create({
  kopf: { backgroundColor: colors.tanne, overflow: 'hidden' },
  zeile: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  zurueck: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titel: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.weiss, marginLeft: 6, marginRight: 10 },
  titelOhneZurueck: { marginLeft: 10 },
  rechts: { minWidth: 70, alignItems: 'flex-end', paddingRight: 10 },
  linie: { height: 3, backgroundColor: colors.rot },
});
