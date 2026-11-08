import { beep, setSound } from '../audio';
import {
  ActionResult,
  NAME_MAX,
  renamePet,
  canAct,
  canPlay,
  clean,
  feedMeal,
  feedSnack,
  finishGame,
  giveMedicine,
  lightButton,
  scold,
  startEgg,
  wakeUp,
} from '../engine/actions';
import { DAY, MIN, RULES } from '../engine/config';
import { advance, ageDays, isOverweight, SimEvent, sleptLast24h } from '../engine/sim';
import { CallType, GameState, Pet, hearts } from '../engine/state';
import { notify, requestNotifications } from '../notify';
import { drawMap, petSprite } from '../render/pixels';
import { Scene } from '../render/scene';
import { SPECIES, lookName, randomLook, species } from '../species';
import { save, wipe } from '../storage';
import { h } from './dom';
import { GAME_IDS, GameId, runGame } from './games';

const STAGE_LABEL = { egg: 'Ei', baby: 'Baby', child: 'Kind', teen: 'Teenager', adult: 'Erwachsen' } as const;

const CALL_TEXT: Record<CallType, string> = {
  hunger: 'hat Hunger!',
  happy: 'ist traurig und will spielen!',
  poop: 'hat gekackt – bitte sauber machen!',
  sick: 'ist krank und braucht Medizin!',
  sleepy: 'ist müde.',
  light: 'schläft – mach das Licht aus!',
  fake: 'ruft nach dir …',
};

export function stageName(p: { species: string; stage: Pet['stage']; variant: Pet['variant'] }): string {
  const names = species(p.species).stageNames[p.stage];
  return names[p.variant] ?? Object.values(names)[0] ?? '';
}

/** Eigener Name, sonst Name der Entwicklungsstufe */
export function petName(p: Pet): string {
  return p.name ?? stageName(p);
}

let deferredInstall: (Event & { prompt(): Promise<void> }) | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e as typeof deferredInstall;
});

export class App {
  private scene: Scene;
  private msgEl: HTMLElement;
  private msgUntil = 0;
  private buttons: Record<string, HTMLButtonElement> = {};
  private dialog: HTMLDialogElement;
  private sheetBody: HTMLElement;
  private sheetTitle: HTMLElement;
  private onSheetClose: (() => void) | null = null;
  private hud: HTMLElement;

  constructor(
    root: HTMLElement,
    private s: GameState,
  ) {
    setSound(s.settings.sound);
    const canvas = h('canvas', { class: 'pixel screen', 'aria-label': 'Haustier' }) as HTMLCanvasElement;
    this.scene = new Scene(canvas);
    this.hud = h('div', { class: 'hud' });
    this.msgEl = h('div', { class: 'msg', role: 'status' });

    const nav = h('nav', { class: 'actions' });
    const add = (id: string, icon: string, label: string, fn: () => void) => {
      const b = h('button', { class: 'act', 'data-id': id }, h('span', { class: 'ico' }, icon), h('span', {}, label));
      b.onclick = () => {
        beep.click();
        fn();
      };
      this.buttons[id] = b;
      nav.append(b);
    };
    add('feed', '🍖', 'Füttern', () => this.feedMenu());
    add('light', '💡', 'Licht', () => this.light());
    add('play', '🎾', 'Spielen', () => this.playMenu());
    add('medicine', '💊', 'Medizin', () => this.act(giveMedicine(this.s), 'pill'));
    add('clean', '🧹', 'Sauber', () => {
      const r = clean(this.s);
      if (r.ok) this.scene.cleaning();
      this.act(r, 'sparkle');
    });
    add('scold', '📣', 'Schimpfen', () => this.act(scold(this.s), 'angry'));
    add('status', '📊', 'Status', () => this.statusSheet());
    add('settings', '⚙️', 'Mehr', () => this.settingsSheet());

    this.dialog = h('dialog', { class: 'sheet' });
    this.sheetTitle = h('h2', {});
    const close = h('button', { class: 'close', 'aria-label': 'Schließen' }, '✕');
    close.onclick = () => this.closeSheet();
    this.sheetBody = h('div', { class: 'sheet-body' });
    this.dialog.append(h('header', {}, this.sheetTitle, close), this.sheetBody);
    this.dialog.addEventListener('close', () => {
      const fn = this.onSheetClose;
      this.onSheetClose = null;
      fn?.();
      // noch kein Name? Nachfragen, sobald der Dialog zu ist
      const p = this.s.pet;
      if (p && p.stage !== 'egg' && p.name === null) setTimeout(() => this.askName(), 300);
    });

    root.append(
      h('main', { class: 'device' }, this.hud, h('div', { class: 'screen-wrap' }, canvas), this.msgEl, nav),
      this.dialog,
    );

    this.tick(true);
    setInterval(() => this.tick(false), 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.tick(true);
      save(this.s);
    });
    const frame = () => {
      this.scene.draw(this.s);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    this.checkScreens();
  }

