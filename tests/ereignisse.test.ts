import { describe, expect, it } from 'vitest';
import * as A from '../src/game/actions';
import {
  catchEscapee, DARKEN_COST, dailyEvents, ESCAPE_REGION, eveningEscapee, findNest, GIFT_EGGS, hourlyEscape, NEIGHBOR_FINE, NEST_DAYS,
  neighborChoice, neighborComplains, QUIET_DAYS, startEscape, startHiddenNest,
} from '../src/game/ereignisse';
import { outsideAnimals } from '../src/game/helpers';
import { advanceHour, moveFlock } from '../src/game/sim';
import { createAnimal, importSave, newGame } from '../src/game/state';
import type { BreedId, GameState, Sex } from '../src/game/types';

const tier = (s: GameState, sex: Sex = 'henne', ageDays = 200, breed: BreedId = 'hybrid') => {
  const a = createAnimal(s, breed, { sex, ageDays });
  s.animals.push(a);
  return a;
};
/** Hof mit Zaun und Stall, Tag 10, 11 Uhr */
function hof(seed = 4) {
  const s = newGame({ farmName: 'Test', difficulty: 'mittel', plot: 'obst', seed });
  for (const id of ['knoten', 'kiste', 'eimer', 'trog']) expect(A.buyItem(s, id).ok).toBe(true);
  s.money = 500;
  s.day = 10;
  s.hour = 11;
  return s;
}

