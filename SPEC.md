# Spezifikation: Virtuelles Haustier

## 1. Ziel

Die App ist ein virtuelles Haustier im Stil der Tamagotchis aus den 90ern. Man zieht ein Tier vom Ei bis zum Erwachsenen auf. Dafür muss man es regelmäßig füttern, schlafen schicken, sauber machen, mit ihm spielen, erziehen und bei Krankheit behandeln. Wie gut man sich kümmert, bestimmt, wie es sich entwickelt, wie lange es lebt und ob es überhaupt überlebt.

Abschnitte mit **(ergänzt)** stammen nicht aus der ursprünglichen Anforderung, sondern aus den klassischen Tamagotchi-Regeln. Zahlen mit **(Vorschlag)** sind Startwerte, die man beim Balancing noch anpassen kann.

## 2. Grundprinzipien

- **Echtzeit:** Die Zeit im Spiel läuft genauso schnell wie die echte Zeit. Ein Tag im Spiel ist ein echter Tag.
- **Läuft weiter, wenn die App zu ist** (ergänzt): Ist die App geschlossen, läuft die Zeit trotzdem weiter. Beim nächsten Öffnen wird alles nachberechnet, was in der Zwischenzeit passiert ist (Hunger, Kacke, Krankheit usw.).
- **Alles über die UI:** Jede Pflegeaktion löst der Spieler selbst über die Oberfläche aus. Nichts passiert automatisch zugunsten des Tiers.
- **Mehrere Tiere:** Man kann bis zu **5 Tiere** gleichzeitig haben. Alle leben parallel in Echtzeit, auch wenn sie gerade nicht angezeigt werden. Über eine **Leiste oben** schaltet man zwischen ihnen um. Jedes Tier hat dort ein Mini-Bild und seinen Namen; ein roter Punkt zeigt, dass es ruft, ein „z“, dass es schläft. Mit „+“ legt man ein neues Ei an. Ruft ein Tier, das gerade nicht angezeigt wird, piept es, und unten erscheint eine Meldung mit seinem Namen. Stirbt ein Tier oder zieht in den Wald, geht es mit den übrigen weiter.

## 2a. Plattform

- Die App ist eine **Web-App** mit dem Namen **„Waldling“** (Arbeitstitel).
- Die App ist öffentlich über **GitHub Pages** erreichbar: https://spikepy.github.io/tamagotchi/ . Bei jedem Push auf `main` wird sie automatisch neu gebaut und veröffentlicht. Auf https://spikepy.github.io/ gibt es einen Link dorthin.
- Der Spielstand wird **lokal im Browser** gespeichert (localStorage). Es gibt keinen Server und kein Konto.
- Die App ist eine **PWA**: Unter Android lässt sie sich als eigenständige App installieren, mit eigenem Icon und im Vollbild ohne Browserleiste. Sie funktioniert auch offline.
- Benachrichtigungen kommen, solange die App im Hintergrund noch läuft. Ist sie komplett beendet, gibt es keine Benachrichtigungen, weil dafür ein Push-Server nötig wäre.
- **Kein Zeitraffer:** Die Spielzeit läuft immer in Echtzeit, auch zum Testen gibt es keinen Zeitraffer.

## 3. Statuswerte

| Wert | Bereich | Beschreibung |
|---|---|---|
| Sättigung (Hunger) | durchgehende Leiste (0–4, intern als Kommazahl) | Sinkt mit der Zeit. Mahlzeiten füllen sie wieder auf. |
| Laune | durchgehende Leiste (0–4, intern als Kommazahl) | Sinkt mit der Zeit. Spielen und Snacks heben sie. (ergänzt) |
| Müdigkeit | 0–100 % | Steigt, solange es wach ist, und sinkt im Schlaf. |
| Gewicht | in g/kg | Steigt durch Essen und sinkt durch Spielen. (ergänzt) Angezeigt wird ein **realistisches Gewicht je Art** bei Normalgewicht: Fuchs 100 g → 1 kg → 3 kg → 6 kg, Igel 25 g → 150 g → 450 g → 1 kg, Katze 100 g → 1 kg → 2,5 kg → 4,5 kg (Baby → Kind → Teenager → Erwachsen). |
| Alter | in Tagen | Zählt ab dem Schlüpfen. |
| Disziplin | 0–100 % | Steigt durch richtiges Schimpfen. (ergänzt) |
| Gesundheit | gesund / krank | Siehe Abschnitt 6. |
| Pflegefehler | Zähler | Zählt verpasste Bedürfnisse. Beeinflusst Entwicklung und Lebensdauer. (ergänzt) |

Den Status kann man jederzeit über einen eigenen Statusbildschirm ansehen.

**HUD:** Sättigung und Laune stehen wie in einem Videospiel **oben im Spielbild**. Alles ist im feinen Pixelraster gezeichnet und sitzt in dunklen Pixel-Rahmen mit abgeschrägten Ecken und heller Oberkante.
- **Links oben: Sättigung.** Ein Fleisch-Knochen-Symbol und eine **durchgehende Leiste** (orange), die stufenlos mit dem Wert sinkt und steigt.
- **Rechts oben: Laune.** Eine durchgehende Leiste (gelb) und ein **Smiley, das zur Stimmung passt**: lachend, neutral oder traurig.
- Die Leisten haben Glanz oben, Schatten unten und eine helle Kante am Ende der Füllung. Bei **höchstens 25 %** werden sie **rot und blinken**.
- Im Statusbildschirm stehen Sättigung und Laune als Balken mit Prozentangabe.
- **Oben in der Mitte** stehen die Warnsymbole: ein Totenkopf bei Krankheit und ein blinkendes Ausrufezeichen beim Rufen.
- Das HUD bleibt auch nachts und bei Licht aus hell.

