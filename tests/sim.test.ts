import { describe, expect, it } from 'vitest';
import * as A from '../src/game/actions';
import { foxProtection, flock, living, stage } from '../src/game/helpers';
import { advanceHour, refreshOffers } from '../src/game/sim';
import { createAnimal, importSave, newGame } from '../src/game/state';
import type { GameState } from '../src/game/types';

const days = (s: GameState, n: number, each?: (s: GameState) => void) => {
  for (let i = 0; i < n * 24; i++) {
    advanceHour(s);
    if (each && s.hour === 9) each(s);
    // ein sorgfältiger Spieler schließt abends die Klappe
    if (each && s.hour === 21 && s.doorOpen) A.toggleDoor(s);
    // … und reagiert auf die Habicht-Warnung
    if (each && s.hour === 11 && s.hawkAlertDay === s.day) A.lureIn(s);
  }
};

function starter(seed = 1, difficulty: 'leicht' | 'mittel' | 'schwer' = 'mittel') {
  const s = newGame({ farmName: 'Test', difficulty, plot: 'obst', seed });
  for (const id of ['knoten', 'kiste', 'eimer', 'trog']) expect(A.buyItem(s, id).ok).toBe(true);
  return s;
}

/** Ein ordentlicher Spieler: versorgt täglich, sammelt, verkauft, mistet aus */
function careTaker(s: GameState) {
  if ((s.inventory.koerner ?? 0) < 2 && s.money > 20) A.buySupply(s, 'koerner');
  if ((s.inventory.einstreu ?? 0) < 1 && s.money > 10) A.buySupply(s, 'einstreu');
  A.refillWater(s);
  A.refillFeed(s);
  A.collectEggs(s);
  A.sellEggs(s);
  if (s.cleanliness < 50) A.cleanCoop(s);
  for (const a of living(s)) for (const c of [...a.conditions]) {
    const cure = { milben: 'kieselgur', wuermer: 'wurmkur', schnupfen: 'tierarzt', kokzidiose: 'kokzidiostatikum' }[c.id];
    A.treat(s, a.id, c.id, cure);
  }
  for (const a of s.animals.filter(x => x.dead)) A.disposeBody(s, a.id);
  if (!s.doorOpen) A.toggleDoor(s);
}

