// Abwechslungsreiche Meldungen; {n} wird in der Oberfläche durch den Namen des Tiers ersetzt.

const last = new Map<string[], number>();
/** zufälliger Text aus der Liste, nie zweimal hintereinander derselbe */
export function pick(list: string[]): string {
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === last.get(list)) i = (i + 1) % list.length;
  last.set(list, i);
  return list[i];
}

/** Liste je Tierart (falls vorhanden) plus allgemeine Texte */
export function pickFor(species: string, by: Record<string, string[]>, common: string[]): string {
  return pick([...(by[species] ?? []), ...common]);
}

export const T = {
  meal: [
    'Mampf! {n} lässt es sich schmecken.',
    'Schmatz, schmatz – {n} putzt den Napf leer.',
    'Lecker! {n} leckt sich die Lippen.',
    '{n} frisst mit großem Appetit.',
    'Mmh, genau das Richtige! {n} ist zufrieden.',
    'Happs! Das war gut, findet {n}.',
  ],
  mealBy: {
    cat: ['{n} schnurrt beim Fressen.', '{n} knuspert vornehm ihr Futter.'],
    dog: ['{n} schlingt alles in Sekunden herunter!', '{n} wedelt beim Fressen mit dem Schwanz.'],
    fox: ['{n} schnappt sich das Futter und schmatzt.', '{n} vergräbt einen Bissen für später.'],
    hedgehog: ['{n} schmatzt laut und zufrieden.', '{n} schnuffelt durch das Futter.'],
    chicken: ['Pick, pick, pick – {n} pickt alle Körner auf.', '{n} gackert zufrieden über die Körner.'],
  } as Record<string, string[]>,
  full: ['{n} ist pappsatt – vielleicht später.', '{n} schiebt den Napf weg. Kein Platz mehr!', 'Nein danke, {n} ist kugelrund satt.'],
  noAppetite: ['{n} hat gerade keinen Appetit.', '{n} schnuppert nur kurz und dreht sich weg.'],
  snack: [
    'Mmh, ein Leckerli! {n} freut sich.',
    'Ein Leckerli! {n} strahlt über das ganze Gesicht.',
    'Knusper! {n} hätte gern gleich noch eins.',
    '{n} macht vor Freude einen kleinen Hüpfer.',
    'Oh, wie lecker! {n} ist begeistert.',
  ],
  snackTooMany: ['Mmh! Aber das waren heute schon viele Leckerlis …', '{n} freut sich – aber zu viele Leckerlis machen dick.', 'Lecker, aber jetzt ist mal gut mit Naschen!'],
  clean: [
    'Alles weggeräumt – blitzblank!',
    'Sauber gemacht! {n} schaut erleichtert.',
    'Frisch und ordentlich – so mag {n} es.',
    'Weg damit! Jetzt riecht es wieder gut.',
    'Ordnung muss sein. {n} bedankt sich.',
  ],
  alreadyClean: ['Schon alles sauber.', 'Hier gibt es nichts aufzuräumen.', 'Blitzblank – nichts zu tun.'],
  sleep: ['Licht aus. Gute Nacht!', 'Gute Nacht, {n}. Träum was Schönes!', '{n} gähnt, kuschelt sich ein und schläft.', 'Licht aus – {n} ist sofort eingeschlummert.'],
  lightOff: ['Licht aus. Schlaf gut!', 'Pssst … Licht aus. {n} schläft jetzt viel ruhiger.', 'Dunkel und gemütlich – schlaf gut, {n}!'],
  notTired: ['{n} ist noch gar nicht müde.', '{n} will noch nicht ins Bett!', 'Schlafen? Jetzt? {n} ist hellwach.'],
  medDose: ['Bäh! Noch eine Dosis, dann geht es {n} besser.', '{n} verzieht das Gesicht. Einmal noch!', 'Tapfer, {n}! Noch eine Dosis.'],
  healed: ['{n} ist wieder gesund!', 'Geschafft! {n} fühlt sich wieder pudelwohl.', 'Gute Besserung hat gewirkt – {n} ist gesund!'],
  medNeedless: ['Bäh! {n} war doch gar nicht krank. Pflegefehler!', '{n} war kerngesund – die Medizin schmeckt scheußlich! Pflegefehler!'],
  scoldOk: ['{n} schaut betreten. Disziplin +25 %.', '{n} senkt den Kopf und benimmt sich wieder. Disziplin +25 %.', 'Erwischt! {n} hat verstanden. Disziplin +25 %.'],
  scoldWrong: ['{n} hat doch gar nichts angestellt! Jetzt ist es traurig.', 'Ungerecht! {n} war ganz brav und ist jetzt traurig.'],
  asleep: ['Psst … {n} schläft gerade.', 'Psst … {n} träumt gerade.'],
  defiant: ['{n} dreht trotzig den Kopf weg.', '{n} tut so, als hätte es nichts gehört.'],
  won: ['Gewonnen! Das hat {n} Spaß gemacht.', 'Super gemacht! {n} ist ganz aus dem Häuschen.', 'Sieg! {n} hüpft vor Freude.'],
  lost: ['Verloren … aber {n} hatte trotzdem Spaß.', 'Knapp daneben! {n} will gleich nochmal.', 'Nicht geschafft – Spaß hatte {n} trotzdem.'],
};
