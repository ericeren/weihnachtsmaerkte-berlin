#!/usr/bin/env python3
"""Baut src/data/markets.json fuer die App aus dem offenen ODIS-Datensatz
plus eigenen Pruefungen (Stand 27.11.2026).

Quelle: technologiestiftung/weihnachtsmarktkarte, public/markets_2026.csv
(Berlin Open Data, Senatsverwaltung fuer Wirtschaft, Energie und Betriebe,
aufbereitet von ODIS) und data_processing/markets_2026_new_from_berlinde.csv.
"""
import csv, json, re, shutil, datetime as dt
from pathlib import Path

# Aufruf: python tools/build_data.py <Pfad zu weihnachtsmarktkarte> <Pfad zu berlin_bezirke.geojson> <Ordner mit Fotos>
#   git clone https://github.com/technologiestiftung/weihnachtsmarktkarte
#   git clone https://github.com/funkeinteraktiv/Berlin-Geodaten
import sys
APP = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else APP.parent / 'weihnachtsmarktkarte'
GEO = Path(sys.argv[2]) if len(sys.argv) > 2 else APP.parent / 'Berlin-Geodaten/berlin_bezirke.geojson'
IMG_SRC = Path(sys.argv[3]) if len(sys.argv) > 3 else APP / 'assets/markets'
STAND = dt.date(2026, 11, 27)

# ---------------------------------------------------------------- Rohdaten
rows = [r for r in csv.DictReader(open(SRC / 'public/markets_2026.csv', encoding='utf-8-sig'), delimiter=';')]
extra = {r['id']: r for r in csv.DictReader(open(SRC / 'data_processing/markets_2026_new_from_berlinde.csv', encoding='utf-8-sig'), delimiter=',')}
ADD_FROM_BERLINDE = ['312', '313', '317', '318']  # bei ODIS nicht in der Endfassung, laut berlin.de 2026 aber geplant
for i in ADD_FROM_BERLINDE:
    r = dict(extra[i]); r['datenquelle'] = 'hauptstadtportal'; rows.append(r)

rows = [r for r in rows if r.get('ignore', '0') != '1' and r['bezirk'] != 'Brandenburg']

# ---------------------------------------------------------------- Namen
NAME = {
 '2': 'Kunsthandwerklicher Weihnachtsmarkt Frohnau', '5': 'Kunsthandwerklicher Weihnachtsmarkt am Mexikoplatz',
 '8': 'Lichtenrader Lichtermarkt', '11': 'Berliner Weihnachtszeit am Roten Rathaus', '17': 'Wintermarkt am Humboldt Forum',
 '20': 'Romantischer Weihnachtsmarkt der Lebenshilfe', '23': 'Historische Weihnacht auf dem RAW-Gelände', '26': 'Winterquartier Berlin',
 '29': 'Weihnachtsmarkt auf der Dicken Linda', '32': 'Heissa Holzmarkt Winterfestival', '38': 'Weihnachtsmarkt im Paul Gerhardt Stift',
 '41': 'A Very British Christmas', '44': 'Umwelt- und Weihnachtsmarkt in der Sophienstraße', '50': 'Adventsmarkt im Bergmannkiez',
 '53': 'Glühweingarten im ://about blank', '56': 'Weihnachtsmarkt in der freiheit fünfzehn', '59': 'Winter am THF',
 '62': 'Adventsmarkt im Evangelischen Johannesstift', '65': 'Wintershopping in der Wilmersdorfer Straße',
 '68': 'Weihnachtsmarkt am Schloss Charlottenburg', '71': 'Schwedischer Weihnachtsbasar', '74': 'Weddingmarkt Weihnachtsausgabe',
 '77': 'Oh du Schöneweide', '83': 'Weihnachtsrummel am Alice-Salomon-Platz', '89': 'Weihnachtsmarkt in der Bölschestraße',
 '95': 'Weihnachtsmarkt am Tempelhofer Hafen', '98': 'Rudower Weihnachtsmeile', '101': 'Weihnachtsmarkt an den Hallen am Borsigturm',
 '107': 'Weihnachtsmarkt Alt-Buckow', '110': 'Weihnacht to go im Kranoldkiez', '116': 'Pankower Adventsmarkt in den Heynhöfen',
 '122': 'Ökumenischer Adventsbasar in Alt-Lübars', '125': 'Weihnachtsmarkt an der Lindenkirche', '128': 'Adventsmarkt auf der Domäne Dahlem',
 '131': 'Kunsthandwerklicher Advent am Karl-August-Platz', '134': 'Kunsthandwerklicher Advent in der Leonhardtstraße',
 '137': 'Weihnachten in Westend', '140': 'WEINachten am Ludwig-Beck-Platz', '143': 'Weihnachtsmarkt an der Gedächtniskirche',
 '149': 'Weihnachtsmarkt in der Abenteueroase', '152': 'Adventsökomarkt am Kollwitzplatz',
 '155': 'Lichterglanz im Tannenwald (Späth’sche Baumschulen)', '158': 'Adventsmarkt Alt-Marzahn',
 '161': 'Kulinarischer Weihnachtsmarkt beim Weinlobbyisten', '167': 'Weihnachtsmarkt in der Fundgrube am Oberhafen',
 '200': 'Alt-Kaulsdorfer Weihnachtsmarkt', '201': 'Weihnachten an der Spree', '202': 'Weihnachtsmarkt auf Lehmanns Bauernhof',
 '203': 'Weihnachtsmarkt vor dem Bröhan-Museum', '204': 'Adventsbasar der Albert-Schweitzer-Stiftung', '205': 'Christmas Avenue',
 '212': 'Winterlights im Dark Matter', '213': 'Weihnachtsmarkt am Alexanderplatz', '214': 'WeihnachtsZauber Gendarmenmarkt',
 '215': 'Alt-Rixdorfer Weihnachtsmarkt', '216': 'Winterwelt am Potsdamer Platz', '217': 'Lucia Weihnachtsmarkt in der Kulturbrauerei',
 '218': 'Keramik Wintermarkt', '223': 'Weihnachtsmarkt auf der Lohmühleninsel', '224': 'Winter Wonderland im Britzer Garten',
 '225': 'Weihnachtsmarkt am Markusplatz', '226': 'Nordberliner Weihnachtsrummel', '227': 'Berliner Hundeweihnachtsmarkt',
 '228': 'Lichtermarkt an der Christuskirche Oberschöneweide', '229': 'Merry Markthalle', '230': 'Lichtenberger Winterzeit',
 '231': 'Weihnachtsfest der Tiere im Tierheim Berlin', '234': 'Alpinia Wintermarkt', '237': 'Oberschöner Weihnachtsmarkt',
 '238': 'Solidarischer Wintermarkt im Görlitzer Park', '239': 'Nordische Märchenweihnacht am Gutshof Britz',
 '242': 'Spandauer Weihnachtsmarkt in der Altstadt', '243': 'Kinky Weihnachtsmarkt', '244': 'Sozial-Weihnachtsmarkt im Stadtschloss Moabit',
 '245': 'Bucher Weihnachtszauber', '246': 'Japanmarkt Christmas Edition', '247': 'Weihnachtsfest in der Alten Fasanerie',
 '248': 'Spandauer Winterland', '250': 'Feuriger Advent auf der Marzahner Promenade', '251': 'Adventsbasar der Kaspar Hauser Stiftung',
 '252': 'Adventsmarkt in Hanff’s Ruh', '253': 'Schauriger Weihnachtsmarkt im Goerzwerk', '254': 'Weihnachtsmarkt auf der Trabrennbahn Karlshorst',
 '256': 'Glühwald am Uber Platz', '257': 'Gatower Kunst- und Handwerkermarkt', '258': 'Nachhaltiger Weihnachtsmarkt am Schloss Schönhausen',
 '259': 'Grunewalder Weihnachtsmarkt', '260': 'Wintermarkt am ehemaligen Flughafen Tegel', '261': 'Waldweihnachtsmarkt am Forstamt Grunewald',
 '262': 'Weihnachtsbasar im Auswärtigen Amt', '263': 'Advent im Forstamt Tegel', '264': 'Weihnachtsmarkt am KaDeWe', '265': 'Weihnachtsrodeo',
 '266': 'Weihnachtsmarkt auf dem Schlossplatz Köpenick', '267': 'Altglienicker Adventsmarkt', '268': 'Dänischer Weihnachtsmarkt',
 '269': 'Lichtermarkt am Rathaus Lichtenberg', '271': 'Adventsmarkt im St.-Michaels-Heim', '272': 'Zehlendorfer Weihnachtsmarkt',
 '273': 'Märchenhafter Weihnachtsmarkt am Jagdschloss Grunewald', '274': 'Adventsmarkt in der Papierstraße',
 '312': 'Weihnachtsmarkt in der Villa Donnersmarck', '313': 'Holy Shit Shopping', '317': 'Norwegischer Julebasar', '318': 'Nowkoelln Xmas Flowmarkt',
}

