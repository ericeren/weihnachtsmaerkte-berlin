import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Zeile } from '../lib/statistik';
import { colors, font } from '../theme';

/**
 * Diagramme für „Saison in Zahlen“, gebaut aus einfachen Views, damit sie in der App und im Web gleich aussehen.
 * Regeln: dünne Säulen mit 2 Punkt Abstand, oben abgerundet, unten eckig, Gitterlinien als Haarlinien,
 * Werte und Beschriftungen in Textfarbe, nie in der Farbe der Reihe. Jedes Säulendiagramm hat eine Tabelle.
 */

export interface Reihe {
  name: string;
  farbe: string;
}

export interface Spalte {
  key: string;
  /** Beschriftung unter der Achse, leer für keine */
  tick?: string;
  /** ein Wert je Reihe */
  werte: number[];
  /** eigene Farbe für die Säule, nur bei einer Reihe, etwa Wochenende hervorgehoben */
  farbe?: string;
}

const PLOT_HOEHE = 150;
const ACHSE_BREITE = 26;
const LUECKE = 2;

/** Runde Obergrenze und Schritt für die Gitterlinien */
function skala(max: number): { top: number; schritt: number } {
  const schritt = max <= 10 ? 2 : max <= 30 ? 10 : 20;
  return { top: Math.max(schritt, Math.ceil(max / schritt) * schritt), schritt };
}

export function Legende({ reihen }: { reihen: Reihe[] }) {
  if (reihen.length < 2) return null;
  return (
    <View style={styles.legende}>
      {reihen.map((r) => (
        <View key={r.name} style={styles.legendeEintrag}>
          <View style={[styles.legendeFeld, { backgroundColor: r.farbe }]} />
          <Text style={styles.legendeText}>{r.name}</Text>
        </View>
      ))}
    </View>
  );
}

interface SaeulenProps {
  reihen: Reihe[];
  spalten: Spalte[];
  /** Zeile über dem Diagramm für die gewählte Spalte */
  ablesen: (i: number) => string;
  /** Spalte, die zu Beginn gewählt ist */
  start: number;
  /** Kurzfassung für Bildschirmleser */
  beschreibung: string;
}

export function Saeulen({ reihen, spalten, ablesen, start, beschreibung }: SaeulenProps) {
  const [breite, setBreite] = useState(0);
  const [auswahl, setAuswahl] = useState(start);
  const n = spalten.length;
  const max = Math.max(...spalten.flatMap((s) => s.werte));
  const { top, schritt } = skala(max);
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += schritt) ticks.push(t);

  const slot = breite / n;
  const k = reihen.length;
  const saeule = Math.max(1, Math.min(24, (slot - LUECKE - LUECKE * (k - 1)) / k));
  const gruppe = saeule * k + LUECKE * (k - 1);

  const waehle = (x: number) => {
    if (!breite) return;
    setAuswahl(Math.max(0, Math.min(n - 1, Math.floor(x / slot))));
  };

  // Achsenbeschriftung nicht zu dicht: bei wenig Platz nur jede zweite
  const mitTick = spalten.map((s, i) => (s.tick ? i : -1)).filter((i) => i >= 0);
  const abstand = mitTick.length > 1 ? (mitTick[1] - mitTick[0]) * slot : breite;
  const jedeZweite = abstand > 0 && abstand < 40;

  const maus =
    Platform.OS === 'web'
      ? {
          onPointerMove: (e: { nativeEvent: { pointerType?: string; offsetX?: number } }) => {
            if (e.nativeEvent.pointerType === 'mouse' && e.nativeEvent.offsetX != null) waehle(e.nativeEvent.offsetX);
          },
        }
      : {};

  return (
    <View>
      <Text style={styles.ablesen} accessibilityLiveRegion="polite">
        {ablesen(auswahl)}
      </Text>
      <View style={styles.diagramm} accessible accessibilityRole="image" accessibilityLabel={beschreibung}>
        <View style={styles.achse}>
          {ticks.map((t) => (
            <Text key={t} style={[styles.achsenText, { top: PLOT_HOEHE - (t / top) * PLOT_HOEHE - 8 }]}>
              {t}
            </Text>
          ))}
        </View>
        <View style={styles.flaeche}>
          <View
            style={styles.plot}
            onLayout={(e) => setBreite(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) => waehle(e.nativeEvent.locationX)}
            {...maus}
          >
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {breite > 0 ? (
                <View style={[styles.markierung, { left: auswahl * slot, width: slot }]} />
              ) : null}
              {ticks.map((t) => (
                <View key={t} style={[styles.gitter, { top: PLOT_HOEHE - (t / top) * PLOT_HOEHE }]} />
              ))}
              {breite > 0
                ? spalten.map((s, i) =>
                    s.werte.map((w, j) => {
                      const h = w > 0 ? Math.max(1, (w / top) * PLOT_HOEHE) : 0;
                      const r = Math.min(4, saeule / 2);
                      return (
                        <View
                          key={`${s.key}-${j}`}
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: i * slot + (slot - gruppe) / 2 + j * (saeule + LUECKE),
                            width: saeule,
                            height: h,
                            backgroundColor: (k === 1 && s.farbe) || reihen[j].farbe,
                            borderTopLeftRadius: r,
                            borderTopRightRadius: r,
                          }}
                        />
                      );
                    }),
                  )
                : null}
            </View>
          </View>
          <View style={styles.ticks} pointerEvents="none">
            {breite > 0
              ? mitTick.map((i, nr) =>
                  jedeZweite && nr % 2 === 1 ? null : (
                    <Text key={spalten[i].key} style={[styles.tickText, { left: i * slot + slot / 2 - 24 }]}>
                      {spalten[i].tick}
                    </Text>
                  ),
                )
              : null}
          </View>
        </View>
      </View>
    </View>
  );
}

