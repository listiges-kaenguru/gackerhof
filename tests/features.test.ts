import { describe, expect, it } from 'vitest';
import * as A from '../src/game/actions';
import { ALBUM_BREED_BONUS, PASTURE_WARN, SHOW_DAY, SHOW_FEE, SHOW_NOTICE } from '../src/game/data';
import { albumKey, dayOfSeason, lightActive, living, pastureNow, pastureWormFactor, season } from '../src/game/helpers';
import { advanceHour, refreshOffers } from '../src/game/sim';
import { runShow, showBasePoints, showProblem } from '../src/game/show';
import { createAnimal, importSave, newGame } from '../src/game/state';
import type { GameState } from '../src/game/types';
import { tutorialStep } from '../src/ui/tutorial';

const hours = (s: GameState, n: number, each?: (s: GameState) => void) => {
  for (let i = 0; i < n; i++) {
    advanceHour(s);
    if (each && s.hour === 9) each(s);
  }
};
const days = (s: GameState, n: number, each?: (s: GameState) => void) => hours(s, n * 24, each);

function farm(seed = 1, money = 5000) {
  const s = newGame({ farmName: 'Test', difficulty: 'mittel', plot: 'obst', seed });
  s.money = money;
  for (const id of ['maschen', 'gartenhaus', 'nippel', 'tritt']) expect(A.buyItem(s, id).ok).toBe(true);
  return s;
}

/** Versorgt die Tiere wie ein sorgfältiger Spieler, ohne Krankheiten zu behandeln */
function care(s: GameState) {
  s.inventory.legemehl = 50;
  s.inventory.einstreu = 5;
  A.refillWater(s);
  A.refillFeed(s, 'legemehl');
  A.collectEggs(s);
  if (s.cleanliness < 60) A.cleanCoop(s);
  for (const a of living(s)) a.conditions = [];
}

function hens(s: GameState, n: number, breed: 'hybrid' | 'sussex' = 'hybrid') {
  for (let i = 0; i < n; i++) s.animals.push(createAnimal(s, breed, { sex: 'henne', ageDays: 60 }));
}

describe('Wechselweide', () => {
  it('ohne Wechselweide wird der Auslauf abgegrast und das Wurmrisiko steigt', () => {
    const s = farm();
    hens(s, 8);
    const fresh = pastureWormFactor(s);
    days(s, 30, care);
    expect(pastureNow(s)).toBeLessThan(PASTURE_WARN);
    expect(pastureWormFactor(s)).toBeGreaterThan(fresh * 2);
  });

  it('die ruhende Hälfte erholt sich, nach dem Wechsel scharren die Hühner auf frischem Gras', () => {
    const s = farm();
    hens(s, 8);
    expect(A.switchPasture(s).ok).toBe(false); // erst kaufen
    expect(A.buyItem(s, 'wechselweide').ok).toBe(true);
    days(s, 20, care);
    const [used, rested] = s.pasture!;
    expect(used).toBeLessThan(rested);
    expect(rested).toBe(100);
    expect(A.switchPasture(s).ok).toBe(true);
    expect(s.pastureSide).toBe(1);
    expect(pastureNow(s)).toBe(100);
    days(s, 5, care);
    expect(s.pasture![0]).toBeGreaterThan(used); // die alte Hälfte erholt sich
  });
});

describe('Stalllicht', () => {
  it('bringt im Winter deutlich mehr Eier', () => {
    const eggs = (light: boolean) => {
      const s = farm(7);
      s.day = 91; // Winterbeginn
      s.temperature = 5;
      hens(s, 10);
      if (light) expect(A.buyItem(s, 'stalllicht').ok).toBe(true);
      expect(season(s)).toBe('winter');
      days(s, 15, care);
      return s.stats.eggsTotal;
    };
    const without = eggs(false);
    const withLight = eggs(true);
    expect(withLight).toBeGreaterThan(without * 1.3);
  });

  it('kostet Strom nur im Herbst und Winter und lässt sich ausschalten', () => {
    const s = farm();
    expect(A.buyItem(s, 'stalllicht').ok).toBe(true);
    s.day = 40; // Sommer
    expect(lightActive(s)).toBe(false);
    const before = s.pendingCosts;
    days(s, 3);
    expect(s.pendingCosts).toBeCloseTo(before, 5);
    s.day = 70; // Herbst
    expect(lightActive(s)).toBe(true);
    days(s, 3);
    expect(s.pendingCosts).toBeGreaterThan(before);
    A.toggleLight(s);
    expect(lightActive(s)).toBe(false);
  });
});