## 4. Lebenszyklus

| Phase | Dauer | Hinweise |
|---|---|---|
| Ei | 1 Minute | Keine Pflege nötig. Danach schlüpft das Tier. |
| Baby | 1 Tag | Braucht viel Pflege: wird schnell hungrig und kackt oft. |
| Kind | 5 Tage | |
| Teenager | 5 Tage | |
| Erwachsen | bis zum Lebensende | |

- **Entwicklung hängt von der Pflege ab** (ergänzt): Bei jedem Phasenwechsel entscheiden Pflegefehler und Disziplin, welche Variante das Tier wird. Gute Pflege ergibt eine schöne, zufriedene Form. Schlechte Pflege ergibt eine verwahrloste oder freche Form. Vorschlag: zwei Varianten für das Kind, zwei für den Teenager und drei für den Erwachsenen.
- **Lebensende** (ergänzt): Ein erwachsenes Tier lebt nicht ewig. Wie lange es lebt, hängt von der Pflege ab (Vorschlag: 10–25 Tage als Erwachsener). Danach "zieht in den Wald zurück".
- **Name:** Direkt nach dem Schlüpfen fragt die App nach einem Namen. Dazu gibt es ein paar Vorschläge passend zur Tierart, maximal 14 Zeichen. Im Statusbildschirm kann man das Tier jederzeit umbenennen. Der Name steht im HUD, in den Meldungen, im Tagebuch und in der Liste der früheren Tiere.
- Nach dem Lebensende oder dem Tod kann man ein neues Ei starten.

## 5. Tierarten

- Die App soll mehrere Tierarten unterstützen. Jede Art hat eigene Grafiken, eigene Entwicklungsformen und eventuell eigene Minispiele.
- **Als erste Art wird ein Fuchs umgesetzt und ein Igel**
- **Katze:** Sie hat alle Entwicklungsstufen und Animationen wie die anderen Tiere. Ihr Aussehen wird beim Anlegen des Eis **zufällig** festgelegt und bleibt ein Leben lang gleich:
  - **Fellfarbe:** Rot, Grau, Schwarz, Creme, Braun oder Weiß, jeweils mit passender Augenfarbe.
  - **Muster:** einfarbig, getigert, gefleckt oder mit weißen Pfoten.
  - Bei der Auswahl steht „Fell & Muster: Überraschung!“. Die Flecken auf dem Ei zeigen aber schon die Fellfarbe. Im Status steht das Fell, zum Beispiel „Grau, getigert“.
  - Katzen-Minispiele: Laserpunkt (Timing), Links oder rechts? (in welchem Karton), Fische fangen (alte Socken meiden), Wollknäuel (nicht in die Wasserschale) und Spuren lesen.
- **Hund:** wohnt drinnen (Zimmer mit Körbchen und Napf, wie die Katze, aber ohne Kratzbaum). Beim Anlegen des Eis werden **Rasse, Fellfarbe und Muster zufällig** festgelegt. Bei der Auswahl steht „Rasse & Fell: Überraschung!“, im Status zum Beispiel „Beagle, Dreifarbig, mit Sattel“. Es gibt **10 typische Rassen** mit eigenem Aussehen (Ohren, Schnauze, Schwanz, Beinlänge), passenden Farben und Mustern und eigenem Erwachsenengewicht:

  | Rasse | Aussehen | Farben | Muster | Gewicht erwachsen |
  |---|---|---|---|---|
  | Labrador | Schlappohren | Schwarz, Blond, Schoko | einfarbig | 30 kg |
  | Schäferhund | Stehohren | Schwarz-Braun, Grau | Sattel | 32 kg |
  | Dackel | eigene Seitenansicht: langer, niedriger Körper, kurze Beine, lange Schnauze, Schlappohr; schaut immer in Laufrichtung | Rot, Schwarz-Braun | einfarbig / Abzeichen | 9 kg |
  | Mops | kleine Ohren, dunkle platte Schnauze, Ringelschwanz | Beige, Schwarz | einfarbig | 7 kg |
  | Husky | Stehohren, Ringelschwanz, blaue Augen | Grau-, Schwarz-, Rot-Weiß | einfarbig / weiße Pfoten | 23 kg |
  | Beagle | lange Schlappohren, weiße Schwanzspitze | Dreifarbig, Zweifarbig | Sattel / gefleckt | 12 kg |
  | Dalmatiner | Schlappohren | Schwarz oder Leberbraun getupft | getupft | 27 kg |
  | Pudel | Wuschelohren, Haarschopf | Weiß, Schwarz, Apricot, Grau | einfarbig | 22 kg |
  | Border Collie | Kippohren | Schwarz-Weiß, Braun-Weiß | einfarbig / weiße Pfoten / gefleckt | 18 kg |
  | Corgi | große Stehohren, kurze Beine, kein Schwanz | Rot-Weiß, Dreifarbig | einfarbig / weiße Pfoten / Abzeichen | 12 kg |

  Welpen wiegen etwa 1,5 %, Junghunde 20 % und Halbstarke 65 % des Erwachsenengewichts. Hunde-Minispiele: Frisbee fangen, In welchem Korb?, Leckerli fangen (Zitronen meiden), Ball werfen (nicht in die Pfütze) und Spuren lesen.
