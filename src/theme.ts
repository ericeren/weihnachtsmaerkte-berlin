import { Platform } from 'react-native';

/** Farbwelt: Weiß, Tinte, ein kräftiges Rot. Dazu Tannengrün für den Kopf und Creme für die Übersicht. */
export const colors = {
  rot: '#B3122E',
  rotDunkel: '#8E0E24',
  rotHell: '#FBEAED',
  tinte: '#1A1C20',
  grau: '#5E636B',
  /** „Heute geschlossen“ auf der Karte und in den Listen, weiße Schrift darauf und es selbst auf Weiß 5:1 */
  grauZu: '#6B7079',
  grauHell: '#8C9199',
  /** warmes Grau für Linien und Flächen, passend zu Creme */
  linie: '#E3DACB',
  flaeche: '#EFE9DD',
  weiss: '#FFFFFF',
  gruen: '#17703F',
  gruenHell: '#E4F2EA',
  gelb: '#7A5200',
  gelbHell: '#FFF1D6',
  /** Kopf der Übersicht, weiße Schrift darauf hat einen Kontrast von 12:1 */
  tanne: '#1E3B2C',
  /** Skyline im Kopf, nur Schmuck */
  tanneHell: '#2D5340',
  /** Untertitel im Kopf, 8:1 auf Tanne */
  kopfGrau: '#C5D6CA',
  creme: '#F5F0E6',
  cremeDunkel: '#EAE2D3',
  linieWarm: '#DDD3C2',
};

export const font = {
  title: 26,
  h2: 20,
  body: 16,
  small: 14,
  tiny: 13,
};

export const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  default: { elevation: 4 },
});

export const radius = 10;

/** Höhe des grünen Kopfs ohne Statusleiste, auf der Übersicht und allen Unterseiten gleich */
export const kopfHoehe = 74;
