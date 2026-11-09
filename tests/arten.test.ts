import { describe, expect, it } from 'vitest';
import * as A from '../src/game/actions';
import {
  brutDays, cleanPond, dailyOthers, diseaseGroup, duckSnails, guardGoose, housed, layOthers, othersOf, speciesCap, speciesOf,
} from '../src/game/arten';
import { harvest, sow } from '../src/game/beet';
import { BREEDS, GOOSE_FOX, POND_BAD, POND_DIRT, SPECIES } from '../src/game/data';
import { adultRoosters, flock, foxProtection, hawkProtection, living, stageName } from '../src/game/helpers';
import { possibleKinds } from '../src/game/orders';
import { showProblem } from '../src/game/show';
import { advanceHour, checkGoals, refreshOffers } from '../src/game/sim';
import { chapterGoals, createAnimal, importSave, newGame } from '../src/game/state';
import type { BreedId, GameState, Sex } from '../src/game/types';

function hof(): GameState {
  const s = newGame({ farmName: 'Test', difficulty: 'mittel', plot: 'obst', seed: 8 });
  s.money = 3000;
  for (const id of ['maschen', 'kleintier', 'nippel', 'tritt']) expect(A.buyItem(s, id).ok).toBe(true);
  s.day = 10;
  s.hour = 7;
  return s;
}
const tier = (s: GameState, breed: BreedId, sex: Sex = 'henne', ageDays = 200) => {
  const a = createAnimal(s, breed, { sex, ageDays });
  s.animals.push(a);
  return a;
};
const kaufe = (s: GameState, ...ids: string[]) => { for (const id of ids) expect(A.buyItem(s, id).ok, id).toBe(true); };

describe('Arten und Rassen', () => {
  it('Hühner sind der Standard, Laufente, Pommerngans und Legewachtel sind eigene Arten', () => {
    expect(speciesOf('hybrid')).toBe('huhn');
    expect(speciesOf('seide')).toBe('huhn');
    expect([speciesOf('laufente'), speciesOf('gans'), speciesOf('wachtel')]).toEqual(['ente', 'gans', 'wachtel']);
  });

  it('nur Hühner zählen zur Herde im Hühnerstall', () => {
    const s = hof();
    const h = tier(s, 'hybrid');
    const e = tier(s, 'laufente');
    expect(flock(s)).toEqual([h]);
    expect(living(s)).toEqual([h, e]);
    expect(othersOf(s, 'ente')).toEqual([e]);
  });

  it('Bezeichnungen je Art', () => {
    const s = hof();
    expect(stageName(s, tier(s, 'laufente', 'henne'))).toBe('Ente');
    expect(stageName(s, tier(s, 'laufente', 'hahn'))).toBe('Erpel');
    expect(stageName(s, tier(s, 'gans', 'hahn'))).toBe('Ganter');
    expect(stageName(s, tier(s, 'wachtel', 'henne', 15))).toBe('Jungwachtel');
    expect(stageName(s, tier(s, 'gans', 'henne', 2))).toBe('Gössel');
    expect(stageName(s, tier(s, 'hybrid', 'hahn'))).toBe('Hahn');
  });
});

describe('Unterkünfte', () => {
  it('Enten brauchen Entenhaus und Becken, Gänse Stall und Weide, Wachteln die Voliere', () => {
    const s = hof();
    expect(housed(s, 'ente')).toBe(false);
    expect(A.buyItem(s, 'becken').ok).toBe(false); // erst das Entenhaus
    kaufe(s, 'entenhaus');
    expect(housed(s, 'ente')).toBe(false);
    kaufe(s, 'becken');
    expect(housed(s, 'ente')).toBe(true);
    kaufe(s, 'gaensestall');
    expect(housed(s, 'gans')).toBe(false);
    kaufe(s, 'grasweide');
    expect(housed(s, 'gans')).toBe(true);
    kaufe(s, 'voliere');
    expect(housed(s, 'wachtel')).toBe(true);
    expect([speciesCap(s, 'ente'), speciesCap(s, 'gans'), speciesCap(s, 'wachtel')]).toEqual([6, 4, 12]);
  });
});