  // ---------- Spielschleife ----------

  private tick(catchUp: boolean) {
    const events = advance(this.s, Date.now());
    if (events.length) this.handleEvents(events, catchUp);
    this.refresh();
    save(this.s);
  }

  private handleEvents(events: SimEvent[], quiet: boolean) {
    const p = this.s.pet;
    const name = p ? petName(p) : '';
    for (const e of events) {
      switch (e.kind) {
        case 'hatched':
          this.say('Es schlüpft!');
          if (!quiet) {
            beep.win();
            this.scene.hatch();
          }
          setTimeout(() => this.askName(), quiet ? 300 : 2000);
          break;
        case 'evolved':
          this.say(`${name} hat sich entwickelt: ${p ? stageName(p) : ''}!`);
          if (!quiet) {
            beep.win();
            this.scene.evolve();
          }
          break;
        case 'call':
          if (quiet) break;
          if (e.call !== 'sleepy') beep.call();
          if (document.hidden && this.s.settings.notifications && p) {
            void notify(name, `${species(p.species).article === 'der' ? 'Dein' : 'Deine'} ${name} ${CALL_TEXT[e.call]}`);
          }
          break;
        case 'sick':
          if (!quiet) this.say('Oh nein, es ist krank geworden!');
          break;
        case 'woke':
          if (!quiet) this.say('Guten Morgen! Es hat Hunger.');
          break;
        case 'ended':
          break;
      }
    }
    if (quiet && p) {
      const calls = Object.keys(p.calls) as CallType[];
      if (calls.length) this.say(`Während du weg warst: ${name} ${CALL_TEXT[calls[0]]}`);
    }
    if (events.some((e) => e.kind === 'ended')) this.checkScreens();
  }

  private refresh() {
    const s = this.s;
    const p = s.pet;
    const can = canAct(s);
    for (const [id, b] of Object.entries(this.buttons)) {
      const enabled = id === 'settings' || (can as Record<string, boolean>)[id];
      b.disabled = !enabled;
    }
    const lightB = this.buttons.light;
    lightB.querySelector('span:last-child')!.textContent = p?.asleep && !p.lightOn ? 'Wecken' : 'Licht';

    // HUD: Herzen und Kurzinfo
    this.hud.replaceChildren();
    if (p && p.stage !== 'egg') {
      this.hud.append(
        heartRow('🍖', hearts(p.hunger)),
        heartRow('😊', hearts(p.happy)),
        h('span', { class: 'hud-name' }, petName(p), p.name ? h('small', {}, stageName(p)) : null),
      );
    } else if (p) {
      this.hud.append(h('span', { class: 'hud-name' }, 'Ein Ei … es wackelt bald!'));
    }

    if (performance.now() > this.msgUntil) {
      this.msgEl.textContent = p ? this.idleText(p) : '';
    }
  }

  private idleText(p: Pet): string {
    if (p.stage === 'egg') return 'Gleich schlüpft es …';
    const calls = Object.keys(p.calls) as CallType[];
    if (calls.length) return `${petName(p)} ${CALL_TEXT[calls[0]]}`;
    if (p.asleep) return p.lightOn ? 'Psst … es schläft (Licht ist noch an).' : 'Psst … es schläft.';
    return `${petName(p)} · ${Math.floor(ageDays(p, this.s.clock))} Tage alt`;
  }

  private say(text: string) {
    this.msgEl.textContent = text;
    this.msgUntil = performance.now() + 3500;
  }

  private act(r: ActionResult, fx?: Parameters<Scene['effect']>[0]) {
    this.say(r.msg);
    if (r.ok) {
      if (fx) this.scene.effect(fx);
      beep.ok();
    } else beep.no();
    this.refresh();
    save(this.s);
  }

  // ---------- Aktionen ----------

