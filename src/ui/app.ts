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
  stroke,
  switchPet,
  wakeUp,
} from '../engine/actions';
import { DAY, MIN, RULES } from '../engine/config';
import { advance, ageDays, isOverweight, SimEvent, sleptLast24h } from '../engine/sim';
import { CallType, GameState, MAX_PETS, Pet, activePet } from '../engine/state';
import { notify, requestNotifications } from '../notify';
import { drawMap, eggColors, eggMap, hiResCanvas, petSprite } from '../render/pixels';
import { Scene } from '../render/scene';
import { SPECIES, lookName, randomLook, species, weightLabel } from '../species';
import { save, wipe } from '../storage';
import { h } from './dom';
import { GAME_IDS, GameId, runGame } from './games';

const STAGE_LABEL = { egg: 'Ei', baby: 'Baby', child: 'Kind', teen: 'Teenager', adult: 'Erwachsen' } as const;

const STROKE_TEXT: Record<string, string> = {
  cat: 'schnurrt',
  dog: 'wedelt mit dem Schwanz',
  fox: 'kuschelt sich an deine Hand',
  hedgehog: 'legt die Stacheln an',
  chicken: 'gluckst zufrieden',
};

const CALL_TEXT: Record<CallType, string> = {
  hunger: 'hat Hunger!',
  happy: 'ist traurig und will spielen!',
  poop: 'hat gekackt – bitte sauber machen!',
  sick: 'ist krank und braucht Medizin!',
  sleepy: 'ist müde.',
  light: 'schläft – mach das Licht aus!',
  fake: 'ruft nach dir …',
};

