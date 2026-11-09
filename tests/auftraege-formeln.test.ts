// Auftrags-Formeln mit festgelegtem Zufall und Hof-Ruf: Lohn, Menge, Frist und wann neue Aufträge kommen.
// between() liefert immer die Untergrenze, pick() das erste Element, chance() steuert der Test.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BreedId, GameState, Order, Sex } from '../src/game/types';

const ctl = vi.hoisted(() => ({ chance: true, chances: [] as number[], stars: 3 }));
vi.mock('../src/game/rng', () => ({
  rand: () => 0,
  chance: (_s: unknown, p: number) => { ctl.chances.push(p); return ctl.chance; },
  between: (_s: unknown, a: number) => a,
  intBetween: (_s: unknown, a: number) => a,
  pick: <T>(_s: unknown, arr: readonly T[]) => arr[0],
}));
vi.mock('../src/game/helpers', async orig => ({ ...(await orig<typeof import('../src/game/helpers')>()), stars: () => ctl.stars }));

const { createOrder, dailyOrders, orderWhat, possibleKinds } = await import('../src/game/orders');
const { createAnimal, newGame } = await import('../src/game/state');

const hof = () => {
  const s = newGame({ farmName: 'Test', difficulty: 'mittel', plot: 'obst', seed: 1 });
  s.day = 10;
  s.orders = [];
  return s;
};
const tier = (s: GameState, breed: BreedId, sex: Sex, ageDays = 200) => s.animals.push(createAnimal(s, breed, { sex, ageDays }));
const auftrag = (o: Partial<Order>): Order => ({ id: 1, customer: 'Bäckerei Krause', kind: 'eier', qty: 6, reward: 10, dueDay: 400, ...o });

beforeEach(() => {
  ctl.chance = true;
  ctl.chances = [];
  ctl.stars = 3;
});

describe('Lohn, Menge und Frist je Auftragsart (Ruf 3 Sterne, kleinste Werte)', () => {
  it.each([
    ['eier', { kind: 'eier', qty: 6, reward: 5, dueDay: 13 }, 'Bäckerei Krause'],
    ['braun', { kind: 'eier', qty: 6, reward: 6, dueDay: 13, brown: true }, 'Bio-Laden Grünkern'],
    ['gross', { kind: 'eier', qty: 48, reward: 38, dueDay: 20, big: true, delivered: 0, paid: 0 }, 'Dorfgemeinschaft (Erntedankfest)'],
    ['junghenne', { kind: 'junghenne', qty: 1, reward: 26, dueDay: 16 }, 'Familie Schulz'],
    ['suppenhuhn', { kind: 'suppenhuhn', qty: 1, reward: 13, dueDay: 14 }, 'Gasthaus Zur Linde'],
    ['hahn', { kind: 'hahn', qty: 1, reward: 23, dueDay: 15 }, 'Familie Hofmann'],
    ['bruteier', { kind: 'bruteier', qty: 6, reward: 20, dueDay: 16, breed: 'sussex' }, 'Züchterin Frau Berger'],
  ] as const)('%s', (plan, erwartet, kunde) => {
    const s = hof();
    const id = s.nextId;
    const o = createOrder(s, plan);
    expect(o).toEqual({ id, customer: kunde, ...erwartet });
    expect(s.nextId).toBe(id + 1);
  });

  it('der Hof-Ruf ändert den Lohn um 10 % je Stern', () => {
    ctl.stars = 5;
    expect(createOrder(hof(), 'gross').reward).toBe(46); // 38,4 × 1,2
    ctl.stars = 1;
    expect(createOrder(hof(), 'gross').reward).toBe(31); // 38,4 × 0,8
  });

  it('Stammkunden zahlen 15 % mehr, auch auf Sonderwünsche', () => {
    const s = hof();
    s.customers = { 'Familie Schulz': 3, 'Familie Hofmann': 3 };
    expect(createOrder(s, 'junghenne').reward).toBe(30); // 26 × 1,15
    expect(createOrder(s, 'hahn').reward).toBe(27); // 18 × 1,3 × 1,15
  });

  it('Bruteier werden in der Rasse bestellt, die der Hof liefern kann', () => {
    const s = hof();
    tier(s, 'marans', 'henne');
    tier(s, 'marans', 'hahn');
    expect(createOrder(s, 'bruteier')).toMatchObject({ breed: 'marans', reward: 27 }); // 6 × 3,50 € × 1,3
  });
});