/** Aufklappbare Tabelle mit denselben Zahlen wie das Diagramm */
export function Tabelle({ kopf, zeilen }: { kopf: string[]; zeilen: (string | number)[][] }) {
  const [offen, setOffen] = useState(false);
  return (
    <View style={styles.tabelle}>
      <Pressable
        onPress={() => setOffen(!offen)}
        style={styles.tabelleKnopf}
        accessibilityRole="button"
        aria-expanded={offen}
        hitSlop={6}
      >
        <Ionicons name={offen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.rot} />
        <Text style={styles.tabelleKnopfText}>{offen ? 'Tabelle ausblenden' : 'Zahlen als Tabelle'}</Text>
      </Pressable>
      {offen ? (
        <View>
          <View style={[styles.tZeile, styles.tKopf]}>
            {kopf.map((k, i) => (
              <Text key={k} style={[styles.tZelle, styles.tKopfText, i === 0 ? styles.tErste : styles.tZahl]}>
                {k}
              </Text>
            ))}
          </View>
          {zeilen.map((z) => (
            <View key={String(z[0])} style={styles.tZeile}>
              {z.map((wert, i) => (
                <Text key={i} style={[styles.tZelle, i === 0 ? styles.tErste : styles.tZahl]}>
                  {wert}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Rangliste als waagerechte Balken. Name und Zahl stehen über dem Balken, damit lange Namen Platz haben. */
export function Balken({ zeilen, farbe, einheit }: { zeilen: Zeile[]; farbe: string; einheit: [string, string] }) {
  const max = Math.max(...zeilen.map((z) => z.wert));
  return (
    <View style={styles.balkenListe}>
      {zeilen.map((z) => (
        <View
          key={z.label}
          style={styles.balkenZeile}
          accessible
          accessibilityLabel={`${z.label}: ${z.wert} ${z.wert === 1 ? einheit[0] : einheit[1]}`}
        >
          <View style={styles.balkenKopf}>
            <Text style={styles.balkenName}>{z.label}</Text>
            <Text style={styles.balkenWert}>{z.wert}</Text>
          </View>
          <View style={[styles.balken, { width: `${(z.wert / max) * 100}%`, backgroundColor: farbe }]} />
        </View>
      ))}
    </View>
  );
}

export function Kachel({
  wert,
  text,
  onPress,
  hinweis,
}: {
  wert: number;
  text: string;
  onPress?: () => void;
  hinweis?: string;
}) {
  const inhalt: ReactNode = (
    <>
      <Text style={styles.kachelWert}>{wert}</Text>
      <Text style={styles.kachelText}>{text}</Text>
      {onPress ? (
        <View style={styles.kachelLink}>
          <Text style={styles.kachelLinkText}>{hinweis}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.rot} />
        </View>
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.kachel}>{inhalt}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.kachel, pressed && styles.kachelGedrueckt]}
      accessibilityRole="button"
    >
      {inhalt}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  legende: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 8 },
  legendeEintrag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendeFeld: { width: 10, height: 10, borderRadius: 2 },
  legendeText: { fontSize: font.tiny, color: colors.tinte },
  ablesen: { fontSize: font.small, fontWeight: '600', color: colors.tinte, minHeight: 20, marginBottom: 6 },
  diagramm: { flexDirection: 'row' },
  achse: { width: ACHSE_BREITE, height: PLOT_HOEHE },
  achsenText: {
    position: 'absolute',
    right: 6,
    fontSize: 11,
    color: colors.grau,
    fontVariant: ['tabular-nums'],
  },
  flaeche: { flex: 1 },
  plot: { height: PLOT_HOEHE },
  // gewählte Spalte: ein heller Streifen hinter den Säulen, etwas kräftiger als die Fläche der Kacheln
  markierung: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.cremeDunkel, borderRadius: 3 },
  gitter: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.linie },
  ticks: { height: 20 },
  tickText: {
    position: 'absolute',
    top: 4,
    width: 48,
    textAlign: 'center',
    fontSize: 11,
    color: colors.grau,
    fontVariant: ['tabular-nums'],
  },
  tabelle: { marginTop: 4 },
  tabelleKnopf: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 6 },
  tabelleKnopfText: { fontSize: font.small, color: colors.rot, fontWeight: '600' },
  tZeile: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.linie,
  },
  tKopf: { borderBottomColor: colors.grauHell },
  tKopfText: { fontWeight: '700' },
  tZelle: { fontSize: font.small, color: colors.tinte },
  tErste: { flex: 1 },
  tZahl: { width: 84, textAlign: 'right', fontVariant: ['tabular-nums'] },
  balkenListe: { gap: 10 },
  balkenZeile: {},
  balkenKopf: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  balkenName: { flex: 1, fontSize: font.small, color: colors.tinte, marginRight: 8 },
  balkenWert: { fontSize: font.small, fontWeight: '700', color: colors.tinte },
  balken: { height: 10, borderTopRightRadius: 4, borderBottomRightRadius: 4, minWidth: 2 },
  kachel: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.weiss,
    borderWidth: 1,
    borderColor: colors.linie,
    borderRadius: 10,
    padding: 12,
  },
  kachelGedrueckt: { backgroundColor: colors.creme },
  kachelWert: { fontSize: 30, fontWeight: '800', color: colors.tinte, letterSpacing: -0.5 },
  kachelText: { fontSize: font.tiny, lineHeight: 18, color: colors.grau, marginTop: 2 },
  kachelLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
  kachelLinkText: { fontSize: font.tiny, fontWeight: '700', color: colors.rot },
});