  private light() {
    const p = this.s.pet;
    if (p?.asleep && !p.lightOn) {
      if (confirm('Wirklich aufwecken? Es wird schlecht gelaunt sein.')) this.act(wakeUp(this.s));
      return;
    }
    this.act(lightButton(this.s));
  }

  private feedMenu() {
    const body = h('div', { class: 'choice-grid' });
    const meal = h('button', { class: 'choice' }, h('span', { class: 'ico' }, '🍖'), h('b', {}, 'Mahlzeit'), h('small', {}, '+1 Hunger-Herz'));
    const snack = h('button', { class: 'choice' }, h('span', { class: 'ico' }, '🍬'), h('b', {}, 'Snack'), h('small', {}, '+1 Laune-Herz, macht dick'));
    meal.onclick = () => (this.closeSheet(), this.act(feedMeal(this.s), 'food'));
    snack.onclick = () => (this.closeSheet(), this.act(feedSnack(this.s), 'candy'));
    body.append(meal, snack);
    this.openSheet('Füttern', body);
  }

  private playMenu() {
    const check = canPlay(this.s);
    if (!check.ok) return this.act(check);
    const sp = species(this.s.pet!.species);
    const body = h('div', { class: 'game-list' });
    GAME_IDS.forEach((id, i) => {
      const g = sp.games[id];
      const b = h('button', { class: 'choice wide' }, h('b', {}, `${i + 1}. ${g.title}`), h('small', {}, g.description));
      b.onclick = () => this.startGame(id);
      body.append(b);
    });
    this.openSheet('Spielen', body);
  }

  private startGame(id: GameId) {
    const p = this.s.pet!;
    const sp = species(p.species);
    const body = h('div', { class: 'game' });
    this.openSheet(sp.games[id].title, body);
    const cleanup = runGame(id, body, sp, p, (won) => {
      cleanup();
      this.onSheetClose = null;
      const r = finishGame(this.s, won);
      won ? beep.win() : beep.lose();
      body.replaceChildren(
        h('p', { class: 'result' }, won ? '🎉 Gewonnen!' : '😅 Verloren'),
        h('p', {}, r.msg),
        btn('Nochmal', () => {
          const c = canPlay(this.s);
          c.ok ? this.startGame(id) : (this.closeSheet(), this.act(c));
        }),
        btn('Fertig', () => this.closeSheet()),
      );
      if (won) this.scene.effect('heart');
      this.refresh();
      save(this.s);
    });
    // Abbruch zählt als verloren (kein Laune-Bonus), aber ohne Gewichtsverlust
    this.onSheetClose = cleanup;
  }

  // ---------- Bildschirme ----------

  private checkScreens() {
    if (this.s.ending) return this.goodbyeSheet();
    if (!this.s.pet) return this.chooseSheet();
    if (this.s.pet.stage !== 'egg' && this.s.pet.name === null) this.askName();
  }

  /** Namensvergabe nach dem Schlüpfen (oder Umbenennen aus dem Status) */
  private askName(rename = false) {
    const p = this.s.pet;
    if (!p || p.stage === 'egg') return;
    if (!rename && (p.name !== null || this.dialog.open)) return;
    const sp = species(p.species);
    const ideas = [...sp.nameIdeas].sort(() => Math.random() - 0.5).slice(0, 4);
    const input = h('input', {
      type: 'text',
      class: 'name-input',
      maxlength: String(NAME_MAX),
      placeholder: ideas[0],
      autocomplete: 'off',
      enterkeyhint: 'done',
      'aria-label': 'Name',
    }) as HTMLInputElement;
    if (p.name) input.value = p.name;
    const chips = h('div', { class: 'chips' });
    for (const n of ideas) {
      const c = h('button', { class: 'chip', type: 'button' }, n);
      c.onclick = () => {
        input.value = n;
        input.focus();
      };
      chips.append(c);
    }
    const form = h('form', { class: 'name-form' });
    form.onsubmit = (e) => {
      e.preventDefault();
      const r = renamePet(this.s, input.value || input.placeholder);
      if (!r.ok) return this.act(r);
      this.closeSheet(true);
      this.act(r, 'heart');
    };
    const pic = h('canvas', { class: 'pixel species-pic', width: '20', height: '20' }) as HTMLCanvasElement;
    const img = petSprite(sp, p);
    drawMap(pic.getContext('2d')!, img.map, img.colors, (20 - img.w) / 2, (20 - img.h) / 2);
    form.append(
      pic,
      h('p', {}, rename ? 'Wie soll es heißen?' : `Ein kleines ${sp.name}baby ist geschlüpft! Wie soll es heißen?`),
      input,
      chips,
      h('button', { class: 'big-btn', type: 'submit' }, rename ? 'Speichern' : 'Los geht’s!'),
    );
    this.openSheet(rename ? 'Umbenennen' : 'Willkommen!', form, !rename);
    setTimeout(() => input.focus(), 50);
  }

