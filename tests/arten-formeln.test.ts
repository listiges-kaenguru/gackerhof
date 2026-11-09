// Regeln der weiteren Geflügelarten mit festgelegtem Zufall: Legewahrscheinlichkeit, Wohlbefinden, Marktangebote.
// chance() steuert der Test und merkt sich die Wahrscheinlichkeiten, between()/intBetween() liefern die Untergrenze.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BreedId, GameState, Sex } from '../src/game/types';

const ctl = vi.hoisted(() => ({ chance: true, chances: [] as number[] }));
vi.mock('../src/game/rng', async orig => ({
  ...(await orig<typeof import('../src/game/rng')>()),
  chance: (_s: unknown, p: number) => { ctl.chances.push(p); return ctl.chance; },
  between: (_s: unknown, a: number) => a,
  intBetween: (_s: unknown, a: number) => a,
  pick: <T>(_s: unknown, arr: readonly T[]) => arr[0],
}));

const { buyProblem, cleanPond, dailyOthers, layOthers, otherDrinks, otherGrazes, otherWellbeingTarget, othersOffers } = await import('../src/game/arten');
const { createAnimal, newGame } = await import('../src/game/state');

function hof(day = 10): GameState {
  const s = newGame({ farmName: 'Test', difficulty: 'mittel', plot: 'obst', seed: 1 });
  s.day = day;
  return s;
}
const mit = (s: GameState, ...ids: string[]) => { s.extras.push(...ids); return s; };
const tier = (s: GameState, breed: BreedId, sex: Sex = 'henne', ageDays = 200) => {
  const a = createAnimal(s, breed, { sex, ageDays, variant: undefined });
  s.animals.push(a);
  return a;
};
/** Wahrscheinlichkeiten eines Legedurchgangs (ohne die Würfe beim Anlegen der Tiere) */
const lege = (s: GameState) => { ctl.chances = []; layOthers(s); return ctl.chances; };

beforeEach(() => {
  ctl.chance = true;
  ctl.chances = [];
});

describe('Legen', () => {
  it('Ente im Frühling bei sauberem Becken: Legerate × 1,1', () => {
    const s = mit(hof(), 'entenhaus', 'becken');
    s.pond = 30;
    tier(s, 'laufente');
    expect(lege(s)[0]).toBeCloseTo(0.7 * 1.1);
  });

  it('schmutziges Becken (unter 30) halbiert, Gänse außerhalb des Frühlings fast nichts', () => {
    const s = mit(hof(), 'entenhaus', 'becken');
    s.pond = 29;
    tier(s, 'laufente');
    expect(lege(s)[0]).toBeCloseTo(0.7 * 1.1 * 0.5);
    const g = hof(70);
    tier(g, 'gans');
    expect(lege(g)[0]).toBeCloseTo(0.35 * 0.6 * 0.08);
    const w = hof(70);
    tier(w, 'wachtel');
    expect(lege(w)[0]).toBeCloseTo(0.85 * 0.6);
  });

  it.each([
    ['food', 49, 0.3], ['food', 50, 1], ['water', 49, 0.3], ['water', 50, 1], ['health', 59, 0.5], ['health', 60, 1],
  ] as const)('%s %i → Faktor %f', (feld, wert, faktor) => {
    const s = hof(70);
    const w = tier(s, 'wachtel');
    w[feld] = wert;
    expect(lege(s)[0]).toBeCloseTo(0.85 * 0.6 * faktor);
  });

  it('Männchen, Jungtiere und Hühner würfeln hier nicht', () => {
    const s = hof();
    tier(s, 'laufente', 'hahn');
    tier(s, 'laufente', 'henne', 15);
    tier(s, 'hybrid');
    expect(lege(s)).toEqual([]);
  });

  it('zählt gelegte Eier; Wartezeit sperrt sie', () => {
    const s = hof();
    const w = tier(s, 'wachtel');
    lege(s);
    expect([w.eggsLaid, s.stats.eggsTotal, s.nestEggs.wachtel]).toEqual([1, 1, 1]);
    w.withdrawalUntil = s.day;
    lege(s);
    expect([s.blockedEggs, s.nestEggs.wachtel]).toEqual([1, 1]);
  });

  it('Bruteier nur mit erwachsenem Männchen derselben Rasse; befruchtet zu 85 %', () => {
    const s = hof();
    tier(s, 'wachtel');
    tier(s, 'laufente', 'hahn');
    tier(s, 'wachtel', 'hahn', 15);
    lege(s);
    expect(s.nestHatchEggs).toEqual([]);
    tier(s, 'wachtel', 'hahn');
    expect(lege(s)).toEqual([expect.any(Number), 0.85]);
    expect(s.nestHatchEggs).toHaveLength(1);
  });
});

