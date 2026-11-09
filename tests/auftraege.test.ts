import { describe, expect, it } from 'vitest';
import * as A from '../src/game/actions';
import { starFactors } from '../src/game/helpers';
import {
  BIG_FIRST, createOrder, dailyOrders, dueText, isRegular, possibleKinds, REGULAR_AFTER, REGULAR_BONUS, SPECIAL_BONUS, weekday,
} from '../src/game/orders';
import { createAnimal, importSave, newGame } from '../src/game/state';
import type { BreedId, GameState, Order, Sex } from '../src/game/types';

const hof = (seed = 3) => newGame({ farmName: 'Test', difficulty: 'mittel', plot: 'obst', seed });
const tier = (s: GameState, breed: BreedId, sex: Sex, ageDays = 200) => {
  const a = createAnimal(s, breed, { sex, ageDays });
  s.animals.push(a);
  return a;
};
const auftrag = (o: Partial<Order>): Order => ({ id: 1, customer: 'Bäckerei Krause', kind: 'eier', qty: 6, reward: 10, dueDay: 400, ...o });

describe('Wochentage', () => {
  it('Tag 1 ist ein Montag, die Woche wiederholt sich', () => {
    expect([1, 5, 7, 8, 14, 15].map(weekday)).toEqual(['Montag', 'Freitag', 'Sonntag', 'Montag', 'Sonntag', 'Montag']);
  });

  it('Fristen: heute, morgen, Wochentag, nächste Woche', () => {
    const s = hof();
    s.day = 3; // Mittwoch
    expect(dueText(s, 3)).toBe('heute');
    expect(dueText(s, 4)).toBe('morgen');
    expect(dueText(s, 5)).toBe('bis Freitag');
    expect(dueText(s, 9)).toBe('bis Dienstag'); // 6 Tage: der kommende Dienstag
    expect(dueText(s, 10)).toBe('bis Mittwoch nächster Woche');
    expect(dueText(s, 16)).toBe('bis Dienstag nächster Woche');
    expect(dueText(s, 17)).toBe('bis Mittwoch in 2 Wochen');
  });
});

describe('Sonderwünsche nur, wenn der Hof sie liefern kann', () => {
  it('ohne Tiere gibt es nur die normalen Eier', () => {
    expect(possibleKinds(hof())).toEqual([]);
  });

  it('weiße Legehybriden: keine braunen Eier, keine Bruteier, kein Hahn', () => {
    const s = hof();
    tier(s, 'hybrid', 'henne');
    const k = possibleKinds(s);
    expect(k).toContain('eier');
    expect(k).not.toContain('braun');
    expect(k).not.toContain('bruteier');
    expect(k).not.toContain('hahn');
  });

  it('Marans-Henne bringt braune Eier, mit Marans-Hahn auch Bruteier und Hahn', () => {
    const s = hof();
    tier(s, 'marans', 'henne');
    expect(possibleKinds(s)).toContain('braun');
    expect(possibleKinds(s)).not.toContain('bruteier');
    tier(s, 'marans', 'hahn');
    expect(possibleKinds(s)).toEqual(expect.arrayContaining(['braun', 'bruteier', 'hahn']));
  });

  it('Bruteier gibt es nicht von Hybriden (keine Rassetiere)', () => {
    const s = hof();
    tier(s, 'hybrid', 'henne');
    tier(s, 'hybrid', 'hahn');
    expect(possibleKinds(s)).not.toContain('bruteier');
  });

  it('Sonderwünsche zahlen 30 % mehr als ein gleich großer normaler Auftrag', () => {
    expect(SPECIAL_BONUS).toBe(1.3);
    const s = hof();
    tier(s, 'marans', 'henne');
    tier(s, 'marans', 'hahn');
    const b = createOrder(s, 'bruteier');
    expect(b.kind).toBe('bruteier');
    expect(b.breed).toBe('marans');
    expect(b.qty % 6).toBe(0);
    const br = createOrder(s, 'braun');
    expect(br).toMatchObject({ kind: 'eier', brown: true });
    expect(br.customer).toMatch(/Bio|Feinkost|Hofcafé/);
  });
});