describe('Grundlagen', () => {
  it('startet mit dem Startgeld des Schwierigkeitsgrads', () => {
    expect(newGame({ farmName: 'x', difficulty: 'leicht', plot: 'wald', seed: 1 }).money).toBe(650);
    expect(newGame({ farmName: 'x', difficulty: 'schwer', plot: 'wald', seed: 1 }).money).toBe(250);
  });

  it('Minimalausstattung lässt Geld für Tiere übrig', () => {
    const s = starter();
    expect(s.money).toBeGreaterThan(200);
  });

  it('Tiere ohne Futter und Wasser sterben', () => {
    const s = starter();
    s.animals.push(createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 40 }));
    days(s, 6);
    expect(living(s).length).toBe(0);
    expect(s.animals[0].deathCause).toBe('verdurstet');
  });

  it('Leicht: Tiere bekommen eine letzte Chance', () => {
    const s = starter(1, 'leicht');
    s.animals.push(createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 40 }));
    let warned = false;
    for (let i = 0; i < 24 * 6 && !warned; i++) {
      advanceHour(s);
      warned = !!s.animals[0].lastChanceUsed;
    }
    expect(warned).toBe(true);
    expect(s.animals[0].dead).toBe(false);
  });

  it('gut versorgte Hennen legen Eier und bringen Geld', () => {
    const s = starter(3);
    A.buySupply(s, 'koerner', 2);
    for (let i = 0; i < 3; i++) s.animals.push(createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 40 }));
    days(s, 20, careTaker);
    expect(living(s).length).toBeGreaterThanOrEqual(2);
    expect(s.stats.eggsSold).toBeGreaterThan(25);
  });

  it('Küken wachsen zu Junghühnern und Erwachsenen heran', () => {
    const s = starter();
    s.money = 5000; // voller Raubtierschutz, damit nur das Wachstum geprüft wird
    for (const id of ['enetz', 'geraet', 'untergrab', 'gartenhaus', 'netz']) A.buyItem(s, id);
    A.buyItem(s, 'kuekenstation');
    A.buySupply(s, 'kuekenstarter', 3);
    const c = createAnimal(s, 'sussex', { ageDays: 0 });
    s.animals.push(c);
    days(s, 26, careTaker);
    expect(c.dead).toBe(false);
    expect(stage(s, c)).toBe('erwachsen');
    expect(s.stats.juniorsRaised).toBe(1);
  });

  it('Brutapparat: Eier schlüpfen nach 7 Tagen', () => {
    const s = starter();
    s.money = 500;
    A.buyItem(s, 'brutapparat');
    for (let i = 0; i < 6; i++) s.hatchEggs.push({ breed: 'marans', fertile: true });
    expect(A.incubate(s, 6).ok).toBe(true);
    days(s, 8);
    expect(s.stats.hatched).toBeGreaterThanOrEqual(3);
  });

  it('Hahn macht Eier zu Bruteiern', () => {
    const s = starter(5);
    A.buySupply(s, 'koerner', 2);
    s.animals.push(createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 40 }));
    s.animals.push(createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 40 }));
    s.animals.push(createAnimal(s, 'sussex', { sex: 'hahn', ageDays: 60 }));
    days(s, 5, s2 => { A.refillWater(s2); A.refillFeed(s2); A.collectEggs(s2); });
    expect(s.hatchEggs.length).toBeGreaterThan(3);
  });

  it('besserer Zaun = besserer Fuchsschutz', () => {
    const s = starter();
    const a = foxProtection(s);
    s.money = 1000;
    A.buyItem(s, 'enetz');
    A.buyItem(s, 'geraet');
    A.buyItem(s, 'untergrab');
    expect(foxProtection(s)).toBeGreaterThan(a + 0.5);
  });

  it('Wurmkur sperrt Eier und Schlachten', () => {
    const s = starter();
    const a = createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 40 });
    s.animals.push(a);
    a.conditions.push({ id: 'wuermer', severity: 30 });
    expect(A.treat(s, a.id, 'wuermer', 'wurmkur').ok).toBe(true);
    expect(A.butcher(s, a.id).ok).toBe(false);
  });

  it('Markt bietet Tiere an, Kauf braucht Stall', () => {
    const s = newGame({ farmName: 't', difficulty: 'mittel', plot: 'bach', seed: 9 });
    refreshOffers(s);
    const o = s.offers.find(x => x.kind === 'junghenne')!;
    expect(A.buyOffer(s, o.id).ok).toBe(false);
    A.buyItem(s, 'kleintier');
    expect(A.buyOffer(s, o.id).ok).toBe(true);
    expect(flock(s).length).toBe(1);
  });
});

describe('Markt', () => {
  it('bietet jede Woche mindestens einen Hahn und Bruteier an', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = newGame({ farmName: 't', difficulty: 'mittel', plot: 'obst', seed });
      refreshOffers(s);
      expect(s.offers.some(o => o.kind === 'hahn')).toBe(true);
      expect(s.offers.some(o => o.kind === 'brutei')).toBe(true);
      expect(s.offers.some(o => o.kind === 'junghenne')).toBe(true);
    }
  });

  it('alte Spielstände bekommen beim Laden sofort einen neuen Markt', () => {
    const s = newGame({ farmName: 't', difficulty: 'mittel', plot: 'obst', seed: 1 });
    refreshOffers(s);
    delete s.marketVersion;
    s.offers = s.offers.filter(o => o.kind !== 'hahn');
    const loaded = importSave(JSON.stringify(s))!;
    expect(loaded.offersDay).toBeLessThan(0);
  });
});