export function stageName(p: { species: string; stage: Pet['stage']; variant: Pet['variant']; look?: Pet['look'] }): string {
  const sp = species(p.species);
  const breed = p.look?.breed !== undefined ? sp.breeds?.[p.look.breed] : undefined;
  const own = breed?.stageNames?.[p.stage]?.[p.variant];
  if (own) return own;
  const names = sp.stageNames[p.stage];
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
  private tabs: HTMLElement;
  private tabsKey = '';

  /** das gerade angezeigte Tier */
  private get pet(): Pet | null {
    return activePet(this.s);
  }

  constructor(
    root: HTMLElement,
    private s: GameState,
  ) {
    setSound(s.settings.sound);
    const canvas = h('canvas', { class: 'pixel screen', 'aria-label': 'Haustier' }) as HTMLCanvasElement;
    this.scene = new Scene(canvas);
    // Tippen/Klicken aufs Tier = streicheln
    canvas.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 64;
      const y = ((e.clientY - r.top) / r.height) * 48;
      if (this.scene.hitPet(x, y)) this.strokePet();
    });
    this.hud = h('div', { class: 'hud' });
    this.tabs = h('div', { class: 'pet-tabs', role: 'tablist', 'aria-label': 'Deine Tiere' });
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
      const p = this.pet;
      if (p && p.stage !== 'egg' && p.name === null) setTimeout(() => this.askName(), 300);
    });

    root.append(
      h('main', { class: 'device' }, this.tabs, this.hud, h('div', { class: 'screen-wrap' }, canvas), this.msgEl, nav),
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
    for (const e of events) {
      const p = this.s.pets.find((x) => x.id === e.petId) ?? null;
      const isActive = !!p && p.id === this.s.activeId;
      const name = p ? petName(p) : e.kind === 'ended' ? (e.name ?? '') : '';
      switch (e.kind) {
        case 'hatched':
          if (!quiet) beep.win();
          if (isActive) {
            this.say('Es schlüpft!');
            if (!quiet) this.scene.hatch();
            setTimeout(() => this.askName(), quiet ? 300 : 2000);
          } else this.say(`Ein Ei ist geschlüpft! Tippe oben auf das Tier, um ihm einen Namen zu geben.`);
          break;
        case 'evolved':
          this.say(`${name} hat sich entwickelt: ${p ? stageName(p) : ''}!`);
          if (!quiet) {
            beep.win();
            if (isActive) this.scene.evolve();
          }
          break;
        case 'call':
          if (quiet || !p) break;
          if (e.call !== 'sleepy') beep.call();
          if (!isActive) this.say(`${name} ${CALL_TEXT[e.call]}`);
          if (document.hidden && this.s.settings.notifications) {
            void notify(name, `${species(p.species).article === 'der' ? 'Dein' : 'Deine'} ${name} ${CALL_TEXT[e.call]}`);
          }
          break;
        case 'sick':
          if (!quiet) this.say(isActive ? 'Oh nein, es ist krank geworden!' : `Oh nein, ${name} ist krank geworden!`);
          break;
        case 'woke':
          if (!quiet && isActive) this.say('Guten Morgen! Es hat Hunger.');
          break;
        case 'ended':
          break;
      }
    }
    if (quiet) {
      const calling = this.s.pets.filter((x) => Object.keys(x.calls).length);
      if (calling.length) {
        const x = calling[0];
        this.say(`Während du weg warst: ${petName(x)} ${CALL_TEXT[Object.keys(x.calls)[0] as CallType]}`);
      }
    }
    if (events.some((e) => e.kind === 'ended')) this.checkScreens();
  }

  /** Leiste oben zum Umschalten zwischen den Tieren */
  private renderTabs() {
    const s = this.s;
    const key = JSON.stringify([
      s.activeId,
      s.pets.map((p) => [p.id, p.name, p.stage, p.variant, p.asleep, Object.keys(p.calls).length > 0, !!p.sick]),
    ]);
    if (key === this.tabsKey) return;
    this.tabsKey = key;
    this.tabs.replaceChildren();
    for (const p of s.pets) {
      const sp = species(p.species);
      const c = hiResCanvas(20, 20, 'tab-pic');
      const ctx = c.getContext('2d')!;
      if (p.stage === 'egg') drawMap(ctx, eggMap(), eggColors(sp, p.look), 4, 4);
      else {
        const img = petSprite(sp, p, { sleeping: p.asleep });
        drawMap(ctx, img.map, img.colors, Math.floor((20 - img.w) / 2), Math.floor((20 - img.h) / 2));
      }
      const active = p.id === s.activeId;
      const label = p.stage === 'egg' ? 'Ei' : petName(p);
      const b = h(
        'button',
        { class: `pet-tab${active ? ' active' : ''}`, role: 'tab', 'aria-selected': String(active), title: label },
        c,
        h('span', { class: 'tab-name' }, label),
        Object.keys(p.calls).length ? h('span', { class: 'tab-dot', 'aria-label': 'ruft' }) : null,
        p.asleep ? h('span', { class: 'tab-z' }, 'z') : null,
      );
      b.onclick = () => {
        if (active) return;
        beep.click();
        switchPet(s, p.id);
        this.scene.reset();
        save(s);
        this.refresh();
        this.checkScreens();
      };
      this.tabs.append(b);
    }
    if (s.pets.length < MAX_PETS) {
      const add = h('button', { class: 'pet-tab add', title: 'Neues Ei', 'aria-label': 'Neues Tier' }, h('span', { class: 'plus' }, '+'));
      add.onclick = () => {
        beep.click();
        this.chooseSheet();
      };
      this.tabs.append(add);
    }
  }

  private refresh() {
    const s = this.s;
    const p = activePet(s);
    const can = canAct(s);
    for (const [id, b] of Object.entries(this.buttons)) {
      const enabled = id === 'settings' || (can as Record<string, boolean>)[id];
      b.disabled = !enabled;
    }
    this.renderTabs();
    const lightB = this.buttons.light;
    lightB.querySelector('span:last-child')!.textContent = p?.asleep && !p.lightOn ? 'Wecken' : 'Licht';

    // Kopfzeile: Name (Sättigung/Laune stehen als HUD im Spielbild)
    this.hud.replaceChildren();
    if (p && p.stage !== 'egg') {
      this.hud.append(
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

  /** Meldung von außen (z. B. URL-Parameter) */
  notice(text: string) {
    this.say(text);
    this.msgUntil = performance.now() + 6000;
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

  private strokePet() {
    const p = this.pet;
    if (!p || p.stage === 'egg') return;
    const r = stroke(this.s);
    if (!r.ok) {
      this.say(`${petName(p)} schläft – psst!`);
      this.scene.stroke(true);
      return;
    }
    this.scene.stroke();
    beep.click();
    this.say(`${petName(p)} ${STROKE_TEXT[p.species] ?? 'genießt das Streicheln'}. ❤`);
    this.refresh();
    save(this.s);
  }

  private light() {
    const p = this.pet;
    if (p?.asleep && !p.lightOn) {
      if (confirm('Wirklich aufwecken? Es wird richtig schlecht gelaunt sein (−2 Laune).')) this.act(wakeUp(this.s));
      return;
    }
    this.act(lightButton(this.s));
  }

  private feedMenu() {
    const body = h('div', { class: 'choice-grid' });
    const meal = h('button', { class: 'choice' }, h('span', { class: 'ico' }, '🍖'), h('b', {}, 'Mahlzeit'), h('small', {}, '+1 Sättigung'));
    const snack = h('button', { class: 'choice' }, h('span', { class: 'ico' }, '🍬'), h('b', {}, 'Snack'), h('small', {}, '+1 Laune, macht dick'));
    meal.onclick = () => (this.closeSheet(), this.act(feedMeal(this.s), 'food'));
    snack.onclick = () => (this.closeSheet(), this.act(feedSnack(this.s), 'candy'));
    body.append(meal, snack);
    this.openSheet('Füttern', body);
  }

  private playMenu() {
    const check = canPlay(this.s);
    if (!check.ok) return this.act(check);
    const sp = species(this.pet!.species);
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
    const p = this.pet!;
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
    if (this.s.pets.length === 0) return this.chooseSheet();
    const p = this.pet;
    if (p && p.stage !== 'egg' && p.name === null) this.askName();
  }

  /** Namensvergabe nach dem Schlüpfen (oder Umbenennen aus dem Status) */
  private askName(rename = false) {
    const p = this.pet;
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
    const pic = hiResCanvas(20, 20, 'species-pic');
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
      const c = hiResCanvas(20, 20, 'species-pic');
      const img = petSprite(sp, { stage: 'child', variant: 'good' });
      drawMap(c.getContext('2d')!, img.map, img.colors, (20 - img.w) / 2, (20 - img.h) / 2);
      const b = h(
        'button',
        { class: 'choice' },
        c,
        h('b', {}, sp.name),
        sp.breeds ? h('small', {}, 'Rasse & Fell: Überraschung!') : sp.coats ? h('small', {}, 'Fell & Muster: Überraschung!') : null,
      );
      b.onclick = () => {
        if (!startEgg(this.s, sp.id, randomLook(sp))) return this.act({ ok: false, msg: `Mehr als ${MAX_PETS} Tiere gehen nicht.` });
        this.scene.reset();
        save(this.s);
        this.closeSheet(true);
        this.say(`Ein ${sp.name}-Ei! Es schlüpft in einer Minute.`);
        this.refresh();
      };
      body.append(b);
    }
    const first = this.s.pets.length === 0;
    this.openSheet(
      first ? 'Welches Tier möchtest du?' : 'Noch ein Tier?',
      h('div', {}, h('p', {}, first ? 'Wähle ein Ei:' : `Wähle ein Ei (${this.s.pets.length}/${MAX_PETS} Tiere):`), body),
      first,
    );
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
      this.s.pets.length
        ? btn(`Weiter zu ${this.pet ? petName(this.pet) : 'deinen Tieren'}`, () => {
            this.s.ending = null;
            save(this.s);
            this.closeSheet(true);
            this.scene.reset();
            this.refresh();
            this.checkScreens();
          })
        : null,
      this.s.pets.length < MAX_PETS
        ? btn('Neues Ei', () => {
            this.s.ending = null;
            save(this.s);
            this.closeSheet(true);
            this.chooseSheet();
          })
        : null,
    );
    this.openSheet('Abschied', body, true);
  }

  private statusSheet() {
    const p = this.pet;
    if (!p) return;
    const sp = species(p.species);
    const rows: [string, string][] = [
      ['Name', p.name ?? '–'],
      ['Tier', `${stageName(p)} (${sp.name})`],
      ...(lookName(sp, p.look) ? [[sp.breeds ? 'Rasse & Fell' : 'Fell', lookName(sp, p.look)!] as [string, string]] : []),
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
        ['Sättigung', meter(p.hunger / 4)],
        ['Laune', meter(p.happy / 4)],
        ['Müdigkeit', `${Math.round(p.tiredness)} %`],
        ['Schlaf (24 h)', duration(sleptLast24h(p, this.s.clock) * MIN)],
        ['Schlaf bis ausgeschlafen', duration((RULES.sleepNeedMin - p.sleptInCycleMin) * MIN)],
        ['Gewicht', `${weightLabel(sp, p)}${isOverweight(p) ? ' (zu dick!)' : ''}`],
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

function meter(frac: number) {
  const f = Math.max(0, Math.min(1, frac));
  const n = Math.round(f * 10);
  return '▰'.repeat(n) + '▱'.repeat(10 - n) + ` ${Math.round(f * 100)} %`;
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