# ---------------------------------------------------------------- Art des Marktes
TYPEN = {
 'klassiker': ['11', '17', '65', '68', '95', '101', '143', '213', '214', '216', '217', '242', '256', '264', '272'],
 'kiez': ['8', '20', '29', '38', '50', '56', '62', '89', '98', '107', '110', '122', '125', '137', '140', '149', '158', '161', '167', '200', '204', '215',
          '228', '231', '234', '244', '247', '250', '251', '252', '253', '259', '266', '267', '269', '271', '312'],
 'kunst': ['2', '5', '59', '74', '116', '131', '134', '203', '218', '223', '229', '237', '257', '260', '265', '274', '313', '318'],
 'historisch': ['23', '239', '245', '273'],
 'international': ['41', '71', '246', '254', '262', '268', '317'],
 'natur': ['44', '128', '152', '202', '224', '225', '258', '261', '263'],
 'rummel': ['26', '77', '83', '155', '201', '212', '226', '230', '248'],
 'szene': ['32', '53', '205', '227', '238', '243'],
}
TYP = {i: t for t, ids in TYPEN.items() for i in ids}

# ---------------------------------------------------------------- Kurzbeschreibungen (eigene Formulierung)
TEXT = {
 '2': 'Rund 120 Kunsthandwerkerinnen und Kunsthandwerker zeigen im Zentrum von Frohnau ihre Unikate, von Schmuck und Keramik bis zu Weihnachtsdeko.',
 '5': 'An allen vier Adventssonntagen bieten über 90 Kunsthandwerkerinnen und Kunsthandwerker am Mexikoplatz in Zehlendorf handgefertigte Arbeiten an.',
 '8': 'Der traditionsreiche Lichtermarkt in Alt-Lichtenrade findet zum 48. Mal statt, wie immer am ersten Adventssonntag.',
 '11': 'Eisbahn rund um den Neptunbrunnen, ein 50 Meter hohes Riesenrad mit beheizten Gondeln und eine Marktgasse im Altberliner Stil. Für Kinder gibt es einen Märchenwald mit Eisenbahn.',
 '17': 'Historischer Wintermarkt auf dem Schlossplatz mit Kunsthandwerk, regionalen Spezialitäten und nostalgischen Fahrgeschäften. Abends wird die Fassade des Humboldt Forums mit Videoprojektionen bespielt.',
 '20': 'Ein Adventssamstag im Haus der Lebenshilfe im Wedding und im Garten: Stände mit Selbstgemachtem und Kunsthandwerk, dazu Waffeln, Crêpes, Plätzchen und Kinderpunsch.',
 '23': 'Mittelalterlich anmutender Markt mit Schmieden, Holzschnitzern und Töpfern, Gauklern und Akrobaten bei Fackelschein. Für Kinder gibt es Riesenrad, Holzkarussell und Bogenschießen.',
 '26': 'Wintermarkt mit rund 1.000 Quadratmeter großer Hallen-Eisbahn, Eisstockschießen, Eisdisco und weihnachtlichem Programm im Napoleon Komplex in Friedrichshain.',
 '29': 'Am zweiten Samstag im Advent wird der Wochenmarkt Dicke Linda auf dem Neuköllner Kranoldplatz zum Weihnachtsmarkt.',
 '32': 'Wintermarkt auf dem Holzmarkt-Gelände an der Spree mit ungewöhnlichen Waren und vielfältigem Programm im ganzen Quartier.',
 '38': 'Zum fünften Mal wird das Gelände des Paul Gerhardt Stifts im Wedding zum Weihnachtsmarkt, mit Programm für Groß und Klein.',
 '41': 'Englischsprachiger Weihnachtsmarkt der anglikanischen St George’s Church in Westend.',
 '44': 'Design- und Künstlerware in einer der ältesten Straßen Berlins, direkt neben den Hackeschen Höfen. Das Umweltkonzept des Marktes wurde schon 1996 ausgezeichnet.',
 '50': 'Adventsnachmittag im Pflegewohnheim Am Kreuzberg, gemeinsam mit dem Mühlenhaupt Museum gegenüber, mit Programm für Groß und Klein.',
 '53': 'Glühwein, Feuertonne, veganes Essen und Musik im Zelt im Garten des Clubs ://about blank am Ostkreuz, immer sonntags im Advent.',
 '56': 'Stände mit Handgemachtem, Essen und Getränken sowie Kinderprogramm mit Weihnachtsmann und Märchenhütte im Kulturort freiheit fünfzehn in Köpenick.',
 '59': 'Wintermarkt in der Alten Feuerwache am THF Tower mit Food Court, Designobjekten und Familienprogramm. Am 13. Dezember gibt es ein großes Weihnachtssingen in der Haupthalle.',
 '62': 'Stimmungsvoller Adventsmarkt mit Kerzenlicht und Musik auf dem Stiftsgelände in Spandau. Er beginnt im Anschluss an eine Adventsandacht.',
 '65': 'Weihnachtsstände in der Fußgängerzone der Wilmersdorfer Straße, ebenerdig und mitten im Einkaufsviertel.',
 '68': 'Vor der Kulisse des beleuchteten Schlosses gibt es Kunsthandwerk, Weihnachtsdeko, Live-Musik, eine Lichtshow und Angebote für Kinder.',
 '71': 'Weihnachtsbasar der Schwedischen Kirche in Berlin, fast komplett im Freien. Am Samstag und Sonntag singt Lucia mit ihrem Chor.',
 '74': 'Der Wochenmarkt auf dem Leopoldplatz wird an den Adventssonntagen und am Samstag vor Weihnachten zum Weihnachtsmarkt mit Kunst, Design und Streetfood, dazu Lagerfeuer und Stockbrot für Kinder.',
 '77': 'Weihnachtliches Event in Oberschöneweide mit Markt und Weihnachtsdinner. Speisen und Getränke sind im Ticketpreis enthalten.',
 '83': 'Weihnachtsrummel mit Fahrgeschäften und Buden mitten in Hellersdorf, für die ganze Familie.',
 '89': 'Drei Tage lang wird die beleuchtete Bölschestraße in Friedrichshagen zum Weihnachtsmarkt mit Bühnenprogramm und kulinarischen Ständen.',
 '95': 'Weihnachtsmarkt am Tempelhofer Hafen mit Live-Musik und Karussell, gut zu verbinden mit dem Weihnachtseinkauf.',
 '98': 'Ein Adventswochenende rund um die Straße Alt-Rudow mit Glühwein, gebrannten Mandeln und Programm der AG Rudow.',
 '101': 'Weihnachtsmarkt auf dem Vorplatz der Hallen am Borsigturm in Tegel mit geschmückten Ständen, winterlichen Leckereien und Live-Musik.',
 '107': 'Kiezweihnachtsmarkt am ersten Adventswochenende in Alt-Buckow mit Ständen voller handgemachter Geschenke und weihnachtlicher Deko.',
 '110': 'Die Straßen rund um den Kranoldplatz in Lichterfelde-Ost werden für einen Nachmittag zum Weihnachtsmarkt, organisiert von der Standortgemeinschaft Mein LiLa.',
 '116': 'Am zweiten Advent bieten wechselnde Stände in den Heynhöfen Geschenke, Kunst, Schmuck und Deko, dazu Essen und Trinken.',
 '122': 'Ökumenischer Adventsbasar im Pfarrgarten im Dorfkern Alt-Lübars, alle Stände sind ebenerdig.',
 '125': 'Kunsthandwerk, Bücher, Trödel, Cafeteria, Herzhaftes und Glühwein an der Lindenkirche in Wilmersdorf. Zeitgleich ist Tag der offenen Tür in der Kita.',
 '128': 'An allen Adventswochenenden auf dem Bio-Landgut: Kunsthandwerk, Bio-Speisen, Bläsermusik und für Kinder Feuershow, Basteln und Kugeln bemalen.',
 '131': 'Kunsthandwerkermarkt am ersten Adventssonntag auf dem Karl-August-Platz in Charlottenburg.',
 '134': 'Kunsthandwerk auf dem Bürgersteig der Leonhardtstraße in Charlottenburg am zweiten Adventssonntag.',
 '137': 'Kleiner Weihnachtsmarkt auf dem Gehweg der Preußenallee in Westend am vierten Adventswochenende.',
 '140': 'Kleiner Wein-Nachtsmarkt auf dem Ludwig-Beck-Platz in Lichterfelde am dritten Adventswochenende.',
 '143': 'Rund 100 Stände rund um die Gedächtniskirche mit Handwerkskunst aus aller Welt, Glühweingärten und einem rund 400 Meter langen Lichtteppich. Der Markt ist barrierefrei gestaltet.',
 '149': 'Pfadfindergruppen, Vereine und Jugendeinrichtungen betreiben die Stände auf dem Außengelände der Abenteueroase, mit alkohol- und fleischfreien Leckereien.',
 '152': 'Ökomarkt der Grünen Liga an den Adventssonntagen: faires und bewusstes Einkaufen, süße und herzhafte Snacks und Infostände gemeinnütziger Vereine.',
 '155': 'Weihnachtswelt auf dem historischen Gelände der Baumschule mit beleuchtetem Tannenwald, Live-Bands und Chören, rund 100 Ständen, Glitzergarten und Kremserfahrten.',
 '158': 'Adventsmarkt im alten Dorfkern Alt-Marzahn am ersten Adventssonntag.',
 '161': 'Kulinarischer Weihnachtsmarkt in Schöneberg, ausgerichtet vom Weinlobbyisten in der Kolonnenstraße.',
 '167': 'Zum ersten Mal wird der Hof der Fundgrube in Spandau zum Weihnachtsmarkt, mit Live-Musik, inklusivem Foodtruck, Schnitzeljagd und Tombola.',
 '200': 'Weihnachtsmarkt im Dorfkern Alt-Kaulsdorf am Samstag vor dem zweiten Advent.',
 '201': 'All-inclusive-Weihnachtsmarkt am Spreespeicher mit Blick auf die Oberbaumbrücke: Speisen und Getränke sind im Ticket enthalten, dazu Eisstockschießen.',
 '202': 'Familiärer Markt auf einem denkmalgeschützten Vierseitenhof an der Dorfaue Marienfelde mit Kunsthandwerk, Bühnenprogramm, Märchenerzählerin, Ponyreiten und Hoftieren.',
 '203': 'Kunsthandwerklicher Weihnachtsmarkt vor dem Bröhan-Museum gegenüber dem Schloss Charlottenburg, ebenerdig und gut beleuchtet.',
 '204': 'Adventsbasar der Albert-Schweitzer-Stiftung im Pfarrgarten in Blankenburg unter dem Motto „Miteinander statt nebeneinander“.',
 '205': 'Queerer Weihnachtsmarkt unter der Hochbahn am Nollendorfplatz mit Hütten für Mode, Kunst und Handgemachtes. Ab 19 Uhr gibt es Bühnenprogramm mit Drag-Bingo, Karaoke und DJs.',
 '212': 'Kein klassischer Markt, sondern eine Lichtinstallation mit Eisbahn: ein schwebender Wald aus Tannen und Lichtpunkten, dazu Glühwein und Schlittschuhverleih.',
 '213': 'Traditionelle Weihnachtswelt mit Gassen, Kinderkarussell und Kunsthandwerk am Brunnen der Völkerfreundschaft. An der Weltzeituhr gibt es Streetfood und eine Eisstockbahn.',
 '214': 'Einer der bekanntesten Märkte der Stadt zwischen Deutschem und Französischem Dom, mit täglichem Bühnenprogramm aus Akrobatik, Chören und Musik, Kunsthandwerk und beheizten Zelten.',
 '215': 'Über 200 gemeinnützige Gruppen und Vereine verkaufen am zweiten Adventswochenende Selbstgemachtes rund um den Richardplatz im historischen Rixdorf, von Holzspielzeug bis Honig.',
 '216': 'Weihnachtsmarkt zwischen Alter Potsdamer Straße und Marlene-Dietrich-Platz mit mobiler Rodelbahn.',
 '217': 'Skandinavisch geprägter Markt im Hof der Kulturbrauerei mit nostalgischem Karussell, Feuerschalen und dem Thron des Weihnachtsmanns samt Wunschzettel-Briefkasten.',
 '218': 'Wintermarkt rund um Keramik beim Clayers Collective in der Wollankstraße.',
 '223': 'Freischwimmer und Ipse richten erstmals gemeinsam einen Markt am Ufer des Flutgrabens aus: Design, Vintage, Kunsthandwerk und Schmuck, dazu Musik, Feuershows und Live-Painting.',
 '224': 'Erstmals gibt es am Modellboothafen im Britzer Garten einen kleinen Weihnachtsmarkt mit Seeblick, Live-Musik, Feuershow und Sprechstunde beim Weihnachtsmann.',
 '225': 'Erster Weihnachtsmarkt auf dem Steglitzer Markusplatz mit Fokus auf Nachhaltigkeit: soziale Einrichtungen bieten Deko, Kunsthandwerk und Essen, dazu Upcycling und eine Tauschbörse für Weihnachtsschmuck.',
 '226': 'Neuer Weihnachtsrummel auf der Festwiese am Borsigturm mit nostalgischen Karussells, schnellen Fahrgeschäften, Imbissständen und Lichtern.',
 '227': 'Weihnachtsmarkt für Hunde und ihre Menschen im Hundeauslaufgebiet Grunewald: Geschenke und Deko rund ums Tier, dazu Glühwein und Snacks.',
 '228': 'Traditionell am Samstag vor dem ersten Advent: Vereine und Gruppen aus dem Kiez verkaufen an der Christuskirche Kunsthandwerk, Spielzeug und Selbstgemachtes.',
 '229': 'Die Markthalle Neun wird an den Adventssonntagen zum wettergeschützten Weihnachtsmarkt mit Schmuck, Kinderkleidung, Büchern, Mode und lokal gemachten Leckereien.',
 '230': 'Großer Weihnachtsrummel an der Landsberger Allee mit Riesenrad, Action- und Kinderfahrgeschäften, Glühwein und Imbissständen. Mittwochs ist Familientag mit günstigeren Fahrpreisen für Kinder.',
 '231': 'Beim Weihnachtsfest der Tiere können Besucher kleine Geschenke für die Tierheimtiere mitbringen. Dazu gibt es Kunsthandwerk, einen Büchermarkt und Geschenkideen für Mensch und Tier.',
 '234': 'Kleiner Adventsmarkt am Hotel Landhaus Alpinia in Mariendorf mit Lagerfeuer, Glühwein, Crêpes und Lebkuchen an den Adventssonntagen.',
 '237': 'Weihnachtsmarkt am zweiten Adventswochenende im Hasselwerder Park in Schöneweide, mit Kunsthandwerk und Live-Musik.',
 '238': 'Rund 25 Stände mit regionalen Waren, Waffeln, Glühwein und Kleidertausch. Die Einnahmen gehen an soziale Projekte im Kiez.',
 '239': 'Nordisch-historischer Markt mit Märchenprogramm, Schattentheater und Feuershow. Kinder können Bogenschießen ausprobieren und auf Wikingerboote klettern, dazu gibt es Glögg.',
 '242': 'Großer Kunsthandwerkermarkt vom Marktplatz bis zwischen Rathaus und Nikolaikirche, mit internationalem Angebot von Alpakawolle aus Peru bis Weihnachtsschmuck aus Polen.',
 '243': 'Über 30 Stände mit Mode, Accessoires, Schmuck und Spielzeug für Erwachsene, dazu Workshops. Zutritt ab 18 Jahren.',
 '244': 'Beim Sozial-Weihnachtsmarkt von Goldnetz können Menschen mit wenig Geld liebevoll gemachte, nachhaltig hergestellte oder upgecycelte Geschenke kaufen.',
 '245': 'Mittelalterlich angehauchter Markt in historischer Kulisse in Buch, mit Lagerfeuer, Gauklern, Kunsthandwerk und Kerzenziehen für Kinder.',
 '246': 'Weihnachtsausgabe des Japanmarkts im Festsaal Kreuzberg mit Workshops, Kulinarik und Handgemachtem, dazu Kampfkunst, Konzerte und Tanz.',
 '247': 'Familienfreundliches Weihnachtsfest mit Lagerfeuer, Live-Musik und Bühnenprogramm in der Alten Fasanerie in Lübars.',
 '248': 'Winterrummel auf dem ehemaligen Postgelände gegenüber den Spandau Arcaden mit über 40 Fahrgeschäften vom Riesenrad bis zur Geisterbahn und Glühweingärten.',
 '250': 'Kiezweihnachtsmarkt mit Feuerschalen, A-cappella-Chor, Feuershow, Plätzchen und Kinderpunsch auf der Marzahner Promenade.',
 '251': 'Basar auf dem Gelände der Konrad-Duden-Schule mit Handgemachtem aus Werkstätten für Menschen mit Behinderung, etwa Keramik, Filz, Bienenwachskerzen und Adventsgestecken.',
 '252': 'Traditioneller Adventsmarkt im Garten des Restaurants Hanff’s Ruh in Köpenick mit besinnlicher Musik und Ständen mit Holz-, Filz- und Wollarbeiten.',
 '253': 'Ein Krampus streift über den Markt, das Programm bleibt aber gemütlich: Geschenkideen, Live-Musik und Reiten durch das Birkenwäldchen, dazu kommt der Nikolaus.',
 '254': 'Interkultureller Weihnachtsmarkt unter dem Motto „Die Welt zu Hause in Karlshorst“: neben Lebkuchen und Glühwein gibt es Einblicke in Weihnachtsbräuche anderer Kulturen.',
 '256': 'Der Uber Platz wird zum Weihnachtswald mit Tannenduft, Holzhütten, Kartoffelpuffern, Waffeln und Bratwurst.',
 '257': 'Rund 40 Kunsthandwerkerinnen und Kunsthandwerker verkaufen in Alt-Gatow Handgemachtes, dazu stellen sich Vereine und Initiativen aus dem Ort vor.',
 '258': 'Müllvermeidender Weihnachtsmarkt mit nachhaltig hergestellten Manufakturwaren vor der Kulisse von Schloss Schönhausen in Pankow.',
 '259': 'Seit 1976 rund um die Grunewaldkirche: etwa 50 Stände gemeinnütziger Organisationen mit Süßem, Herzhaftem und Geschenkideen in familiärer Atmosphäre.',
 '260': 'In der alten Frachtkantine des früheren Flughafens Tegel gibt es rund 30 Stände mit Keramik, Schmuck und nachhaltigen Produkten, einige spenden ihre Einnahmen.',
 '261': 'Rustikaler Markt auf dem Wirtschaftshof des Forstamts mit Wildschwein und Reh aus Berliner Wäldern, Gulasch und Würsten.',
 '262': 'Basar im Lichthof des Auswärtigen Amts mit Kuriositäten und Weihnachtsdeko aus aller Welt, organisiert vom Förderkreis Eine Welt.',
 '263': 'Gemütlich und rustikal mit Lagerfeuer: Wildfleisch und Würste, frisch geräucherter Fisch, Honig, Brennholz und Weihnachtsgrün.',
 '264': 'Weiße Pagodenzelte am Wittenbergplatz zwischen KaDeWe und U-Bahnhof, mit regionalen Spezialitäten, kleiner Bühne und dem energieautarken Riesenrad „Solar Wheel“.',
 '265': 'Designmarkt im Colosseum an der Schönhauser Allee: rund 150 Designerinnen und Designer mit Mode, Schmuck, Kunst und Streetfood.',
 '266': 'Freie Träger aus dem Bezirk verkaufen auf der Schlossinsel Kunsthandwerk, Keramik, Kerzen und regionalen Honig. Abends spielen Turmbläser am Schloss.',
 '267': 'Rund 20 Stände von Vereinen, Kitas und Selbstständigen aus dem Kiez nahe dem S-Bahnhof Altglienicke, mit Essen, Gestecken und kleinem Kunsthandwerk.',
 '268': 'Julemarked der Dänischen Kirche in Wilmersdorf mit Glögg, Lakritz, Æbleskiver, Smørrebrød und dänischem Weihnachtsbier.',
 '269': 'Seit über 30 Jahren zum ersten Advent: Vereine, Schulen und Einrichtungen verkaufen am Rathaus Lichtenberg Handgemachtes, Spielzeug und Gebäck.',
 '271': 'Seit über 40 Jahren richtet das Johannische Sozialwerk diesen Markt am St.-Michaels-Heim aus, mit Leckereien nach alten Rezepten.',
 '272': 'Fünf Wochen lang vor dem Rathaus Zehlendorf: Kunsthandwerk entlang des Teltower Damms, eine Kunsteisbahn und am Wochenende ab 16 Uhr Bühnenprogramm.',
 '273': 'Im Hof des ältesten erhaltenen Schlosses Berlins am Grunewaldsee laufen Märchenfiguren zwischen den Ständen umher, mit Kunsthandwerk und Leckereien.',
 '274': 'In offenen Werkstätten in Alt-Reinickendorf gibt es Handgemachtes aus Papier, Stoff und Wolle, von Kalendern und Notizbüchern bis zu Kissen und Taschen.',
 '312': 'Die Villa Donnersmarck wird zum Weihnachtshaus: Handgemachtes aus Werkstätten und Gruppen für Menschen mit Behinderung, dazu Programm für Kinder.',
 '313': 'Designmarkt im Haus der Visionäre mit ausgewählten Produkten von über 300 Kreativen aus Deutschland und Europa, dazu DJ-Sets, Glühwein und Streetfood.',
 '317': 'Adventsbasar der Norwegischen Kirche in Kreuzberg mit Gløgg, Fischsuppe und Pfannkuchen, dazu Fairtrade- und Secondhand-Waren und Marshmallows am Feuer.',
 '318': 'Über 50 Stände am Landwehrkanal mit überwiegend selbstgemachtem Design und Kunst aus dem Kiez, dazu Glühwein und Waffeln.',
}