describe('Klappe und Stall', () => {
  function flockOf(n: number) {
    const s = starter(11);
    A.buySupply(s, 'koerner', 2);
    for (let i = 0; i < n; i++) s.animals.push(createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 40 }));
    return s;
  }
  const until = (s: GameState, hour: number) => { while (s.hour !== hour) advanceHour(s); };

  it('tagsüber draußen, ab 20 Uhr von selbst im Stall', () => {
    const s = flockOf(3);
    until(s, 12);
    expect(flock(s).every(a => a.outside)).toBe(true);
    until(s, 20);
    expect(flock(s).every(a => !a.outside)).toBe(true);
  });

  it('zu früh geschlossene Klappe sperrt die Hühner aus', () => {
    const s = flockOf(3);
    until(s, 17);
    const r = A.toggleDoor(s);
    expect(r.msg).toContain('ausgesperrt');
    until(s, 22);
    expect(flock(s).filter(a => a.outside).length).toBe(3);
    expect(s.log.some(l => l.text.includes('verschlossenen Klappe'))).toBe(true);
  });

  it('Reinlocken holt die Hühner mit Futter in den Stall', () => {
    const s = flockOf(3);
    until(s, 12);
    const before = s.inventory.koerner;
    expect(A.lureIn(s).ok).toBe(true);
    expect(flock(s).every(a => !a.outside)).toBe(true);
    expect(s.doorOpen).toBe(false);
    expect(s.inventory.koerner).toBeLessThan(before);
  });

  it('ausgesperrte Hühner sind dem Fuchs ausgeliefert, eingesperrte nicht', () => {
    let lostOut = 0, lostIn = 0;
    for (let seed = 1; seed <= 30; seed++) {
      for (const lockOut of [true, false]) {
        const s = starter(seed);
        s.money = 5000;
        A.buyItem(s, 'gartenhaus');
        for (let i = 0; i < 3; i++) s.animals.push(createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 40 }));
        until(s, 12);
        if (lockOut) A.toggleDoor(s);
        until(s, 21);
        if (!lockOut) A.toggleDoor(s);
        s.foxAlertDay = s.day;
        until(s, 0);
        const lost = 3 - flock(s).length;
        if (lockOut) lostOut += lost; else lostIn += lost;
      }
    }
    expect(lostOut).toBeGreaterThan(20);
    expect(lostIn).toBeLessThan(3);
  });
});

describe('Küken', () => {
  it('Küken ohne Wärmelampe frieren und sterben', () => {
    const s = starter();
    A.buySupply(s, 'kuekenstarter', 2);
    const c = createAnimal(s, 'sussex', { ageDays: 0 });
    s.animals.push(c);
    days(s, 4, s2 => { A.refillWater(s2); });
    expect(c.dead).toBe(true);
    expect(s.log.some(l => l.text.includes('frieren'))).toBe(true);
  });
});

describe('Erfolge', () => {
  it('erreichte Ziele erscheinen als Banner, ein Kapitel als Feier mit Belohnung', () => {
    const s = starter();
    advanceHour(s);
    expect(s.banners.length).toBe(4); // Zaun, Stall, Tränke, Futterstelle
    for (let i = 0; i < 3; i++) s.animals.push(createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 40 }));
    s.stats.eggsSold = 10;
    const money = s.money;
    advanceHour(s);
    expect(s.chapter).toBe(2);
    expect(s.money).toBe(money + 50);
    expect(s.celebrations[0].title).toContain('Kapitel 1');
  });
});

describe('Balancing', () => {
  it('Ein sorgfältiger Spieler (Mittel) überlebt 60 Tage, ohne pleitezugehen', () => {
    const results: number[] = [];
    for (let seed = 1; seed <= 24; seed++) {
      const s = starter(seed);
      A.buyItem(s, 'untergrab');
      A.buyItem(s, 'flatterband');
      A.buySupply(s, 'koerner', 2);
      for (let i = 0; i < 3; i++) s.animals.push(createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 22 }));
      s.money -= 3 * 18;
      days(s, 60, s2 => {
        careTaker(s2);
        // Abends Klappe zu (der Spieler denkt dran)
      });
      results.push(s.money);
      expect(s.gameOver).toBe(false);
    }
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    // eslint-disable-next-line no-console
    console.log('Geld nach 60 Tagen (Mittel):', results.map(r => Math.round(r)).join(', '), 'Ø', Math.round(avg));
    // Nach dem Einkauf bleiben ca. 130 €; der Hof soll sich über 60 Tage tragen
    expect(avg).toBeGreaterThan(60);
  });
});
