// Spieleraktionen mit Geld oder Eingaben: Verkaufen, Entsorgen, Zurückzahlen, Umbenennen, Hut, Schwierigkeit.
// Neben dem Normalfall jeweils Grenzwerte, ungültige Kennungen und doppelte Ausführung.
import { describe, expect, it } from 'vitest';
import * as A from '../src/game/actions';
import { DISPOSAL_COST, HEALTH_CHECK_COST } from '../src/game/data';
import { refreshOffers } from '../src/game/sim';
import { createAnimal, newGame } from '../src/game/state';
import type { GameState } from '../src/game/types';

function hof(seed = 3): GameState {
  const s = newGame({ farmName: 'Test', difficulty: 'mittel', plot: 'obst', seed });
  for (const id of ['knoten', 'kiste', 'eimer', 'trog']) expect(A.buyItem(s, id).ok).toBe(true);
  return s;
}
const henne = (s: GameState) => {
  const a = createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 200 });
  s.animals.push(a);
  return a;
};

describe('Ausrüstung verkaufen', () => {
  it('verkauft eine Tränke für 40 % und leert das Wasser', () => {
    const s = hof(); s.water = 5;
    const geld = s.money;
    expect(A.sellItem(s, 'eimer').ok).toBe(true);
    expect(s.equip.drinker).toBeNull();
    expect(s.water).toBe(0);
    expect(s.money).toBeGreaterThan(geld);
  });
  it('verkauft denselben Gegenstand nicht zweimal', () => {
    const s = hof();
    A.sellItem(s, 'eimer');
    const geld = s.money;
    expect(A.sellItem(s, 'eimer').ok).toBe(false);
    expect(s.money).toBe(geld);
  });
  it('lässt den Stall nicht verkaufen, solange Hühner darin wohnen', () => {
    const s = hof(); henne(s);
    expect(A.sellItem(s, 'kiste').ok).toBe(false);
    expect(s.equip.coop).toBe('kiste');
  });
  it('verkauft keine Gimmicks', () => {
    const s = hof(); s.money += 100;
    A.buyItem(s, 'hut_krone');
    expect(A.sellItem(s, 'hut_krone').ok).toBe(false);
  });
  it('lehnt eine unbekannte Kennung ab, statt abzustürzen', () => {
    const s = hof();
    expect(() => A.sellItem(s, 'gibt-es-nicht')).not.toThrow();
    expect(A.sellItem(s, 'gibt-es-nicht').ok).toBe(false);
  });
});

describe('Tiere verkaufen und entsorgen', () => {
  it('verkauft ein lebendes Tier und schreibt den Erlös gut', () => {
    const s = hof(); const a = henne(s); const geld = s.money;
    expect(A.sellAnimal(s, a.id).ok).toBe(true);
    expect(s.animals.find(x => x.id === a.id)).toBeUndefined();
    expect(s.money).toBeGreaterThan(geld);
  });
  it('verkauft kein totes, unbekanntes oder brütendes Tier', () => {
    const s = hof(); const tot = henne(s); tot.dead = true;
    const brut = henne(s); brut.broodEggs = [{ breed: 'hybrid' } as never];
    const geld = s.money;
    expect(A.sellAnimal(s, tot.id).ok).toBe(false);
    expect(A.sellAnimal(s, 99999).ok).toBe(false);
    expect(A.sellAnimal(s, brut.id).ok).toBe(false);
    expect(s.money).toBe(geld);
  });
  it('entsorgt ein totes Tier für die feste Gebühr', () => {
    const s = hof(); const a = henne(s); a.dead = true; const geld = s.money;
    expect(A.disposeBody(s, a.id).ok).toBe(true);
    expect(s.money).toBeCloseTo(geld - DISPOSAL_COST, 2);
    expect(s.animals).toHaveLength(0);
  });
  it('entsorgt nicht ohne genug Geld und keine lebenden Tiere', () => {
    const s = hof(); const tot = henne(s); tot.dead = true; const lebt = henne(s);
    expect(A.disposeBody(s, lebt.id).ok).toBe(false);
    s.money = DISPOSAL_COST - 0.01;
    expect(A.disposeBody(s, tot.id).ok).toBe(false);
    expect(s.animals).toHaveLength(2);
  });
});