- **Huhn:** lebt draußen auf dem **Hühnerhof**. Beim Ei werden **Rasse, Farbe, Muster und Geschlecht zufällig** festgelegt. Hühner sind in der **Seitenansicht** gezeichnet und schauen immer in Laufrichtung. Babys und Kinder sind **Küken** in den Farben ihrer Rasse.
  - **Henne oder Hahn:** Jedes Huhn ist zufällig eine Henne oder ein Hahn. Ab dem Teenager-Alter haben Hähne einen größeren Kamm, Kehllappen und einen hohen dunklen **Sichelschwanz**. Sie heißen **Junghahn / Hahn / Prachthahn / Frechhahn** und sind etwa **30 % schwerer**. Im Status steht zum Beispiel „Legehuhn (Hahn), Braun“.
  - **9 Rassen:**

  | Rasse | Aussehen | Farben | Gewicht Henne |
  |---|---|---|---|
  | Legehuhn | rundlich, roter Kamm und Kehllappen | Braun, Weiß, Schwarz | 2 kg |
  | Seidenhuhn | flauschig, runder Federschopf | Weiß, Schwarz, Buff | 1,2 kg |
  | Sperberhuhn | gestreiftes (gesperbertes) Gefieder | Grau, Gold | 2,5 kg |
  | Leghorn | großer Zackenkamm | Weiß, Rebhuhnfarbig | 1,8 kg |
  | Brahma | groß, füllig, befiederte Beine | Hell, Dunkel, Gelb | 4,5 kg |
  | Orpington | besonders rund und füllig | Gelb, Schwarz, Blau | 3,5 kg |
  | Wyandotte | gesäumtes Gefieder (Schuppenmuster) | Silber, Gold | 2,8 kg |
  | Appenzeller Spitzhaube | Federhaube auf dem Kopf | Silber getupft, Schwarz | 1,6 kg |
  | Zwerghuhn | klein | Goldhals, Weiß, Schwarz | 0,7 kg |

  - **Verhalten:** Hühner putzen und strecken sich nicht, sondern **picken** zwischendurch schnell auf den Boden.
  - **Eier:** Eine **erwachsene Henne** legt jeden **Morgen nach dem Ausschlafen** ein Ei in den Nistkasten, wenn sie gesund und nicht hungrig ist (Sättigung mindestens 25 %). Im Kasten liegen höchstens **3 Eier**. **Tippt man auf den Nistkasten**, sammelt man sie ein („🥚 2 Eier eingesammelt!“) und die Henne freut sich (+12,5 % Laune). Im Status steht „Eier: x im Nest · y gesammelt“. Hähne legen keine Eier.
  - **Schlaf:** Im Stall sitzen sie aufgeplustert und mit geschlossenen Augen (Lidstrich) **auf der Sitzstange**.
  - **Minispiele:** Wurm picken, Hinter welchem Strohballen?, Körner fangen (Steinchen meiden), Weitflattern (nicht in den Teich) und Spuren lesen.
- Fellfarben und Muster sind als Daten angelegt (`coats`, `patterns`) und lassen sich auch für andere Arten nutzen.
- Die Architektur muss es erlauben, neue Tierarten hinzuzufügen, ohne die Spiellogik zu ändern. Eine Tierart besteht also aus Daten und Grafiken, nicht aus eigenem Code.

## 6. Bedürfnisse und Aktionen

### 6.1 Füttern

- **Mahlzeit:** +25 % Sättigung, +1 g Gewicht.
- **Snack** (ergänzt): +25 % Laune, +2 g Gewicht. Zu viele Snacks (Vorschlag: mehr als 3 pro Tag) machen das Tier übergewichtig, und es wird eher krank.
- Das Tier braucht **3 Mahlzeiten pro Tag**. Der Hunger sinkt gleichmäßig über den Tag.
- Ist die Sättigung voll (100 %), lehnt das Tier weiteres Essen ab.
- **Steht der Hunger zu lange auf 0** (Vorschlag: 2 h), **wird das Tier krank.**
- Nach dem **Ausschlafen** ist das Tier hungrig (Hunger auf maximal 25 %). Wird es zu früh geweckt, bleibt der Hunger unverändert.

### 6.2 Schlafen

- Das Tier wird mit der Zeit müde. Ist es sehr müde, zeigt es das an (gähnt, Augen fallen zu).
- Man schickt es aktiv schlafen und **macht das Licht aus**.
- Es braucht **8 Stunden Schlaf pro Tag**. Die müssen nicht am Stück sein, mehrere Nickerchen zählen zusammen.
- Bleibt das Licht an, während es schläft, zählt das als Pflegefehler (ergänzt), weil es nicht gut schlafen kann.
- Während es schläft, kann man nicht füttern und nicht spielen (ergänzt).
- **Müdigkeit beim Schlüpfen:** Sie richtet sich nach der Uhrzeit, so als wäre das Tier um 7 Uhr ausgeschlafen aufgewacht. Die Müdigkeit steigt im Wachzustand in 16 Stunden von 0 auf 100 %. Schlüpft es zum Beispiel um 18 Uhr, startet es mit etwa 69 % und schläft gegen 23 Uhr ein. Schlüpft es nachts zwischen 23 und 7 Uhr, ist es sofort müde.
- Ist die Müdigkeit bei 100 %, schläft es von selbst ein. Das Licht bleibt dabei an, bis man es ausmacht.
- **Sobald es insgesamt 8 Stunden geschlafen hat, wacht es automatisch auf.** Nickerchen zählen mit. Dieses Aufwachen gilt als „morgens“, danach beginnt der Zähler wieder bei 0.
- Man kann es auch vorher wecken. Dann hat es **richtig schlechte Laune (−50 %)**, aber nicht mehr Hunger als vorher. Was es bis dahin geschlafen hat, zählt für die 8 Stunden mit.
- **Nach dem Ausschlafen hat es Hunger**, siehe 6.1.
- Bekommt es zu wenig Schlaf (Vorschlag: weniger als 6 h in 24 h), sinkt die Laune stärker. Dauert das länger an, wird es krank (ergänzt).

