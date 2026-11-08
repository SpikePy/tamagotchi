# Waldling – virtuelles Haustier

Ein virtuelles Haustier im Stil der 90er-Jahre-Taschenspiele, als Web-App, die sich auf Android installieren lässt. Man zieht einen **Fuchs**, einen **Igel**, eine **Katze** (mit zufälliger Fellfarbe und Muster) einen **Hund** (10 Rassen, zufällige Farbe und Muster) oder ein **Huhn** (4 Rassen) vom Ei bis zum Erwachsenen groß: füttern, schlafen legen, sauber machen, spielen, erziehen und gesund pflegen. Alles läuft in Echtzeit und geht auch weiter, wenn die App zu ist.

**▶ Jetzt spielen: https://spikepy.github.io/tamagotchi/**

<p align="center">
  <img src="docs/screenshots/fox-day.png" width="260" alt="Ein erwachsener Prachtfuchs in seinem Bau am Tag">
  <img src="docs/screenshots/hedgehog-sick.png" width="260" alt="Ein krankes Igelbaby ruft, zwei Haufen liegen herum">
  <img src="docs/screenshots/hedgehog-night.png" width="260" alt="Ein Jungigel schläft nachts bei ausgeschaltetem Licht">
</p>

<p align="center">
  <img src="docs/screenshots/multi.png" width="260" alt="Drei Tiere mit Umschalter oben">
  <img src="docs/screenshots/cat-day.png" width="260" alt="Eine getigerte graue Katze und ihr Körbchen">
  <img src="docs/screenshots/cats.png" width="520" alt="Alle Tiere in allen Stufen, Katzen-Fellvarianten und Hunderassen">
</p>

<p align="center">
  <img src="docs/screenshots/choose.png" width="260" alt="Auswahl zwischen Fuchs und Igel">
  <img src="docs/screenshots/games.png" width="260" alt="Die fünf Minispiele des Fuchses">
  <img src="docs/screenshots/game-catch.png" width="260" alt="Minispiel Beeren fangen">
</p>

<p align="center">
  <img src="docs/screenshots/status.png" width="260" alt="Statusbildschirm mit allen Werten">
</p>

## Features

- **Lebenszyklus:** Ei (1 min) → Baby (1 Tag) → Kind (5 Tage) → Teenager (5 Tage) → Erwachsen. Welche Form das Tier annimmt, hängt von Pflegefehlern und Disziplin ab. Am Lebensende zieht es sich in den Wald zurück.
- **Bedürfnisse:** Sättigung und Laune (HUD-Leisten mit je 4 Segmenten), Müdigkeit, Gewicht, Disziplin und Gesundheit.
- **Schlafen:** Das Tier wacht nach insgesamt 8 Stunden Schlaf automatisch auf. Danach hat es Hunger und kackt innerhalb einer Stunde.
- **Hygiene:** Es kackt alle 1–3 Stunden. Liegt ein Haufen länger als 4 Stunden, wird es krank.
- **Mehrere Tiere:** bis zu 5 gleichzeitig, Umschalter oben
- **Umgebung:** Fuchs am Waldrand mit Baumhöhle, Igel im Garten mit Laubhaufen, Katze im Zimmer mit Körbchen und Kratzbaum
- **Hühner:** Legehuhn, Seidenhuhn, Hahn, Sperberhuhn in mehreren Farben, mit Hühnerhof und Stall
- **Hunde:** 10 Rassen (Labrador, Schäferhund, Dackel, Mops, Husky, Beagle, Dalmatiner, Pudel, Border Collie, Corgi), zufällig mit passender Farbe und Muster
- **Lebendige Gehege:** Deko je Tier (Bach, Pilze, Igelhaus, Sonnenblumen, Regal, Fensterkissen, Nistkasten, Wetterhahn …), Interaktionen (Katze döst auf dem Fensterbrett, Huhn nimmt Sandbad, Hennen legen Eier), Schmetterlinge, Glühwürmchen, Abendlicht
- **Wetter und Jahreszeiten:** ziehende Wolken, Regen mit Pfützen, Schnee, Frühlingsblüten, Herbstlaub, Winterlandschaft – nach echtem Datum
- **Katzen-Fell:** 6 Fellfarben × 4 Muster (einfarbig, getigert, gefleckt, weiße Pfoten), zufällig pro Tier.
- **5 Minispiele pro Tier:** zum Beispiel Mäusesprung, Links oder rechts?, Beeren fangen, Stöckchen holen und Spuren lesen.
- **Rufen:** Braucht das Tier etwas, ruft es mit Ton und Benachrichtigung. Reagiert man nicht innerhalb von 15 Minuten, zählt das als Pflegefehler.
- **Offline und installierbar (PWA):** Der Spielstand liegt nur lokal im Browser (localStorage).

Alle Regeln stehen in der **[SPEC.md](SPEC.md)**.

### Cheat-Codes per URL

Zum Beispiel https://spikepy.github.io/tamagotchi/?max=1 oder `?pet=Rudi&stage=erwachsen&form=pracht` oder `?pet=alle&hunger=4&poop=0`.

`pet=Name|Nummer|alle` · `max=1` · `happy=0–4` · `hunger=0–4` · `sick=1|0` · `tired=0–100` · `sleep=1|0` · `discipline=0–100` · `weight=Gramm` · `poop=0–6` · `mistakes=0–99` · `stage=baby|kind|teen|erwachsen` · `form=gut|schlecht|pracht|normal|frech` · `age=Tage` · `name=Text` · `hatch=1`

Alle Details stehen in der [SPEC.md](SPEC.md#7a-cheat-codes-per-url-parameter).

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server (auch im LAN erreichbar, z. B. vom Handy)
npm test           # Tests der Spiellogik
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal ausliefern
```

Weitere Skripte:

```bash
npm run icons        # App-Icons aus dem Fuchs-Sprite neu erzeugen
npm run screenshots  # README-Screenshots neu erzeugen (braucht laufendes "npm run preview" und Chromium)
```

## Auf Android installieren

1. https://spikepy.github.io/tamagotchi/ in Chrome auf Android öffnen.
2. Im Menü **„App installieren“** bzw. **„Zum Startbildschirm hinzufügen“** wählen. Alternativ gibt es in der App unter **⚙️ Mehr** einen Knopf **„Als App installieren“**.

Danach startet die App mit eigenem Icon im Vollbild und funktioniert auch offline.

> Hinweis: Benachrichtigungen kommen nur, solange die App im Hintergrund noch läuft. Echte Push-Nachrichten bei komplett geschlossener App bräuchten einen Server.

## Deployment

Bei jedem Push auf `main` testet und baut der GitHub-Actions-Workflow `.github/workflows/pages.yml` die App und veröffentlicht sie auf GitHub Pages.

## Aufbau

```
src/
  engine/    Spiellogik ohne UI: Zustand, Minuten-Simulation, Aktionen, Regeln (config.ts), Tests
  species/   Tierarten als reine Daten: Pixel-Sprites, Farben, Namen, Minispiel-Themen
  render/    Pixel-Renderer für den Bildschirm (Canvas)
  ui/        Oberfläche, Dialoge, Minispiele
public/      Manifest, Service Worker, Icons
```

**Neue Tierart:** In `src/species/` eine neue `SpeciesDef` anlegen und in `src/species/index.ts` eintragen. An der Spiellogik muss dafür nichts geändert werden.

**Balancing:** Alle Zeiten und Werte stehen in `src/engine/config.ts`.