describe('Bruteier', () => {
  it('verkauft Bruteier und zählt sie als verkaufte Eier', () => {
    const s = hof(); s.hatchEggs = [{ breed: 'hybrid' } as never, { breed: 'hybrid' } as never];
    const geld = s.money, verkauft = s.stats.eggsSold;
    expect(A.sellHatchEggs(s).ok).toBe(true);
    expect(s.hatchEggs).toHaveLength(0);
    expect(s.stats.eggsSold).toBe(verkauft + 2);
    expect(s.money).toBeGreaterThan(geld);
  });
  it('zahlt als Speiseeier weniger als als Bruteier', () => {
    const a = hof(); a.hatchEggs = [{ breed: 'hybrid' } as never];
    const b = hof(); b.hatchEggs = [{ breed: 'hybrid' } as never];
    const vorA = a.money, vorB = b.money;
    A.sellHatchEggs(a); A.sellHatchEggs(b, true);
    expect(b.money - vorB).toBeLessThan(a.money - vorA);
  });
  it('verkauft ohne Bruteier nichts', () => {
    expect(A.sellHatchEggs(hof()).ok).toBe(false);
  });
  it('legt höchstens 8 Eier unter eine brütige Henne', () => {
    const s = hof(); const a = henne(s); a.broodyUntil = s.day + 3;
    s.hatchEggs = Array.from({ length: 10 }, () => ({ breed: 'hybrid' }) as never);
    expect(A.setUnderHen(s, a.id).ok).toBe(true);
    expect(a.broodEggs).toHaveLength(8);
    expect(s.hatchEggs).toHaveLength(2);
  });
  it('legt keine Eier unter eine nicht brütige oder unbekannte Henne', () => {
    const s = hof(); const a = henne(s); a.broodyUntil = 0;
    s.hatchEggs = [{ breed: 'hybrid' } as never];
    expect(A.setUnderHen(s, a.id).ok).toBe(false);
    expect(A.setUnderHen(s, 99999).ok).toBe(false);
    expect(s.hatchEggs).toHaveLength(1);
  });
});

describe('Schulden und Gesundheitscheck', () => {
  it('zahlt höchstens das vorhandene Geld zurück', () => {
    const s = hof(); s.debt = 100; s.money = 30;
    expect(A.repayDebt(s).ok).toBe(true);
    expect(s.debt).toBeCloseTo(70, 2);
    expect(s.money).toBeCloseTo(0, 2);
  });
  it('zahlt alles zurück, wenn genug Geld da ist', () => {
    const s = hof(); s.debt = 50; s.money = 80;
    A.repayDebt(s);
    expect(s.debt).toBe(0);
    expect(s.money).toBeCloseTo(30, 2);
  });
  it('lehnt Zurückzahlen ohne Schulden oder ohne Geld ab', () => {
    const s = hof(); s.debt = 0;
    expect(A.repayDebt(s).ok).toBe(false);
    s.debt = 10; s.money = -5;
    expect(A.repayDebt(s).ok).toBe(false);
    expect(s.debt).toBe(10);
  });
  it('prüft eine Legehenne auf dem Markt genau einmal', () => {
    const s = hof(); s.money += 50;
    for (let i = 0; i < 20 && !s.offers.some(o => o.kind === 'legehenne'); i++) { s.offersDay = -99; refreshOffers(s); }
    const angebot = s.offers.find(o => o.kind === 'legehenne');
    expect(angebot).toBeDefined();
    const geld = s.money;
    expect(A.healthCheck(s, angebot!.id).ok).toBe(true);
    expect(s.money).toBeCloseTo(geld - HEALTH_CHECK_COST, 2);
    expect(A.healthCheck(s, angebot!.id).ok).toBe(false);
    expect(A.healthCheck(s, 99999).ok).toBe(false);
  });
});

