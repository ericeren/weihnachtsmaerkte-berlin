import { Alert, Platform } from 'react-native';

/** Hinweis als Dialog. Im Browser zeigt react-native-web kein Alert, dort übernimmt window.alert. */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export const IS_WEB = Platform.OS === 'web';

/** Hinweis, wenn der Standort fehlt */
export const LOC_HELP = IS_WEB
  ? 'Erlaube dieser Seite den Standortzugriff in deinem Browser, dann zeigt sie Märkte in deiner Nähe.'
  : 'Erlaube der App den Standortzugriff in den iOS-Einstellungen unter Datenschutz, dann zeigt sie Märkte in deiner Nähe.';

export const LOC_OFF = IS_WEB
  ? 'Standortzugriff ist aus. Du kannst ihn in den Einstellungen deines Browsers erlauben.'
  : 'Standortzugriff ist aus. Du kannst ihn in den iOS-Einstellungen erlauben.';