describe('Liefern von Sonderwünschen', () => {
  it('braune Eier: weiße zählen nicht, braune werden genommen', () => {
    const s = hof();
    s.eggs = { hybrid: 20, marans: 3, sussex: 2 };
    s.orders = [auftrag({ brown: true, qty: 6, reward: 12 })];
    expect(A.fulfillOrder(s, 1)).toEqual({ ok: false, msg: 'Dafür brauchst du 6 braune Eier (Marans, Sussex, Brahma), du hast 5.' });
    s.eggs.brahma = 1;
    const vorher = s.money;
    expect(A.fulfillOrder(s, 1).ok).toBe(true);
    expect(s.eggs).toEqual({ hybrid: 20, marans: 0, sussex: 0, brahma: 0 });
    expect(s.money).toBe(vorher + 12);
  });

  it('Bruteier einer Rasse: nur diese Rasse aus dem Bruteier-Lager', () => {
    const s = hof();
    s.hatchEggs = [
      { breed: 'marans', fertile: true }, { breed: 'sussex', fertile: true }, { breed: 'marans', fertile: false },
    ];
    s.orders = [auftrag({ kind: 'bruteier', breed: 'marans', qty: 3, reward: 15 })];
    expect(A.fulfillOrder(s, 1)).toEqual({ ok: false, msg: 'Dafür brauchst du 3 Bruteier Marans, du hast 2.' });
    s.orders[0].qty = 2;
    expect(A.fulfillOrder(s, 1).ok).toBe(true);
    expect(s.hatchEggs).toEqual([{ breed: 'sussex', fertile: true }]);
  });

  it('Hahn: Küken und kranke Hähne zählen nicht, abgegeben wird der jüngste', () => {
    const s = hof();
    tier(s, 'sussex', 'hahn', 3); // Küken
    const krank = tier(s, 'sussex', 'hahn', 100);
    krank.conditions.push({ id: 'schnupfen', severity: 60 });
    s.orders = [auftrag({ kind: 'hahn', qty: 1, reward: 30 })];
    expect(A.fulfillOrder(s, 1)).toEqual({ ok: false, msg: 'Dafür brauchst du 1 gesunden Hahn (kein Küken), du hast 0.' });
    const alt = tier(s, 'sussex', 'hahn', 300);
    const jung = tier(s, 'sussex', 'hahn', 40);
    expect(A.fulfillOrder(s, 1).ok).toBe(true);
    expect(s.animals.map(a => a.id)).toContain(alt.id);
    expect(s.animals.map(a => a.id)).not.toContain(jung.id);
  });
});

describe('Stammkunden', () => {
  it(`nach ${REGULAR_AFTER} erfüllten Aufträgen ist ein Kunde Stammkunde`, () => {
    const s = hof();
    for (let i = 1; i <= REGULAR_AFTER; i++) {
      expect(isRegular(s, 'Bäckerei Krause')).toBe(false);
      s.eggs = { hybrid: 6 };
      s.orders = [auftrag({ id: i })];
      expect(A.fulfillOrder(s, i).ok).toBe(true);
    }
    expect(isRegular(s, 'Bäckerei Krause')).toBe(true);
    expect(isRegular(s, 'Café Sonnenschein')).toBe(false);
    expect(s.stats.ordersDone).toBe(REGULAR_AFTER);
  });

  it('Stammkunden zahlen 15 % mehr', () => {
    expect(REGULAR_BONUS).toBe(1.15);
    const ohne = hof(9), mit = hof(9);
    for (const s of [ohne, mit]) tier(s, 'hybrid', 'henne');
    mit.customers = Object.fromEntries(['Bäckerei Krause', 'Café Sonnenschein', 'Kita Pusteblume', 'Hotel Seeblick', 'Frau Meier von nebenan'].map(c => [c, REGULAR_AFTER]));
    const a = createOrder(ohne, 'eier'), b = createOrder(mit, 'eier');
    expect(b.qty).toBe(a.qty);
    expect(b.reward).toBe(Math.round(a.reward * REGULAR_BONUS));
  });

  it('Stammkunden melden sich öfter', () => {
    const zaehle = (stamm: boolean) => {
      let n = 0;
      for (let seed = 1; seed <= 300; seed++) {
        const s = hof(seed);
        tier(s, 'hybrid', 'henne');
        s.day = 10;
        if (stamm) s.customers = { 'Bäckerei Krause': 5, 'Hotel Seeblick': 4, 'Oma Gerda': 3 };
        dailyOrders(s);
        n += s.orders!.length;
      }
      return n;
    };
    expect(zaehle(true)).toBeGreaterThan(zaehle(false) * 1.2);
  });
});