# ---------------------------------------------------------------- Eintritt (geprüft 26./27.11.2026)
U = ('unbekannt', 'Keine Angabe zum Eintritt')
FEE = {
 '2': ('frei', 'Eintritt frei'),
 '11': ('frei', 'Eintritt frei. Eisbahn 5 € pro Laufzeit'),
 '17': ('frei', 'Eintritt frei'),
 '23': ('kosten', 'Di bis Fr 3 €, Sa und So 4 €, ermäßigt jeweils die Hälfte. Montags frei, Kinder bis 5 Jahre frei'),
 '26': ('spende', 'Eintritt auf Spendenbasis. Eisbahn ab 6 € für 90 Minuten, Leihschlittschuhe 5 €'),
 '50': U,
 # nachgetragen am 27.11.2026: Veranstalterseiten, berlin.de-Liste „Weihnachtsmärkte mit freiem Eintritt“, visitBerlin, Berliner Kurier
 '5': ('frei', 'Eintritt frei (laut berlin.de)'),
 '32': ('kosten', 'Mi und Do 2 €, Fr bis So 3 € Kulturbeitrag. Frei für Kinder bis 12 Jahre, Senior*innen und in der ersten Stunde nach Öffnung für alle'),
 '53': ('frei', 'Eintritt frei'),
 '56': ('frei', 'Eintritt frei. Eisbahn 10 € pro Person und Stunde, ein Glühwein inklusive'),
 '158': ('frei', 'Eintritt frei'),
 '234': ('frei', 'Eintritt frei (laut berlin.de)'),
 '237': ('frei', 'Eintritt frei (Angabe von 2025)'),
 '245': ('frei', 'Eintritt frei (laut berlin.de)'),
 '247': ('frei', 'Eintritt frei (Angabe von 2025)'),
 '252': ('frei', 'Eintritt frei (laut berlin.de)'),
 '259': ('frei', 'Eintritt frei (laut berlin.de)'),
 '268': ('frei', 'Eintritt frei (laut berlin.de)'),
 '271': ('frei', 'Eintritt frei (laut berlin.de)'),
 '317': ('frei', 'Eintritt frei (laut berlin.de)'),
 '318': ('frei', 'Eintritt frei'),
 '59': ('frei', 'Eintritt frei. Für das Weihnachtssingen am 13.12. braucht man ein Ticket'),
 '62': ('frei', 'Eintritt frei'),
 '65': ('frei', 'Eintritt frei (öffentliche Fußgängerzone)'),
 '71': ('kosten', '2 € pro Person, Kinder bis 12 Jahre frei'),
 '77': ('ticket', 'Nur mit Ticket. Speisen und Getränke sind im Preis enthalten'),
 '116': ('frei', 'Eintritt frei'),
 '128': ('kosten', '4,50 €, ermäßigt 2 €, Kinder unter 12 frei. Tickets am besten vorab online kaufen'),
 '152': ('frei', 'Eintritt frei'),
 '155': ('ticket', 'Ticket nötig, online günstiger als vor Ort'),
 '201': ('ticket', 'Ticket ab 29,99 € plus Gebühren, nur im Vorverkauf. Speisen und Getränke inklusive'),
 '202': ('frei', 'Eintritt frei'),
 '212': ('ticket', 'Ticket nötig, Preise auf der Webseite'),
 '214': ('kosten', '2 €. Mo bis Fr von 11 bis 14 Uhr frei (nicht am 24., 25., 26. und 31.12.). Kinder unter 12 sowie Menschen mit Schwerbehindertenausweis und eine Begleitperson frei'),
 '224': ('kosten', 'Eintritt in den Britzer Garten (Tageskarte ab 1 €)'),
 '227': ('kosten', '2,50 €, davon geht 1 € an einen Tierschutzverein'),
 '231': ('kosten', '1 €, Kinder unter 6 Jahren frei'),
 '239': ('kosten', 'Kostenpflichtig, Preis für 2026 noch nicht veröffentlicht (2024: 5 €, ermäßigt 2 €, Kinder unter 6 frei)'),
 '243': ('kosten', '6 bis 10 €, Zutritt ab 18 Jahren'),
 '246': ('kosten', '22 €, Frühbucher 16 €, Kinder unter 10 frei'),
 '258': ('kosten', '2 €, unter 18 Jahren frei'),
 '265': ('ticket', 'Ticket nötig, Preise auf der Webseite. Ein Drink am Einlass ist inklusive'),
 '272': ('frei', 'Eintritt frei. Schlittschuhbahn 2,50 €'),
 '273': ('kosten', '3,50 €, ermäßigt 2 €, mit Schlossbesichtigung. Kinder bis 6 Jahre frei'),
 '312': ('frei', 'Eintritt frei'),
 '313': ('kosten', '8 €, Kinder bis 14 Jahre frei'),
}

