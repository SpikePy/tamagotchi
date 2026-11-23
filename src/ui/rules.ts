// Spielregeln zum Nachlesen. Alle Zahlen kommen direkt aus config.ts (RULES, DIFFICULTIES),
// damit der Text immer zu den echten Regeln passt.
import { DIFFICULTIES, DIFFICULTY_ORDER, RULES, type Difficulty } from '../engine/config';
import { h } from './dom';

/** Minuten lesbar: „15 Minuten“, „2 Stunden“, „1,5 Stunden“ */
export function fmtMin(m: number): string {
  if (m < 60) return `${m} Minuten`;
  const hrs = m / 60;
  const t = Number.isInteger(hrs) ? String(hrs) : hrs.toFixed(1).replace('.', ',');
  return hrs === 1 ? '1 Stunde' : `${t} Stunden`;
}
const fmtDays = (d: number) => (d === 1 ? '1 Tag' : `${String(d).replace('.', ',')} Tage`);
const pct = (f: number) => `${Math.round(f * 100)} %`;
const frac = (d: number) => (d === 0.25 ? '¼ Tag' : d === 0.5 ? '½ Tag' : d === 0.75 ? '¾ Tag' : fmtDays(d));
const clock = (awakeMin: number) => (RULES.dayStartHour + awakeMin / 60) % 24;

const ul = (...items: (string | Node)[]) => h('ul', {}, ...items.map((i) => h('li', {}, i)));
const b = (t: string) => h('b', {}, t);
/** Text mit **fett** */
const rich = (t: string) => {
  const span = h('span', {});
  t.split(/\*\*(.+?)\*\*/).forEach((part, i) => span.append(i % 2 ? b(part) : part));
  return span;
};
const list = (...items: string[]) => ul(...items.map(rich));
const section = (title: string, ...body: Node[]) => h('section', { class: 'rules-sec' }, h('h3', {}, title), ...body);

