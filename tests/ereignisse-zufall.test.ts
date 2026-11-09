// Wann Ereignisse starten, mit festgelegtem Zufall: chance() steuert der Test und merkt sich die Wahrscheinlichkeiten.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState, Sex } from '../src/game/types';

const ctl = vi.hoisted(() => ({ chance: true, chances: [] as number[] }));
vi.mock('../src/game/rng', async orig => ({
  ...(await orig<typeof import('../src/game/rng')>()),
  chance: (_s: unknown, p: number) => { ctl.chances.push(p); return ctl.chance; },
}));

const { dailyEvents, hourlyEscape } = await import('../src/game/ereignisse');
const { createAnimal, newGame } = await import('../src/game/state');

function hof(day: number) {
  const s = newGame({ farmName: 'Test', difficulty: 'mittel', plot: 'obst', seed: 2 });
  s.equip.fence = 'knoten';
  s.equip.coop = 'kiste';
  s.day = day;
  s.hour = 11;
  return s;
}
const tier = (s: GameState, sex: Sex) => {
  const a = createAnimal(s, 'hybrid', { sex, ageDays: 200 });
  a.outside = true;
  s.animals.push(a);
  return a;
};

beforeEach(() => {
  ctl.chance = true;
  ctl.chances = [];
});

describe('Tägliche Ereignisse', () => {
  it('erst ab Tag 6', () => {
    const s = hof(5);
    tier(s, 'henne');
    tier(s, 'hahn');
    dailyEvents(s);
    expect(s.hiddenNest ?? null).toBeNull();
    expect(s.neighbor?.pending ?? false).toBe(false);
    s.day = 6;
    dailyEvents(s);
    expect(s.hiddenNest).toBeTruthy();
    expect(s.neighbor?.pending).toBe(true);
  });

  it('Wahrscheinlichkeiten: Versteck 3 %, Nachbar 2,5 %, verdunkelt 0,8 %', () => {
    const s = hof(10);
    ctl.chance = false;
    dailyEvents(s);
    expect(ctl.chances).toEqual([0.03, 0.025]);
    ctl.chances = [];
    s.neighbor = { pending: false, warned: false, quietUntil: 0, darkened: true };
    dailyEvents(s);
    expect(ctl.chances).toEqual([0.03, 0.008]);
  });
});

describe('Ausbüxen je Zaun', () => {
  it.each([['knoten', 0.04], ['maschen', 0.015], ['enetz', 0.025]])('%s: %f pro Tag', (fence, p) => {
    const s = hof(10);
    s.equip.fence = fence;
    tier(s, 'henne');
    ctl.chance = false;
    ctl.chances = []; // createAnimal würfelt selbst
    hourlyEscape(s);
    expect(ctl.chances).toEqual([p]);
  });

  it('Volierennetz senkt das Risiko auf 30 %', () => {
    const s = hof(10);
    s.extras.push('netz');
    tier(s, 'henne');
    ctl.chance = false;
    ctl.chances = []; // createAnimal würfelt selbst
    hourlyEscape(s);
    expect(ctl.chances[0]).toBeCloseTo(0.012);
  });

  it('nur um 11 Uhr, ab Tag 6, mit Zaun', () => {
    const s = hof(5);
    tier(s, 'henne');
    hourlyEscape(s);
    expect(s.escapee ?? null).toBeNull();
    s.day = 6;
    s.hour = 12;
    hourlyEscape(s);
    expect(s.escapee ?? null).toBeNull();
    s.hour = 11;
    s.equip.fence = null;
    hourlyEscape(s);
    expect(s.escapee ?? null).toBeNull();
    s.equip.fence = 'knoten';
    hourlyEscape(s);
    expect(s.escapee).toBeTruthy();
  });
});
