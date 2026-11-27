import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform, Share } from 'react-native';

import { colors } from '../theme';
import type { Market, Moment } from '../types';
import { seasonText, statusNow, weeklyText } from './format';
import { notify } from './notify';

/** iPhone, iPad oder Mac, auch im Browser */
function isApple(): boolean {
  if (Platform.OS === 'ios') return true;
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
}

export async function openWebsite(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url, { controlsColor: colors.rot, toolbarColor: colors.weiss });
  } catch {
    Linking.openURL(url).catch(() => notify('Seite lässt sich nicht öffnen', url));
  }
}

/** Route mit öffentlichen Verkehrsmitteln: Apple Karten auf Apple-Geräten, sonst Google Maps */
export function routeUrl(m: Market): string {
  const name = encodeURIComponent(m.name);
  return isApple()
    ? `https://maps.apple.com/?daddr=${m.lat},${m.lng}&dirflg=r&q=${name}`
    : `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}&travelmode=transit`;
}

export function openRoute(m: Market) {
  Linking.openURL(routeUrl(m)).catch(() => notify('Karten-App lässt sich nicht öffnen'));
}

/**
 * Auf der Webseite werden Route und Webseite als echte Links gebaut. Brave auf dem iPhone blockiert
 * Fenster, die ein Skript öffnet, ein angetippter Link geht dagegen in jedem Browser. In der App: nichts.
 */
export function webLink(url: string): object | undefined {
  if (Platform.OS !== 'web') return undefined;
  return { href: url, hrefAttrs: { target: '_blank', rel: 'noopener noreferrer' } };
}

export function shareMarket(m: Market, now: Moment) {
  // In der Webfassung kommt der Link zur Marktseite mit, damit Freunde direkt dort landen
  const page = Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/markt/${m.id}` : '';
  const lines = [
    m.name,
    m.adresse,
    `${seasonText(m)}${weeklyText(m) ? `, ${weeklyText(m)}` : ''}`,
    statusNow(m, now).label,
    page || m.web?.url || '',
  ].filter(Boolean);
  const text = lines.join('\n');

  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    if (typeof navigator.share === 'function') {
      navigator.share({ title: m.name, text }).catch(() => undefined);
      return;
    }
    navigator.clipboard
      ?.writeText(text)
      .then(() => notify('Kopiert', 'Die Angaben zum Markt liegen jetzt in der Zwischenablage.'))
      .catch(() => undefined);
    return;
  }
  Share.share({ message: text }).catch(() => undefined);
}