# ---------------------------------------------------------------- Webseiten
WEB = {
 '2': 'https://www.kunsthand-berlin.de/',
 '32': 'https://www.holzmarkt.com/veranstaltung/heissa-holzmarkt-winterfestival-2026',
 '65': 'https://www.berlin.de/weihnachtsmarkt/5697424-3496862-weihnachtsmarkt-fussgaengerzone-wilmersd.html',
 '158': 'https://www.berlin.de/weihnachtsmarkt/5685805-3496862-adventsmarkt-altmarzahn.html',
 '200': 'https://www.berlin.de/weihnachtsmarkt/5685370-3496862-christmas-market-alt-kaulsdorf.html',
 '203': 'https://www.berlin.de/weihnachtsmarkt/3659759-3496862-weihnachtsmarkt-vor-dem-broehanmuseum.html',
 '218': 'https://clayerscollective.squarespace.com/',
 '312': 'https://www.berlin.de/weihnachtsmarkt/5703211-3496862-weihnachtsmarkt-in-der-villa-donnersmarc.html',
 '313': 'https://www.berlin.de/weihnachtsmarkt/2208886-3496862-holy-shit-shopping.html',
 '317': 'https://www.berlin.de/weihnachtsmarkt/7792272-3496862-norwegischer-julebasar.html',
 '318': 'https://www.berlin.de/weihnachtsmarkt/4611178-3496862-nowkoelln-xmas-flowmarkt.html',
}

