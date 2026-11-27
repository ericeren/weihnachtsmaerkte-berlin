# Weihnachtsmärkte Berlin

Alle Berliner Weihnachtsmärkte der Saison 2026/27 auf einer Karte. Auf einen Blick sieht man, welcher Markt gerade offen hat, welcher heute noch aufmacht und wo der Eintritt frei ist.

**Webseite:** https://weihnachtsmaerkte-berlin.expo.app

## Was die App kann

- Karte und Liste mit 105 Märkten. Die Farbe der Sterne zeigt, ob ein Markt jetzt offen hat, heute später aufmacht oder erst an einem anderen Tag.
- Filter nach Tag und Uhrzeit: jetzt, heute, am Wochenende, zu einem bestimmten Zeitpunkt („Offen um“) oder an einem bestimmten Tag („Offen am“).
- Filter nach Nähe, Bezirk, Art des Markts und freiem Eintritt.
- Zu jedem Markt Öffnungszeiten, Adresse, Eintritt, ein Link zum Veranstalter und die Route mit Bus und Bahn.
- Nach der Hauptsaison ein Rückblick auf den Moment, an dem die meisten Märkte gleichzeitig offen hatten.

## Daten

Grundlage ist der offene Datensatz [„Berliner und Brandenburger Weihnachtsmärkte“](https://daten.berlin.de/datensaetze/simple_search_wwwberlindesenwebservicemaerktefesteweihnachtsmaerkte) der Senatsverwaltung für Wirtschaft, Energie und Betriebe im Berliner Open-Data-Portal. Aufbereitet hat ihn die Open Data Informationsstelle Berlin (ODIS) der Technologiestiftung Berlin im Projekt [weihnachtsmarktkarte](https://github.com/technologiestiftung/weihnachtsmarktkarte).

Am 27.11.2026 wurden Eintrittspreise, Öffnungszeiten und Links mit den Seiten der Veranstalter, mit berlin.de und mit visitBerlin abgeglichen und ergänzt. Die Kurzbeschreibungen sind eigene Zusammenfassungen. Wie der Datensatz entsteht, steht in [`tools/build_data.py`](tools/build_data.py). Das Ergebnis liegt in [`src/data/markets.json`](src/data/markets.json).

## Technik

- [Expo](https://expo.dev) SDK 58 mit React Native und Expo Router, eine Codebasis für iPhone und Web.
- Im Web eine Karte mit [Leaflet](https://leafletjs.com) und OpenStreetMap, veröffentlicht über EAS Hosting.
- Auf dem iPhone Apple Karten über react-native-maps, verteilt über Expo Go und EAS Update.
- Eine anonyme Besucherstatistik der Webseite mit [Umami](https://umami.is) Cloud, Datenregion EU, ohne Cookies. In der App lässt sie sich unter „Über die App“ abschalten.

## Selbst starten

Nötig ist [Node.js](https://nodejs.org) in der LTS-Version.

```
npm install
npx expo start --web
```

Mit `npx expo start` läuft die App über Expo Go auf dem iPhone. `npx expo export --platform web` baut die Webfassung in den Ordner `dist`.

## Entstehung

Die Idee stammt von Eric Eren. Wer auf einem Weihnachtsmarkt steht und weiterziehen will, soll schnell sehen, welcher Markt in der Nähe gerade offen hat. Den Code hat Claude geschrieben, ein KI-Assistent von Anthropic, nach Erics Vorgaben. Auch der Abgleich der Daten mit den Seiten der Veranstalter und die Kurzbeschreibungen der Märkte stammen von Claude. Eric hat die App auf dem iPhone und im Browser getestet und über Aufbau, Texte und Funktionen entschieden.

## Lizenzen

- Code: MIT, siehe [LICENSE](LICENSE).
- Daten und Texte in `src/data/markets.json`: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.de). Namensnennung: Senatsverwaltung für Wirtschaft, Energie und Betriebe (Ausgangsdatensatz unter CC BY), aufbereitet von der ODIS, ergänzt von Eric Eren.
- Fotos in `assets/markets`: von Wikimedia Commons unter eigenen Lizenzen, siehe [BILDNACHWEIS.md](assets/markets/BILDNACHWEIS.md). Die MIT-Lizenz gilt für sie nicht.
- Kartenmaterial im Web: © OpenStreetMap-Mitwirkende, Lizenz ODbL.

## Fehler gefunden?

Stimmt eine Öffnungszeit nicht oder fehlt ein Markt, freue ich mich über ein [Issue](https://github.com/ericeren/weihnachtsmaerkte-berlin/issues).

Private App, kein Angebot des Landes Berlin. Alle Angaben ohne Gewähr.
