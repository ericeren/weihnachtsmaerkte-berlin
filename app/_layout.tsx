import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { StoreProvider } from '../src/state/Store';
import { colors } from '../src/theme';

// Ein Direktlink auf einen Markt legt die Übersicht darunter, damit es einen Weg zurück gibt.
export const unstable_settings = { initialRouteName: 'index' };

// Auf der Webseite sehen Filter und Info aus wie in der App: Titel mittig, kein zusätzlicher Zurück-Pfeil.
const webModal = Platform.OS === 'web' ? { headerLeft: () => null, headerTitleAlign: 'center' as const } : {};

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
        headerTintColor: colors.rot,
        headerTitleStyle: { color: colors.tinte },
        headerBackTitle: 'Zurück',
        contentStyle: { backgroundColor: colors.weiss },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Übersicht' }} />
      <Stack.Screen name="markt/[id]" options={{ title: '', headerTitle: () => null }} />
      <Stack.Screen name="saison" options={{ title: 'Saison in Zahlen' }} />
      <Stack.Screen name="filter" options={{ presentation: 'modal', title: 'Filter', ...webModal }} />
      <Stack.Screen name="info" options={{ presentation: 'modal', title: 'Über die App', ...webModal }} />
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
        <StatusBar style="dark" />
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