### 6.3 Hygiene

- Das Tier **kackt alle 1–3 Stunden**. Der Abstand wird zufällig gewählt.
- Die Haufen sieht man im Zuhause des Tiers, mehrere können sich ansammeln.
- Man muss das **Zuhause über die UI sauber machen**. Das entfernt alle Haufen auf einmal.
- **Liegt ein Haufen länger als 4 Stunden, wird das Tier krank.**
- Im Schlaf kackt es nicht.
- Nach dem Aufwachen am Morgen kackt es auf jeden Fall innerhalb der ersten Stunde. Erst danach gilt wieder der normale Abstand von 1–3 Stunden.

### 6.4 Spielen

**Jedes zu Ende gespielte Minispiel gibt +1 Laune, egal ob gewonnen oder verloren.** Wer das Spiel mittendrin abbricht, bekommt nichts. Spielen senkt außerdem das Gewicht (−1 g) und macht etwas müde. Es gibt 5 Minispiele. Jede Tierart hat dafür ein eigenes Thema, die Spielmechanik ist bei allen gleich. Beim Fuchs:

1. **Mäusesprung:** Unter dem Schnee raschelt eine Maus. Im richtigen Moment tippen, damit der Fuchs kopfüber hineinspringt. Ein Timing-Spiel.
2. **Links oder rechts?** Der Fuchs versteckt sich hinter einem von zwei Büschen. Man rät, wo er ist. Wer 3 von 5 Mal richtig liegt, gewinnt.
3. **Beeren fangen:** Beeren fallen vom Baum, und man fängt sie, indem man den Fuchs nach links und rechts bewegt. Faule Beeren muss man meiden.
4. **Stöckchen holen:** Man wirft ein Stöckchen und wählt dabei Richtung und Kraft. Je weiter der Wurf, desto mehr Punkte, solange es nicht im Bach landet.
5. **Spuren lesen:** Kurz wird eine Folge von Pfotenabdrücken gezeigt, die man danach nachtippen muss. Ein Gedächtnisspiel, die Folge wird jede Runde länger.

Beim Igel: **Regenwurm schnappen** (Timing), **Links oder rechts?** (unter welchem Laubhaufen), **Äpfel fangen**, **Kugelrollen** (statt in den Bach darf er nicht in den Teich rollen) und **Spuren lesen**.

Gewinnbedingungen: Mäusesprung 2 von 3 Treffern · Links oder rechts? 3 von 5 richtig · Fangen mindestens 8 Punkte in 20 s · Werfen ein Wurf über 70 m · Spuren lesen eine Folge der Länge 5 schaffen.

Ist die Laune zu lange auf 0, zählt das als Pflegefehler (ergänzt).

### 6.4a Streicheln

- **Tippt oder klickt man auf das Tier**, wird es gestreichelt.
- Es **bleibt stehen**, schließt genießerisch die Augen, **wiegt sich** leicht hin und her, und **Herzchen** steigen auf.
- Unten erscheint eine passende Meldung: Die Katze „schnurrt“, der Hund „wedelt mit dem Schwanz“, der Fuchs „kuschelt sich an deine Hand“, der Igel „legt die Stacheln an“, das Huhn „gluckst zufrieden“.
- Streicheln gibt **+25 % Laune**, aber höchstens **einmal pro Minute**. Öfter streicheln geht, bringt aber keine zusätzliche Laune.
- Schlafende Tiere werden nicht geweckt. Es gibt nur ein einzelnes Herzchen und den Hinweis „psst“.

### 6.5 Medizin

- Ist das Tier krank, sieht man das an einem Symbol (zum Beispiel einem Totenkopf oder einem Thermometer), und es bewegt sich träge.
- Um es wieder gesund zu machen, **muss man ihm Medizin geben**. Vorschlag: Je nach Schwere sind 1–2 Dosen nötig (ergänzt).
- **Unnötige Medizin:** Gibt man einem gesunden Tier Medizin, zählt das als **Pflegefehler**, und die Laune sinkt um 25 %.
- Ein krankes Tier hat keine Lust zu spielen und isst weniger (ergänzt).

### 6.6 Disziplin (ergänzt)

- Ab und zu ruft das Tier **ohne echten Grund** nach Aufmerksamkeit, oder es verweigert Essen und Spielen, obwohl es Hunger oder schlechte Laune hat.
- In diesem Fall muss man es über die UI **schimpfen**. Das gibt +25 % Disziplin.
- Schimpft man ohne Grund, sinkt die Laune.
- Ignoriert man die Rufe ohne Grund, zählt das als Pflegefehler.
- Wie hoch die Disziplin ist, beeinflusst die Entwicklung (siehe 4).