# ---------------------------------------------------------------- Adressen
ADR = {
 '2': 'Zeltinger Platz, 13465 Berlin', '5': 'Mexikoplatz, 14163 Berlin', '8': 'Alt-Lichtenrade, 12305 Berlin',
 '11': 'Rathausstraße 15, 10178 Berlin', '20': 'Dohnagestell 10, 13351 Berlin', '26': 'Modersohnstraße 35-45, 10245 Berlin',
 '59': 'THF Tower, Flughafen Tempelhof, 12101 Berlin', '62': 'Schönwalder Allee 26, 13587 Berlin',
 '95': 'Tempelhofer Damm 227, 12099 Berlin', '98': 'Alt-Rudow, Ecke Krokusstraße, 12357 Berlin',
 '110': 'Rund um den Kranoldplatz, 12209 Berlin', '116': 'Heynstraße 15, 13187 Berlin', '125': 'Homburger Straße 48, 14197 Berlin',
 '128': 'Königin-Luise-Straße 49, 14195 Berlin', '155': 'Späthstraße 80/81, 12437 Berlin', '167': 'Am Oberhafen 16-20, 13597 Berlin',
 '201': 'Stralauer Allee 2 (Spreespeicher), 10245 Berlin', '202': 'Alt-Marienfelde 35-37, 12277 Berlin',
 '205': 'Nollendorfplatz (unter der Hochbahn), 10777 Berlin', '215': 'Richardplatz, 12055 Berlin',
 '216': 'Alte Potsdamer Straße, 10785 Berlin', '218': 'Wollankstraße 72, 13359 Berlin',
 '224': 'Britzer Garten, Eingang Mohriner Allee 152, 12347 Berlin', '237': 'Hasselwerderstraße 22A, 12439 Berlin',
 '243': 'Köpenicker Straße 18-20 (Sage Beach), 10997 Berlin', '246': 'Am Flutgraben 2 (Festsaal Kreuzberg), 12435 Berlin',
 '251': 'Rolandstraße 35, 13156 Berlin', '260': 'Flughafen Tegel, Gebäude I 1, 13405 Berlin', '264': 'Wittenbergplatz, 10789 Berlin',
 '265': 'Schönhauser Allee 123 (Colosseum), 10437 Berlin', '266': 'Grünstraße 11 (Schlossplatz), 12555 Berlin',
 '313': 'Eichenstraße 4A (Haus der Visionäre), 12435 Berlin', '213': 'Alexanderplatz, 10178 Berlin',
 '214': 'Gendarmenmarkt, 10117 Berlin', '68': 'Spandauer Damm 20-24, 14059 Berlin', '17': 'Schlossplatz, 10178 Berlin',
}
OEPNV = {'214': 'U Stadtmitte, U Hausvogteiplatz', '149': '', '313': 'Bus Eichenstr./Puschkinallee', '17': 'U Museumsinsel',
         '216': 'S+U Potsdamer Platz', '213': 'S+U Alexanderplatz', '201': 'S+U Warschauer Straße'}