describe('Geflügelmarkt', () => {
  it('ohne Unterkunft gibt es nur Hühner', () => {
    for (let i = 0; i < 20; i++) {
      const s = hof();
      s.seed = i;
      refreshOffers(s);
      expect(s.offers.every(o => speciesOf(o.breed) === 'huhn')).toBe(true);
    }
  });

  it('mit Unterkunft gibt es jede Woche Weibchen und Männchen der Art', () => {
    const s = hof();
    kaufe(s, 'entenhaus', 'becken', 'voliere');
    refreshOffers(s);
    const enten = s.offers.filter(o => o.breed === 'laufente').map(o => o.kind);
    expect(enten).toEqual(expect.arrayContaining(['legehenne', 'hahn']));
    expect(s.offers.some(o => o.breed === 'wachtel' && o.kind === 'legehenne')).toBe(true);
    expect(s.offers.some(o => o.breed === 'gans')).toBe(false);
  });

  it('Kauf nur mit Unterkunft und freiem Platz; Bruteier gehen immer', () => {
    const s = hof();
    s.offers = [
      { id: 900, kind: 'legehenne', breed: 'gans', price: 40, qty: 9, seller: 'Test', hiddenAge: 200 },
      { id: 901, kind: 'brutei', breed: 'gans', price: 5, qty: 2, seller: 'Test' },
    ];
    expect(A.buyOffer(s, 900)).toEqual({ ok: false, msg: 'Gänse brauchen erst einen Gänsestall mit Grasweide.' });
    expect(A.buyOffer(s, 901).ok).toBe(true);
    kaufe(s, 'gaensestall', 'grasweide');
    expect(A.buyOffer(s, 900, 4).ok).toBe(true);
    expect(A.buyOffer(s, 900)).toEqual({ ok: false, msg: 'Im Gänsestall ist kein Platz mehr (4 Plätze).' });
    expect(othersOf(s, 'gans')).toHaveLength(4);
  });
});

describe('Eier und Brut', () => {
  it('Enten legen ins Nest; mit Erpel werden es Bruteier', () => {
    const s = hof();
    kaufe(s, 'entenhaus', 'becken');
    s.pond = 100;
    for (let i = 0; i < 4; i++) tier(s, 'laufente');
    for (let d = 0; d < 10; d++) layOthers(s);
    expect(s.nestEggs.laufente).toBeGreaterThan(10);
    expect(s.nestHatchEggs).toEqual([]);
    tier(s, 'laufente', 'hahn');
    layOthers(s);
    expect(s.nestHatchEggs.length).toBeGreaterThan(0);
    expect(s.nestHatchEggs.every(e => e.breed === 'laufente')).toBe(true);
  });

  it('Männchen, Jungtiere und Hühner legen hier nicht; Hühner haben ihr eigenes Legen', () => {
    const s = hof();
    tier(s, 'laufente', 'hahn');
    tier(s, 'laufente', 'henne', 15);
    tier(s, 'hybrid');
    for (let d = 0; d < 10; d++) layOthers(s);
    expect(s.nestEggs).toEqual({});
  });

  it('Gänse legen fast nur im Frühling', () => {
    const zaehle = (day: number) => {
      const s = hof();
      s.day = day;
      for (let i = 0; i < 4; i++) tier(s, 'gans');
      for (let d = 0; d < 30; d++) layOthers(s);
      return s.nestEggs.gans ?? 0;
    };
    expect(zaehle(10)).toBeGreaterThan(zaehle(70) * 4);
  });

  it('Eier der Arten werden mit eingesammelt und haben eigene Preise', () => {
    const s = hof();
    s.nestEggs = { laufente: 2, wachtel: 5, gans: 1 };
    expect(A.collectEggs(s).ok).toBe(true);
    expect(s.eggs).toEqual({ laufente: 2, wachtel: 5, gans: 1 });
    expect(BREEDS.gans.eggValue).toBeGreaterThan(BREEDS.laufente.eggValue);
    expect(BREEDS.wachtel.eggValue).toBeLessThan(1);
  });

  it(`Brutdauer im Brutapparat: Huhn 7, Ente 9, Gans 10, Wachtel 6 Tage`, () => {
    expect([brutDays('hybrid'), brutDays('laufente'), brutDays('gans'), brutDays('wachtel')]).toEqual([7, 9, 10, 6]);
    expect(SPECIES.ente.brutDays).toBe(9);
    const s = hof();
    kaufe(s, 'brutapparat');
    s.hatchEggs = [{ breed: 'gans', fertile: true }, { breed: 'hybrid', fertile: true }];
    expect(A.incubate(s, 2).ok).toBe(true);
    expect(s.incubator.map(e => e.hatchDay - s.day)).toEqual([10, 7]);
  });
});