### 6.7 Rufen und Benachrichtigungen (ergänzt)

- Das Tier ruft, sobald es etwas braucht: Hunger oder Laune auf 0, Müdigkeit, Krankheit, Kacke oder ein Ruf ohne Grund.
- Ein Rufsymbol zeigt das in der App an. Ist die App geschlossen, kommt eine Push-Benachrichtigung.
- Kümmert man sich nicht innerhalb von **15 Minuten** um einen Ruf (Vorschlag), zählt das als **Pflegefehler**.

## 7. Krankheit und Tod (ergänzt)

**Das Tier wird krank, wenn:**
- es zu lange hungrig ist (6.1),
- eine Kacke länger als 4 Stunden liegt (6.3),
- es dauerhaft zu wenig Schlaf bekommt (6.2),
- es übergewichtig ist (Zufallschance).

**Das Tier stirbt, wenn** (Vorschlag):
- es länger als 12 Stunden krank ist, ohne Medizin zu bekommen,
- der Hunger länger als 12 Stunden auf 0 steht,
- sich zu viele Pflegefehler angesammelt haben (zum Beispiel 20 in einer Lebensphase),
- seine natürliche Lebenszeit abgelaufen ist (siehe 4).

Stirbt das Tier, sieht man einen Abschiedsbildschirm mit Alter und Lebenslauf. Danach kann man ein neues Ei starten.

## 7a. Cheat-Codes per URL-Parameter

Über die Adresse kann man die Werte der Tiere direkt setzen, wie Cheat-Codes, zum Beispiel:
- `https://spikepy.github.io/tamagotchi/?max=1` macht das angezeigte Tier perfekt.
- `…/?pet=Rudi&stage=erwachsen&form=pracht` macht Rudi sofort zum erwachsenen Prachtfuchs.
- `…/?pet=alle&hunger=4&poop=0` macht alle satt und sauber.

Nach dem Anwenden verschwinden die Parameter aus der Adresse. Unten erscheint eine Meldung mit den Änderungen, und im Tagebuch des Tiers steht ein Eintrag.

| Parameter | Werte | Wirkung |
|---|---|---|
| `pet` | Name, Nummer (ab 1) oder `alle` | Welches Tier gemeint ist. Ohne diesen Parameter gilt es für das angezeigte Tier. |
| `max` | 1 | Alles perfekt: satt, gute Laune, gesund, sauber, ausgeschlafen, 100 % Disziplin, Normalgewicht |
| `happy` | 0–4 | Laune (0–4 entspricht 0–100 %) |
| `hunger` | 0–4 | Sättigung (0–4 entspricht 0–100 %) |
| `sick` | 1 / 0 | krank machen bzw. heilen |
| `tired` | 0–100 | Müdigkeit in % |
| `sleep` | 1 / 0 | schlafen schicken (Licht aus) bzw. aufwecken (gilt als ausgeschlafen) |
| `discipline` | 0–100 | Disziplin in % |
| `weight` | Gramm | Gewicht in echten Gramm (wird je Art bzw. Rasse umgerechnet) |
| `poop` | 0–6 | Anzahl Haufen (0 = sauber) |
| `mistakes` | 0–99 | Pflegefehler (0 setzt auch den Gesamtzähler zurück) |
| `stage` | `baby`, `kind`, `teen`, `erwachsen` | springt in diese Entwicklungsstufe |
| `form` | `gut`, `schlecht`, `pracht`, `normal`, `frech` | Entwicklungsform (zusammen mit `stage` oder allein) |
| `age` | Tage | Alter in Tagen |
| `name` | Text | Name (max. 14 Zeichen) |
| `hatch` | 1 | Ei schlüpft sofort |

Mehrere Parameter lassen sich kombinieren. Bei einem Ei wirkt nur `hatch=1`.

## 8. UI

**Größe:** Das Gerät nutzt den Bildschirm aus: Die Breite richtet sich nach der Bildschirmhöhe (bis 1000 px), und Schrift, Knöpfe und Tier-Leiste wachsen mit. Das Gerät ist nur **so hoch wie nötig** und wird nicht auf die Bildschirmhöhe gestreckt. Am Handy nutzt es die volle Breite.

**Grafikstil:** Echter, scharfer **Pixel-Look**, aber mit **doppelt so vielen Pixeln** wie das ursprüngliche 64 × 48-Raster. Das Spielbild hat **128 × 96 Pixel** und wird ohne Weichzeichnen hochskaliert.
- Die Sprites werden einmal mit Scale2x verfeinert, dabei werden Treppen an Schrägen abgerundet. Die Umrisse bleiben **1 Pixel dünn**, dazu kommt eine 1-Pixel-Schattierung (Licht oben links, Schatten unten rechts).
- Alle Hintergrund-Details liegen auf demselben Pixelraster:
  - Himmel und Wand mit **Farbstufen** statt weichem Verlauf
  - Wolken und Sonnenschein aus Pixeln
  - Tapetenmuster, Fußleiste, Dielen
  - Fensterspiegelung als Pixel-Diagonalen
  - Grashalme, Zaunmaserung
- Die Tiere bewegen sich in halben Schritten.

**Deko je Gehege (zusätzlich):**
- **Fuchs (Wald):**
  - ein kleiner **Bach** im Hintergrund mit glitzernden Lichtreflexen
  - ein umgestürzter, moosiger **Baumstamm** als Brücke darüber
  - **Pilzgruppe** und **Farn** an der Tanne
  - eine **Feder** vor dem Bau