describe('Verstecktes Nest', () => {
  it('braucht Zaun und eine erwachsene Henne', () => {
    const s = newGame({ farmName: 'Test', difficulty: 'mittel', plot: 'obst', seed: 1 });
    tier(s);
    expect(startHiddenNest(s)).toBe(false); // ohne Zaun kein Auslauf
    const t = hof();
    tier(t, 'henne', 15);
    tier(t, 'hahn');
    expect(startHiddenNest(t)).toBe(false);
    const h = tier(t);
    expect(startHiddenNest(t)).toBe(true);
    expect(t.hiddenNest).toMatchObject({ henId: h.id, since: 10, eggs: 0 });
    expect(t.toasts.at(-1)?.text).toMatch(new RegExp(`${h.name}.*Versteck`));
  });

  it('liegt im Auslauf', () => {
    for (let seed = 1; seed < 30; seed++) {
      const s = hof(seed);
      tier(s);
      startHiddenNest(s);
      const n = s.hiddenNest!;
      expect(n.x).toBeGreaterThanOrEqual(262);
      expect(n.x).toBeLessThanOrEqual(448);
      expect(n.y).toBeGreaterThanOrEqual(192);
      expect(n.y).toBeLessThanOrEqual(246);
    }
  });

  it('die Henne legt ins Versteck statt ins Stallnest', () => {
    const s = hof();
    const h = tier(s);
    startHiddenNest(s);
    for (let i = 0; i < 24 * 3; i++) {
      advanceHour(s);
      h.food = h.water = 100; // gut versorgt, damit sie legt
    }
    expect(s.hiddenNest?.eggs).toBeGreaterThan(0);
    expect(s.hiddenNest!.eggs).toBe(h.eggsLaid);
    expect(Object.values(s.nestEggs).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('Finden bringt die Eier ins Lager und beendet das Versteck', () => {
    const s = hof();
    tier(s);
    startHiddenNest(s);
    s.hiddenNest!.eggs = 3;
    expect(findNest(s)).toEqual({ ok: true, msg: expect.stringMatching(/3 Eier/) });
    expect(s.eggs.hybrid).toBe(3);
    expect(s.hiddenNest).toBeNull();
    expect(findNest(s).ok).toBe(false);
  });

  it('auch ein leeres Versteck lässt sich finden', () => {
    const s = hof();
    tier(s);
    startHiddenNest(s);
    expect(findNest(s).ok).toBe(true);
    expect(s.eggs.hybrid ?? 0).toBe(0);
  });

  it(`nach ${NEST_DAYS} Tagen verderben die Eier, nicht früher`, () => {
    const s = hof();
    tier(s);
    startHiddenNest(s);
    s.hiddenNest!.eggs = 4;
    s.day += NEST_DAYS - 1;
    dailyEvents(s);
    expect(s.hiddenNest?.eggs).toBe(4);
    s.day++;
    dailyEvents(s);
    expect(s.hiddenNest).toBeNull();
    expect(s.log[0].text).toMatch(/4 Eier.*verdorben/);
  });

  it('endet, wenn die Henne nicht mehr da ist', () => {
    const s = hof();
    const h = tier(s);
    startHiddenNest(s);
    s.hiddenNest!.eggs = 2;
    s.animals = s.animals.filter(a => a !== h);
    dailyEvents(s);
    expect(s.hiddenNest).toBeNull();
  });
});

describe('Ausgebüxtes Huhn', () => {
  it('nur tagsüber, mit Zaun und einem Huhn im Auslauf', () => {
    const s = hof();
    const h = tier(s);
    h.outside = false;
    expect(startEscape(s)).toBe(false);
    h.outside = true;
    s.hour = 22;
    expect(startEscape(s)).toBe(false);
    s.hour = 11;
    expect(startEscape(s)).toBe(true);
    expect(s.escapee).toMatchObject({ id: h.id, since: 10 });
    expect(s.escapee!.x).toBeGreaterThanOrEqual(ESCAPE_REGION.x0);
    expect(s.escapee!.x).toBeLessThanOrEqual(ESCAPE_REGION.x1);
    expect(s.toasts.at(-1)).toMatchObject({ kind: 'warn', text: expect.stringMatching(new RegExp(`${h.name}.*ausgebüxt`)) });
    expect(startEscape(s)).toBe(false); // nur einer zur Zeit
  });

  it('schwacher Zaun lässt öfter eins entwischen, im Winter niemand', () => {
    const zaehle = (fence: string, day: number) => {
      let n = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const s = hof(seed);
        s.equip.fence = fence;
        s.day = day;
        tier(s).outside = true;
        hourlyEscape(s);
        if (s.escapee) n++;
      }
      return n;
    };
    const knoten = zaehle('knoten', 40), maschen = zaehle('maschen', 40);
    expect(knoten).toBeGreaterThan(5);
    expect(maschen).toBeLessThan(knoten * 0.6);
    expect(zaehle('knoten', 100)).toBe(0); // Tag 91–120: Winter
  });

  it('Küken büxen nicht aus', () => {
    const s = hof();
    tier(s, 'henne', 3).outside = true;
    expect(startEscape(s)).toBe(false);
  });

  it('zählt nicht mehr als „im Auslauf“: Reinlocken holt es nicht, die Herde bewegt es nicht', () => {
    const s = hof();
    s.inventory.koerner = 5;
    const h = tier(s);
    h.outside = true;
    startEscape(s);
    expect(outsideAnimals(s)).toEqual([]);
    expect(A.lureIn(s).ok).toBe(false);
    s.hour = 20;
    s.minute = 50;
    moveFlock(s);
    expect(h.outside).toBe(true);
  });

  it('Einfangen bringt es zurück in den Auslauf', () => {
    const s = hof();
    const h = tier(s);
    h.outside = true;
    startEscape(s);
    expect(catchEscapee(s)).toEqual({ ok: true, msg: `${h.name} ist wieder im Auslauf.` });
    expect(s.escapee).toBeNull();
    expect(outsideAnimals(s)).toEqual([h]);
    expect(catchEscapee(s).ok).toBe(false);
  });

  it('nicht eingefangen: abends holt es meist der Fuchs, sonst kommt es selbst zurück', () => {
    let tot = 0, zurueck = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = hof(seed);
      const h = tier(s);
      h.outside = true;
      startEscape(s);
      eveningEscapee(s);
      expect(s.escapee).toBeNull();
      if (h.dead) {
        tot++;
        expect(h.deathCause).toMatch(/Fuchs/);
      } else {
        zurueck++;
        expect(h.outside).toBe(false);
      }
    }
    expect(tot / 200).toBeGreaterThan(0.6);
    expect(tot / 200).toBeLessThan(0.8);
    expect(zurueck).toBeGreaterThan(0);
  });

  it('der Abend läuft im Spiel um 21 Uhr', () => {
    const s = hof();
    const h = tier(s);
    h.outside = true;
    startEscape(s);
    while (s.hour !== 21) advanceHour(s);
    expect(s.escapee).toBeNull();
  });

  it('verschwindet, wenn das Tier verkauft wurde', () => {
    const s = hof();
    const h = tier(s);
    h.outside = true;
    startEscape(s);
    s.animals = [];
    eveningEscapee(s);
    expect(s.escapee).toBeNull();
    expect(s.toasts.at(-1)?.text).not.toMatch(/Fuchs/);
  });
});

describe('Nachbar beschwert sich über den Hahn', () => {
  it('nur mit erwachsenem Hahn', () => {
    const s = hof();
    tier(s, 'hahn', 15);
    expect(neighborComplains(s)).toBe(false);
    tier(s, 'hahn');
    expect(neighborComplains(s)).toBe(true);
    expect(s.neighbor?.pending).toBe(true);
    const c = s.celebrations.at(-1)!;
    expect(c.choices?.map(x => x.act)).toEqual(['nachbar:eier', 'nachbar:verdunkeln', 'nachbar:ignorieren']);
    expect(neighborComplains(s)).toBe(false); // offene Beschwerde
  });

  it(`Eierkarton: ${GIFT_EGGS} Eier, dann ${QUIET_DAYS} Tage Ruhe`, () => {
    const s = hof();
    tier(s, 'hahn');
    neighborComplains(s);
    s.eggs = { hybrid: 5 };
    expect(neighborChoice(s, 'eier')).toEqual({ ok: false, msg: `Dafür brauchst du ${GIFT_EGGS} Eier im Lager.` });
    s.eggs = { hybrid: 4, marans: 4 };
    expect(neighborChoice(s, 'eier').ok).toBe(true);
    expect(s.eggs).toEqual({ hybrid: 0, marans: 2 }); // die günstigsten zuerst
    expect(s.neighbor).toMatchObject({ pending: false, quietUntil: 10 + QUIET_DAYS });
    s.day += QUIET_DAYS - 1;
    expect(neighborComplains(s)).toBe(false);
    s.day++;
    expect(neighborComplains(s)).toBe(true);
  });

  it(`Verdunkeln kostet ${DARKEN_COST} € und macht Beschwerden seltener`, () => {
    const s = hof();
    tier(s, 'hahn');
    neighborComplains(s);
    s.money = DARKEN_COST - 1;
    expect(neighborChoice(s, 'verdunkeln').ok).toBe(false);
    s.money = 100;
    const ausruestung = s.finance!.cur.ausruestung ?? 0;
    expect(neighborChoice(s, 'verdunkeln').ok).toBe(true);
    expect(s.money).toBe(100 - DARKEN_COST);
    expect(s.finance!.cur.ausruestung).toBe(ausruestung - DARKEN_COST);
    expect(s.neighbor).toMatchObject({ pending: false, darkened: true });
  });

  it('wer ignoriert, zahlt bei der nächsten Beschwerde Bußgeld', () => {
    const s = hof();
    tier(s, 'hahn');
    neighborComplains(s);
    expect(neighborChoice(s, 'ignorieren').ok).toBe(true);
    expect(s.neighbor).toMatchObject({ pending: false, warned: true });
    const vorher = s.money;
    expect(neighborComplains(s)).toBe(true);
    expect(s.money).toBe(vorher - NEIGHBOR_FINE);
    expect(s.neighbor).toMatchObject({ pending: false, warned: false });
    expect(s.celebrations.at(-1)?.choices).toBeUndefined();
  });

  it('ohne offene Beschwerde gibt es nichts zu entscheiden; unbekannte Wahl wird abgelehnt', () => {
    const s = hof();
    expect(neighborChoice(s, 'eier').ok).toBe(false);
    tier(s, 'hahn');
    neighborComplains(s);
    expect(neighborChoice(s, 'drohen' as 'eier').ok).toBe(false);
    expect(s.neighbor?.pending).toBe(true);
  });

  it('verdunkelter Stall: Beschwerden deutlich seltener', () => {
    const zaehle = (darkened: boolean) => {
      let n = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const s = hof(seed);
        tier(s, 'hahn');
        s.neighbor = { pending: false, warned: false, quietUntil: 0, darkened };
        dailyEvents(s);
        if (s.neighbor.pending) n++;
      }
      return n;
    };
    const normal = zaehle(false);
    expect(normal).toBeGreaterThan(3);
    expect(zaehle(true)).toBeLessThan(normal * 0.6);
  });
});

