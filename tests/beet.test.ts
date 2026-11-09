import { describe, expect, it } from 'vitest';
import * as A from '../src/game/actions';
import {
  BASE_YIELD, bedState, dailyBed, feedVegetables, fertilize, GROW_DAYS, harvest, SEED_COST, sellVegetables, sow, VEG_PRICE,
} from '../src/game/beet';
import { ITEM } from '../src/game/data';
import { advanceHour } from '../src/game/sim';
import { createAnimal, importSave, newGame } from '../src/game/state';
import type { GameState } from '../src/game/types';

/** Hof mit Beet im Frühling (Tag 10) */
function hof(): GameState {
  const s = newGame({ farmName: 'Test', difficulty: 'mittel', plot: 'obst', seed: 5 });
  s.money = 500;
  expect(A.buyItem(s, 'beet').ok).toBe(true);
  s.day = 10;
  s.temperature = 12;
  return s;
}

describe('Beet kaufen', () => {
  it('ist eine Erweiterung für 40 €', () => {
    expect(ITEM.beet).toMatchObject({ cat: 'ausbau', price: 40 });
    const s = newGame({ farmName: 'Test', difficulty: 'mittel', plot: 'obst', seed: 5 });
    expect(sow(s)).toEqual({ ok: false, msg: 'Du hast noch kein Gemüsebeet.' });
    const vorher = s.money;
    expect(A.buyItem(s, 'beet').ok).toBe(true);
    expect(s.money).toBe(vorher - 40);
    expect(bedState(s)).toBe('leer');
  });
});

describe('Säen', () => {
  it(`kostet ${SEED_COST} € Saatgut`, () => {
    const s = hof();
    const vorher = s.money;
    expect(sow(s).ok).toBe(true);
    expect(s.money).toBe(vorher - SEED_COST);
    expect(s.bed).toEqual({ sownDay: 10, fertilized: false });
    expect(bedState(s)).toBe('waechst');
    expect(sow(s)).toEqual({ ok: false, msg: 'Im Beet wächst schon etwas.' });
  });

  it.each([[1, true], [60, true], [61, false], [90, false], [91, false], [120, false], [121, true]])('Tag %i (Jahreszeit): säen %s', (day, erlaubt) => {
    const s = hof();
    s.day = day;
    const r = sow(s);
    expect(r.ok).toBe(erlaubt);
    if (!erlaubt) expect(r.msg).toBe('Gesät wird im Frühling und Sommer.');
  });

  it('ohne Geld kein Saatgut', () => {
    const s = hof();
    s.money = SEED_COST - 0.01;
    expect(sow(s)).toEqual({ ok: false, msg: `Saatgut kostet ${SEED_COST} €.` });
  });
});

describe('Düngen mit Mist', () => {
  it('braucht einen Sack Mist und etwas, das wächst', () => {
    const s = hof();
    s.inventory.mist = 2;
    expect(fertilize(s)).toEqual({ ok: false, msg: 'Erst säen, dann düngen.' });
    sow(s);
    s.inventory.mist = 0;
    expect(fertilize(s)).toEqual({ ok: false, msg: 'Kein Mist im Lager. Mist gibt es beim Ausmisten.' });
    s.inventory.mist = 2;
    expect(fertilize(s).ok).toBe(true);
    expect(s.inventory.mist).toBe(1);
    expect(s.bed?.fertilized).toBe(true);
    expect(fertilize(s)).toEqual({ ok: false, msg: 'Das Beet ist schon gedüngt.' });
    expect(s.inventory.mist).toBe(1);
  });

  it('reifes Gemüse lässt sich nicht mehr düngen', () => {
    const s = hof();
    sow(s);
    s.inventory.mist = 1;
    s.day += GROW_DAYS;
    expect(fertilize(s)).toEqual({ ok: false, msg: 'Das Gemüse ist schon reif. Ernte es!' });
  });
});

describe('Ernten', () => {
  it(`nach ${GROW_DAYS} Tagen reif, nicht früher`, () => {
    const s = hof();
    sow(s);
    s.day += GROW_DAYS - 1;
    expect(bedState(s)).toBe('waechst');
    expect(harvest(s)).toEqual({ ok: false, msg: 'Noch nicht reif: noch 1 Tag.' });
    s.day++;
    expect(bedState(s)).toBe('reif');
    expect(harvest(s)).toEqual({ ok: true, msg: `${BASE_YIELD} kg Gemüse geerntet.` });
    expect(s.inventory.gemuese).toBe(BASE_YIELD);
    expect(s.bed).toBeNull();
    expect(bedState(s)).toBe('leer');
  });

  it('Dünger verdoppelt den Ertrag', () => {
    const s = hof();
    sow(s);
    s.inventory.mist = 1;
    fertilize(s);
    s.day += GROW_DAYS;
    harvest(s);
    expect(s.inventory.gemuese).toBe(BASE_YIELD * 2);
  });

  it('leeres Beet: nichts zu ernten', () => {
    expect(harvest(hof())).toEqual({ ok: false, msg: 'Im Beet wächst nichts.' });
  });

  it('Ernte kommt zum Vorrat dazu', () => {
    const s = hof();
    s.inventory.gemuese = 1.5;
    sow(s);
    s.day += GROW_DAYS;
    harvest(s);
    expect(s.inventory.gemuese).toBe(1.5 + BASE_YIELD);
  });
});

