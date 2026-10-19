// Neuer Hof, neue Tiere und das Ergänzen älterer Spielstände (src/game/state.ts).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BREEDS, DIFFICULTIES, HEN_NAMES, ROOSTER_NAMES } from '../src/game/data';
import { chapterGoals, createAnimal, exportSave, importSave, newGame, randomVariant, targetWeight } from '../src/game/state';
import type { Difficulty, GameState } from '../src/game/types';

const hof = (seed = 1) => newGame({ farmName: 'Testhof', difficulty: 'mittel', plot: 'obst', seed });

describe('Neuer Hof', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('startet mit leerem Stall, Startgeld und ohne Kredit', () => {
    const s = hof();
    expect(s).toMatchObject({
      version: 1, farmName: 'Testhof', day: 1, hour: 7, debt: 0, loanUsed: false, speed: 1, hat: 'stroh',
      equip: { fence: null, coop: null, drinker: null, feeder: null }, extras: [], cosmetics: [],
      foxAlertDay: -1, marderAlertDay: -1, hawkAlertDay: -1, offersDay: -99, marketVersion: 2,
      toasts: [], report: null, banners: [], celebrations: [], gameOver: false, chapter: 1,
    });
    expect(s.inventory).toEqual({ koerner: 0, legemehl: 0, kuekenstarter: 0, mehlwuermer: 0, einstreu: 1, kieselgur: 0,
      milbenspray: 0, wurmkur: 0, kokzidiostatikum: 0, mist: 0 });
  });

  it.each(['leicht', 'mittel', 'schwer'] as Difficulty[])('Startgeld je Schwierigkeit: %s', (d) => {
    expect(newGame({ farmName: 'x', difficulty: d, plot: 'obst', seed: 1 }).money).toBe(DIFFICULTIES[d].startMoney);
  });

  it('nimmt „Mein Hof“, wenn kein Name eingegeben ist', () => {
    expect(newGame({ farmName: '', difficulty: 'mittel', plot: 'obst', seed: 1 }).farmName).toBe('Mein Hof');
  });

  it('würfelt ohne vorgegebenen Seed einen ganzzahligen Seed aus dem ganzen Bereich', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(newGame({ farmName: 'x', difficulty: 'mittel', plot: 'obst' }).seed).toBe(2 ** 30);
  });

  it('übernimmt einen vorgegebenen Seed, auch 0', () => {
    expect(hof(0).seed).toBe(0);
  });
});

describe('Kapitelziele', () => {
  it.each([
    [1, ['zaun', 'stall', 'traenke', 'futter', 'huehner3', 'eier10']],
    [2, ['hahn', 'schlupf', 'aufzucht', 'fuchs50']],
    [3, ['hofladen', 'sterne3', 'eier150', 'tiere10']],
  ])('Kapitel %i hat die Ziele %j, alle offen und mit Text', (ch, ids) => {
    const goals = chapterGoals(ch);
    expect(goals.map(g => g.id)).toEqual(ids);
    for (const g of goals) {
      expect(g.done).toBe(false);
      expect(g.text.length).toBeGreaterThan(0);
    }
  });

  it.each([0, 4, -1, 1.5])('Kapitel %s gibt es nicht: keine Ziele', (ch) => {
    expect(chapterGoals(ch)).toEqual([]);
  });
});

describe('Neue Tiere', () => {
  it('Hennen bekommen Hennennamen, Hähne Hahnnamen', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = hof(seed);
      expect(HEN_NAMES).toContain(createAnimal(s, 'hybrid', { sex: 'henne' }).name);
      expect(ROOSTER_NAMES).toContain(createAnimal(s, 'hybrid', { sex: 'hahn' }).name);
    }
  });

  it('vergibt keinen Namen doppelt, solange die Liste reicht; danach „Henne <ID>“ bzw. „Hahn <ID>“', () => {
    const s = hof();
    for (const [sex, liste, ersatz] of [['henne', HEN_NAMES, 'Henne'], ['hahn', ROOSTER_NAMES, 'Hahn']] as const) {
      const namen = liste.map(() => { const a = createAnimal(s, 'hybrid', { sex }); s.animals.push(a); return a.name; });
      expect(new Set(namen).size).toBe(liste.length);
      const naechste = createAnimal(s, 'hybrid', { sex });
      expect(naechste.name).toBe(`${ersatz} ${naechste.id}`);
    }
  });

  it('würfelt das Geschlecht, wenn keins vorgegeben ist: beide kommen vor', () => {
    const s = hof(3);
    const geschlechter = new Set(Array.from({ length: 40 }, () => createAnimal(s, 'hybrid').sex));
    expect(geschlechter).toEqual(new Set(['henne', 'hahn']));
  });

  it('ein Hahn ist nie brütig, behält aber andere Charakterzüge; Hennen können brütig sein', () => {
    const s = hof(5);
    const haehne = Array.from({ length: 300 }, () => createAnimal(s, 'hybrid', { sex: 'hahn' }).personality);
    const hennen = Array.from({ length: 300 }, () => createAnimal(s, 'hybrid', { sex: 'henne' }).personality);
    expect(haehne).not.toContain('bruetig');
    expect(haehne).toContain('scheu');
    expect(haehne).toContain('mutig');
    expect(hennen).toContain('bruetig');
    expect(hennen).toContain('scheu');
  });

  it('übernimmt Alter, Mutter und Herkunft', () => {
    const s = hof();
    s.day = 50;
    const a = createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 20, motherId: 3, history: 'Vom Markt' });
    expect(a).toMatchObject({ hatchedDay: 30, motherId: 3, history: ['Vom Markt'], arrivedDay: 50, dead: false });
    expect(createAnimal(s, 'hybrid', { sex: 'henne' }).history).toEqual([]);
  });

  it('vergibt fortlaufende IDs', () => {
    const s = hof();
    const a = createAnimal(s, 'hybrid');
    const b = createAnimal(s, 'hybrid');
    expect(b.id).toBe(a.id + 1);
    expect(s.nextId).toBe(b.id + 1);
  });
});