- **Igel (Garten):**
  - ein **Igelhaus** mit Moosdach
  - zwei **Sonnenblumen**, deren Köpfe sich zur Sonne drehen
  - ein **Gartenzwerg** und eine **Gießkanne**
  - ein **Apfel** im Gras
  - eine **Schnecke**, die ganz langsam hin und her kriecht
- **Katze (Zimmer):**
  - **Wandregal** mit Büchern und Katzenfigur
  - ein **Bild von einer Maus** statt der Landschaft
  - **Kissen** auf der Fensterbank, **Katzengras** auf dem Fenstersims
  - **Wollknäuel** mit Faden und **Spielmaus** auf dem Boden
- **Hund (Zimmer):**
  - **Pfoten-Poster** statt Landschaftsbild
  - **Leine** am Haken neben dem Fenster
  - **Wassernapf** neben dem Futternapf
  - **Quietsche-Ente** und **Seilknoten**
  - **Fußmatte** vorne
- **Huhn (Hof):**
  - zwei **Sonnenblumen** am Zaun
  - **Sandbad-Kuhle**, **Wassertränke** aus Blech
  - **Leiter** am Stall
  - **Nistkasten** rechts am Stall
  - **Wetterhahn** auf dem Dach, der in die aktuelle **Windrichtung** zeigt

**Niederschlag:** Zum Wetter gehört auch Regen oder Schnee.
- **Regen:** außerhalb des Winters etwa jedes 5. Wetter.
- **Schnee:** im Winter etwa jedes 3. Wetter.
- Bei Niederschlag gibt es mindestens 4 graue Wolken, und der Himmel wird grau verschleiert.
- **Draußen:** Regentropfen fallen schräg je nach Wind, die Szene wird etwas trüber, und auf dem Boden bilden sich **Pfützen** mit kleinen Ringen. Schneeflocken fallen langsam und tanzen leicht.
- **Drinnen:** Regen bzw. Schnee sieht man im Fenster, bei Regen laufen **Tropfen an der Scheibe** herunter.

**Ebenen (Tiefe):** Die Szenen bestehen aus Ebenen, damit sich bewegte Dinge **richtig dahinter oder davor** befinden:
- **Draußen**, von hinten nach vorn:
  1. Himmel mit Sonne/Mond
  2. Wolken
  3. Vögel
  4. ferne Landschaft (Berge, Waldsaum, Hügel bzw. Hecke und Zaun)
  5. Reh
  6. nahe Landschaft (Wiese, große Tannen, Busch, Baum bzw. Laubhaufen)
  7. wehende Blätter
  8. Haustier
  9. Maus und Igel ganz vorne
  10. Napf
- **Drinnen:** Im Fenster liegen Himmel, Wolken und Vogel **hinter** Fensterkreuz und Spiegelung.

**Atmosphäre:**
- **Schmetterlinge** flattern tagsüber draußen umher (gelb, weiß, rosa oder blau).
- **Glühwürmchen** leuchten nachts draußen, drinnen sieht man sie durchs Fenster.
- **Abendlicht:** Bei Sonnenauf- und -untergang liegt ein warmer Orange-Ton über der ganzen Szene.
- **Stehlampe** im Zimmer (Katze, Hund): Sie brennt **abends und nachts** (18–7 Uhr) mit warmem Lichtschein, solange das Licht an ist. Bei „Licht aus“ ist sie aus.

**Jahreszeiten** nach dem echten Datum (März–Mai Frühling, Juni–August Sommer, September–November Herbst, Dezember–Februar Winter):
- **Frühling:** frischeres Grün, rosa Blüten am Busch, weiße Blüten in der Hecke.
- **Sommer:** normales Grün.
- **Herbst:** Gras und Hügel golden, Busch und Hecke orange-rot (die Tannen bleiben grün). Im Wald wehen bunte statt grüne Blätter.
- **Winter:**
  - Schneedecke auf dem Boden, **Schneehauben** auf allen Kanten (Tannen, Dächer, Zaun, Busch, Baum)
  - zugefrorener Bach, Schnee-Böen statt Blätter
  - keine Sonnenblumen, keine Schmetterlinge und Glühwürmchen

**Wolken und Wetter:** Am Himmel draußen und im Fenster drinnen **ziehen Wolken vorbei**.
- Das Wetter wechselt etwa **alle 45 Minuten** zufällig, aber in einem moderaten Rahmen: **1 bis 5 Wolken** und **Wind** von schwach bis mäßig, meist von West nach Ost, manchmal andersherum.
- Wolken kommen am Rand herein und ziehen hinaus. Größere Wolken sind etwas schneller, Wind und Wolkenzahl ändern sich sanft.
- Sie ziehen **hinter** Bäumen, Hecke und Fensterkreuz vorbei. Nachts sind sie nur blass zu sehen.

**Tiere im Hintergrund:** Ab und zu (etwa alle 15–50 Sekunden, nur tagsüber) ist etwas los:
- **Fuchs (Wald):** Eine Maus huscht vorbei, ein Igel läuft vorbei, ein **Reh** läuft klein im Hintergrund vorbei und **grast** zwischendurch, oder ein **Vogel** fliegt vorbei.
- **Igel (Garten):** eine Maus oder ein Vogel.
- **Katze und Hund (Zimmer):** Ein Vogel fliegt **am Fenster** vorbei.
- Die kleinen Tiere sind im feinen Pixelraster mit mehr Details gezeichnet:
  - **Maus:** grau, mit rosa Ohr, Schwanz und trippelnden Füßchen
  - **Igel:** zweifarbige Stacheln, helles Gesicht, laufende Füße
  - **Reh:** weißer Spiegel und Bauch; beim Grasen senkt es den Kopf
  - **Spatz:** schlagende Flügel, gelber Schnabel