describe('Frost', () => {
  it('zerstört, was im Beet steht', () => {
    const s = hof();
    sow(s);
    s.temperature = 1;
    dailyBed(s);
    expect(s.bed).toBeTruthy();
    s.temperature = 0;
    dailyBed(s);
    expect(s.bed).toBeNull();
    expect(s.toasts.at(-1)).toMatchObject({ kind: 'warn', text: expect.stringMatching(/Frost/) });
  });

  it('ein leeres Beet bleibt still', () => {
    const s = hof();
    s.temperature = -5;
    dailyBed(s);
    expect(s.toasts).toEqual([]);
  });

  it('im Spiel: ein im späten Sommer gesätes Beet erfriert spätestens im Winter, wenn man nicht erntet', () => {
    const s = hof();
    s.day = 60;
    sow(s);
    for (let i = 0; i < 24 * 60 && s.bed; i++) advanceHour(s);
    expect(s.bed).toBeNull();
  });
});

describe('Gemüse verwenden', () => {
  it(`verkaufen: ${VEG_PRICE} € je kg, mit Hofladen das 1,5-Fache`, () => {
    const s = hof();
    expect(sellVegetables(s)).toEqual({ ok: false, msg: 'Kein Gemüse im Lager.' });
    s.inventory.gemuese = 4;
    const vorher = s.money;
    expect(sellVegetables(s)).toEqual({ ok: true, msg: '4 kg Gemüse für 10.00 € verkauft.' });
    expect(s.money).toBe(vorher + 4 * VEG_PRICE);
    expect(s.inventory.gemuese).toBe(0);
    expect(s.finance!.cur.gemuese).toBe(10);
    s.extras.push('hofladen');
    s.inventory.gemuese = 2;
    sellVegetables(s);
    expect(s.finance!.cur.gemuese).toBe(10 + 2 * VEG_PRICE * 1.5);
  });

  it('verfüttern: 1 kg je angefangene 5 Tiere, macht satt und zufrieden', () => {
    const s = hof();
    for (let i = 0; i < 6; i++) s.animals.push(createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 200 }));
    expect(feedVegetables(s)).toEqual({ ok: false, msg: 'Für 6 Tiere brauchst du 2 kg Gemüse.' });
    s.inventory.gemuese = 2.5;
    for (const a of s.animals) { a.food = 50; a.wellbeing = 95; }
    expect(feedVegetables(s).ok).toBe(true);
    expect(s.inventory.gemuese).toBe(0.5);
    for (const a of s.animals) {
      expect(a.food).toBe(75);
      expect(a.wellbeing).toBe(100);
    }
  });

  it('verfüttern ohne Tiere geht nicht; Küken zählen nicht', () => {
    const s = hof();
    s.inventory.gemuese = 3;
    expect(feedVegetables(s)).toEqual({ ok: false, msg: 'Keine Hühner zum Füttern.' });
    s.animals.push(createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 2 }));
    expect(feedVegetables(s).ok).toBe(false);
  });

  it('Mist lässt sich weiter verkaufen', () => {
    const s = hof();
    s.inventory.mist = 3;
    expect(A.sellManure(s).ok).toBe(true);
  });
});

describe('Spielstand', () => {
  it('Beet und Gemüse überstehen Export und Import', () => {
    const s = hof();
    sow(s);
    s.inventory.mist = 1;
    fertilize(s);
    s.inventory.gemuese = 2;
    const t = importSave(JSON.stringify(s));
    expect(t?.bed).toEqual({ sownDay: 10, fertilized: true });
    expect(t?.inventory.gemuese).toBe(2);
  });

  it.each([
    ['Beet als Text', 'voll'], ['Saattag fehlt', { fertilized: true }], ['gedüngt als Zahl', { sownDay: 3, fertilized: 1 }],
  ])('lehnt ab: %s', (_, bed) => {
    const o = JSON.parse(JSON.stringify(hof()));
    o.bed = bed;
    expect(importSave(JSON.stringify(o))).toBeNull();
  });
});

describe('Grenzwerte', () => {
  it('mit genau 3 € lässt sich säen', () => {
    const s = hof();
    s.money = SEED_COST;
    expect(sow(s).ok).toBe(true);
    expect(s.money).toBe(0);
  });

  it('„noch 2 Tage“ in der Mehrzahl', () => {
    const s = hof();
    sow(s);
    s.day += GROW_DAYS - 2;
    expect(harvest(s).msg).toBe('Noch nicht reif: noch 2 Tage.');
  });

  it('genau so viel Gemüse wie nötig reicht zum Verfüttern', () => {
    const s = hof();
    for (let i = 0; i < 5; i++) s.animals.push(createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 200 }));
    s.inventory.gemuese = 1;
    expect(feedVegetables(s).ok).toBe(true);
    expect(s.inventory.gemuese).toBe(0);
  });
});