export function rulesView(current: Difficulty): HTMLElement {
  const d = DIFFICULTIES[current];
  const R = RULES;
  const heartsFull = (perHeart: number) => fmtMin(perHeart * R.hearts);
  const v = R.variantMaxMistakes;
  const [m0, m1] = R.morningPoopMin;
  const [e0, e1] = R.eveningPoopMin;

  const intro = h(
    'p',
    { class: 'rules-intro' },
    rich(`Die Zahlen gelten für **${d.emoji} ${d.label}**, den Schwierigkeitsgrad dieses Tiers. Die anderen Grade stehen ganz unten.`),
  );

  const todo = section(
    '✅ Was du tun musst',
    list(
      `**Ei ausbrüten:** ${R.eggTaps}× auf das Ei tippen, dann schlüpft es.`,
      `**Füttern 🍖:** Eine Mahlzeit füllt ein Viertel der Sättigung. Ein Baby wird in ${heartsFull(R.hungerMinPerHeart.baby)} von satt zu hungrig, ältere Tiere in ${heartsFull(R.hungerMinPerHeart.other)} (nur im Wachzustand; im Schlaf viel langsamer).`,
      `**Laune 🎾:** Jedes zu Ende gespielte Minispiel gibt ein Viertel Laune, ein Snack auch, Streicheln (aufs Tier tippen) ebenso. Ein Baby verliert die ganze Laune in ${heartsFull(R.happyMinPerHeart.baby)}, ältere Tiere in ${heartsFull(R.happyMinPerHeart.other)}.`,
      `**Saubermachen 🧹:** Ein Häufchen kommt morgens innerhalb von ${m0}–${m1} Minuten nach dem Aufwachen und abends (etwa ${Math.round(clock(e0))}–${Math.round(clock(e1))} Uhr, wenn es um ${R.dayStartHour} Uhr aufsteht). Babys machen zusätzlich ${R.youngExtraPoops}× zwischendurch eins.`,
      `**Schlafen 💡:** Nach etwa ${fmtMin(R.awakeMinUntilTired)} wach wird es müde. Ab ${R.sleepyCallAt} % Müdigkeit ruft es: Licht aus! Nach ${fmtMin(R.sleepNeedMin)} Schlaf wacht es von selbst auf und hat Hunger.`,
      `**Medizin 💊:** Ist es krank, braucht es ${R.medicineDoses.join(' oder ')} Dosen Medizin.`,
    ),
  );

  const care = section(
    '👀 Worauf du achten musst',
    list(
      `**Wenn es ruft, schnell reagieren.** Es ruft bei leerer Sättigung, leerer Laune, einem Häufchen, Krankheit, Müdigkeit und wenn beim Schlafen das Licht noch an ist.`,
      `**Höchstens ${R.snackLimitPerDay} Snacks am Tag.** Snacks und viele Mahlzeiten machen dick. Wer zu dick ist (mehr als das ${String(R.overweightFactor).replace('.', ',')}-Fache des normalen Gewichts), wird leichter krank. Spielen macht wieder schlanker.`,
      `**Nicht hungern lassen.** Bei leerer Sättigung nimmt es ab: pro Stunde ${pct(R.starveWeightLossPerHour)} seines Normalgewichts. Wiegt es weniger als ${pct(R.underweightFactor)} davon, ist es zu dünn und wird leicht krank. Unter dem Normalgewicht bringt jede Mahlzeit ${R.underweightMealGain === 2 ? 'doppelt' : `${R.underweightMealGain}-mal`} so viel Gewicht zurück.`,
      `**Licht aus beim Schlafen** und **nicht wecken:** Zu früh geweckt ist es richtig schlecht gelaunt.`,
      `**Genug Schlaf:** Weniger als ${fmtMin(R.sleepDeficitMin)} Schlaf in 24 Stunden drückt die Laune.`,
      `**Medizin nur, wenn es krank ist.**`,
    ),
  );

  const mistakes = section(
    '⚠️ Was ein Pflegefehler ist',
    list(
      `Ein Ruf bleibt **${fmtMin(d.graceMin)}** lang unbeantwortet (Hunger, Laune, Krankheit, Müdigkeit, Licht).`,
      `Ein Häufchen liegt **${fmtMin(d.poopGraceMin)}** lang herum.`,
      `**Medizin für ein gesundes Tier.**`,
    ),
    h('p', {}, 'Jeder Pflegefehler wird unten gemeldet und mit Grund ins Tagebuch geschrieben. Im Status siehst du, wie viele es sind.'),
  );

  const consequences = section(
    '📉 Was Pflegefehler bewirken',
    list(
      `**Entwicklung:** Die Pflegefehler einer Phase bestimmen die nächste Form. Kind und Teenager: bis ${v.childGood} bzw. ${v.teenGood} Fehler „gut gepflegt“, sonst „vernachlässigt“. Erwachsen: bis ${v.adultGreat} „prächtig“, bis ${v.adultNormal} „normal“, sonst „frech“.`,
      d.endless
        ? `**Lebenszeit:** Auf ${d.label} bleibt das Tier für immer.`
        : `**Lebenszeit:** Als Erwachsener lebt es höchstens ${fmtDays(R.adultLifespanDays.max)}, jeder Pflegefehler (im ganzen Leben) kostet ${frac(d.lifespanPerMistake)}, mindestens bleiben ${fmtDays(R.adultLifespanDays.min)}. Danach zieht es in den Wald 🌲.`,
      d.awayMistakes === null
        ? `**Tierpflegestation:** Auf ${d.label} wird das Tier nie abgeholt.`
        : `**Tierpflegestation 🏡:** Sie holt das Tier ab, wenn sich in einer Phase **${d.awayMistakes} Pflegefehler** sammeln, es **${fmtMin(d.sickAwayMin!)}** krank ohne Medizin ist oder **${fmtMin(d.hungerAwayMin!)}** lang gar nichts zu essen bekommt.`,
    ),
  );

  const sick = section(
    '🤒 Wann es krank wird',
    list(
      `Sättigung länger als **${fmtMin(R.hungerSickAfterMin)}** leer.`,
      `Ein Häufchen liegt länger als **${fmtMin(R.poopSickAfterMin)}**.`,
      `Länger als **${fmtMin(R.sleepDeficitSickAfterMin)}** zu wenig Schlaf.`,
      `Zu dünn: unter ${pct(R.underweightFactor)} des Normalgewichts (zufällig, im Schnitt nach etwa ${fmtMin(Math.round(1 / R.underweightSickChancePerMin))}).`,
      `Übergewicht (zufällig).`,
    ),
  );

  const phases = section(
    '🐣 Lebensphasen',
    list(
      `Baby: ${fmtDays(R.stageDays.baby)} · Kind: ${fmtDays(R.stageDays.child)} · Teenager: ${fmtDays(R.stageDays.teen)} · danach erwachsen.`,
      `Die Zeit läuft auch weiter, wenn die App zu ist.`,
    ),
  );

  const table = h('table', { class: 'rules-diff' });
  const row = (label: string, f: (x: (typeof DIFFICULTIES)[Difficulty]) => string) =>
    h('tr', {}, h('th', {}, label), ...DIFFICULTY_ORDER.map((k) => h('td', k === current ? { class: 'cur' } : {}, f(DIFFICULTIES[k]))));
  table.append(
    h('tr', {}, h('th', {}, ''), ...DIFFICULTY_ORDER.map((k) => h('th', k === current ? { class: 'cur' } : {}, `${DIFFICULTIES[k].emoji} ${DIFFICULTIES[k].label}`))),
    row('Zeit für einen Ruf', (x) => fmtMin(x.graceMin).replace(' Minuten', ' min').replace(/ Stunden?/, ' h')),
    row('Zeit fürs Häufchen', (x) => fmtMin(x.poopGraceMin).replace(' Minuten', ' min').replace(/ Stunden?/, ' h')),
    row('Station ab … Fehlern', (x) => (x.awayMistakes === null ? 'nie' : String(x.awayMistakes))),
    row('Station: krank/hungrig', (x) => (x.sickAwayMin === null ? 'nie' : fmtMin(x.sickAwayMin).replace(/ Stunden?/, ' h'))),
    row('Lebenszeit je Fehler', (x) => (x.endless ? '–' : `−${frac(x.lifespanPerMistake)}`)),
    row('Zieht in den Wald', (x) => (x.endless ? 'nie' : 'ja')),
  );
  const diffs = section('🎚️ Schwierigkeitsgrade', h('p', {}, 'Wird vor jedem neuen Ei gewählt und gilt für das ganze Leben des Tiers.'), h('div', { class: 'rules-scroll' }, table));

  return h('div', { class: 'rules' }, intro, todo, care, mistakes, consequences, sick, phases, diffs);
}