describe('Farbvarianten', () => {
  const zaehle = (s: GameState, uniform: boolean, n = 3000) => {
    const z = new Map<string, number>();
    for (let i = 0; i < n; i++) { const v = randomVariant(s, 'hybrid', uniform); z.set(v, (z.get(v) ?? 0) + 1); }
    return z;
  };
  const varianten = BREEDS.hybrid.variants.map(v => v.id);

  it('die erste Farbe ist mit rund 60 % die häufigste, die anderen kommen auch vor', () => {
    const z = zaehle(hof(11), false);
    expect([...z.keys()].every(v => varianten.includes(v))).toBe(true);
    expect(z.get(varianten[0])! / 3000).toBeGreaterThan(0.55);
    expect(z.get(varianten[0])! / 3000).toBeLessThan(0.65);
    expect(z.size).toBe(varianten.length);
  });

  it('gleichverteilt: jede Farbe etwa gleich oft', () => {
    const z = zaehle(hof(12), true);
    expect(z.size).toBe(varianten.length);
    const erwartet = 1 / varianten.length;
    for (const v of varianten) {
      expect(z.get(v)! / 3000).toBeGreaterThan(erwartet - 0.05);
      expect(z.get(v)! / 3000).toBeLessThan(erwartet + 0.05);
    }
  });
});

describe('Zielgewicht', () => {
  const tier = (sex: 'henne' | 'hahn', ageDays: number, health: number) => {
    const s = hof();
    s.day = 100;
    const a = createAnimal(s, 'hybrid', { sex, ageDays });
    a.health = health;
    return targetWeight(s, a);
  };

  it.each([
    // Legehybride: Henne 1,9 kg, Hahn 2,4 kg; Faktor Alter min(1, 0,05 + Alter/30), Gesundheit 0,9 … 1,1
    ['Küken am ersten Tag', 'henne', 0, 100, 0.1],
    ['Henne mit 12 Tagen', 'henne', 12, 100, 0.94],
    ['ausgewachsene gesunde Henne', 'henne', 30, 100, 2.09],
    ['ausgewachsene Henne, halb gesund', 'henne', 60, 50, 1.9],
    ['ausgewachsener kranker Hahn', 'hahn', 60, 0, 2.16],
    ['Hahn mit 12 Tagen', 'hahn', 12, 100, 1.19],
  ] as const)('%s: %s kg', (_, sex, ageDays, health, kg) => {
    expect(tier(sex, ageDays, health)).toBe(kg);
  });
});

describe('Ältere Spielstände ergänzen', () => {
  type O = Record<string, unknown>;
  const alt = (aenderung: (o: O) => void) => {
    const s = hof();
    s.day = 40;
    s.animals.push(
      createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 200, variant: 'braun' }),
      createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 1, variant: 'weiss' }),
    );
    const o = JSON.parse(exportSave(s)) as O;
    aenderung(o);
    return importSave(JSON.stringify(o))!;
  };

  it('ergänzt fehlende Listen und Weideseite, vorhandene bleiben', () => {
    const neu = alt(o => { delete o.banners; delete o.celebrations; delete o.pastureSide; o.toasts = [{ text: 'alt' }]; });
    expect(neu).toMatchObject({ banners: [], celebrations: [], pastureSide: 0, toasts: [] });
    const behalten = alt(o => { o.banners = ['Hallo']; o.celebrations = [{ emoji: '🎉', title: 'x', lines: [] }]; o.pastureSide = 1; });
    expect(behalten.banners).toEqual(['Hallo']);
    expect(behalten.celebrations).toHaveLength(1);
    expect(behalten.pastureSide).toBe(1);
  });

  it.each([
    ['frischer Hof', 0, 1, false],
    ['schon Eier verkauft', 1, 1, true],
    ['schon im zweiten Kapitel', 0, 2, true],
  ])('Tutorial bei fehlender Einstellung: %s', (_, eggsSold, chapter, aus) => {
    const s = alt(o => { delete o.tutorialOff; (o.stats as O).eggsSold = eggsSold; o.chapter = chapter; });
    expect(s.tutorialOff).toBe(aus);
  });

  it('eine vorhandene Tutorial-Einstellung bleibt', () => {
    expect(alt(o => { o.tutorialOff = true; }).tutorialOff).toBe(true);
    expect(alt(o => { o.tutorialOff = false; (o.stats as O).eggsSold = 5; }).tutorialOff).toBe(false);
  });

  it('ohne Album: trägt lebende Tiere ein, aber keine Küken', () => {
    const s = alt(o => { delete o.album; });
    expect(s.album).toEqual({ 'hybrid:braun': { day: 40, name: s.animals[0].name } });
  });

  it('ein vorhandenes Album bleibt unverändert, auch wenn es leer ist', () => {
    expect(alt(o => { o.album = {}; }).album).toEqual({});
  });
});