describe('Entenbecken', () => {
  it(`verschmutzt mit ${POND_DIRT} % je Ente und Tag und lässt sich reinigen`, () => {
    const s = hof();
    kaufe(s, 'entenhaus', 'becken');
    expect(s.pond).toBe(100);
    tier(s, 'laufente');
    tier(s, 'laufente');
    dailyOthers(s);
    expect(s.pond).toBe(100 - 2 * POND_DIRT);
    s.pond = 3;
    dailyOthers(s);
    expect(s.pond).toBe(0);
    expect(cleanPond(s)).toEqual({ ok: true, msg: 'Becken gereinigt und frisches Wasser eingelassen.' });
    expect(s.pond).toBe(100);
    expect(cleanPond(s)).toEqual({ ok: false, msg: 'Das Becken ist noch sauber.' });
  });

  it('ohne Becken nichts zu reinigen', () => {
    expect(cleanPond(hof())).toEqual({ ok: false, msg: 'Du hast kein Wasserbecken.' });
  });

  it(`schmutziges Becken (unter ${POND_BAD} %) macht Enten unglücklich und senkt das Legen`, () => {
    const lege = (pond: number) => {
      const s = hof();
      kaufe(s, 'entenhaus', 'becken');
      s.pond = pond;
      for (let i = 0; i < 6; i++) tier(s, 'laufente');
      for (let d = 0; d < 20; d++) { layOthers(s); s.pond = pond; }
      return s.nestEggs.laufente ?? 0;
    };
    expect(lege(10)).toBeLessThan(lege(90) * 0.7);
    const s = hof();
    kaufe(s, 'entenhaus', 'becken');
    const e = tier(s, 'laufente');
    s.hour = 10;
    s.pond = 10;
    for (let i = 0; i < 30; i++) advanceHour(s);
    expect(e.wellbeing).toBeLessThan(65);
  });
});

describe('Versorgung', () => {
  it('Arten mit Unterkunft trinken dort; Hühnertränke bleibt unberührt', () => {
    const s = hof();
    kaufe(s, 'voliere');
    const w = tier(s, 'wachtel');
    w.water = 30;
    s.water = 5;
    s.feed = 2;
    s.hour = 9;
    advanceHour(s);
    expect(w.water).toBeGreaterThan(30);
    expect(s.water).toBe(5);
  });

  it('Gänse auf der Grasweide fressen tagsüber Gras statt Futter', () => {
    const s = hof();
    kaufe(s, 'gaensestall', 'grasweide');
    const g = tier(s, 'gans');
    g.food = 40;
    s.feed = 3;
    s.hour = 9;
    advanceHour(s);
    expect(g.food).toBeGreaterThan(40);
    expect(s.feed).toBe(3);
  });

  it('Enten fressen am Futterplatz der Hühner mit', () => {
    const s = hof();
    kaufe(s, 'entenhaus', 'becken');
    const e = tier(s, 'laufente');
    e.food = 40;
    s.feed = 3;
    s.hour = 9;
    advanceHour(s);
    expect(e.food).toBeGreaterThan(40);
    expect(s.feed).toBeLessThan(3);
  });
});