# ---------------------------------------------------------------- Zeit-Korrekturen (aus Veranstalterangaben)
def hm(s):
    s = s.strip().replace('.', ':')
    h, m = (s.split(':') + ['0'])[:2]
    return int(h) * 60 + int(m)

OVR = {
 '41': {'woche': {'Sa': ('14:00', '17:30')}},
 '74': {'von': '2026-11-29', 'bis': '2026-12-20', 'woche_neu': {'So': ('11:00', '19:00')}, 'sonder': {'2026-12-19': ('11:00', '19:00')}},
 '128': {'von': '2026-11-28', 'bis': '2026-12-20', 'woche_neu': {'Sa': ('11:00', '19:00'), 'So': ('11:00', '19:00')}},
 '201': {'von': '2026-11-16'},
 '205': {'woche': {'Fr': ('15:00', '22:30'), 'Sa': ('15:00', '22:30')}},
 '217': {'woche': {'Sa': ('13:00', '22:00'), 'So': ('13:00', '22:00')}},
 '248': {'zu_plus': ['2026-11-15', '2026-11-22'], 'sonder': {'2026-12-27': ('12:00', '20:00')}},
 '313': {'woche_neu': {'Sa': ('11:00', '18:00'), 'So': ('11:00', '18:00')}},
 '158': {'woche_neu': {'So': ('12:00', '18:00')}},  # visitBerlin 2026, um 11 Uhr nur Gottesdienst
}
HINWEIS = {
 '245': 'Ende der Öffnungszeit nicht angegeben', '256': 'Ende der Öffnungszeit nicht angegeben',
 '267': 'Ende der Öffnungszeit nicht angegeben', '317': 'Ende der Öffnungszeit nicht angegeben',
 '243': 'Zutritt ab 18 Jahren', '224': 'Die Eingänge Buckower Damm und Tauernallee schließen um 16 Uhr',
 '201': 'Nur mit Ticket aus dem Vorverkauf', '26': 'Der Markt ist nur am Wochenende offen, die Eisbahn hat eigene Zeiten',
 '239': 'Märkte an allen vier Adventswochenenden', '59': 'Nur am 2. und 3. Adventswochenende',
 '158': 'Um 11 Uhr Gottesdienst in der Dorfkirche Marzahn',
}