describe('Verpasste und abgelehnte Aufträge', () => {
  it('ein verpasster Auftrag kostet 14 Tage Hof-Ruf und Stammkunden-Punkte', () => {
    const s = hof();
    tier(s, 'hybrid', 'henne'); // ohne Tiere gibt es keinen Hof-Ruf
    s.day = 20;
    s.customers = { 'Bäckerei Krause': 4 };
    s.orders = [auftrag({ dueDay: 19 })];
    dailyOrders(s);
    expect(s.orders.filter(o => o.id === 1)).toEqual([]);
    expect(s.orderEffect).toEqual({ until: 34, points: -0.3 });
    expect(s.customers['Bäckerei Krause']).toBe(2);
    expect(starFactors(s).some(f => f.label === 'Verpasste Aufträge' && f.points === -0.3)).toBe(true);
  });

  it('am Fälligkeitstag ist der Auftrag noch nicht verpasst', () => {
    const s = hof();
    s.day = 20;
    s.orders = [auftrag({ dueDay: 20 })];
    dailyOrders(s);
    expect(s.orders.some(o => o.id === 1)).toBe(true);
    expect(s.orderEffect ?? null).toBeNull();
  });

  it('mehrere verpasste Aufträge summieren sich, höchstens −1 Stern', () => {
    const s = hof();
    s.day = 20;
    s.orders = [1, 2, 3, 4, 5].map(id => auftrag({ id, dueDay: 10 }));
    dailyOrders(s);
    expect(s.orderEffect).toEqual({ until: 34, points: -1 });
  });

  it('nach Ablauf zählt die Strafe nicht mehr', () => {
    const s = hof();
    tier(s, 'hybrid', 'henne');
    s.orderEffect = { until: 10, points: -0.3 };
    s.day = 11;
    expect(starFactors(s).some(f => f.label === 'Verpasste Aufträge')).toBe(false);
  });

  it('Ablehnen kostet nichts', () => {
    const s = hof();
    s.customers = { 'Bäckerei Krause': 3 };
    s.orders = [auftrag({})];
    expect(A.declineOrder(s, 1)).toEqual({ ok: true, msg: 'Auftrag von Bäckerei Krause abgelehnt.' });
    expect(s.orders).toEqual([]);
    expect(s.orderEffect ?? null).toBeNull();
    expect(s.customers['Bäckerei Krause']).toBe(3);
    expect(A.declineOrder(s, 1).ok).toBe(false);
  });
});