describe('Eingaben: Umbenennen, Hut, Schwierigkeit', () => {
  it('übernimmt einen Namen gekürzt auf 24 Zeichen', () => {
    const s = hof(); const a = henne(s);
    expect(A.rename(s, a.id, '  ' + 'Ä'.repeat(30) + '  ').ok).toBe(true);
    expect(a.name).toBe('Ä'.repeat(24));
  });
  it('speichert HTML im Namen als Text (Anzeige maskiert)', () => {
    const s = hof(); const a = henne(s);
    A.rename(s, a.id, '<b>Berta</b>');
    expect(a.name).toBe('<b>Berta</b>');
  });
  it('lehnt leere Namen und unbekannte Tiere ab', () => {
    const s = hof(); const a = henne(s); const alt = a.name;
    expect(A.rename(s, a.id, '   ').ok).toBe(false);
    expect(A.rename(s, 99999, 'Berta').ok).toBe(false);
    expect(a.name).toBe(alt);
  });
  it('setzt nur gekaufte Hüte auf (Strohhut gibt es immer)', () => {
    const s = hof();
    expect(A.wearHat(s, 'hut_krone').ok).toBe(false);
    expect(A.wearHat(s, 'stroh').ok).toBe(true);
    s.money += 50; A.buyItem(s, 'hut_krone');
    expect(A.wearHat(s, 'hut_krone').ok).toBe(true);
    expect(A.wearHat(s, null).ok).toBe(true);
    expect(s.hat).toBeNull();
  });
  it('senkt die Schwierigkeit nur nach unten', () => {
    const s = hof();
    expect(A.lowerDifficulty(s, 'schwer').ok).toBe(false);
    expect(A.lowerDifficulty(s, 'mittel').ok).toBe(false);
    expect(A.lowerDifficulty(s, 'leicht').ok).toBe(true);
    expect(s.difficulty).toBe('leicht');
  });
  it('übernimmt keine unbekannte Schwierigkeit', () => {
    const s = hof();
    expect(A.lowerDifficulty(s, 'unmoeglich' as never).ok).toBe(false);
    expect(s.difficulty).toBe('mittel');
  });
});

describe('Kleinere Aktionen', () => {
  it('Mehlwürmer verbrauchen genau eine Packung und heben das Wohlbefinden', () => {
    const s = hof(); const a = henne(s); a.wellbeing = 50; s.inventory.mehlwuermer = 1;
    expect(A.giveTreat(s).ok).toBe(true);
    expect(s.inventory.mehlwuermer).toBe(0);
    expect(a.wellbeing).toBe(70);
    expect(A.giveTreat(s).ok).toBe(false);
  });
  it('Mehlwürmer ohne Tiere werden nicht verbraucht', () => {
    const s = hof(); s.inventory.mehlwuermer = 1;
    expect(A.giveTreat(s).ok).toBe(false);
    expect(s.inventory.mehlwuermer).toBe(1);
  });
  it('Kräuter brauchen Tränke und Vorrat', () => {
    const s = hof(); s.inventory.kraeuter = 1;
    expect(A.giveHerbs(s).ok).toBe(true);
    expect(s.kraeuterUntil).toBeGreaterThan(s.day);
    expect(A.giveHerbs(s).ok).toBe(false);
    const ohne = hof(); ohne.equip.drinker = null; ohne.inventory.kraeuter = 1;
    expect(A.giveHerbs(ohne).ok).toBe(false);
  });
  it('Besuch absagen nur, wenn einer angefragt hat', () => {
    const s = hof(); s.visit = null;
    expect(A.declineVisit(s).ok).toBe(false);
    s.visit = { group: 'Kita Sonnenschein' } as never;
    expect(A.declineVisit(s).ok).toBe(true);
    expect(s.visit).toBeNull();
  });
});
