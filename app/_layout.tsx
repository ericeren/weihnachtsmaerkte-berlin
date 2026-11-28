import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import Seitenkopf, { type SeitenkopfProps } from '../src/components/Seitenkopf';
import { StoreProvider } from '../src/state/Store';
import { colors } from '../src/theme';

// Ein Direktlink auf einen Markt legt die Übersicht darunter, damit es einen Weg zurück gibt.
export const unstable_settings = { initialRouteName: 'index' };

// iOS 26 legt in Apps vom Home-Bildschirm unter der Statusleiste einen weichen Schleier über den
// oberen Rand der Seite, rund 40 Punkte hoch. Dort bleibt deshalb nur weißer Grund stehen, Titel
// und Knöpfe beginnen darunter. Im Browser, auf Android und in der App ändert sich nichts.
const IOS_WEB =
  Platform.OS === 'web' &&
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1));
const HOME_BILDSCHIRM =
  IOS_WEB &&
  (window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);
const SCHLEIER = 40;

function Seiten() {
  return (
    <Stack
      screenOptions={{
        // Wie die Übersicht: grüner Kopf mit derselben Skyline und roter Linie, darunter Creme.
        // Alle Unterseiten gleich: links der Pfeil zurück, daneben die Überschrift. Deshalb öffnen
        // auch Filter und Info als normale Seite und nicht mehr als Blatt mit „Fertig“.
        header: (p) => <Seitenkopf {...(p as unknown as SeitenkopfProps)} />,
        headerStyle: { backgroundColor: colors.tanne },
        headerTintColor: colors.weiss,
        headerTitleStyle: { color: colors.weiss },
        headerShadowVisible: false,
        headerBackTitle: 'Zurück',
        contentStyle: { backgroundColor: colors.creme },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Übersicht' }} />
      {/* Den Namen des Markts setzt die Seite selbst */}
      <Stack.Screen name="markt/[id]" options={{ title: '' }} />
      <Stack.Screen name="saison" options={{ title: 'Saison in Zahlen' }} />
      <Stack.Screen name="filter" options={{ title: 'Filter' }} />
      <Stack.Screen name="info" options={{ title: 'Über die App' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  const appInsets = useMemo(
    () => (HOME_BILDSCHIRM ? { ...insets, top: insets.top + SCHLEIER } : insets),
    [insets],
  );

  return (
    <SafeAreaInsetsContext.Provider value={appInsets}>
      <StoreProvider>
        {/* Alle Seiten haben einen grünen Kopf, deshalb helle Statusleiste */}
        <StatusBar style="light" />
        {Platform.OS === 'web' ? (
          // Im Web liegt alles in einem Hauptbereich, auch der Kopf der Seiten. So finden Bildschirmleser den Inhalt.
          <View style={{ flex: 1 }} role="main">
            <Seiten />
          </View>
        ) : (
          <Seiten />
        )}
      </StoreProvider>
    </SafeAreaInsetsContext.Provider>
  );
}