describe('Großaufträge', () => {
  it(`erst ab ${BIG_FIRST} Sternen und mit Eiern im Angebot`, () => {
    const s = hof();
    tier(s, 'hybrid', 'henne');
    const big = createOrder(s, 'gross');
    expect(big.big).toBe(true);
    expect(big.qty).toBeGreaterThanOrEqual(48);
    expect(big.qty).toBeLessThanOrEqual(96);
    expect(big.dueDay - s.day).toBeGreaterThanOrEqual(10);
    expect(big.dueDay - s.day).toBeLessThanOrEqual(14);
  });

  it('Teillieferungen werden anteilig bezahlt, die vollständige Lieferung bringt den Rest', () => {
    const s = hof();
    s.money = 0;
    s.orders = [auftrag({ big: true, qty: 50, reward: 100 })];
    s.eggs = { hybrid: 20 };
    expect(A.fulfillOrder(s, 1).ok).toBe(false);
    expect(A.deliverPartial(s, 1)).toEqual({ ok: true, msg: '20 Eier geliefert, 30 fehlen noch. Bäckerei Krause zahlt 32.00 €.' });
    expect(s.money).toBe(32);
    expect(s.orders[0]).toMatchObject({ delivered: 20, paid: 32 });
    expect(A.deliverPartial(s, 1)).toEqual({ ok: false, msg: 'Keine Eier im Lager.' });
    s.eggs = { hybrid: 40 };
    expect(A.deliverPartial(s, 1).ok).toBe(true);
    expect(s.money).toBe(100);
    expect(s.eggs.hybrid).toBe(10);
    expect(s.orders).toEqual([]);
    expect(s.stats.ordersDone).toBe(1);
    expect(s.stats.eggsSold).toBe(50);
  });

  it('Teillieferung geht nur bei Großaufträgen', () => {
    const s = hof();
    s.eggs = { hybrid: 3 };
    s.orders = [auftrag({ qty: 6 })];
    expect(A.deliverPartial(s, 1)).toEqual({ ok: false, msg: 'Diesen Auftrag kannst du nur ganz liefern.' });
  });

  it('verpasster Großauftrag: Bezahltes bleibt, Ruf leidet', () => {
    const s = hof();
    s.day = 30;
    s.money = 0;
    s.orders = [auftrag({ big: true, qty: 60, reward: 120, delivered: 30, paid: 48, dueDay: 29 })];
    dailyOrders(s);
    expect(s.money).toBe(0);
    expect(s.orderEffect?.points).toBe(-0.3);
  });
});

describe('Spielstand', () => {
  it('Sonderwünsche, Großaufträge, Stammkunden und Strafe überstehen Export und Import', () => {
    const s = hof();
    s.orders = [
      auftrag({ id: 1, brown: true }), auftrag({ id: 2, kind: 'bruteier', breed: 'marans' }), auftrag({ id: 3, kind: 'hahn', qty: 1 }),
      auftrag({ id: 4, big: true, qty: 60, delivered: 12, paid: 16 }),
    ];
    s.nextId = 10;
    s.customers = { 'Bäckerei Krause': 3 };
    s.orderEffect = { until: 40, points: -0.3 };
    s.stats.ordersDone = 7;
    const t = importSave(JSON.stringify(s));
    expect(t?.orders).toEqual(s.orders);
    expect(t?.customers).toEqual(s.customers);
    expect(t?.stats.ordersDone).toBe(7);
  });

  it.each([
    ['unbekannte Rasse', { kind: 'bruteier', breed: 'drache' }],
    ['Bruteier ohne Rasse', { kind: 'bruteier' }],
    ['braun als Zahl', { brown: 1 }],
    ['geliefert über Menge', { big: true, qty: 6, delivered: 7 }],
    ['geliefert negativ', { big: true, delivered: -1 }],
    ['bezahlt negativ', { big: true, paid: -1 }],
  ])('lehnt Aufträge ab: %s', (_, o) => {
    const s = hof();
    s.nextId = 5;
    s.orders = [auftrag(o as Partial<Order>)];
    expect(importSave(JSON.stringify(s))).toBeNull();
  });

  it.each([
    ['Stammkunden als Liste', { customers: [1] }],
    ['Stammkunde negativ', { customers: { a: -1 } }],
    ['Strafe ohne Ende', { orderEffect: { points: -1 } }],
    ['erfüllte Aufträge als Text', { stats: 'x' }],
  ])('lehnt Spielstand ab: %s', (_, feld) => {
    const s = hof() as unknown as Record<string, unknown>;
    const kaputt = { ...JSON.parse(JSON.stringify(s)), ...feld };
    if ('stats' in feld) kaputt.stats = { ...(s.stats as object), ordersDone: 'x' };
    expect(importSave(JSON.stringify(kaputt))).toBeNull();
  });
});