describe('Welche Aufträge möglich sind', () => {
  const zaehle = (k: string[]) => k.reduce<Record<string, number>>((t, x) => ({ ...t, [x]: (t[x] ?? 0) + 1 }), {});

  it('Grundmischung mit einer erwachsenen Hybridhenne', () => {
    const s = hof();
    tier(s, 'hybrid', 'henne');
    expect(zaehle(possibleKinds(s))).toEqual({ eier: 3, junghenne: 1, suppenhuhn: 1 });
  });

  it('Junghühner machen Junghennen-Aufträge, alte Hennen Suppenhuhn-Aufträge wahrscheinlicher', () => {
    const s = hof();
    tier(s, 'hybrid', 'henne', 15);
    expect(zaehle(possibleKinds(s))).toMatchObject({ junghenne: 2, suppenhuhn: 1 });
    tier(s, 'hybrid', 'hahn', 300); // alter Hahn ist kein Suppenhuhn
    expect(zaehle(possibleKinds(s)).suppenhuhn).toBe(1);
    tier(s, 'hybrid', 'henne', 239);
    expect(zaehle(possibleKinds(s)).suppenhuhn).toBe(1);
    tier(s, 'hybrid', 'henne', 240);
    expect(zaehle(possibleKinds(s)).suppenhuhn).toBe(3);
  });

  it('braune Eier nur von erwachsenen Hennen braunlegender Rassen', () => {
    const s = hof();
    tier(s, 'hybrid', 'henne');
    tier(s, 'marans', 'henne', 15);
    tier(s, 'marans', 'hahn');
    expect(possibleKinds(s)).not.toContain('braun');
    tier(s, 'sussex', 'henne');
    expect(possibleKinds(s)).toContain('braun');
  });

  it('Bruteier brauchen erwachsene Henne und erwachsenen Hahn derselben Rasse', () => {
    const s = hof();
    tier(s, 'marans', 'henne');
    tier(s, 'sussex', 'hahn');
    tier(s, 'marans', 'hahn', 15);
    expect(possibleKinds(s)).not.toContain('bruteier');
    tier(s, 'sussex', 'henne', 15);
    expect(possibleKinds(s)).not.toContain('bruteier');
    tier(s, 'marans', 'hahn');
    expect(possibleKinds(s)).toContain('bruteier');
  });

  it('Hahn-Aufträge nur mit Hahn, der kein Küken mehr ist', () => {
    const s = hof();
    tier(s, 'hybrid', 'henne');
    tier(s, 'hybrid', 'hahn', 3);
    expect(possibleKinds(s)).not.toContain('hahn');
    tier(s, 'hybrid', 'hahn', 15);
    expect(possibleKinds(s)).toContain('hahn');
  });
});