- **Wehende Blätter:** Draußen kommt alle 8–24 Sekunden eine Windböe, und 2–5 Blätter wehen trudelnd und sich drehend durchs Bild. Beim Fuchs im Wald sind sie grün, beim Igel im Garten bunt (orange, rot, gelb).

Die Hauptansicht zeigt das Tier in seinem Zuhause, die Haufen und alle Statussymbole (Schlaf, Krankheit, Rufen). Darunter liegt eine Aktionsleiste mit:

| Aktion | Funktion |
|---|---|
| Füttern | Mahlzeit oder Snack wählen |
| Licht | Licht an/aus, schlafen schicken oder wecken |
| Spielen | Eins der 5 Minispiele auswählen |
| Medizin | Das kranke Tier behandeln |
| Sauber machen | Alle Haufen entfernen |
| Schimpfen | Disziplin, siehe 6.6 |
| Status | Bildschirm mit allen Werten aus Abschnitt 3 |

Gesperrte Aktionen, zum Beispiel Füttern während des Schlafs, sind ausgegraut.

**Umgebung je Tierart:**
- **Katze:** wohnt drinnen im Zimmer (siehe unten).
- **Fuchs:** lebt draußen **am Waldrand**: Himmel mit Sonne bzw. Mond und Sternen, ganz hinten eine bläuliche **Bergkette mit Schneegipfeln**, schattigen Hängen und Dunst, davor ein dunstiger Waldsaum, zwei Hügelketten mit kleinen Bäumen, **Tannen mit Ast-Etagen** (Licht links, Schatten rechts), Wiese mit Grashalmen, Steinen und einem **Fliegenpilz**, links vorne ein runder **Busch** mit Beeren. Der Baumstamm hat Rindenfurchen, Moos, Astknoten und einen Aststummel. Er schläft in einer **Baumhöhle**: Der Baum ist so hoch, dass man **nur den Stamm** sieht und keine Blätter. Der Stamm ist schlank, mit Rindenstruktur, Licht und Schatten, einem Aststummel, einem Astloch und Wurzeln. Unten im Stamm ist ein kleiner bogenförmiger Eingang zum Fuchsbau mit Laubpolster. Der schlafende Fuchs liegt **in** der Höhle: Er ist nur durch die Öffnung zu sehen, der Stamm verdeckt den Rest, und innen ist es etwas schattiger. Dafür rollt er sich kleiner zusammen. Gefüttert wird auf einem flachen Stein.
- **Huhn:** lebt draußen auf dem **Hühnerhof**: Hecke und Zaun wie im Garten, der **Boden ist komplett mit Stroh ausgelegt** (Halme kreuz und quer). Es schläft in einem **Hühnerstall** aus Holzbrettern mit rotem Ziegeldach und kleinem Fenster. Die hohe Tür hat innen eine **Sitzstange** auf zwei Stützen und Stroh am Boden. Gefüttert wird aus einem **Futtertrog aus Blech**. Statt Blättern wehen Heu- und Strohhalme vorbei, als Besucher kommen eine Maus und Vögel.
- **Igel:** lebt draußen **im Garten**: eine **Hecke aus einzelnen Blättern**, ein **Holzzaun mit spitzen Latten**, Maserung, Nägeln und Schatten, ein Busch mit roten Beeren, **Tulpen**, ein Stein und Rasen mit Herbstlaub. Der Laubhaufen besteht aus vielen einzelnen bunten Blättern. Er schläft in einem **Laubhaufen**. Gefüttert wird aus einem Tonschälchen.
- Schlafplätze sind innen hell genug und verdecken nur den unteren Rand, damit man das schlafende Tier **gut erkennt**. Licht aus dunkelt das Bild nur so weit ab, dass das Tier sichtbar bleibt. Nachts ist draußen der Hintergrund zusätzlich dunkler.

**Einrichtung (Katze, drinnen):** Das **Körbchen** steht rechts unter dem Fenster. Es ist ein **flacher**, geflochtener Weidenkorb mit Flechtrand und Kissen. Das Ei liegt darin, und zum Schlafen legt sich das Tier hinein. Wach läuft es im Raum herum. Links im Raum steht ein **Futternapf** auf einem kleinen ovalen **Teppich** (bzw. Stein/Tonschale draußen). Die Haufen landen zwischen Napf und Körbchen.

**Fenster:** An der Wand hängt ein großes Fenster, durch das man die echte Tageszeit sieht:
- Die **Sonne** wandert zwischen 7 und 20 Uhr im Bogen durchs Fenster. Sie geht links unten auf, steht mittags oben und geht rechts unten unter.
- Morgens und abends ist der Himmel **orange**, in der Dämmerung blassblau.
- Nachts zieht der **Mond** seinen Bogen, dazu leuchten Sterne.

