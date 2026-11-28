import { router } from 'expo-router';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Balken, Kachel, Legende, Saeulen, Tabelle, type Reihe } from '../src/components/Diagramme';
import { STAND } from '../src/data';
import { webLink } from '../src/lib/actions';
import { clock, dateNum, dateShort, plural } from '../src/lib/format';
import { IS_WEB } from '../src/lib/notify';
import { ERSTER_TAG } from '../src/lib/saison';
import { weekdayOf } from '../src/lib/time';
import { statistik, type Zeile } from '../src/lib/statistik';
import { useStore } from '../src/state/Store';
import { colors, font } from '../src/theme';

const QUELLCODE = 'https://github.com/ericeren/weihnachtsmaerkte-berlin/blob/main/src/lib/statistik.ts';
const WOCHE: Reihe[] = [
  { name: 'Samstag und Sonntag', farbe: colors.rot },
  { name: 'Montag bis Freitag', farbe: colors.grauHell },
];

const ganz = (x: number) => Math.round(x);
const tagMonat = (iso: string) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.`;

/** „A“, „A und B“, „A, B und C“ */
function aufzaehlen(namen: string[]): string {
  return namen.length < 2 ? namen.join('') : `${namen.slice(0, -1).join(', ')} und ${namen[namen.length - 1]}`;
}

/** Alle Namen mit dem höchsten oder niedrigsten Wert, damit ein Gleichstand nicht unter den Tisch fällt */
function spitze(zeilen: Zeile[], welche: 'oben' | 'unten'): { namen: string; wert: number } {
  const wert = welche === 'oben' ? zeilen[0].wert : zeilen[zeilen.length - 1].wert;
  return { namen: aufzaehlen(zeilen.filter((z) => z.wert === wert).map((z) => z.label)), wert };
}

function Abschnitt({ titel, einsicht, children }: { titel: string; einsicht: string; children: ReactNode }) {
  return (
    <View style={styles.abschnitt}>
      <Text style={styles.h} accessibilityRole="header">
        {titel}
      </Text>
      <Text style={styles.einsicht}>{einsicht}</Text>
      {children}
    </View>
  );
}

export default function Saison() {
  const insets = useSafeAreaInsets();
  const { setFilters, setView, setSelectedId } = useStore();
  const st = useMemo(() => statistik(), []);
  const jahr = Number(ERSTER_TAG.slice(0, 4));
  const saison = `${jahr}/${String(jahr + 1).slice(2)}`;

  useEffect(() => {
    if (!IS_WEB) return;
    const vorher = document.title;
    document.title = 'Saison in Zahlen | Weihnachtsmärkte Berlin';
    return () => {
      document.title = vorher;
    };
  }, []);

  const zeigeSpitze = () => {
    setSelectedId(null);
    setFilters({ when: { kind: 'tag', date: st.bester.date }, time: st.bester.minutes });
    setView('karte');
    router.back();
  };

  // Tage
  const tagSpalten = st.tage.map((t) => ({
    key: t.date,
    tick: weekdayOf(t.date) === 0 ? tagMonat(t.date) : undefined,
    werte: [t.offen],
    farbe: t.wochenende ? WOCHE[0].farbe : WOCHE[1].farbe,
  }));
  const vonTag = st.tage[0].date;
  const bisTag = st.tage[st.tage.length - 1].date;
  const tagMaxIndex = st.tage.findIndex((t) => t.date === st.tagMax.date);

  // Stunden
  const peakWe = st.stunden.reduce((a, x) => (x.wochenende > a.wochenende ? x : a));
  const peakWt = st.stunden.reduce((a, x) => (x.werktag > a.werktag ? x : a));
  const kaum = Math.max(1, peakWe.wochenende / 10);
  const ersteStunde = st.stunden.find((x) => x.wochenende >= kaum)?.stunde ?? 11;
  const letzteStunde = [...st.stunden].reverse().find((x) => x.wochenende >= kaum)?.stunde ?? 21;
  const stundenEinsicht =
    peakWe.stunde === peakWt.stunde
      ? `Am meisten ist um ${peakWe.stunde} Uhr offen, am Wochenende im Schnitt ${ganz(peakWe.wochenende)} Märkte, unter der Woche ${ganz(peakWt.werktag)}. Vor ${ersteStunde} Uhr und ab ${letzteStunde + 1} Uhr hat kaum ein Markt offen.`
      : `Am Wochenende ist um ${peakWe.stunde} Uhr am meisten offen, im Schnitt ${ganz(peakWe.wochenende)} Märkte, unter der Woche um ${peakWt.stunde} Uhr mit ${ganz(peakWt.werktag)}. Vor ${ersteStunde} Uhr und ab ${letzteStunde + 1} Uhr hat kaum ein Markt offen.`;

  const bezirkOben = spitze(st.bezirke, 'oben');
  const bezirkUnten = spitze(st.bezirke, 'unten');
  const art = st.arten[0];

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
    >
      <View style={styles.inner}>
        <Text style={styles.lead}>
          Was die Daten über die Berliner Weihnachtsmärkte der Saison {saison} zeigen. Stand der Daten: {dateNum(STAND)}.
        </Text>

        <View style={styles.kacheln}>
          <Kachel wert={st.maerkte} text={`Märkte in der Saison ${saison}`} />
          <Kachel
            wert={st.bester.offen}
            text={`gleichzeitig offen am ${dateShort(st.bester.date)} um ${clock(st.bester.minutes)} Uhr`}
            onPress={zeigeSpitze}
            hinweis="Auf der Karte zeigen"
          />
          <Kachel wert={st.ohneEintritt} text="ohne Eintritt oder auf Spende" />
          <Kachel wert={st.nurEinTag} text="nur an einem einzigen Tag offen" />
        </View>

        <Abschnitt
          titel="An welchen Tagen am meisten offen ist"
          einsicht={`An den Adventswochenenden haben im Schnitt ${ganz(st.advent.wochenende)} Märkte offen, von Montag bis Freitag ${ganz(st.advent.werktag)}. Am meisten sind es am ${dateShort(st.tagMax.date)} mit ${st.tagMax.offen}, an Heiligabend nur ${st.heiligabend.offen}.`}
        >
          <Legende reihen={WOCHE} />
          <Saeulen
            reihen={[{ name: 'Märkte', farbe: colors.rot }]}
            spalten={tagSpalten}
            start={tagMaxIndex}
            ablesen={(i) => `${dateShort(st.tage[i].date)}: ${plural(st.tage[i].offen, 'Markt', 'Märkte')} offen`}
            beschreibung={`Säulendiagramm der offenen Märkte je Tag vom ${dateNum(vonTag)} bis ${dateNum(bisTag)}. Höchster Wert ${st.tagMax.offen} am ${dateShort(st.tagMax.date)}. Die Zahlen stehen auch in der Tabelle darunter.`}
          />
          <Text style={styles.fuss}>
            Gezählt ist jeder Markt, der an dem Tag irgendwann offen hat, vom {dateNum(vonTag)} bis {dateNum(bisTag)}.
            An den übrigen Tagen der Saison haben höchstens {st.ausserhalbMax} Märkte offen.
          </Text>
          <Tabelle kopf={['Tag', 'Märkte']} zeilen={st.tage.map((t) => [dateShort(t.date), t.offen])} />
        </Abschnitt>

        <Abschnitt titel="Zu welcher Uhrzeit" einsicht={stundenEinsicht}>
          <Legende reihen={WOCHE} />
          <Saeulen
            reihen={WOCHE}
            spalten={st.stunden.map((x) => ({
              key: String(x.stunde),
              tick: x.stunde % 2 === 0 ? String(x.stunde) : undefined,
              werte: [x.wochenende, x.werktag],
            }))}
            start={st.stunden.indexOf(peakWe)}
            ablesen={(i) =>
              `${st.stunden[i].stunde} Uhr: ${ganz(st.stunden[i].wochenende)} am Wochenende, ${ganz(st.stunden[i].werktag)} unter der Woche`
            }
            beschreibung={`Säulendiagramm der offenen Märkte je Uhrzeit von 10 bis 22 Uhr, im Schnitt der Adventszeit. Höchster Wert um ${peakWe.stunde} Uhr. Die Zahlen stehen auch in der Tabelle darunter.`}
          />
          <Text style={styles.fuss}>
            Uhrzeit, gezählt zur vollen Stunde. Schnitt aus den Tagen vom {dateNum(st.advent.von)} bis {dateNum(st.advent.bis)}.
          </Text>
          <Tabelle
            kopf={['Uhrzeit', 'Sa und So', 'Mo bis Fr']}
            zeilen={st.stunden.map((x) => [`${x.stunde} Uhr`, ganz(x.wochenende), ganz(x.werktag)])}
          />
        </Abschnitt>

        <Abschnitt
          titel="Wie lange ein Markt offen hat"
          einsicht={`${st.nurEinTag} von ${st.maerkte} Märkten haben nur an einem einzigen Tag offen, die Hälfte an höchstens ${plural(st.medianTage, 'Tag', 'Tagen')}. ${st.langlaeufer} Märkte laufen länger als einen Monat.`}
        >
          <Balken zeilen={st.laufzeit} farbe={colors.rot} einheit={['Markt', 'Märkte']} />
          <Text style={styles.fuss}>Gezählt sind die Tage mit Öffnungszeiten.</Text>
        </Abschnitt>

        <Abschnitt
          titel="In welchem Bezirk"
          einsicht={`Die meisten Märkte gibt es in ${bezirkOben.namen} mit ${bezirkOben.wert}, die wenigsten in ${bezirkUnten.namen} mit ${bezirkUnten.wert}.`}
        >
          <Balken zeilen={st.bezirke} farbe={colors.rot} einheit={['Markt', 'Märkte']} />
        </Abschnitt>

        <Abschnitt
          titel="Welche Art von Markt"
          einsicht={`Die größte Gruppe ist „${art.label}“ mit ${art.wert} von ${st.maerkte} Märkten.`}
        >
          <Balken zeilen={st.arten} farbe={colors.rot} einheit={['Markt', 'Märkte']} />
        </Abschnitt>

        <View style={styles.abschnitt}>
          <Text style={styles.h} accessibilityRole="header">
            Zu den Daten
          </Text>
          <Text style={styles.p}>
            Ausgewertet sind die {st.maerkte} Berliner Märkte aus dem offenen Datensatz „Berliner und Brandenburger
            Weihnachtsmärkte“, ergänzt mit den Angaben der Veranstalter. Die Märkte in Brandenburg sind nicht dabei.
          </Text>
          <Text style={styles.p}>
            {st.barrierefrei} Märkte sind als barrierefrei angegeben. Bei {st.maerkte - st.barrierefrei} fehlt die Angabe,
            das heißt nicht, dass sie nicht barrierefrei sind.
          </Text>
          <Text style={styles.p}>
            Die App rechnet alle Zahlen selbst aus den Daten. Wie, steht im{' '}
            <Text
              style={styles.link}
              accessibilityRole="link"
              {...webLink(QUELLCODE)}
              onPress={IS_WEB ? undefined : () => Linking.openURL(QUELLCODE)}
            >
              Quellcode auf GitHub
            </Text>
            .
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.creme },
  content: { padding: 16 },
  inner: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  lead: { fontSize: font.body, lineHeight: 23, color: colors.tinte, marginBottom: 14 },
  kacheln: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  abschnitt: { marginTop: 28 },
  h: { fontSize: 19, fontWeight: '800', color: colors.tinte, marginBottom: 4 },
  einsicht: { fontSize: font.body, lineHeight: 23, color: colors.tinte, marginBottom: 12 },
  fuss: { fontSize: font.tiny, lineHeight: 18, color: colors.grau, marginTop: 6 },
  p: { fontSize: 15, lineHeight: 22, color: colors.tinte, marginBottom: 8 },
  link: { color: colors.rot, textDecorationLine: 'underline' },
});