describe('Neue Aufträge pro Tag', () => {
  it('erst ab Tag 4', () => {
    const s = hof();
    tier(s, 'hybrid', 'henne');
    s.day = 3;
    dailyOrders(s);
    expect(s.orders).toEqual([]);
    s.day = 4;
    dailyOrders(s);
    expect(s.orders!.length).toBeGreaterThan(0);
  });

  it('Wahrscheinlichkeit steigt mit Ruf und echten Stammkunden (höchstens 3)', () => {
    const s = hof();
    tier(s, 'hybrid', 'henne');
    ctl.stars = 2;
    s.orders = [auftrag({ big: true })]; // kein zweiter Großauftrag
    s.customers = { a: 3, b: 5, c: 2, d: 9, e: 4 };
    ctl.chance = false;
    ctl.chances = []; // createAnimal würfelt selbst
    dailyOrders(s);
    expect(ctl.chances).toEqual([0.15 + 2 * 0.05 + 3 * 0.05]);
    ctl.chances = [];
    s.customers = { a: 3, c: 2 };
    dailyOrders(s);
    expect(ctl.chances[0]).toBeCloseTo(0.15 + 0.1 + 0.05);
  });

  it('höchstens 3 normale Aufträge; ein Großauftrag zählt nicht mit', () => {
    const s = hof();
    tier(s, 'hybrid', 'henne');
    ctl.stars = 2;
    s.orders = [1, 2].map(id => auftrag({ id })).concat(auftrag({ id: 3, big: true }));
    dailyOrders(s);
    expect(s.orders!.filter(o => !o.big)).toHaveLength(3);
    dailyOrders(s);
    expect(s.orders!.filter(o => !o.big)).toHaveLength(3);
  });

  it('Großauftrag ab 3 Sternen mit Hennen, höchstens einer', () => {
    const s = hof();
    tier(s, 'hybrid', 'hahn');
    s.orders = [1, 2, 3].map(id => auftrag({ id }));
    dailyOrders(s);
    expect(s.orders!.some(o => o.big)).toBe(false); // keine Henne
    tier(s, 'hybrid', 'henne');
    ctl.stars = 2;
    dailyOrders(s);
    expect(s.orders!.some(o => o.big)).toBe(false);
    ctl.stars = 3;
    dailyOrders(s);
    expect(s.orders!.filter(o => o.big)).toHaveLength(1);
    expect(ctl.chances).toContain(0.04);
    dailyOrders(s);
    expect(s.orders!.filter(o => o.big)).toHaveLength(1);
  });

  it('neue und verpasste Aufträge erscheinen als Hinweis', () => {
    const s = hof();
    tier(s, 'hybrid', 'henne');
    ctl.stars = 2;
    s.orders = [auftrag({ dueDay: 9 })];
    dailyOrders(s);
    expect(s.toasts.map(t => [t.kind, t.text.slice(0, 22)])).toEqual([['warn', '📋 Auftrag verpasst: B'], ['good', '📋 Neuer Auftrag: Bäck']]);
  });
});

describe('Verpasste Aufträge im Detail', () => {
  it('Kunden ohne bisherige Aufträge bekommen keinen Eintrag', () => {
    const s = hof();
    s.orders = [auftrag({ dueDay: 9, customer: 'Neukunde' })];
    ctl.chance = false;
    dailyOrders(s);
    expect(s.customers).toEqual({});
  });

  it('eine noch am selben Tag laufende Strafe wird aufgestockt', () => {
    const s = hof();
    s.orderEffect = { until: 10, points: -0.3 };
    s.orders = [auftrag({ dueDay: 9 })];
    ctl.chance = false;
    dailyOrders(s);
    expect(s.orderEffect).toEqual({ until: 24, points: -0.6 });
  });

  it('die Strafe läuft am Tag nach ihrem Ende aus, nicht früher', () => {
    const s = hof();
    ctl.chance = false;
    s.orderEffect = { until: 10, points: -0.3 };
    dailyOrders(s);
    expect(s.orderEffect).toEqual({ until: 10, points: -0.3 });
    s.day = 11;
    dailyOrders(s);
    expect(s.orderEffect).toBeNull();
  });
});

describe('Beschreibung', () => {
  it.each([
    [{ kind: 'eier', qty: 6 }, '6 Eier'], [{ kind: 'eier', qty: 12, brown: true }, '12 braune Eier'],
    [{ kind: 'junghenne', qty: 1 }, '1 Junghenne'], [{ kind: 'junghenne', qty: 2 }, '2 Junghennen'],
    [{ kind: 'suppenhuhn', qty: 1 }, '1 Suppenhuhn'], [{ kind: 'suppenhuhn', qty: 2 }, '2 Suppenhühner'],
    [{ kind: 'hahn', qty: 1 }, '1 Hahn'], [{ kind: 'hahn', qty: 2 }, '2 Hähne'],
    [{ kind: 'bruteier', qty: 6, breed: 'marans' }, '6 Bruteier Marans'], [{ kind: 'bruteier', qty: 6 }, '6 Bruteier'],
  ] as const)('%o → %s', (o, text) => {
    expect(orderWhat(auftrag(o as Partial<Order>))).toBe(text);
  });
});