# Fotos 5 (Mexikoplatz), 44 (Sophienstraße) und 68 (Schloss Charlottenburg): Im Vordergrund der
# Originale sind Gesichter erkennbar. Die App zeigt deshalb nur einen Ausschnitt oberhalb der Köpfe,
# bei 44 seit 27.11.2026, bei 5 und 68 seit 28.11.2026, siehe AUSSCHNITT.
BILD = {
 '11': ('Leonhard Lenz', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/deed.de'),
 '44': ('Leonhard Lenz', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/deed.de'),
 '68': ('Heidi zu Klampen', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/deed.de'),
 '95': ('Dguendel', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/deed.de'),
 '101': ('Aiken Hartenfels', 'CC BY-SA 3.0 DE', 'https://creativecommons.org/licenses/by-sa/3.0/de/deed.de'),
 '213': ('Pascal Volk', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0/deed.de'),
 '216': ('KlemensM', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/deed.de'),
 '217': ('Auto1234', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/deed.de'),
 '5': ('Colin Smith', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0/deed.de'),
 '242': ('Colin Smith', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0/deed.de'),
}

# ---------------------------------------------------------------- genauere Koordinaten fuer grosse Maerkte
KOORD = {
 '11': (52.5193, 13.4071), '17': (52.5170, 13.4020), '143': (52.5048, 13.3350), '213': (52.5219, 13.4132),
 '216': (52.5096, 13.3759), '217': (52.5390, 13.4130), '68': (52.5195, 13.2950), '242': (52.5370, 13.2040),
 '264': (52.5015, 13.3425), '215': (52.4740, 13.4440), '128': (52.4580, 13.2890), '273': (52.4706, 13.2627),
 '214': (52.5137, 13.3926),
}
# Bezirk laut Postanschrift, wo die gerundeten Koordinaten knapp neben der Grenze liegen
BEZIRK = {'231': 'Lichtenberg', '246': 'Treptow-Köpenick', '313': 'Treptow-Köpenick', '273': 'Steglitz-Zehlendorf'}

# ---------------------------------------------------------------- Bezirk per Punkt-in-Polygon
geo = json.load(open(GEO))
def pip(x, y, ring):
    inside = False; n = len(ring); j = n - 1
    for i in range(n):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside
def bezirk_von(lat, lng):
    for f in geo['features']:
        for poly in f['geometry']['coordinates']:
            if pip(lng, lat, poly[0]) and not any(pip(lng, lat, h) for h in poly[1:]):
                return f['properties']['name']
    return None

# ---------------------------------------------------------------- Umbau
TAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
def iso(d):
    d = d.strip(); dd, mm, yy = d.split('.'); return f'20{yy}-{int(mm):02d}-{int(dd):02d}'
def interval(s):
    s = (s or '').strip()
    if s in ('', '0'): return None
    m = re.match(r'^(\d{1,2}[:.]\d{2})\s*(?:-\s*(\d{1,2}[:.]\d{2}|\?))?$', s)
    if not m: raise ValueError(f'Zeit nicht lesbar: {s!r}')
    o = hm(m.group(1)); c = m.group(2)
    if c in (None, '?'): return [o, None]
    c = hm(c)
    if c <= o: c += 24 * 60
    return [o, c]
def clean(s):
    return re.sub(r'\s+', ' ', (s or '').replace('–', '-').replace('—', '-')).strip()
def oepnv(s):
    parts = [clean(p.replace('(Berlin)', '').replace(' Bhf.', '').replace(' Bhf', '')) for p in (s or '').split(',')]
    parts = [p for p in parts if p and p != 'Berlin']
    return ', '.join(parts[:2])

out = []
for r in rows:
    i = r['id']
    o = OVR.get(i, {})
    von = o.get('von') or iso(r['von']); bis = o.get('bis') or iso(r['bis'])
    if dt.date.fromisoformat(bis) < STAND: continue  # schon vorbei
    if i not in NAME: raise SystemExit(f'Name fehlt für {i} {r["shortname"]}')
    woche = [interval(r[t]) for t in TAGE]
    if 'woche_neu' in o: woche = [None] * 7
    for t, (a, b) in {**o.get('woche', {}), **o.get('woche_neu', {})}.items():
        woche[TAGE.index(t)] = interval(f'{a} - {b}')
    zu = sorted({iso(x) for x in r['closed-exc'].split(',') if x.strip() not in ('', '0')} | set(o.get('zu_plus', [])))
    sonder = {}
    for part in r['hours-exc'].split(','):
        part = part.strip()
        if part in ('', '0'): continue
        d, t = part.split('=')
        sonder[iso(d)] = interval(t)
    for d, (a, b) in o.get('sonder', {}).items(): sonder[d] = interval(f'{a} - {b}')
    lat, lng = KOORD.get(i, (float(r['lat']), float(r['lng'])))
    bez = BEZIRK.get(i) or bezirk_von(lat, lng)
    if not bez: raise SystemExit(f'Kein Bezirk für {i}')
    flag = r['immer-kostenlos'] == '1'
    art, ftext = FEE.get(i, ('frei', 'Eintritt frei') if flag else U)
    url = WEB.get(i, clean(r['w3']))
    if url and not url.startswith('http'): url = 'https://' + url
    web = None
    if url:
        web = {'url': url, 'art': 'info' if '/weihnachtsmarkt/' in url and 'berlin.de' in url else 'veranstalter'}
    plz = clean(r['plz_ort']).replace('berlin', 'Berlin')
    adresse = ADR.get(i) or f"{clean(r['strasse']).rstrip(',')}, {plz}"
    m = {
        'id': i, 'name': NAME[i], 'typ': TYP[i], 'bezirk': bez, 'adresse': adresse,
        'lat': round(lat, 5), 'lng': round(lng, 5), 'von': von, 'bis': bis,
        'woche': woche, 'zu': zu, 'sonder': sonder,
        'eintritt': {'art': art, 'text': ftext}, 'text': TEXT[i],
    }
    if web: m['web'] = web
    ov = OEPNV.get(i, oepnv(r.get('train', '')))
    if ov: m['oepnv'] = ov
    if r.get('barrierefrei') == '1': m['barrierefrei'] = True
    if i in BILD: m['bild'] = i
    if i in HINWEIS: m['hinweis'] = HINWEIS[i]
    for k in ('name', 'text', 'adresse'):
        assert '–' not in m[k] and '—' not in m[k], (i, k)
    out.append(m)

out.sort(key=lambda m: m['name'].lower())
missing_text = [m['id'] for m in out if not m['text']]
assert not missing_text, missing_text
assert set(TYP) >= {m['id'] for m in out}

data = {
    'stand': STAND.isoformat(),
    'bilder': {k: {'urheber': a, 'lizenz': l, 'lizenzUrl': u} for k, (a, l, u) in BILD.items()},
    'maerkte': out,
}
dst = APP / 'src/data'; dst.mkdir(parents=True, exist_ok=True)
json.dump(data, open(dst / 'markets.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# Bilder kopieren und require-Tabelle schreiben
img_dst = APP / 'assets/markets'; img_dst.mkdir(parents=True, exist_ok=True)
lines = ['// Automatisch erzeugt von build_data.py', 'export const IMAGES: Record<string, number> = {']
# Ausschnitt (links, oben, rechts, unten) in Pixeln des Originals, danach auf 600 × 400 gebracht
# und leicht nachgeschärft. Geschnitten wird nur, solange die Datei noch das Original ist, erkannt an
# Größe und, wo angegeben, Prüfsumme (MD5). Sonst liegt der Ausschnitt schon vor und wird nur kopiert.
AUSSCHNITT = {
 '5': ((640, 426), '9b4cdffb106983a88916e239a5ff6af7', (200, 10, 600, 277)),
 '44': ((900, 600), None, (470, 0, 896, 284)),
 '68': ((600, 400), 'd11cf42ac438f2ff051d140cf8f8ec52', (140, 0, 590, 300)),
}
for k in sorted(BILD, key=int):
    quelle, ziel = IMG_SRC / f'{k}.jpg', img_dst / f'{k}.jpg'
    if k in AUSSCHNITT:
        import hashlib
        from PIL import Image, ImageFilter
        groesse, pruefsumme, box = AUSSCHNITT[k]
        im = Image.open(quelle)
        original = im.size == groesse and (pruefsumme is None or hashlib.md5(quelle.read_bytes()).hexdigest() == pruefsumme)
        if original:
            im = im.convert('RGB').crop(box).resize((600, 400), Image.LANCZOS)
            im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
            im.save(ziel, quality=86, optimize=True, progressive=True)
        else:
            assert im.size == (600, 400), (k, im.size)
            if quelle.resolve() != ziel.resolve():
                shutil.copy(quelle, ziel)
    elif quelle.resolve() != ziel.resolve():
        shutil.copy(quelle, ziel)
    lines.append(f"  '{k}': require('../../assets/markets/{k}.jpg'),")
lines.append('};\n')
(dst / 'images.ts').write_text('\n'.join(lines), encoding='utf-8')

from collections import Counter
print(len(out), 'Märkte')
print(Counter(m['typ'] for m in out))
print(Counter(m['bezirk'] for m in out))
print(Counter(m['eintritt']['art'] for m in out))
print('mit Bild', sum('bild' in m for m in out), '| ohne Web', sum('web' not in m for m in out))
