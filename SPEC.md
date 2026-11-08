# Spezifikation: Virtuelles Haustier

## 1. Ziel

Die App ist ein virtuelles Haustier im Stil der Tamagotchis aus den 90ern. Man zieht ein Tier vom Ei bis zum Erwachsenen auf. Dafür muss man es regelmäßig füttern, schlafen schicken, sauber machen, mit ihm spielen, erziehen und bei Krankheit behandeln. Wie gut man sich kümmert, bestimmt, wie es sich entwickelt, wie lange es lebt und ob es überhaupt überlebt.

Abschnitte mit **(ergänzt)** stammen nicht aus der ursprünglichen Anforderung, sondern aus den klassischen Tamagotchi-Regeln. Zahlen mit **(Vorschlag)** sind Startwerte, die man beim Balancing noch anpassen kann.

## 2. Grundprinzipien

- **Echtzeit:** Die Zeit im Spiel läuft genauso schnell wie die echte Zeit. Ein Tag im Spiel ist ein echter Tag.
- **Läuft weiter, wenn die App zu ist** (ergänzt): Ist die App geschlossen, läuft die Zeit trotzdem weiter. Beim nächsten Öffnen wird alles nachberechnet, was in der Zwischenzeit passiert ist (Hunger, Kacke, Krankheit usw.).
- **Alles über die UI:** Jede Pflegeaktion löst der Spieler selbst über die Oberfläche aus. Nichts passiert automatisch zugunsten des Tiers.
- **Ein Tier gleichzeitig** (ergänzt): Es gibt immer nur ein aktives Tier.

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
| Hunger | 0–4 Herzen | Sinkt mit der Zeit. Mahlzeiten füllen ihn wieder auf. |
| Laune | 0–4 Herzen | Sinkt mit der Zeit. Spielen und Snacks heben sie. (ergänzt) |
| Müdigkeit | 0–100 % | Steigt, solange es wach ist, und sinkt im Schlaf. |
| Gewicht | in g | Steigt durch Essen und sinkt durch Spielen. (ergänzt) |
| Alter | in Tagen | Zählt ab dem Schlüpfen. |
| Disziplin | 0–100 % | Steigt durch richtiges Schimpfen. (ergänzt) |
| Gesundheit | gesund / krank | Siehe Abschnitt 6. |
| Pflegefehler | Zähler | Zählt verpasste Bedürfnisse. Beeinflusst Entwicklung und Lebensdauer. (ergänzt) |

Den Status kann man jederzeit über einen eigenen Statusbildschirm ansehen.

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
- Nach dem Lebensende oder dem Tod kann man ein neues Ei starten.

## 5. Tierarten

- Die App soll mehrere Tierarten unterstützen. Jede Art hat eigene Grafiken, eigene Entwicklungsformen und eventuell eigene Minispiele.
- **Als erste Art wird ein Fuchs umgesetzt und ein Igel**
- Die Architektur muss es erlauben, neue Tierarten hinzuzufügen, ohne die Spiellogik zu ändern. Eine Tierart besteht also aus Daten und Grafiken, nicht aus eigenem Code.

## 6. Bedürfnisse und Aktionen

### 6.1 Füttern

- **Mahlzeit:** +1 Hungerherz, +1 g Gewicht.
- **Snack** (ergänzt): +1 Launeherz, +2 g Gewicht. Zu viele Snacks (Vorschlag: mehr als 3 pro Tag) machen das Tier übergewichtig, und es wird eher krank.
- Das Tier braucht **3 Mahlzeiten pro Tag**. Der Hunger sinkt gleichmäßig über den Tag.
- Ist der Hunger bei 4 Herzen, lehnt das Tier weiteres Essen ab.
- **Steht der Hunger zu lange auf 0** (Vorschlag: 2 h), **wird das Tier krank.**
- Nach dem Aufwachen ist das Tier immer hungrig (Hunger auf maximal 1 Herz).

### 6.2 Schlafen

