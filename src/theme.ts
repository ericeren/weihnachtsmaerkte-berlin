import { Platform } from 'react-native';

/** Sachliche Farbwelt: Weiß, Tinte, ein kräftiges Rot. */
export const colors = {
  rot: '#B3122E',
  rotDunkel: '#8E0E24',
  rotHell: '#FBEAED',
  tinte: '#1A1C20',
  grau: '#5E636B',
  grauHell: '#8C9199',
  linie: '#DFE2E6',
  flaeche: '#F2F3F5',
  weiss: '#FFFFFF',
  gruen: '#17703F',
  gruenHell: '#E4F2EA',
  gelb: '#7A5200',
  gelbHell: '#FFF1D6',
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