describe('Spielstand', () => {
  it('Versteck, Ausbüxer, Nachbar und Auswahlknöpfe überstehen Export und Import', () => {
    const s = hof();
    tier(s);
    const h = tier(s);
    h.outside = true;
    tier(s, 'hahn');
    startHiddenNest(s);
    startEscape(s);
    neighborComplains(s);
    const t = importSave(JSON.stringify(s));
    expect(t?.hiddenNest).toEqual(s.hiddenNest);
    expect(t?.escapee).toEqual(s.escapee);
    expect(t?.neighbor).toEqual(s.neighbor);
    expect(t?.celebrations.at(-1)?.choices).toEqual(s.celebrations.at(-1)?.choices);
  });

  it.each([
    ['Auswahl mit fremder Aktion', (o: Record<string, any>) => { o.celebrations = [{ emoji: 'x', title: 't', lines: [], choices: [{ act: 'tab:shop', label: 'x' }] }]; }],
    ['Auswahl mit HTML in der Aktion', (o: Record<string, any>) => { o.celebrations = [{ emoji: 'x', title: 't', lines: [], choices: [{ act: 'nachbar:eier"><img src=x>', label: 'x' }] }]; }],
    ['Versteck mit Text-ID', (o: Record<string, any>) => { o.hiddenNest = { henId: 'x', since: 1, eggs: 0, x: 300, y: 200 }; }],
    ['Versteck mit negativen Eiern', (o: Record<string, any>) => { o.hiddenNest = { henId: 1, since: 1, eggs: -1, x: 300, y: 200 }; }],
    ['Ausbüxer ohne Position', (o: Record<string, any>) => { o.escapee = { id: 1, since: 1 }; }],
    ['Nachbar mit Text', (o: Record<string, any>) => { o.neighbor = 'laut'; }],
  ])('lehnt ab: %s', (_, aendern) => {
    const o = JSON.parse(JSON.stringify(hof()));
    aendern(o);
    expect(importSave(JSON.stringify(o))).toBeNull();
  });
});