- Das Tier wird mit der Zeit müde. Ist es sehr müde, zeigt es das an (gähnt, Augen fallen zu).
- Man schickt es aktiv schlafen und **macht das Licht aus**.
- Es braucht **8 Stunden Schlaf pro Tag**. Die müssen nicht am Stück sein, mehrere Nickerchen zählen zusammen.
- Bleibt das Licht an, während es schläft, zählt das als Pflegefehler (ergänzt), weil es nicht gut schlafen kann.
- Während es schläft, kann man nicht füttern und nicht spielen (ergänzt).
- Ist die Müdigkeit bei 100 %, schläft es von selbst ein. Das Licht bleibt dabei an, bis man es ausmacht.
- **Sobald es insgesamt 8 Stunden geschlafen hat, wacht es automatisch auf.** Nickerchen zählen mit. Dieses Aufwachen gilt als „morgens“, danach beginnt der Zähler wieder bei 0.
- Man kann es auch vorher wecken, dann ist es aber schlecht gelaunt (ergänzt). Was es bis dahin geschlafen hat, zählt für die 8 Stunden mit.
- **Hat es nach dem Aufwachen Hunger**, siehe 6.1.
- Bekommt es zu wenig Schlaf (Vorschlag: weniger als 6 h in 24 h), sinkt die Laune stärker. Dauert das länger an, wird es krank (ergänzt).

### 6.3 Hygiene

- Das Tier **kackt alle 1–3 Stunden**. Der Abstand wird zufällig gewählt.
- Die Haufen sieht man im Zuhause des Tiers, mehrere können sich ansammeln.
- Man muss das **Zuhause über die UI sauber machen**. Das entfernt alle Haufen auf einmal.
- **Liegt ein Haufen länger als 4 Stunden, wird das Tier krank.**
- Im Schlaf kackt es nicht.
- Nach dem Aufwachen am Morgen kackt es auf jeden Fall innerhalb der ersten Stunde. Erst danach gilt wieder der normale Abstand von 1–3 Stunden.

### 6.4 Spielen

Spielen hebt die Laune (+1 Herz, wenn man gewinnt), senkt das Gewicht (−1 g) und macht etwas müde. Es gibt 5 Minispiele. Jede Tierart hat dafür ein eigenes Thema, die Spielmechanik ist bei allen gleich. Beim Fuchs:

1. **Mäusesprung:** Unter dem Schnee raschelt eine Maus. Im richtigen Moment tippen, damit der Fuchs kopfüber hineinspringt. Ein Timing-Spiel.
2. **Links oder rechts?** Der Fuchs versteckt sich hinter einem von zwei Büschen. Man rät, wo er ist. Wer 3 von 5 Mal richtig liegt, gewinnt.
3. **Beeren fangen:** Beeren fallen vom Baum, und man fängt sie, indem man den Fuchs nach links und rechts bewegt. Faule Beeren muss man meiden.
4. **Stöckchen holen:** Man wirft ein Stöckchen und wählt dabei Richtung und Kraft. Je weiter der Wurf, desto mehr Punkte, solange es nicht im Bach landet.
5. **Spuren lesen:** Kurz wird eine Folge von Pfotenabdrücken gezeigt, die man danach nachtippen muss. Ein Gedächtnisspiel, die Folge wird jede Runde länger.

Beim Igel: **Regenwurm schnappen** (Timing), **Links oder rechts?** (unter welchem Laubhaufen), **Äpfel fangen**, **Kugelrollen** (statt in den Bach darf er nicht in den Teich rollen) und **Spuren lesen**.

Gewinnbedingungen: Mäusesprung 2 von 3 Treffern · Links oder rechts? 3 von 5 richtig · Fangen mindestens 8 Punkte in 20 s · Werfen ein Wurf über 70 m · Spuren lesen eine Folge der Länge 5 schaffen.

Ist die Laune zu lange auf 0, zählt das als Pflegefehler (ergänzt).

### 6.5 Medizin

- Ist das Tier krank, sieht man das an einem Symbol (zum Beispiel einem Totenkopf oder einem Thermometer), und es bewegt sich träge.
- Um es wieder gesund zu machen, **muss man ihm Medizin geben**. Vorschlag: Je nach Schwere sind 1–2 Dosen nötig (ergänzt).
- Medizin bei einem gesunden Tier hat keine Wirkung, und das Tier lehnt sie ab.
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

## 8. UI

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

## 9. Offene Fragen

1. **Tod oder sanfter Abschied?** Soll das Tier wirklich sterben, oder lieber kinderfreundlich „in den Wald zurückziehen“?
2. **Pause-Funktion?** Das Original hatte keine. Soll man das Tier zum Beispiel in den Urlaub oder zu den Großeltern schicken können, damit die Zeit stillsteht?
3. **Sound:** Piep-Töne im Retro-Stil, ja oder nein? Vorläufig sind sie eingebaut und lassen sich in den Einstellungen abschalten.

Entschieden: Das Tier schläft nach Müdigkeit statt zu einer festen Uhrzeit (siehe 6.2). Die Plattform ist eine Web-App bzw. PWA (siehe 2a). Einen Zeitraffer gibt es nicht.
