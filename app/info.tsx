import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Logo from '../src/components/Logo';
import { BILDER, BY_ID, MARKETS, STAND } from '../src/data';
import { dateNum } from '../src/lib/format';
import { IS_WEB, notify } from '../src/lib/notify';
import { colors } from '../src/theme';

function H({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.h} accessibilityRole="header">
      {children}
    </Text>
  );
}

function P({ children }: { children: ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}

/** Eigene Besuche aus der Statistik nehmen. Umami zählt nicht, solange umami.disabled im Speicher des Browsers steht. */
function Zaehlen() {
  const [aus, setAus] = useState(() => {
    try {
      return window.localStorage.getItem('umami.disabled') != null;
    } catch {
      return false;
    }
  });
  const umschalten = () => {
    try {
      if (aus) window.localStorage.removeItem('umami.disabled');
      else window.localStorage.setItem('umami.disabled', '1');
      setAus(!aus);
    } catch {
      notify('Geht in diesem Browser nicht', 'Der Browser erlaubt der Seite keinen Speicher.');
    }
  };
  return (
    <P>
      {aus ? 'Besuche in diesem Browser werden nicht mitgezählt. ' : ''}
      <Text style={styles.link} onPress={umschalten} accessibilityRole="button">
        {aus ? 'Wieder mitzählen' : 'Besuche in diesem Browser nicht mitzählen'}
      </Text>
    </P>
  );
}

function A({ url, children }: { url: string; children: ReactNode }) {
  return (
    <Text style={styles.link} onPress={() => Linking.openURL(url)} accessibilityRole="link">
      {children}
    </Text>
  );
}

export default function Info() {
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              accessibilityRole="button"
              style={IS_WEB ? styles.doneWeb : undefined}
            >
              <Text style={styles.done}>Fertig</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.brand}>
        <Logo size={56} />
        <View style={styles.brandText}>
          <Text style={styles.title}>Weihnachtsmärkte Berlin</Text>
          <Text style={styles.sub}>
            {MARKETS.length} Märkte, Stand {dateNum(STAND)}, Version {version}
          </Text>
        </View>
      </View>

      <View style={styles.box}>
        <Text style={styles.boxText}>
          Private Übersicht, kein Angebot des Landes Berlin oder der Veranstalter. Alle Angaben ohne Gewähr.
        </Text>
      </View>

      <H>Datenquellen</H>
      <P>
        Grundlage ist der offene Datensatz „Berliner Weihnachtsmärkte“ der Senatsverwaltung für Wirtschaft, Energie und
        Betriebe im <A url="https://daten.berlin.de">Berliner Open-Data-Portal</A>, aufbereitet von der{' '}
        <A url="https://github.com/technologiestiftung/weihnachtsmarktkarte">Open Data Informationsstelle Berlin (ODIS)</A>{' '}
        der Technologiestiftung Berlin. Eintrittspreise, Zeiten und Links wurden am {dateNum(STAND)} mit den Seiten der
        Veranstalter, mit berlin.de und visitBerlin abgeglichen und ergänzt. Die Kurzbeschreibungen sind eigene Zusammenfassungen.
      </P>
      {IS_WEB ? (
        <P>
          Kartenmaterial: © <A url="https://www.openstreetmap.org/copyright">OpenStreetMap-Mitwirkende</A>, Lizenz ODbL,
          dargestellt mit Leaflet.
        </P>
      ) : (
        <P>Kartenmaterial: Apple Karten.</P>
      )}

      <H>Datenschutz</H>
      {IS_WEB ? (
        <>
          <P>
            Die Seite hat kein Konto und setzt keine Cookies. Sie liegt bei Expo (EAS Hosting). Für eine anonyme
            Besucherstatistik nutzt sie Umami Cloud mit Datenregion EU. Umami setzt keine Cookies und speichert keine IP-Adressen. Gezählt
            werden aufgerufene Seiten, die Seite, von der du kommst, Browser, Betriebssystem, Gerätetyp und Land. Die
            Kartenkacheln kommen von den Servern der OpenStreetMap Foundation. Wie bei jeder Webseite erhalten diese
            Server beim Abruf technische Angaben wie deine IP-Adresse. Deinen Standort fragt die Seite nur, wenn du „In
            der Nähe“, eine Entfernung oder „Mein Standort“ antippst. Er wird nur in deinem Browser verwendet, um
            Entfernungen zu berechnen, und nirgendwohin gesendet. Links zu Veranstalterseiten öffnen sich in einem neuen
            Tab, dort gelten deren Datenschutzbestimmungen.
          </P>
          <Zaehlen />
        </>
      ) : (
        <P>
          Die App sammelt keine Daten und hat kein Konto. Deinen Standort fragt sie nur, wenn du „In der Nähe“, eine
          Entfernung oder „Mein Standort“ antippst. Er wird nur auf dem Gerät verwendet, um Entfernungen zu berechnen,
          und nirgendwohin gesendet. Links zu Veranstalterseiten öffnen sich im Browser, dort gelten deren
          Datenschutzbestimmungen.
        </P>
      )}

      <H>Bildnachweise</H>
      {Object.entries(BILDER).map(([id, b]) => (
        <Text key={id} style={styles.credit}>
          {BY_ID[id]?.name ?? id}: Foto {b.urheber}, <A url={b.lizenzUrl}>{b.lizenz}</A>, via Wikimedia Commons, zugeschnitten
          und verkleinert.
        </Text>
      ))}

      <H>Barrierefreiheit</H>
      <P>
        Alles, was die Karte zeigt, steht auch in der Liste. Bildschirmleser lesen zu jedem Stern den Namen des Markts
        und ob er gerade offen hat. Märkte, die erst an anderen Tagen öffnen, haben kleinere Sterne, damit man sie nicht
        nur an der Farbe erkennt. Zu den Diagrammen unter „Saison in Zahlen“ gibt es die Zahlen als Tabelle. Die
        Webseite lässt sich auch mit der Tastatur bedienen.
      </P>

      <H>Fehler gefunden?</H>
      <P>
        Termine ändern sich manchmal kurzfristig. Maßgeblich sind immer die Angaben auf der Seite des jeweiligen
        Veranstalters.
      </P>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.weiss },
  content: { padding: 16 },
  done: { fontSize: 17, fontWeight: '600', color: colors.rot },
  // Auf der Webseite fehlt der Randabstand, den iOS in der App von selbst setzt
  doneWeb: { paddingHorizontal: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  brandText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.tinte },
  sub: { fontSize: 14, color: colors.grau, marginTop: 2 },
  box: { backgroundColor: colors.rotHell, borderRadius: 10, padding: 12, marginBottom: 6 },
  boxText: { fontSize: 15, color: colors.rotDunkel, lineHeight: 21, fontWeight: '600' },
  h: { fontSize: 18, fontWeight: '700', color: colors.tinte, marginTop: 22, marginBottom: 6 },
  p: { fontSize: 15, lineHeight: 22, color: colors.tinte, marginBottom: 8 },
  link: { color: colors.rot, textDecorationLine: 'underline' },
  credit: { fontSize: 14, lineHeight: 20, color: colors.grau, marginBottom: 6 },
});