  private chooseSheet() {
    const body = h('div', { class: 'choice-grid species-grid' });
    for (const sp of Object.values(SPECIES)) {
      const c = h('canvas', { class: 'pixel species-pic', width: '20', height: '20' }) as HTMLCanvasElement;
      const img = petSprite(sp, { stage: 'child', variant: 'good' });
      drawMap(c.getContext('2d')!, img.map, img.colors, (20 - img.w) / 2, (20 - img.h) / 2);
      const b = h(
        'button',
        { class: 'choice' },
        c,
        h('b', {}, sp.name),
        sp.coats ? h('small', {}, 'Fell & Muster: Überraschung!') : null,
      );
      b.onclick = () => {
        startEgg(this.s, sp.id, randomLook(sp));
        save(this.s);
        this.closeSheet(true);
        this.say(`Ein ${sp.name}-Ei! Es schlüpft in einer Minute.`);
        this.refresh();
      };
      body.append(b);
    }
    this.openSheet('Welches Tier möchtest du?', h('div', {}, h('p', {}, 'Wähle ein Ei:'), body), true);
  }

  private goodbyeSheet() {
    const e = this.s.ending!;
    const m = this.s.memorials[0];
    const sp = species(m?.species ?? 'fox');
    const name = m ? (m.name ?? stageName(m)) : sp.name;
    const body = h(
      'div',
      { class: 'goodbye' },
      h('p', { class: 'result' }, e.reason === 'forest' ? '🌲' : '🪦'),
      h(
        'p',
        {},
        e.reason === 'forest'
          ? `${name} hat sich nach einem langen, schönen Leben in den Wald zurückgezogen.`
          : `${name} ist gestorben (${e.cause}).`,
      ),
      h('p', {}, `Alter: ${Math.floor(e.ageDays)} Tage`),
      m ? h('details', {}, h('summary', {}, 'Lebenslauf'), logList(m.log)) : null,
      btn('Neues Ei', () => {
        this.s.ending = null;
        save(this.s);
        this.closeSheet(true);
        this.chooseSheet();
      }),
    );
    this.openSheet('Abschied', body, true);
  }

  private statusSheet() {
    const p = this.s.pet;
    if (!p) return;
    const sp = species(p.species);
    const rows: [string, string][] = [
      ['Name', p.name ?? '–'],
      ['Tier', `${stageName(p)} (${sp.name})`],
      ...(lookName(sp, p.look) ? [['Fell', lookName(sp, p.look)!] as [string, string]] : []),
      ['Phase', STAGE_LABEL[p.stage]],
      ['Alter', `${Math.floor(ageDays(p, this.s.clock))} Tage`],
    ];
    if (p.stage !== 'egg') {
      const next = { baby: 1, child: 5, teen: 5 }[p.stage as 'baby'];
      if (next) {
        const left = next * DAY - (this.s.clock - p.stageStartedAt);
        rows.push(['Nächste Phase in', duration(left)]);
      }
      rows.push(
        ['Hunger', '❤️'.repeat(hearts(p.hunger)) + '🤍'.repeat(4 - hearts(p.hunger))],
        ['Laune', '❤️'.repeat(hearts(p.happy)) + '🤍'.repeat(4 - hearts(p.happy))],
        ['Müdigkeit', `${Math.round(p.tiredness)} %`],
        ['Schlaf (24 h)', duration(sleptLast24h(p, this.s.clock) * MIN)],
        ['Schlaf bis ausgeschlafen', duration((RULES.sleepNeedMin - p.sleptInCycleMin) * MIN)],
        ['Gewicht', `${p.weight} g${isOverweight(p) ? ' (zu dick!)' : ''}`],
        ['Disziplin', `${p.discipline} %`],
        ['Gesundheit', p.sick ? `krank (noch ${p.sick.doses}× Medizin)` : 'gesund'],
        ['Snacks heute', `${p.snacksToday} / ${RULES.snackLimitPerDay}`],
        ['Pflegefehler', `${p.careMistakesStage} (Phase) · ${p.careMistakesTotal} (gesamt)`],
      );
    }
    const table = h('table', { class: 'stats' });
    for (const [k, v] of rows) table.append(h('tr', {}, h('th', {}, k), h('td', {}, v)));
    const rename = p.stage !== 'egg' ? btn('✏️ Umbenennen', () => this.askName(true)) : null;
    this.openSheet('Status', h('div', {}, table, rename, h('details', {}, h('summary', {}, 'Tagebuch'), logList(p.log))));
  }