describe('Grenzfälle', () => {
  it('brütende Hennen suchen kein Versteck; am letzten Bruttag schon', () => {
    const s = hof();
    const h = tier(s);
    h.broodingUntil = s.day + 1;
    expect(startHiddenNest(s)).toBe(false);
    h.broodingUntil = s.day;
    expect(startHiddenNest(s)).toBe(true);
  });

  it('gefundene Eier haben die Rasse der Henne; fehlt die Henne, gelten sie als Hybrideier', () => {
    const s = hof();
    tier(s, 'henne', 200, 'marans');
    startHiddenNest(s);
    s.hiddenNest!.eggs = 2;
    findNest(s);
    expect(s.eggs).toEqual({ marans: 2 });
    s.hiddenNest = { henId: 999, since: s.day, eggs: 1, x: 300, y: 200 };
    findNest(s);
    expect(s.eggs).toEqual({ marans: 2, hybrid: 1 });
  });

  it('ein leeres Versteck legt keine Eier an', () => {
    const s = hof();
    tier(s);
    startHiddenNest(s);
    expect(findNest(s).msg).toMatch(/noch leer/);
    expect(s.eggs).toEqual({});
    expect(s.log[0].text).toBe('🔍 Verstecktes Nest gefunden.');
  });

  it('ein Versteck ohne Eier verschwindet still; eins mit totem Huhn endet', () => {
    const s = hof();
    const h = tier(s);
    startHiddenNest(s);
    s.day += NEST_DAYS;
    const vorher = s.toasts.length;
    dailyEvents(s);
    expect(s.hiddenNest).toBeNull();
    expect(s.toasts.slice(vorher).some(x => /Versteck/.test(x.text))).toBe(false);
    s.hiddenNest = { henId: h.id, since: s.day, eggs: 3, x: 300, y: 200 };
    h.dead = true;
    dailyEvents(s);
    expect(s.hiddenNest).toBeNull();
    expect(s.toasts.at(-1)).toMatchObject({ kind: 'warn', text: '🔍 Das Versteck wurde nicht gefunden: 3 Eier sind verdorben.' });
  });

  it('Einfangen klappt nicht, wenn das Tier inzwischen tot ist', () => {
    const s = hof();
    const h = tier(s);
    h.outside = true;
    startEscape(s);
    h.dead = true;
    expect(catchEscapee(s)).toEqual({ ok: false, msg: 'Das Tier ist nicht mehr da.' });
    expect(s.escapee).toBeNull();
  });

  it('abends: ein schon totes Tier wird nicht noch einmal geholt', () => {
    const s = hof();
    const h = tier(s);
    h.outside = true;
    startEscape(s);
    h.dead = true;
    const tote = s.stats.deaths;
    eveningEscapee(s);
    expect(s.stats.deaths).toBe(tote);
  });

  it('der Fuchs nimmt das Tier ganz mit (nichts zu entsorgen) und zählt als Raubtierverlust', () => {
    for (let seed = 1; seed < 20; seed++) {
      const s = hof(seed);
      const h = tier(s);
      h.outside = true;
      startEscape(s);
      eveningEscapee(s);
      if (!h.dead) {
        expect(s.toasts.at(-1)?.text).toMatch(/selbst zurück/);
        continue;
      }
      expect(s.animals).not.toContain(h);
      expect(s.stats.predatorLosses).toBe(1);
      return;
    }
    throw new Error('kein Fuchs in 20 Seeds');
  });

  it('stündlich: Ausbüxer verschwindet, wenn das Tier tot ist', () => {
    const s = hof();
    const h = tier(s);
    h.outside = true;
    startEscape(s);
    s.hour = 12;
    hourlyEscape(s);
    expect(s.escapee).toBeTruthy();
    h.dead = true;
    hourlyEscape(s);
    expect(s.escapee).toBeNull();
  });

  it('nur Hennen: kein Hahn, keine Beschwerde; neuer Nachbar-Stand ohne Verdunkelung', () => {
    const s = hof();
    tier(s);
    expect(neighborComplains(s)).toBe(false);
    tier(s, 'hahn');
    neighborComplains(s);
    expect(s.neighbor).toEqual({ pending: true, warned: false, quietUntil: 0, darkened: false });
    expect(s.toasts.at(-1)).toMatchObject({ kind: 'warn' });
  });

  it('Bußgeld erscheint als Hinweis', () => {
    const s = hof();
    tier(s, 'hahn');
    s.neighbor = { pending: false, warned: true, quietUntil: 0, darkened: false };
    neighborComplains(s);
    expect(s.toasts.at(-1)).toMatchObject({ kind: 'bad', text: expect.stringMatching(/Bußgeld/) });
  });

  it('Eierkarton: genau 6 Eier reichen, die günstigsten gehen zuerst', () => {
    const s = hof();
    tier(s, 'hahn');
    neighborComplains(s);
    s.eggs = { marans: 4, hybrid: 2, sussex: 0 };
    expect(neighborChoice(s, 'eier').ok).toBe(true);
    expect(s.eggs).toEqual({ marans: 0, hybrid: 0, sussex: 0 });
    s.neighbor!.pending = true;
    s.eggs = { marans: 4, hybrid: 4 };
    neighborChoice(s, 'eier');
    expect(s.eggs).toEqual({ marans: 2, hybrid: 0 });
  });

  it('Verdunkeln geht mit genau dem nötigen Geld', () => {
    const s = hof();
    tier(s, 'hahn');
    neighborComplains(s);
    s.money = DARKEN_COST;
    expect(neighborChoice(s, 'verdunkeln')).toEqual({ ok: true, msg: 'Der Stall ist jetzt verdunkelt.' });
    expect(s.money).toBe(0);
  });

  it('Meldungen der Auswahl', () => {
    const s = hof();
    expect(neighborChoice(s, 'eier')).toEqual({ ok: false, msg: 'Gerade gibt es keine Beschwerde.' });
    tier(s, 'hahn');
    neighborComplains(s);
    s.money = 1;
    expect(neighborChoice(s, 'verdunkeln')).toEqual({ ok: false, msg: `Dafür brauchst du ${DARKEN_COST} €.` });
    expect(neighborChoice(s, 'drohen' as 'eier')).toEqual({ ok: false, msg: 'Unbekannte Auswahl.' });
    expect(neighborChoice(s, 'ignorieren')).toEqual({ ok: true, msg: 'Du ignorierst die Beschwerde.' });
  });
});