describe('Eigenheiten', () => {
  it(`Wachgans: eine erwachsene Gans bringt ${GOOSE_FOX * 100} % Fuchsschutz`, () => {
    const s = hof();
    const ohne = foxProtection(s);
    tier(s, 'gans', 'henne', 15);
    expect(guardGoose(s)).toBe(false);
    expect(foxProtection(s)).toBe(ohne);
    tier(s, 'gans');
    tier(s, 'gans');
    expect(guardGoose(s)).toBe(true);
    expect(foxProtection(s)).toBeCloseTo(ohne + GOOSE_FOX);
  });

  it('Laufenten fressen Schnecken: weniger Würmer bei den Hühnern', () => {
    const wurm = (enten: boolean) => {
      let n = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const s = hof();
        s.seed = seed;
        s.day = 40; // Sommer
        kaufe(s, 'entenhaus', 'becken');
        for (let i = 0; i < 6; i++) tier(s, 'hybrid');
        if (enten) for (let i = 0; i < 3; i++) tier(s, 'laufente');
        s.cleanliness = 20;
        for (let h = 0; h < 20 * 24; h++) {
          advanceHour(s);
          for (const a of living(s)) {
            if (a.breed === 'hybrid') n += a.conditions.filter(c => c.id === 'wuermer').length;
            a.conditions = [];
            a.food = a.water = a.health = 100;
          }
          s.pond = 100;
        }
      }
      return n;
    };
    expect(duckSnails(hof())).toBe(false);
    expect(wurm(true)).toBeLessThan(wurm(false) * 0.85);
  });

  it('Laufenten fressen Schnecken: ein Viertel mehr Gemüse', () => {
    const s = hof();
    kaufe(s, 'beet');
    tier(s, 'laufente');
    expect(duckSnails(s)).toBe(true);
    sow(s);
    s.day += 20;
    expect(harvest(s).msg).toBe('5 kg Gemüse geerntet.');
  });

  it('nur Hühner dürfen auf die Geflügelschau', () => {
    const s = hof();
    expect(showProblem(s, tier(s, 'laufente'))).toBe('Auf der Geflügelschau sind nur Hühner zugelassen');
    expect(showProblem(s, tier(s, 'hybrid'))).toMatch(/Hybriden/);
  });

  it('Hahn-Aufträge gelten nicht für Erpel', () => {
    const s = hof();
    tier(s, 'hybrid');
    tier(s, 'laufente', 'hahn');
    expect(possibleKinds(s)).not.toContain('hahn');
    s.orders = [{ id: 1, customer: 'x', kind: 'hahn', qty: 1, reward: 10, dueDay: 99 }];
    expect(A.fulfillOrder(s, 1).ok).toBe(false);
    expect(A.orderAnimals(s, 'suppenhuhn')).toEqual([]);
  });
});

describe('Spielstand', () => {
  it('Arten, Becken und ihre Eier überstehen Export und Import', () => {
    const s = hof();
    kaufe(s, 'entenhaus', 'becken');
    tier(s, 'laufente');
    tier(s, 'gans', 'hahn');
    tier(s, 'wachtel');
    s.eggs = { gans: 2 };
    s.pond = 55;
    const t = importSave(JSON.stringify(s));
    expect(t?.animals.map(a => a.breed)).toEqual(['laufente', 'gans', 'wachtel']);
    expect(t?.pond).toBe(55);
  });

  it('Becken außerhalb 0–100 wird abgelehnt', () => {
    const o = JSON.parse(JSON.stringify(hof()));
    o.pond = 101;
    expect(importSave(JSON.stringify(o))).toBeNull();
  });
});

describe('Männchen anderer Arten sind keine Hähne', () => {
  it('ein Erpel befruchtet keine Hühnereier und schützt nicht vor dem Habicht', () => {
    const s = hof();
    kaufe(s, 'entenhaus', 'becken');
    tier(s, 'laufente', 'hahn');
    for (let i = 0; i < 4; i++) tier(s, 'hybrid');
    expect(adultRoosters(s)).toEqual([]);
    const ohne = hawkProtection(s);
    s.hour = 7;
    for (let i = 0; i < 24 * 5; i++) {
      advanceHour(s);
      for (const a of living(s)) { a.food = a.water = 100; }
    }
    expect(s.nestHatchEggs.filter(e => e.breed === 'hybrid')).toEqual([]);
    expect(s.hatchEggs.filter(e => e.breed === 'hybrid')).toEqual([]);
    tier(s, 'hybrid', 'hahn');
    expect(hawkProtection(s)).toBeCloseTo(ohne + 0.15);
  });

  it('Kapitel 2 „Einen Hahn halten“: Erpel, Ganter und Wachtelhahn zählen nicht', () => {
    const s = hof();
    s.chapter = 2;
    s.goals = chapterGoals(2);
    tier(s, 'laufente', 'hahn');
    tier(s, 'gans', 'hahn');
    tier(s, 'wachtel', 'hahn');
    checkGoals(s);
    expect(s.goals.find(g => g.id === 'hahn')?.done).toBe(false);
    tier(s, 'sussex', 'hahn', 15);
    checkGoals(s);
    expect(s.goals.find(g => g.id === 'hahn')?.done).toBe(true);
  });
});