describe('Hühner-Album', () => {
  it('gekaufte Tiere werden eingetragen, Küken erst als Junghuhn', () => {
    const s = farm();
    refreshOffers(s);
    const o = s.offers.find(x => x.kind === 'junghenne')!;
    expect(A.buyOffer(s, o.id, 1).ok).toBe(true);
    expect(s.album![albumKey(o.breed, o.variant)]).toBeTruthy();

    A.buyItem(s, 'kuekenstation');
    s.inventory.kuekenstarter = 5;
    const chick = createAnimal(s, 'brahma', { ageDays: 0, variant: 'dunkel' });
    s.animals.push(chick);
    expect(s.album!['brahma:dunkel']).toBeUndefined();
    days(s, 11, care);
    expect(s.album!['brahma:dunkel']).toBeTruthy();
  });

  it('Küken erben die Farbe von Mutter und Vater', () => {
    const s = farm(3);
    for (let i = 0; i < 6; i++) s.animals.push(createAnimal(s, 'sussex', { sex: 'henne', ageDays: 60, variant: 'rot' }));
    s.animals.push(createAnimal(s, 'sussex', { sex: 'hahn', ageDays: 60, variant: 'rot' }));
    days(s, 10, care);
    expect(s.hatchEggs.length).toBeGreaterThan(10);
    const red = s.hatchEggs.filter(e => e.variant === 'rot').length;
    expect(red / s.hatchEggs.length).toBeGreaterThan(0.85);
  });

  it('alle Farben einer Rasse bringen eine Prämie', () => {
    // Drei Seidenhuhn-Küken in allen Farben wachsen zu Junghühnern heran
    const s = farm();
    for (const v of ['weiss', 'schwarz', 'blau']) s.animals.push(createAnimal(s, 'seide', { ageDays: 0, variant: v }));
    s.inventory.kuekenstarter = 5;
    A.buyItem(s, 'kuekenstation');
    const income = s.stats.income;
    days(s, 11, care);
    expect(Object.keys(s.album!).filter(k => k.startsWith('seide:')).length).toBe(3);
    expect(s.celebrations.some(c => c.title.includes('Seidenhuhn'))).toBe(true);
    expect(s.stats.income - income).toBeGreaterThanOrEqual(ALBUM_BREED_BONUS);
  });

  it('alte Spielstände bekommen ein Album mit ihren Tieren', () => {
    const s = farm();
    hens(s, 2, 'sussex');
    const old = JSON.parse(JSON.stringify(s));
    delete old.album;
    delete old.pasture;
    delete old.show;
    for (const a of old.animals) delete a.variant;
    const loaded = importSave(JSON.stringify(old))!;
    expect(loaded.album!['sussex:hell']).toBeTruthy();
    expect(loaded.pasture).toEqual([100, 100]);
    expect(loaded.show).toBeTruthy();
  });
});