  private settingsSheet() {
    const st = this.s.settings;
    const sound = toggle('Töne', st.sound, (v) => {
      st.sound = v;
      setSound(v);
      save(this.s);
    });
    const notif = toggle('Benachrichtigungen', st.notifications, async (v, input) => {
      if (v && !(await requestNotifications())) {
        input.checked = false;
        alert('Benachrichtigungen wurden vom Browser nicht erlaubt.');
        v = false;
      }
      st.notifications = v;
      save(this.s);
    });
    const body = h(
      'div',
      { class: 'settings' },
      sound,
      notif,
      h('p', { class: 'hint' }, 'Benachrichtigungen kommen, solange die App im Hintergrund noch läuft.'),
    );
    if (deferredInstall) {
      body.append(
        btn('📲 Als App installieren', async () => {
          await deferredInstall?.prompt();
          deferredInstall = null;
          this.closeSheet();
        }),
      );
    } else if (!matchMedia('(display-mode: standalone)').matches) {
      body.append(h('p', { class: 'hint' }, 'Installieren: im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.'));
    }
    if (this.s.memorials.length) {
      const list = h('ul', { class: 'memorials' });
      for (const m of this.s.memorials) {
        list.append(
          h('li', {}, `${m.ending.reason === 'forest' ? '🌲' : '🪦'} ${m.name ? `${m.name} (${stageName(m)})` : stageName(m)} – ${Math.floor(m.ending.ageDays)} Tage`),
        );
      }
      body.append(h('details', {}, h('summary', {}, 'Frühere Tiere'), list));
    }
    body.append(
      btn('Alles löschen & neu anfangen', () => {
        if (!confirm('Wirklich alles löschen? Dein Tier und alle früheren Tiere sind dann weg.')) return;
        wipe();
        location.reload();
      }, 'danger'),
    );
    this.openSheet('Mehr', body);
  }

  private openSheet(title: string, body: HTMLElement, modal = false) {
    this.sheetTitle.textContent = title;
    this.sheetBody.replaceChildren(body);
    this.dialog.classList.toggle('locked', modal);
    if (!this.dialog.open) this.dialog.showModal();
    this.dialog.oncancel = modal ? (e) => e.preventDefault() : null;
  }

  private closeSheet(force = false) {
    if (this.dialog.classList.contains('locked') && !force) return;
    this.dialog.classList.remove('locked');
    this.dialog.close();
  }
}

function heartRow(icon: string, n: number) {
  return h('span', { class: 'hud-hearts' }, `${icon} ${'♥'.repeat(n)}${'♡'.repeat(4 - n)}`);
}

function btn(label: string, fn: () => void, cls = '') {
  const b = h('button', { class: `big-btn ${cls}` }, label);
  b.onclick = fn;
  return b;
}

function toggle(label: string, value: boolean, fn: (v: boolean, input: HTMLInputElement) => void) {
  const input = h('input', { type: 'checkbox' }) as HTMLInputElement;
  input.checked = value;
  input.onchange = () => fn(input.checked, input);
  return h('label', { class: 'toggle' }, h('span', {}, label), input);
}

function logList(log: { at: number; text: string }[]) {
  const ul = h('ul', { class: 'log' });
  for (const l of [...log].reverse()) {
    const d = new Date(l.at);
    ul.append(h('li', {}, `${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${l.text}`));
  }
  return ul;
}

function duration(ms: number): string {
  const m = Math.max(0, Math.round(ms / MIN));
  const d = Math.floor(m / 1440);
  const hh = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d) return `${d} T ${hh} h`;
  if (hh) return `${hh} h ${mm} min`;
  return `${mm} min`;
}