describe('Getrennte Ansteckung (0.5.1)', () => {
  it('Ansteckungsgruppen: eigene Unterkunft trennt, ohne Unterkunft und als Küken bei den Hühnern', () => {
    const s = hof();
    const h = tier(s, 'hybrid');
    const e = tier(s, 'laufente');
    const k = tier(s, 'laufente', 'henne', 2);
    expect(diseaseGroup(s, h)).toBe('huhn');
    expect(diseaseGroup(s, e)).toBe('huhn'); // noch kein Entenhaus
    kaufe(s, 'entenhaus');
    expect(diseaseGroup(s, e)).toBe('ente');
    expect(diseaseGroup(s, k)).toBe('huhn'); // Küken in der Kükenstation
    expect(diseaseGroup(s, tier(s, 'wachtel'))).toBe('huhn');
  });

  it('kranke Hühner stecken Enten in eigener Unterkunft nicht an', () => {
    const zaehle = (haus: boolean) => {
      let n = 0;
      for (let seed = 1; seed <= 6; seed++) {
        const s = hof();
        s.seed = seed;
        s.day = 40; // Sommer: kaum spontane Infekte
        if (haus) kaufe(s, 'entenhaus', 'becken');
        const huehner = Array.from({ length: 6 }, () => tier(s, 'hybrid'));
        const enten = Array.from({ length: 4 }, () => tier(s, 'laufente'));
        for (let h = 0; h < 10 * 24; h++) {
          for (const a of huehner) a.conditions = [{ id: 'schnupfen', severity: 90 }];
          advanceHour(s);
          for (const a of [...huehner, ...enten]) Object.assign(a, { food: 100, water: 100, health: 100, dead: false });
          for (const e of enten) { n += e.conditions.filter(c => c.id === 'schnupfen').length; e.conditions = []; }
          s.pond = 100;
        }
      }
      return n;
    };
    const ohne = zaehle(false);
    expect(ohne).toBeGreaterThan(20);
    expect(zaehle(true)).toBeLessThan(ohne * 0.1);
  });
});

describe('Gänse und Wachteln robuster (0.5.1)', () => {
  it('Eierpreise: Gans 6-fach, Wachtel 0,4-fach, Ente unverändert 1,6-fach', () => {
    expect([BREEDS.gans.eggValue, BREEDS.wachtel.eggValue, BREEDS.laufente.eggValue]).toEqual([6, 0.4, 1.6]);
  });

  it('in eigener Unterkunft bekommen Gänse und Wachteln deutlich seltener Atemwegsinfekte als Enten', () => {
    const zaehle = (breed: BreedId, haus: string[]) => {
      let n = 0;
      for (let seed = 1; seed <= 8; seed++) {
        const s = hof();
        s.seed = seed;
        s.day = 95; // Winter
        kaufe(s, ...haus);
        const tiere = Array.from({ length: 6 }, () => tier(s, breed));
        for (let h = 0; h < 20 * 24; h++) {
          advanceHour(s);
          for (const a of tiere) { n += a.conditions.filter(c => c.id === 'schnupfen').length; a.conditions = []; Object.assign(a, { food: 100, water: 100, health: 100 }); }
          s.pond = 100;
        }
      }
      return n;
    };
    const enten = zaehle('laufente', ['entenhaus', 'becken']);
    expect(enten).toBeGreaterThan(10);
    expect(zaehle('gans', ['gaensestall', 'grasweide'])).toBeLessThan(enten * 0.7);
    expect(zaehle('wachtel', ['voliere'])).toBeLessThan(enten * 0.7);
  });
});