describe('Geflügelschau', () => {
  it('findet jede Jahreszeit statt und wird eine Woche vorher angekündigt', () => {
    const s = farm();
    expect(s.show!.day).toBe(SHOW_DAY);
    expect(s.show!.announced).toBe(false);
    days(s, SHOW_DAY - SHOW_NOTICE - 1);
    expect(s.show!.announced).toBe(true);
    days(s, SHOW_NOTICE + 1);
    expect(s.show!.day).toBe(SHOW_DAY + 30);
    expect(dayOfSeason({ ...s, day: s.show!.day })).toBe(SHOW_DAY);
  });

  it('nur gesunde, ausgewachsene Rassetiere dürfen antreten, Standgeld wird fällig', () => {
    const s = farm();
    s.day = SHOW_DAY - 3;
    s.show = undefined;
    days(s, 1);
    const hybrid = createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 60 });
    const young = createAnimal(s, 'sussex', { sex: 'henne', ageDays: 15 });
    const good = createAnimal(s, 'sussex', { sex: 'henne', ageDays: 60 });
    s.animals.push(hybrid, young, good);
    expect(showProblem(s, hybrid)).toMatch(/Hybriden/);
    expect(showProblem(s, young)).toBeTruthy();
    expect(showProblem(s, good)).toBeNull();
    expect(A.toggleShowEntry(s, hybrid.id).ok).toBe(false);
    const money = s.money;
    expect(A.toggleShowEntry(s, good.id).ok).toBe(true);
    expect(s.money).toBe(money - SHOW_FEE);
    expect(A.toggleShowEntry(s, good.id).ok).toBe(true); // abmelden
    expect(s.money).toBe(money);
  });

  it('gut gepflegte Tiere bekommen Preise, ein „vorzüglich“ bringt den Pokal', () => {
    const s = farm(5);
    s.day = SHOW_DAY - 2;
    s.show = undefined;
    days(s, 1);
    const star = createAnimal(s, 'sussex', { sex: 'henne', ageDays: 60 });
    const poor = createAnimal(s, 'sussex', { sex: 'henne', ageDays: 60 });
    s.animals.push(star, poor);
    Object.assign(star, { health: 100, wellbeing: 95, weight: 3 });
    Object.assign(poor, { health: 70, wellbeing: 40, weight: 2.3 });
    s.cleanliness = 100;
    expect(showBasePoints(s, star)).toBe(97);
    expect(showBasePoints(s, poor)).toBeLessThan(93);
    A.toggleShowEntry(s, star.id);
    A.toggleShowEntry(s, poor.id);
    s.day = s.show!.day;
    const money = s.money;
    runShow(s);
    const r = s.lastShow!.results;
    expect(r.length).toBe(2);
    const starR = r.find(x => x.animalId === star.id)!;
    expect(starR.points).toBeGreaterThanOrEqual(96);
    expect(starR.prize).toBeGreaterThan(0);
    expect(s.money).toBeGreaterThan(money);
    expect(s.trophies!.length).toBe(starR.trophy ? 1 : 0);
    expect(s.celebrations.length).toBeGreaterThan(0);
  });
});

describe('Tutorial-Pfeile', () => {
  it('führen Schritt für Schritt durch den Start', () => {
    const s = newGame({ farmName: 'Test', difficulty: 'mittel', plot: 'obst', seed: 1 });
    const ids: string[] = [];
    const step = () => { const t = tutorialStep(s); ids.push(t?.id ?? '-'); return t; };
    step();
    A.buyItem(s, 'knoten'); step();
    A.buyItem(s, 'kiste'); step();
    A.buyItem(s, 'eimer'); step();
    A.buyItem(s, 'trog'); step();
    A.refillWater(s); step();
    A.buySupply(s, 'koerner'); step();
    A.refillFeed(s); step();
    expect(ids).toEqual(['zaun', 'stall', 'traenke', 'futterstelle', 'wasser', 'futterkauf', 'futter', 'huehner']);
    expect(step()!.targets.some(t => t.includes('tab:markt'))).toBe(true);
  });

  it('erinnern abends an die Klappe und lassen sich abschalten', () => {
    const s = farm();
    hens(s, 3);
    s.water = 3; s.feed = 3;
    s.hour = 21;
    for (const a of living(s)) a.outside = false;
    expect(tutorialStep(s)?.id).toBe('klappe-zu');
    A.setTutorial(s, false);
    expect(tutorialStep(s)).toBeNull();
  });

  it('enden nach dem ersten Eierverkauf und den ersten Tagen', () => {
    const s = farm();
    hens(s, 3);
    s.water = 3; s.feed = 3;
    s.stats.eggsSold = 5;
    s.day = 8;
    expect(tutorialStep(s)).toBeNull();
  });
});
