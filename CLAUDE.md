# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Waldling": a 90s-handheld-style virtual pet as an installable PWA (vanilla TypeScript + Vite, no framework, Canvas pixel rendering). Deployed to GitHub Pages (https://spikepy.github.io/tamagotchi/) by `.github/workflows/pages.yml` on every push to `main` (runs `npm test` then `npm run build`).

**Language:** everything user-facing, the code comments, SPEC.md, README and commit messages is in **German**. Keep it that way. Use the pet's name (`{n}` placeholder) rather than "Es", and "Häufchen" rather than cruder words.

**SPEC.md is the source of truth for game rules.** When changing behaviour, update SPEC.md (and README features if relevant) together with the code.

## Commands

```bash
npm run dev            # Vite dev server, --host (reachable from a phone on the LAN)
npm test               # vitest run (engine, species, weather tests)
npx vitest run src/engine/sim.test.ts         # single file
npx vitest run -t 'schlüpft nach 1 Minute'    # single test by name
npm run build          # tsc --noEmit (strict, noUnusedLocals/Parameters) + vite build -> dist/
npm run preview        # serve dist/ on :4173
npm run icons          # regenerate public/icons from the fox sprite
npm run screenshots    # README screenshots via puppeteer-core; needs `npm run preview` running and Chromium (CHROME env, default /usr/bin/chromium)
npx vite-node scripts/preview.ts out.png      # render all species/stages/coats into a PNG to eyeball sprites
```

There is no linter; `npm run build` (type check) is the correctness gate besides tests.

## Architecture

Layers, strictly one-directional: `engine` (pure logic) ← `species` (data) ← `render` (canvas) ← `ui` (DOM). `main.ts` wires them up.

- **`src/engine/`** — UI-free, deterministic game logic.
  - `state.ts`: `GameState` (up to `MAX_PETS` pets, `activeId`, memorials, settings) and `Pet`. Hunger/happy are float hearts 0..4 (display rounded via `hearts()`).
  - `sim.ts`: `advance(state, realNow, rng)` replays game time **minute by minute** from `state.lastReal` to now (capped at 60 days of catch-up), so the pet keeps living while the app is closed. Returns `SimEvent[]` that the UI turns into sounds/notifications/messages. All randomness goes through an injectable `rng` — tests pass fixed rngs (`() => 0.5`, `() => 0.999` for "no random events").
  - `actions.ts`: player actions (`feedMeal`, `clean`, `scold`, `finishGame`, …) mutate state and return `ActionResult { ok, msg, events }`.
  - `config.ts`: **all balancing values** (`RULES`), times in game minutes.
  - `texts.ts`: randomized message pools (`T`, `pick`, `pickFor` per species; never repeats the same line twice in a row).
  - `debug.ts`: URL cheat codes (`?pet=…&max=1&stage=erwachsen…`, documented in SPEC.md §7a). Applied once in `main.ts`, then stripped from the URL.
- **`src/species/`** — each animal is a pure-data `SpeciesDef` (`types.ts`): palettes, sprites or a `rig`, coats/patterns, optional `breeds` (dog, chicken) and `sexes` (chicken), stage/variant names, room scene, minigame themes. Register new species in `species/index.ts` `SPECIES`; no engine changes needed. `randomLook()` picks a per-pet `Look` (breed/coat/pattern/seed/sex) that stays fixed for life. Internal weight is abstract units; `weightGrams()` converts for display.
- **`src/render/`** — Canvas pixel renderer on a 64×48 logical screen (`scene.ts`, `Scene` class). Pets come from `pixels.ts` `petSprite()`: if the species/breed has a `rig` (`rig.ts`), the creature is built procedurally from shapes at full raster density; otherwise from character-grid `Sprite`s whose letters are palette keys (see the legend in `species/types.ts`). Scene backgrounds per `room.scene` (room/forest/garden/farm) in `outdoor.ts`/`roomart.ts`/`decor.ts`/`props.ts`; weather and seasons follow the **real date** (`weather.ts`, `season.ts`); `ambient.ts` handles day/night light.
- **`src/ui/`** — `app.ts` (`App`): owns the state, runs `tick()` every second (`advance` → handle events → `save`), the rAF render loop, menus/dialogs, built with the tiny `h()` helper from `dom.ts`. `games.ts` contains the minigames (themes come from `SpeciesDef.games`), `gamesprites.ts` their pixel art.
- **Persistence** (`storage.ts`): single localStorage key `tamagotchi.v1`, state `version: 2`. Changing the saved shape (e.g. reindexing breeds) requires a step in `migrate()` so existing saves keep working. `wipe()` blocks further saves until reload.
- **PWA**: `public/sw.js` (cache name `waldling-v1`, precaches assets parsed from `index.html`) is registered only in production builds; `public/manifest.webmanifest`. Vite `base: './'` so it works under the Pages subpath.