**Deko je Tierart:** Sie ist als Daten in der Tierart angelegt (`room`).
- **Fuchs:** Grasbüschel und Grashalme auf dem Boden.
- **Igel:** buntes Herbstlaub auf dem Boden (orange, rot, gelb, braun).
- **Hund:** Auf dem Boden liegen ein Tennisball und ein **Kauknochen**, und vor dem Hundebett liegt ein Paar geklauter **Menschensocken** in L-Form, mit Bündchen, Ringeln und abgesetzter Ferse und Spitze: eine rot-weiß geringelte und eine blau-gelbe, zerknüllte.
- **Zimmer (Katze, Hund):** An der Wand hängt ein **Bild** mit einer kleinen Landschaft. Unter dem Napf liegt ein ovaler **Teppich** mit Randmuster.
- **Katze:** links im Zimmer (etwas vom Rand entfernt) steht ein Kratzbaum mit Sisalstamm und zwei Liegeflächen; oben hängt ein Spielball an einer Schnur und wackelt leicht. Eine Zimmerpflanze gibt es nicht mehr.

**Verhalten (wach):** Die Tiere bewegen sich zufällig und nie gleich:
- Sie laufen zu zufälligen Stellen im Raum, mal schneller, mal langsamer. Kranke Tiere schleichen nur.
- Sie machen **Pausen**: stehen bleiben, sich umschauen (die Augen wandern nach links und rechts).
- **Katze, Hund und Fuchs** **putzen** sich ab und zu (Kopf nickt, Zunge blitzt auf, danach ein Glitzern).
- Ab dem Teenager-Alter **strecken** sie sich auch, und zwar mit einer eigenen, gezeichneten **Streck-Animation** statt verzerrter Pixel. Die Pose ist eine Seitenansicht: Erst beugen sie sich vor (Vorderbeine nach vorn, Po hoch, Schwanz aufgestellt), dann strecken sie sich ganz und **gähnen** mit offenem Maul, dann kommen sie zurück. Ohren und Schwanz passen zum Tier bzw. zur Hunderasse (Steh-, Schlapp- oder kleine Ohren; weiße Schwanzspitze beim Fuchs; Corgi ohne Schwanz).
- Sie laufen **nicht immer auf derselben Höhe**, sondern auch mal **weiter vorne oder weiter hinten** im Raum. Ein kleiner Schatten zeigt, wo sie stehen. Weiter hinten verdecken die Haufen und der Napf das Tier.
- **Deko besuchen:** Ab und zu geht das Tier zu einem Deko-Objekt und tut dort etwas:
  - Fuchs: schnüffelt an der Feder
  - Igel: schnuppert am Apfel
  - Katze: stupst die Spielmaus an oder **springt aufs Fensterkissen** und döst dort eine Weile eingerollt, dann springt sie wieder herunter
  - Hund: **trinkt** am Wassernapf, kleine Wassertropfen inklusive
  - Huhn: nimmt ein **Sandbad**, plustert sich in der Kuhle auf und lässt Staubwölkchen aufsteigen
- Kommt ein **Tier vorbei** (Maus, Igel, Reh, Vogel, auch der Vogel am Fenster), bleibt das Haustier **kurz stehen**, dreht sich hin und **schaut ihm nach**.

**Animationen:**
- **Ei:** Etwa 40 Sekunden vor dem Schlüpfen bekommt es die ersten Risse, die dann in drei Stufen mehr werden. Dabei wackelt es in immer kürzeren Abständen.
- **Schlüpfen:** Die obere Schalenhälfte fliegt weg, das Baby taucht aus der unteren Hälfte auf, und es funkelt. Danach kommt der Dialog für den Namen.
- **Essen:** Beim Füttern erscheint das Futter im Napf (Mahlzeit braun, Snack rosa). Das Tier läuft zum Napf, steckt den Kopf hinein und frisst. Dabei wird das Futter in drei Stufen weniger, bis der Napf leer ist. Bei einem Snack hüpft es danach.
- **Freude:** Bei einem gewonnenen Spiel oder einem Snack hüpft es.
- **Schimpfen:** Das Tier schüttelt sich.
- **Entwicklung:** Der Bildschirm blitzt weiß auf, danach hüpft das Tier.
- **Haufen:** Über den Haufen steigen Stinkewölkchen auf.
- **Schlaf:** Schlafende Tiere liegen in einer eigenen **eingerollten Schlafpose** im Körbchen bzw. in der Höhle. Fuchs, Katze und Hund liegen mit dem Kopf auf den Pfoten und dem Schwanz vorne herum, der Fuchs mit weißer Schwanzspitze. Der Igel rollt sich zur Stachelkugel ein. Hunde haben die Ohren ihrer Rasse (Steh-, Schlapp- oder kleine Ohren), Fellfarbe und Muster bleiben erhalten. Die Tiere atmen ganz sanft (ein halber Pixel, langsam), darüber schweben „Zzz“. In der Tier-Leiste oben erscheint ebenfalls die Schlafpose.

## 9. Offene Fragen

1. **Tod oder sanfter Abschied?** Soll das Tier wirklich sterben, oder lieber kinderfreundlich „in den Wald zurückziehen“?
2. **Pause-Funktion?** Das Original hatte keine. Soll man das Tier zum Beispiel in den Urlaub oder zu den Großeltern schicken können, damit die Zeit stillsteht?
3. **Sound:** Piep-Töne im Retro-Stil, ja oder nein? Vorläufig sind sie eingebaut und lassen sich in den Einstellungen abschalten.

Entschieden: Das Tier schläft nach Müdigkeit statt zu einer festen Uhrzeit (siehe 6.2). Die Plattform ist eine Web-App bzw. PWA (siehe 2a). Einen Zeitraffer gibt es nicht.