describe('Wohlbefinden', () => {
  it('Grundwert 80 mit Unterkunft; ohne Unterkunft 55', () => {
    const s = mit(hof(), 'voliere');
    const w = tier(s, 'wachtel');
    expect(otherWellbeingTarget(s, w)).toBe(80);
    const t = hof();
    expect(otherWellbeingTarget(t, tier(t, 'wachtel'))).toBe(55);
  });

  it('volle Unterkunft ist in Ordnung, Überbelegung kostet 25; Hühner zählen nicht mit', () => {
    const s = mit(hof(), 'gaensestall', 'grasweide');
    for (let i = 0; i < 6; i++) tier(s, 'hybrid');
    const g = tier(s, 'gans');
    for (let i = 0; i < 3; i++) tier(s, 'gans');
    expect(otherWellbeingTarget(s, g)).toBe(80);
    tier(s, 'gans');
    expect(otherWellbeingTarget(s, g)).toBe(55);
  });

  it('Entenbecken unter 30 kostet Enten 25, Gänse nicht', () => {
    const s = mit(hof(), 'entenhaus', 'becken', 'gaensestall', 'grasweide');
    const e = tier(s, 'laufente');
    const g = tier(s, 'gans');
    s.pond = 30;
    expect(otherWellbeingTarget(s, e)).toBe(80);
    s.pond = 29;
    expect(otherWellbeingTarget(s, e)).toBe(55);
    expect(otherWellbeingTarget(s, g)).toBe(80);
  });

  it.each([['food', 39, 60], ['food', 40, 80], ['water', 39, 60], ['water', 40, 80]] as const)('%s %i → %i', (feld, wert, ziel) => {
    const s = mit(hof(), 'voliere');
    const w = tier(s, 'wachtel');
    w[feld] = wert;
    expect(otherWellbeingTarget(s, w)).toBe(ziel);
  });
});

describe('Trinken und Grasen', () => {
  it('trinkt in der eigenen Unterkunft; Küken und Hühner nicht', () => {
    const s = mit(hof(), 'entenhaus');
    expect(otherDrinks(s, tier(s, 'laufente'))).toBe(true);
    expect(otherDrinks(s, tier(s, 'laufente', 'henne', 2))).toBe(false);
    expect(otherDrinks(s, tier(s, 'hybrid'))).toBe(false);
    expect(otherDrinks(s, tier(s, 'gans'))).toBe(false); // kein Gänsestall
  });

  it('nur erwachsene Gänse mit Grasweide grasen', () => {
    const s = mit(hof(), 'gaensestall');
    const g = tier(s, 'gans');
    expect(otherGrazes(s, g)).toBe(false);
    s.extras.push('grasweide');
    expect(otherGrazes(s, g)).toBe(true);
    expect(otherGrazes(s, tier(s, 'gans', 'henne', 2))).toBe(false);
    expect(otherGrazes(s, tier(s, 'laufente'))).toBe(false);
  });
});

describe('Becken', () => {
  it('ohne Becken verschmutzt nichts', () => {
    const s = hof();
    tier(s, 'laufente');
    dailyOthers(s);
    expect(s.pond).toBeUndefined();
  });

  it('ab 95 % gilt es als sauber', () => {
    const s = mit(hof(), 'entenhaus', 'becken');
    expect(cleanPond(s).ok).toBe(false); // noch nie benutzt = sauber
    s.pond = 95;
    expect(cleanPond(s).ok).toBe(false);
    s.pond = 94.9;
    expect(cleanPond(s).ok).toBe(true);
  });
});

describe('Marktangebote', () => {
  it('je Art mit Unterkunft: Weibchen, Männchen, Bruteier mit festen Mengen', () => {
    const s = mit(hof(), 'voliere', 'entenhaus', 'becken');
    const id = s.nextId;
    const o = othersOffers(s);
    expect(o.map(x => [x.breed, x.kind, x.qty, x.price])).toEqual([
      ['laufente', 'legehenne', 2, 15.5], ['laufente', 'hahn', 1, 13], ['laufente', 'brutei', 6, 1.5],
      ['wachtel', 'legehenne', 2, 5], ['wachtel', 'hahn', 1, 4.5], ['wachtel', 'brutei', 6, 0.5],
    ]);
    expect(o.map(x => x.id)).toEqual([0, 1, 2, 3, 4, 5].map(i => id + i));
    expect(o.filter(x => x.kind === 'legehenne').every(x => x.hiddenAge === 60 && x.hiddenMites === false)).toBe(true);
    expect(o.filter(x => x.kind !== 'legehenne').every(x => x.hiddenAge === undefined)).toBe(true);
  });

  it('Kaufgrenze zählt nur die eigene Art, Küken eingeschlossen', () => {
    const s = mit(hof(), 'voliere');
    for (let i = 0; i < 8; i++) tier(s, 'hybrid');
    for (let i = 0; i < 10; i++) tier(s, 'wachtel');
    tier(s, 'wachtel', 'henne', 2);
    expect(buyProblem(s, 'wachtel', 1)).toBeNull();
    expect(buyProblem(s, 'wachtel', 2)).toBe('In der Wachtelvoliere ist kein Platz mehr (12 Plätze).');
    expect(buyProblem(s, 'hybrid', 50)).toBeNull();
  });
});
