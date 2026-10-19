// Genaue Wirkung der Spieleraktionen (src/game/actions.ts): Geld und Finanzkategorie, Lager, Tiere, Grenzwerte.
// Ergänzt aktionen.test.ts; die Fälle sind so gewählt, dass jede Bedingung auf beiden Seiten der Grenze geprüft wird.
import { describe, expect, it } from 'vitest';
import * as A from '../src/game/actions';
import { BREEDS, HEN_NAMES, PREVENTION_DAYS, SOUP_AGE } from '../src/game/data';
import { eggValue, hourIndex, ICE_FREE_HOURS } from '../src/game/helpers';
import { createAnimal, newGame } from '../src/game/state';
import type { Animal, Difficulty, GameState } from '../src/game/types';

type Offer = GameState['offers'][number];
type Order = NonNullable<GameState['orders']>[number];

function hof(difficulty: Difficulty = 'mittel', plot: 'obst' | 'bach' = 'obst'): GameState {
  const s = newGame({ farmName: 'Test', difficulty, plot, seed: 3 });
  s.money = 1000;
  s.day = 300;
  return s;
}
/** Hof mit Zaun, Stall (3 Plätze), Tränke (3 l) und Futtertrog (1,5 kg) */
function ausgeruestet(difficulty: Difficulty = 'mittel'): GameState {
  const s = hof(difficulty);
  s.equip = { fence: 'knoten', coop: 'kiste', drinker: 'eimer', feeder: 'trog' };
  return s;
}
function tier(s: GameState, opts: { sex?: 'henne' | 'hahn'; ageDays?: number } = {}): Animal {
  const a = createAnimal(s, 'hybrid', { sex: opts.sex ?? 'henne', ageDays: opts.ageDays ?? 200 });
  s.animals.push(a);
  return a;
}
const fin = (s: GameState, cat: string) => s.finance?.cur[cat as never] ?? 0;
const angebot = (o: Partial<Offer>): Offer => ({ id: 1, kind: 'legehenne', breed: 'hybrid', variant: 'braun', price: 15, qty: 1,
  seller: 'Hof Meyer', ...o } as Offer);
const auftrag = (o: Partial<Order>): Order => ({ id: 1, customer: 'Bäckerei', kind: 'eier', qty: 2, reward: 10, dueDay: 400, ...o } as Order);

describe('Preise', () => {
  it('Auslauf wird mit jeder Erweiterung 30 € teurer, andere Artikel nicht', () => {
    const s = hof();
    s.runExtensions = 2;
    expect(A.itemPrice(s, 'auslauf')).toBe(150);
    expect(A.itemPrice(s, 'licht')).toBe(A.itemPrice(hof(), 'licht'));
  });

  it('Futter kostet beim Lieferengpass das Anderthalbfache, anderes Material nicht', () => {
    const s = hof();
    s.events = [{ id: 'futterteuer', until: s.day }];
    expect(A.supplyPrice(s, 'koerner')).toBe(9);
    expect(A.supplyPrice(s, 'legemehl')).toBe(13.5);
    expect(A.supplyPrice(s, 'kuekenstarter')).toBe(10.5);
    expect(A.supplyPrice(s, 'einstreu')).toBe(5);
    s.events = [{ id: 'futterteuer', until: s.day - 1 }];
    expect(A.supplyPrice(s, 'koerner')).toBe(6);
  });

  it('Großpackung nur auf Wunsch und nur, wo es eine gibt', () => {
    const s = hof();
    expect(A.supplyPrice(s, 'koerner')).toBe(6);
    expect(A.supplyPrice(s, 'koerner', true)).toBe(12);
    expect(A.supplyPrice(s, 'einstreu', true)).toBe(21);
    expect(A.supplyPrice(s, 'mehlwuermer', true)).toBe(6);
  });
});

describe('Lagerplatz', () => {
  it('Futter: genau voll passt, ein Hundertstel mehr nicht', () => {
    const s = hof();
    s.inventory.koerner = 50;
    expect(A.storageProblem(s, 'legemehl', 10)).toBeNull();
    s.inventory.koerner = 60;
    expect(A.storageProblem(s, 'kuekenstarter', 0.01)).toBeNull();
    expect(A.storageProblem(s, 'koerner', 0.02)).toContain('höchstens 60 kg Futter');
  });

  it('Stroh: 8 Ballen passen, der neunte nicht', () => {
    const s = hof();
    s.inventory.einstreu = 7;
    expect(A.storageProblem(s, 'einstreu', 1)).toBeNull();
    s.inventory.einstreu = 8;
    expect(A.storageProblem(s, 'einstreu', 1)).toContain('höchstens 8 Ballen');
  });

  it('nennt den Lagerschuppen nur, wenn er fehlt; mit Schuppen passt mehr', () => {
    const s = hof();
    s.inventory.koerner = 60;
    expect(A.storageProblem(s, 'koerner', 10)).toContain('Lagerschuppen');
    s.extras.push('schuppen');
    expect(A.storageProblem(s, 'koerner', 10)).toBeNull();
    s.inventory.koerner = 300;
    expect(A.storageProblem(s, 'koerner', 10)).not.toContain('Lagerschuppen');
  });

  it('anderes Material ist nicht begrenzt', () => {
    expect(A.storageProblem(hof(), 'mehlwuermer', 1000)).toBeNull();
  });

  it('nennt den Futterbestand mit einer Nachkommastelle und Komma', () => {
    const s = hof();
    s.inventory.koerner = 55.46;
    expect(A.storageProblem(s, 'koerner', 10)).toContain('(jetzt 55,5 kg)');
  });
});

describe('Kaufen erlaubt?', () => {
  it.each([
    ['vorhandene Ausrüstung', (s: GameState) => { s.equip.fence = 'knoten'; }, 'knoten', 'Bereits vorhanden'],
    ['vorhandenes Zubehör', (s: GameState) => { s.extras.push('licht'); }, 'licht', 'Bereits vorhanden'],
    ['vorhandene Deko', (s: GameState) => { s.cosmetics.push('zwerg'); }, 'zwerg', 'Bereits vorhanden'],
    ['Auslauf voll ausgebaut', (s: GameState) => { s.equip.fence = 'knoten'; s.runExtensions = 3; }, 'auslauf', 'Maximal ausgebaut'],
    ['Auslauf ohne Zaun', () => {}, 'auslauf', 'Braucht zuerst einen Zaun'],
    ['Weidezaungerät ohne Elektronetz', (s: GameState) => { s.equip.fence = 'knoten'; }, 'geraet', 'Braucht Elektro-Geflügelnetz'],
    ['Bachpumpe auf dem Obstgrundstück', () => {}, 'pumpe', 'Nur auf dem Grundstück am Bach möglich'],
    ['Futterautomat ohne Futterstelle', () => {}, 'autofutter', 'Braucht zuerst eine Futterstelle'],
    ['Wechselweide ohne Zaun', () => {}, 'wechselweide', 'Braucht zuerst einen Zaun'],
    ['Stalllicht ohne Stall', () => {}, 'stalllicht', 'Braucht zuerst einen Stall'],
    ['Dämmung ohne Stall', () => {}, 'daemmung', 'Braucht zuerst einen Stall'],
    ['Dämmung im gedämmten Gartenhaus', (s: GameState) => { s.equip.coop = 'gartenhaus'; }, 'daemmung', 'Dein Stall ist schon gedämmt'],
    ['ein Cent zu wenig', (s: GameState) => { s.money = 59.99; }, 'knoten', 'Nicht genug Geld'],
  ])('nein: %s', (_, vorher, id, grund) => {
    const s = hof();
    vorher(s);
    expect(A.canBuy(s, id)).toBe(grund);
    const geld = s.money;
    expect(A.buyItem(s, id).ok).toBe(false);
    expect(s.money).toBe(geld);
  });

  it.each([
    ['anderer Zaun als der vorhandene', (s: GameState) => { s.equip.fence = 'knoten'; }, 'maschen'],
    ['zweite Auslauf-Erweiterung', (s: GameState) => { s.equip.fence = 'knoten'; s.runExtensions = 2; }, 'auslauf'],
    ['Weidezaungerät mit Elektronetz', (s: GameState) => { s.equip.fence = 'enetz'; }, 'geraet'],
    ['Futterautomat mit Futterstelle', (s: GameState) => { s.equip.feeder = 'trog'; }, 'autofutter'],
    ['Wechselweide mit Zaun', (s: GameState) => { s.equip.fence = 'knoten'; }, 'wechselweide'],
    ['Stalllicht mit Stall', (s: GameState) => { s.equip.coop = 'kiste'; }, 'stalllicht'],
    ['Dämmung für die Holzkiste', (s: GameState) => { s.equip.coop = 'kiste'; }, 'daemmung'],
    ['genau passendes Geld', (s: GameState) => { s.money = 60; }, 'knoten'],
  ])('ja: %s', (_, vorher, id) => {
    const s = hof();
    vorher(s);
    expect(A.canBuy(s, id)).toBeNull();
  });

  it('ja: Bachpumpe am Bach', () => {
    expect(A.canBuy(hof('mittel', 'bach'), 'pumpe')).toBeNull();
  });
});

describe('Ausrüstung kaufen', () => {
  it('nimmt alte Ausrüstung für 40 % in Zahlung und bucht alles unter Ausrüstung', () => {
    const s = hof();
    s.equip.fence = 'knoten';
    expect(A.buyItem(s, 'maschen').ok).toBe(true);
    expect(s.money).toBe(1000 - 140 + 24);
    expect(fin(s, 'ausruestung')).toBe(-116);
    expect(s.equip.fence).toBe('maschen');
  });

  it('ohne alte Ausrüstung gibt es nichts zurück', () => {
    const s = hof();
    A.buyItem(s, 'knoten');
    expect(s.money).toBe(940);
  });

  it('ein neuer Zaun warnt nicht vor Platzmangel, eine neue Tränke lässt das Futter in Ruhe', () => {
    const s = ausgeruestet();
    s.equip.feeder = 'silo';
    tier(s);
    s.feed = 5;
    const hinweise = s.toasts.length;
    A.buyItem(s, 'maschen');
    A.buyItem(s, 'nippel');
    expect(s.toasts.length).toBe(hinweise);
    expect(s.feed).toBe(5);
  });

  it('beim Wechsel weg vom Elektronetz verschwindet das Weidezaungerät, anderes Zubehör bleibt', () => {
    const s = hof();
    s.equip.fence = 'enetz';
    s.extras = ['geraet', 'licht'];
    A.buyItem(s, 'maschen');
    expect(s.extras).toEqual(['licht']);
  });

  it('bei anderem altem Zaun bleibt das Weidezaungerät', () => {
    const s = hof();
    s.equip.fence = 'knoten';
    s.extras = ['geraet'];
    A.buyItem(s, 'maschen');
    expect(s.extras).toEqual(['geraet']);
  });

  it('warnt beim zu kleinen Stall, aber nicht, wenn die Herde genau passt', () => {
    const s = ausgeruestet();
    s.equip.coop = 'kleintier';
    for (let i = 0; i < 3; i++) tier(s);
    const vorher = s.toasts.length;
    A.buyItem(s, 'kiste');
    expect(s.toasts.length).toBe(vorher);
    tier(s);
    s.equip.coop = 'kleintier';
    A.buyItem(s, 'kiste');
    expect(s.toasts.length).toBe(vorher + 1);
    expect(s.log[1].kind).toBe('warn');
    expect(s.log[1].text).toContain('nur 3 Plätze für 4 Tiere');
  });

  it('kleinere Tränke und Futterstelle kappen den Vorrat, kleinerer Vorrat bleibt', () => {
    const s = hof();
    s.water = 10; s.feed = 6;
    A.buyItem(s, 'eimer'); A.buyItem(s, 'trog');
    expect(s.water).toBe(3);
    expect(s.feed).toBe(1.5);
    const t = hof();
    t.water = 2; t.feed = 1;
    A.buyItem(t, 'eimer'); A.buyItem(t, 'trog');
    expect(t.water).toBe(2);
    expect(t.feed).toBe(1);
  });

  it('ein Hut wird gleich aufgesetzt, Deko nicht', () => {
    const s = hof();
    A.buyItem(s, 'zwerg');
    expect(s.hat).toBe('stroh');
    A.buyItem(s, 'hut_cowboy');
    expect(s.hat).toBe('hut_cowboy');
    expect(s.cosmetics).toEqual(['zwerg', 'hut_cowboy']);
    expect(s.extras).toEqual([]);
  });

  it('Auslauf zählt die Erweiterungen hoch statt ins Zubehör', () => {
    const s = hof();
    s.equip.fence = 'knoten';
    A.buyItem(s, 'auslauf');
    expect(s.runExtensions).toBe(1);
    expect(s.extras).toEqual([]);
    expect(s.money).toBe(910);
  });

  it('Flatterband merkt sich den Kauftag, anderes Zubehör nicht', () => {
    const s = hof();
    s.flatterbandSince = 0;
    A.buyItem(s, 'licht');
    expect(s.flatterbandSince).toBe(0);
    A.buyItem(s, 'flatterband');
    expect(s.flatterbandSince).toBe(300);
    expect(s.extras).toEqual(['licht', 'flatterband']);
  });
});

describe('Ausrüstung verkaufen', () => {
  it('bringt genau 40 % und bucht unter Ausrüstung', () => {
    const s = ausgeruestet();
    A.sellItem(s, 'eimer');
    expect(s.money).toBe(1003.2);
    expect(fin(s, 'ausruestung')).toBe(3.2);
  });

  it('Gimmicks: eigene Meldung', () => {
    const s = hof();
    s.cosmetics.push('zwerg');
    expect(A.sellItem(s, 'zwerg')).toEqual({ ok: false, msg: 'Gimmicks kann man nicht verkaufen.' });
  });

  it('den Zaun darf man trotz Hühnern verkaufen; dabei gehen Gerät und Erweiterungen verloren', () => {
    const s = ausgeruestet();
    tier(s);
    s.extras = ['geraet', 'autofutter'];
    s.runExtensions = 2; s.water = 2; s.feed = 1;
    expect(A.sellItem(s, 'knoten').ok).toBe(true);
    expect(s.extras).toEqual(['autofutter']);
    expect(s.runExtensions).toBe(0);
    expect(s.water).toBe(2);
    expect(s.feed).toBe(1);
  });

  it('Tränke verkaufen leert nur das Wasser', () => {
    const s = ausgeruestet();
    s.extras = ['geraet', 'autofutter']; s.runExtensions = 2; s.water = 2; s.feed = 1;
    A.sellItem(s, 'eimer');
    expect(s).toMatchObject({ water: 0, feed: 1, runExtensions: 2, extras: ['geraet', 'autofutter'] });
  });

  it('Futterstelle verkaufen leert das Futter und nimmt den Futterautomaten mit', () => {
    const s = ausgeruestet();
    s.extras = ['geraet', 'autofutter', 'licht']; s.runExtensions = 2; s.water = 2; s.feed = 1;
    A.sellItem(s, 'trog');
    expect(s).toMatchObject({ water: 2, feed: 0, runExtensions: 2, extras: ['geraet', 'licht'] });
  });

  it('Zubehör wird aus der Liste genommen und bezahlt', () => {
    const s = hof();
    s.extras = ['licht', 'netz'];
    expect(A.sellItem(s, 'licht').ok).toBe(true);
    expect(s.extras).toEqual(['netz']);
    expect(s.money).toBeGreaterThan(1000);
  });

  it('nicht eingebaute Ausrüstung kann man nicht verkaufen', () => {
    const s = ausgeruestet();
    expect(A.sellItem(s, 'maschen')).toEqual({ ok: false, msg: 'Nicht vorhanden.' });
    expect(s.money).toBe(1000);
  });
});

describe('Verbrauchsmaterial kaufen', () => {
  it('mehrere Packungen: Menge und Preis vervielfacht, gebucht unter Futter', () => {
    const s = hof();
    const r = A.buySupply(s, 'koerner', 3);
    expect(r).toEqual({ ok: true, msg: '30 kg Körnerfutter gekauft.' });
    expect(s.inventory.koerner).toBe(30);
    expect(s.money).toBe(982);
    expect(fin(s, 'futter')).toBe(-18);
  });

  it('Großpackung mit eigenem Namen', () => {
    const s = hof();
    expect(A.buySupply(s, 'koerner', 1, true).msg).toBe('25-kg-Sack 25 kg Körnerfutter gekauft.');
    expect(s.inventory.koerner).toBe(25);
    expect(s.money).toBe(988);
  });

  it('Großpackung gewünscht, aber keine vorhanden: normale Packung', () => {
    const s = hof();
    expect(A.buySupply(s, 'mehlwuermer', 1, true).msg).toBe('5 Portionen Mehlwürmer gekauft.');
  });

  it('genau passendes Geld reicht, ein Cent weniger nicht', () => {
    const s = hof();
    s.money = 6;
    expect(A.buySupply(s, 'koerner').ok).toBe(true);
    expect(s.money).toBe(0);
    s.money = 5.99;
    expect(A.buySupply(s, 'koerner')).toEqual({ ok: false, msg: 'Nicht genug Geld' });
    expect(s.inventory.koerner).toBe(10);
  });

  it('kein Kauf, wenn das Lager voll ist', () => {
    const s = hof();
    s.inventory.einstreu = 8;
    expect(A.buySupply(s, 'einstreu').ok).toBe(false);
    expect(s.money).toBe(1000);
  });
});

describe('Klappe', () => {
  it('ohne Stall passiert nichts', () => {
    const s = hof();
    expect(A.toggleDoor(s).ok).toBe(false);
    expect(s.doorOpen).toBe(true);
  });

  it('beim Öffnen werden die Hühner neu verteilt (ohne Zaun bleiben alle drin)', () => {
    const s = hof();
    s.equip.coop = 'kiste';
    s.doorOpen = false;
    const a = tier(s);
    a.outside = true;
    expect(A.toggleDoor(s).ok).toBe(true);
    expect(s.doorOpen).toBe(true);
    expect(a.outside).toBe(false);
  });

  it('beim Schließen: Meldung je nach Zahl der Ausgesperrten', () => {
    const s = ausgeruestet();
    const [a, b] = [tier(s), tier(s)];
    expect(A.toggleDoor(s).msg).toBe('Klappe zu: Alle Hühner sind im Stall.');
    A.toggleDoor(s);
    a.outside = true; b.outside = false;
    expect(A.toggleDoor(s).msg).toContain(`${a.name} ist noch draußen`);
    s.doorOpen = true;
    a.outside = true; b.outside = true;
    expect(A.toggleDoor(s).msg).toContain('2 Hühner sind noch draußen');
  });
});

describe('Hühner reinlocken', () => {
  const draussen = (s: GameState, n: number) => Array.from({ length: n }, () => { const a = tier(s); a.outside = true; return a; });

  it('ohne Stall oder ohne Ausgesperrte passiert nichts', () => {
    const s = hof();
    s.inventory.koerner = 5;
    expect(A.lureIn(s).ok).toBe(false);
    const a = tier(s);
    a.outside = true;
    expect(A.lureIn(s).ok).toBe(false);
    a.outside = false;
    s.equip.coop = 'kiste';
    expect(A.lureIn(s)).toEqual({ ok: false, msg: 'Alle Hühner sind schon im Stall.' });
    expect(s.inventory.koerner).toBe(5);
  });

  it('nimmt zuerst Körner (genau 0,2 kg reichen), dann Legemehl', () => {
    const s = ausgeruestet();
    draussen(s, 1);
    s.inventory.koerner = 0.2;
    expect(A.lureIn(s).msg).toContain('ein paar Körnern');
    expect(s.inventory.koerner).toBe(0);
    draussen(s, 1);
    s.inventory.koerner = 0.1; s.inventory.legemehl = 1;
    A.lureIn(s);
    expect(s.inventory.koerner).toBe(0.1);
    expect(s.inventory.legemehl).toBe(0.8);
  });

  it('Mehlwürmer: eine ganze Portion nötig', () => {
    const s = ausgeruestet();
    draussen(s, 1);
    s.inventory.mehlwuermer = 0.5;
    expect(A.lureIn(s).ok).toBe(false);
    s.inventory.mehlwuermer = 1;
    expect(A.lureIn(s).msg).toContain('Mehlwürmern');
    expect(s.inventory.mehlwuermer).toBe(0);
  });

  it('lockt nur so viele, wie in den Stall passen, und schließt die Klappe', () => {
    const s = ausgeruestet();
    const raus = draussen(s, 5);
    s.inventory.koerner = 1;
    const r = A.lureIn(s);
    expect(raus.filter(a => !a.outside)).toHaveLength(3);
    expect(r.msg).toContain('3 Hühner sind im Stall');
    expect(r.msg).toContain('2 passen nicht mehr hinein');
    expect(s.doorOpen).toBe(false);
  });

  it('ist der Stall schon voll, kommt keiner mehr rein', () => {
    const s = ausgeruestet();
    for (let i = 0; i < 3; i++) tier(s);
    const raus = draussen(s, 2);
    s.inventory.koerner = 1;
    A.lureIn(s);
    expect(raus.every(a => a.outside)).toBe(true);
  });
});

describe('Wasser und Futter', () => {
  it('Tränke: ohne Tränke nichts, voll bis auf 0,01 l gilt als voll', () => {
    const s = hof();
    expect(A.refillWater(s).ok).toBe(false);
    s.equip.drinker = 'eimer';
    s.water = 3 - 0.01;
    expect(A.refillWater(s).ok).toBe(false);
    s.water = 3;
    expect(A.refillWater(s).ok).toBe(false);
    s.water = 2.9;
    expect(A.refillWater(s)).toEqual({ ok: true, msg: 'Tränke aufgefüllt.' });
    expect(s.water).toBe(3);
    expect(s.iceFreeUntil).toBeUndefined();
  });

  it('bei Frost wird auch eine volle Tränke aufgehackt und bleibt eine Weile eisfrei', () => {
    const ohne = hof();
    ohne.temperature = -5;
    expect(A.refillWater(ohne).ok).toBe(false);
    expect(ohne.iceFreeUntil).toBeUndefined();
    const s = hof();
    s.equip.drinker = 'eimer';
    s.temperature = -5;
    s.water = 3;
    expect(A.refillWater(s).ok).toBe(true);
    expect(s.iceFreeUntil).toBe(hourIndex(s) + ICE_FREE_HOURS);
  });

  it('Futter: ohne Futterstelle oder ohne Vorrat der gewählten Sorte nichts', () => {
    const s = hof();
    s.inventory.legemehl = 5;
    expect(A.refillFeed(s).ok).toBe(false);
    s.equip.feeder = 'trog';
    expect(A.refillFeed(s, 'koerner').ok).toBe(false);
    expect(s.feed).toBe(0);
  });

  it('Futter: bis 0,05 kg Platz gilt als voll', () => {
    const s = hof();
    s.equip.feeder = 'trog';
    s.inventory.koerner = 10;
    s.feed = 1.45;
    expect(A.refillFeed(s).ok).toBe(false);
    s.feed = 1.44;
    expect(A.refillFeed(s).ok).toBe(true);
    expect(s.feed).toBe(1.5);
  });

  it('Futter: füllt den freien Platz aus dem Lager auf, höchstens den Vorrat', () => {
    const s = hof();
    s.equip.feeder = 'trog';
    s.inventory.koerner = 10;
    s.feed = 0.5;
    expect(A.refillFeed(s, 'koerner').msg).toBe('1.0 kg Körnerfutter eingefüllt.');
    expect(s).toMatchObject({ feed: 1.5, feedType: 'koerner' });
    expect(s.inventory.koerner).toBe(9);
    const t = hof();
    t.equip.feeder = 'trog';
    t.inventory.legemehl = 0.3;
    A.refillFeed(t);
    expect(t.feed).toBe(0.3);
    expect(t.inventory.legemehl).toBe(0);
  });
});

describe('Eier einsammeln', () => {
  const nest = (n: number, h: number, b: number) => {
    const s = hof();
    s.nestEggs = n ? { hybrid: n } : {};
    s.nestHatchEggs = Array.from({ length: h }, () => ({ breed: 'hybrid' as const, fertile: true }));
    s.blockedEggs = b;
    return s;
  };

  it.each([
    [1, 0, 0, '🥚 1 Ei eingesammelt.'],
    [2, 0, 0, '🥚 2 Eier eingesammelt.'],
    [0, 1, 0, '🥚 1 Ei eingesammelt – alles Bruteier, weil ein Hahn dabei ist.'],
    [0, 2, 0, '🥚 2 Eier eingesammelt – alles Bruteier, weil ein Hahn dabei ist.'],
    [2, 1, 0, '🥚 3 Eier eingesammelt: 1 Brutei (mit Hahn gelegt), 2 Speiseeier.'],
    [1, 2, 0, '🥚 3 Eier eingesammelt: 2 Bruteier (mit Hahn gelegt), 1 Speiseei.'],
    [1, 0, 1, '🥚 2 Eier eingesammelt: 1 Speiseei, 1 mit Medikamenten-Wartezeit (entsorgt).'],
    [0, 0, 2, '🥚 2 Eier eingesammelt: 2 mit Medikamenten-Wartezeit (entsorgt).'],
  ])('%i Speiseeier, %i Bruteier, %i gesperrte: „%s“', (n, h, b, msg) => {
    expect(A.collectEggs(nest(n, h, b))).toEqual({ ok: true, msg });
  });

  it('legt Eier zum Vorrat, leert das Nest und verwirft gesperrte', () => {
    const s = nest(2, 1, 1);
    s.eggs = { hybrid: 3 };
    A.collectEggs(s);
    expect(s).toMatchObject({ eggs: { hybrid: 5 }, nestEggs: {}, nestHatchEggs: [], blockedEggs: 0 });
    expect(s.hatchEggs).toHaveLength(1);
  });

  it('leeres Nest: nichts zu tun', () => {
    expect(A.collectEggs(nest(0, 0, 0)).ok).toBe(false);
  });
});

describe('Ausmisten', () => {
  const stall = (sauber: number, stroh = 1) => {
    const s = hof();
    s.equip.coop = 'kiste';
    s.cleanliness = sauber;
    s.inventory.einstreu = stroh;
    return s;
  };

  it('ohne Stall, bei über 90 % Sauberkeit oder ohne Stroh nicht', () => {
    const ohne = hof();
    ohne.cleanliness = 10;
    expect(A.cleanCoop(ohne).ok).toBe(false);
    expect(ohne.inventory.einstreu).toBe(1);
    expect(A.cleanCoop(stall(91)).ok).toBe(false);
    expect(A.cleanCoop(stall(10, 0)).ok).toBe(false);
    const leer = stall(10);
    delete (leer.inventory as Record<string, number>).einstreu;
    expect(A.cleanCoop(leer).ok).toBe(false);
  });

  it.each([[90, 1], [50, 2], [0, 4]])('bei %i %% Sauberkeit: ein Ballen Stroh, %i Sack Mist', (sauber, mist) => {
    const s = stall(sauber);
    s.inventory.mist = 3;
    expect(A.cleanCoop(s).ok).toBe(true);
    expect(s.inventory.einstreu).toBe(0);
    expect(s.inventory.mist).toBe(3 + mist);
    expect(s.cleanliness).toBe(100);
  });
});

describe('Kleinere Aktionen', () => {
  it('Mehlwürmer machen satt, aber höchstens bis 100', () => {
    const s = hof();
    s.inventory.mehlwuermer = 1;
    const [a, b] = [tier(s), tier(s)];
    a.food = 50; b.food = 95;
    A.giveTreat(s);
    expect([a.food, b.food]).toEqual([60, 100]);
  });

  it('Wechselweide: ohne nicht; wechselt hin und her und ergänzt fehlende Weidewerte', () => {
    const s = hof();
    expect(A.switchPasture(s).ok).toBe(false);
    s.extras.push('wechselweide');
    s.pasture = [30, 80];
    expect(A.switchPasture(s).msg).toContain('rechten Hälfte (80 % frisch)');
    expect(s.pastureSide).toBe(1);
    expect(s.pastureSwitchDay).toBe(300);
    expect(A.switchPasture(s).msg).toContain('linken Hälfte (30 % frisch)');
    expect(s.pastureSide).toBe(0);
    delete (s as Partial<GameState>).pasture;
    A.switchPasture(s);
    expect(s.pasture).toEqual([100, 100]);
  });

  it('Stalllicht: ohne nicht; schaltet aus und wieder an', () => {
    const s = hof();
    expect(A.toggleLight(s).ok).toBe(false);
    expect(s.lightOn).toBe(true);
    s.extras.push('stalllicht');
    A.toggleLight(s);
    expect(s.lightOn).toBe(false);
    A.toggleLight(s);
    expect(s.lightOn).toBe(true);
  });

  it('Besuch: eine schon zugesagte Anfrage nicht noch einmal', () => {
    const s = hof();
    s.visit = { group: 'Kita', day: 310, fee: 20, accepted: true };
    const eintraege = s.log.length;
    expect(A.acceptVisit(s)).toEqual({ ok: false, msg: 'Keine offene Anfrage.' });
    expect(s.log.length).toBe(eintraege);
  });

  it('Entsorgen und Verkaufen nehmen nur das eine Tier weg', () => {
    const s = hof();
    const [tot, lebt, bleibt] = [tier(s), tier(s), tier(s)];
    tot.dead = true;
    A.disposeBody(s, tot.id);
    A.sellAnimal(s, lebt.id);
    expect(s.animals).toEqual([bleibt]);
    expect(fin(s, 'entsorgung')).toBe(-15);
    expect(fin(s, 'tierverkauf')).toBeGreaterThan(0);
  });
});

describe('Behandeln', () => {
  const krank = (difficulty: Difficulty = 'mittel') => {
    const s = hof(difficulty);
    const a = tier(s);
    return { s, a };
  };

  it('kein totes Tier und keine Krankheit, die es nicht hat', () => {
    const { s, a } = krank();
    a.conditions = [{ id: 'milben', severity: 50 }];
    a.dead = true;
    expect(A.treat(s, a.id, 'milben', 'milbenspray').ok).toBe(false);
    a.dead = false;
    expect(A.treat(s, a.id, 'wuermer', 'wurmkur').ok).toBe(false);
    expect(s.money).toBe(1000);
  });

  it('behandelt genau die gewählte Krankheit; andere bleiben', () => {
    const { s, a } = krank();
    a.conditions = [{ id: 'wuermer', severity: 50 }, { id: 'milben', severity: 50 }];
    s.inventory.milbenspray = 1;
    A.treat(s, a.id, 'milben', 'milbenspray');
    expect(a.conditions).toEqual([{ id: 'wuermer', severity: 50 }]);
  });

  it('Kräuter helfen nur bis 30 % Schwere', () => {
    const { s, a } = krank();
    s.inventory.kraeuter = 2;
    a.conditions = [{ id: 'schnupfen', severity: 31 }];
    expect(A.treat(s, a.id, 'schnupfen', 'kraeuter').ok).toBe(false);
    a.conditions = [{ id: 'schnupfen', severity: 30 }];
    expect(A.treat(s, a.id, 'schnupfen', 'kraeuter').ok).toBe(true);
    expect(s.kraeuterUntil).toBe(300 + PREVENTION_DAYS);
  });

  it.each([['mittel', 25], ['leicht', 18.75]] as const)('Tierarzt kostet je Schwierigkeit (%s: %s €)', (d, preis) => {
    const { s, a } = krank(d);
    a.conditions = [{ id: 'schnupfen', severity: 80 }];
    s.money = preis - 0.01;
    expect(A.treat(s, a.id, 'schnupfen', 'tierarzt').ok).toBe(false);
    expect(a.conditions).toHaveLength(1);
    s.money = preis;
    expect(A.treat(s, a.id, 'schnupfen', 'tierarzt').ok).toBe(true);
    expect(s.money).toBe(0);
    expect(fin(s, 'tierarzt')).toBe(-preis);
    expect(s.kraeuterUntil).toBeUndefined();
  });

  it('Mittel aus dem Lager wird verbraucht, sonst gekauft (Medizin)', () => {
    const { s, a } = krank();
    a.conditions = [{ id: 'milben', severity: 50 }];
    s.inventory.milbenspray = 1;
    A.treat(s, a.id, 'milben', 'milbenspray');
    expect(s.inventory.milbenspray).toBe(0);
    expect(s.money).toBe(1000);
    a.conditions = [{ id: 'milben', severity: 50 }];
    A.treat(s, a.id, 'milben', 'milbenspray');
    expect(s.inventory.milbenspray).toBe(0);
    expect(s.money).toBe(988);
    expect(fin(s, 'medizin')).toBe(-12);
  });

  it('ohne Mittel und ohne Geld keine Behandlung', () => {
    const { s, a } = krank();
    a.conditions = [{ id: 'milben', severity: 50 }];
    s.money = 11.99;
    expect(A.treat(s, a.id, 'milben', 'milbenspray').ok).toBe(false);
    expect(a.conditions[0].severity).toBe(50);
  });

  it('Kieselgur: senkt um 45, wirkt vorbeugend; bei genau 45 gesund, bei mehr bleibt der Befall', () => {
    const { s, a } = krank();
    s.inventory.kieselgur = 2;
    a.conditions = [{ id: 'milben', severity: 60 }];
    const r = A.treat(s, a.id, 'milben', 'kieselgur');
    expect(a.conditions).toEqual([{ id: 'milben', severity: 15 }]);
    expect(r.msg).toContain('noch nicht weg');
    expect(s.kieselgurUntil).toBe(300 + PREVENTION_DAYS);
    a.conditions = [{ id: 'milben', severity: 45 }];
    expect(A.treat(s, a.id, 'milben', 'kieselgur').msg).toContain('ist wieder gesund');
    expect(a.conditions).toEqual([]);
  });

  it('Milbenspray beugt nicht vor', () => {
    const { s, a } = krank();
    s.kieselgurUntil = 0;
    s.inventory.milbenspray = 1;
    a.conditions = [{ id: 'milben', severity: 50 }];
    A.treat(s, a.id, 'milben', 'milbenspray');
    expect(s.kieselgurUntil).toBe(0);
  });

  it('nach Atemwegsinfekt 30 Tage immun (mit Hinweis), nach Milben nicht', () => {
    const { s, a } = krank();
    s.inventory.kraeuter = 1; s.inventory.milbenspray = 1;
    a.conditions = [{ id: 'schnupfen', severity: 20 }];
    expect(A.treat(s, a.id, 'schnupfen', 'kraeuter').msg).toContain('30 Tage ist');
    expect(a.immuneUntil).toEqual({ schnupfen: 330 });
    a.conditions = [{ id: 'milben', severity: 20 }];
    expect(A.treat(s, a.id, 'milben', 'milbenspray').msg).not.toContain('immun');
    expect(a.immuneUntil).toEqual({ schnupfen: 330 });
  });

  it('teilweise Behandlung einer Krankheit mit Immunität: kein Immun-Hinweis', () => {
    const { s, a } = krank();
    s.inventory.kokzidiostatikum = 1;
    a.conditions = [{ id: 'kokzidiose', severity: 150 }];
    expect(A.treat(s, a.id, 'kokzidiose', 'kokzidiostatikum').msg).not.toContain('immun');
    expect(a.immuneUntil).toBeUndefined();
  });

  it('Wurmkur: 5 Tage Wartezeit', () => {
    const { s, a } = krank();
    s.inventory.wurmkur = 1;
    a.conditions = [{ id: 'wuermer', severity: 50 }];
    A.treat(s, a.id, 'wuermer', 'wurmkur');
    expect(a.withdrawalUntil).toBe(305);
  });
});

describe('Schlachten', () => {
  it.each([
    ['totes Tier', (a: Animal) => { a.dead = true; }],
    ['Küken', (a: Animal, s: GameState) => { a.hatchedDay = s.day - 5; }],
    ['Wartezeit bis heute', (a: Animal, s: GameState) => { a.withdrawalUntil = s.day; }],
    ['Krankheit über 30 %', (a: Animal) => { a.conditions = [{ id: 'milben', severity: 31 }]; }],
    ['eine von zwei Krankheiten über 30 %', (a: Animal) => { a.conditions = [{ id: 'milben', severity: 10 }, { id: 'wuermer', severity: 50 }]; }],
    ['brütende Henne', (a: Animal) => { a.broodEggs = [{ breed: 'hybrid', fertile: true }]; }],
  ])('nicht: %s', (_, aenderung) => {
    const s = hof();
    const a = tier(s);
    aenderung(a, s);
    expect(A.butcher(s, a.id).ok).toBe(false);
    expect(s.animals).toHaveLength(1);
    expect(s.money).toBe(1000);
  });

  it('unbekanntes Tier: nicht gefunden', () => {
    expect(A.butcher(hof(), 999)).toEqual({ ok: false, msg: 'Nicht gefunden.' });
  });

  it.each([
    ['Wartezeit bis gestern', (a: Animal, s: GameState) => { a.withdrawalUntil = s.day - 1; }],
    ['Krankheit genau 30 %', (a: Animal) => { a.conditions = [{ id: 'milben', severity: 30 }]; }],
    ['Junghenne', (a: Animal, s: GameState) => { a.hatchedDay = s.day - 15; }],
  ])('ja: %s – nur dieses Tier, Erlös als Tierverkauf', (_, aenderung) => {
    const s = hof();
    const a = tier(s);
    const anderes = tier(s);
    aenderung(a, s);
    expect(A.butcher(s, a.id).ok).toBe(true);
    expect(s.animals).toEqual([anderes]);
    expect(s.money).toBeGreaterThan(1000);
    expect(fin(s, 'tierverkauf')).toBeCloseTo(s.money - 1000, 2);
  });
});

describe('Markt', () => {
  it('kauft das gewählte Angebot, nicht das erste', () => {
    const s = ausgeruestet();
    s.offers = [angebot({ id: 1, kind: 'hahn' }), angebot({ id: 2 })];
    A.buyOffer(s, 2);
    expect(s.animals[0].sex).toBe('henne');
    expect(s.offers.map(o => o.id)).toEqual([1]);
  });

  it('Menge: mehr als angeboten nicht; genau alles entfernt das Angebot; weniger lässt den Rest stehen', () => {
    const s = ausgeruestet();
    s.offers = [angebot({ qty: 2 })];
    expect(A.buyOffer(s, 1, 3).ok).toBe(false);
    expect(A.buyOffer(s, 1, 1).ok).toBe(true);
    expect(s.offers[0].qty).toBe(1);
    expect(A.buyOffer(s, 1, 1).ok).toBe(true);
    expect(s.offers).toEqual([]);
  });

  it('Preis mal Menge, gebucht als Tierkauf; genau passendes Geld reicht', () => {
    const s = ausgeruestet();
    s.offers = [angebot({ qty: 2, price: 15 })];
    s.money = 30;
    expect(A.buyOffer(s, 1, 2).ok).toBe(true);
    expect(s.money).toBe(0);
    expect(fin(s, 'tierkauf')).toBe(-30);
  });

  it('ohne Geld kein Kauf, Angebot bleibt', () => {
    const s = ausgeruestet();
    s.offers = [angebot({ price: 15 })];
    s.money = 14.99;
    expect(A.buyOffer(s, 1).ok).toBe(false);
    expect(s.offers[0].qty).toBe(1);
    expect(s.animals).toEqual([]);
  });

  it.each([
    ['Legehenne ohne Stall', 'legehenne', {}, false],
    ['Hahn ohne Stall', 'hahn', {}, false],
    ['Bruteier ohne Stall', 'brutei', {}, true],
    ['Küken ohne Stall und Kükenstation', 'kueken', {}, false],
    ['Küken mit Kükenstation', 'kueken', { station: true }, true],
    ['Küken mit Stall', 'kueken', { stall: true }, true],
  ] as const)('%s', (_, kind, opt: { station?: boolean; stall?: boolean }, ok) => {
    const s = hof();
    if (opt.station) s.extras.push('kuekenstation');
    if (opt.stall) s.equip.coop = 'kiste';
    s.offers = [angebot({ kind })];
    expect(A.buyOffer(s, 1).ok).toBe(ok);
  });

  it('Bruteier landen im Lager mit Rasse und Farbe', () => {
    const s = hof();
    s.offers = [angebot({ kind: 'brutei', qty: 2, variant: 'weiss' })];
    expect(A.buyOffer(s, 1, 2).msg).toBe('2 Bruteier (Legehybride) ins Lager gelegt.');
    expect(s.hatchEggs.map(e => [e.breed, e.variant, typeof e.fertile])).toEqual([['hybrid', 'weiss', 'boolean'], ['hybrid', 'weiss', 'boolean']]);
    expect(s.animals).toEqual([]);
    s.offers = [angebot({ kind: 'brutei' })];
    expect(A.buyOffer(s, 1).msg).toBe('1 Brutei (Legehybride) ins Lager gelegt.');
  });

  it('Alter und Geschlecht je Angebotsart, Herkunft im Verlauf', () => {
    const s = ausgeruestet();
    s.extras.push('kuekenstation');
    s.offers = [angebot({ id: 1, kind: 'kueken' }), angebot({ id: 2, kind: 'junghenne' }), angebot({ id: 3, kind: 'legehenne', hiddenAge: 300 }),
      angebot({ id: 4, kind: 'legehenne' }), angebot({ id: 5, kind: 'hahn' })];
    for (const id of [1, 2, 3, 4, 5]) expect(A.buyOffer(s, id).ok).toBe(true);
    const alter = s.animals.map(a => s.day - a.hatchedDay);
    expect(alter[0]).toBe(1);
    expect(alter[1]).toBeGreaterThanOrEqual(20);
    expect(alter[1]).toBeLessThanOrEqual(23);
    expect(alter[2]).toBe(300);
    expect(alter[3]).toBe(120);
    expect(alter[4]).toBeGreaterThanOrEqual(40);
    expect(alter[4]).toBeLessThanOrEqual(160);
    expect(s.animals.slice(1).map(a => a.sex)).toEqual(['henne', 'henne', 'henne', 'hahn']);
    expect(s.animals.every(a => a.history[0] === 'Gekauft bei Hof Meyer' && a.variant === 'braun')).toBe(true);
  });

  it('versteckte Milben gibt es nur bei Legehennen', () => {
    const s = ausgeruestet();
    s.extras.push('kuekenstation');
    s.offers = [angebot({ id: 1, kind: 'legehenne', hiddenMites: true }), angebot({ id: 2, kind: 'legehenne' }),
      angebot({ id: 3, kind: 'kueken', hiddenMites: true })];
    for (const id of [1, 2, 3]) A.buyOffer(s, id);
    expect(s.animals.map(a => a.conditions)).toEqual([[{ id: 'milben', severity: 25 }], [], []]);
  });

  it('begrüßt alle neuen Tiere mit Namen', () => {
    const s = ausgeruestet();
    s.offers = [angebot({ qty: 2 })];
    const msg = A.buyOffer(s, 1, 2).msg;
    expect(msg).toBe(`Willkommen auf dem Hof: ${s.animals[0].name}, ${s.animals[1].name}!`);
    expect(HEN_NAMES).toContain(s.animals[1].name);
  });

  it('warnt bei Überbelegung erst über der Stallgröße und nie bei Küken oder Bruteiern', () => {
    const s = ausgeruestet();
    s.extras.push('kuekenstation');
    s.inventory.kuekenstarter = 1;
    tier(s); tier(s);
    s.offers = [angebot({ id: 1, qty: 2 }), angebot({ id: 2, kind: 'kueken' }), angebot({ id: 3, kind: 'brutei' })];
    expect(A.buyOffer(s, 1).msg).not.toContain('überbelegt');
    expect(A.buyOffer(s, 1).msg).toContain('überbelegt');
    expect(A.buyOffer(s, 2).msg).not.toContain('überbelegt');
    expect(A.buyOffer(s, 3).msg).not.toContain('überbelegt');
  });

  it('Küken: Hinweise auf Kükenstation und Kükenstarter nur, wenn sie fehlen', () => {
    const s = ausgeruestet();
    s.offers = [angebot({ id: 1, kind: 'kueken', qty: 3 }), angebot({ id: 2, kind: 'legehenne' })];
    s.inventory.kuekenstarter = 0.5;
    const ohne = A.buyOffer(s, 1).msg;
    expect(ohne).toContain('Kükenstation mit Wärmelampe');
    expect(ohne).toContain('Kükenstarter-Futter nicht vergessen');
    s.extras.push('kuekenstation');
    s.inventory.kuekenstarter = 1;
    const mit = A.buyOffer(s, 1).msg;
    expect(mit).not.toContain('Kükenstation');
    expect(mit).not.toContain('Kükenstarter');
    s.extras = [];
    s.inventory.kuekenstarter = 0;
    const henne = A.buyOffer(s, 2).msg;
    expect(henne).not.toContain('Küken');
  });

  it('Gesundheitscheck nur für Legehennen', () => {
    const s = ausgeruestet();
    s.offers = [angebot({ kind: 'kueken' })];
    expect(A.healthCheck(s, 1).ok).toBe(false);
    expect(s.money).toBe(1000);
  });
});

describe('Eier und Mist verkaufen', () => {
  it('ohne Eier nichts', () => {
    expect(A.sellEggs(hof()).ok).toBe(false);
  });

  it.each([['mittel', 2.1], ['leicht', 2.41]] as const)('Bruteier bringen 70 %% des Brutei-Preises (%s: %s €)', (d, wert) => {
    const s = hof(d);
    s.hatchEggs = [{ breed: 'hybrid', fertile: true }, { breed: 'hybrid', fertile: false }];
    expect(A.hatchEggValue(s)).toBe(wert);
    expect(BREEDS.hybrid.prices.brutei).toBe(1.5);
  });

  it('als Speiseeier zählt jedes Brutei wie ein Speiseei derselben Rasse', () => {
    const s = hof();
    s.hatchEggs = [{ breed: 'hybrid', fertile: true }, { breed: 'hybrid', fertile: true }, { breed: 'seide', fertile: true }];
    expect(A.hatchEggFoodValue(s)).toBe(eggValue(s, { hybrid: 2, seide: 1 }));
  });

  it('Mist: ab einem Sack, 2 € je Sack, gebucht als Mist', () => {
    const s = hof();
    s.inventory.mist = 1;
    expect(A.sellManure(s).ok).toBe(true);
    expect(s.money).toBe(1002);
    expect(fin(s, 'mist')).toBe(2);
    expect(A.sellManure(s).ok).toBe(false);
  });
});

describe('Brüten', () => {
  const bruteier = (n: number) => Array.from({ length: n }, () => ({ breed: 'hybrid' as const, fertile: true }));

  it('Brutapparat: ohne nicht; füllt nur bis 12 Plätze, Schlupf in 7 Tagen', () => {
    const s = hof();
    s.hatchEggs = bruteier(5);
    expect(A.incubate(s, 5).ok).toBe(false);
    s.extras.push('brutapparat');
    s.incubator = Array.from({ length: 10 }, () => ({ breed: 'hybrid' as const, fertile: true, hatchDay: 1, candled: true }));
    expect(A.incubate(s, 5).msg).toBe('2 Bruteier in den Brutapparat gelegt. Schlupf in 7 Tagen.');
    expect(s.incubator).toHaveLength(12);
    expect(s.incubator[10]).toMatchObject({ hatchDay: 307, candled: false });
    expect(s.hatchEggs).toHaveLength(3);
    expect(A.incubate(s, 1)).toEqual({ ok: false, msg: 'Der Brutapparat ist voll.' });
  });

  it('Brutapparat: ohne Bruteier oder mit 0 gewünschten nicht; ein Ei in der Einzahl', () => {
    const s = hof();
    s.extras.push('brutapparat');
    expect(A.incubate(s, 3)).toEqual({ ok: false, msg: 'Keine Bruteier im Lager.' });
    s.hatchEggs = bruteier(2);
    expect(A.incubate(s, 0).ok).toBe(false);
    expect(A.incubate(s, 1).msg).toBe('1 Brutei in den Brutapparat gelegt. Schlupf in 7 Tagen.');
  });

  it('unter die Henne: brütig bis heute reicht, Schlupf in 7 Tagen', () => {
    const s = hof();
    const a = tier(s);
    a.broodyUntil = s.day;
    expect(A.setUnderHen(s, a.id).ok).toBe(false);
    s.hatchEggs = bruteier(3);
    expect(A.setUnderHen(s, a.id).ok).toBe(true);
    expect(a.broodingUntil).toBe(307);
    expect(a.broodEggs).toHaveLength(3);
  });
});

describe('Kundenaufträge', () => {
  it('Junghennen: nur gesunde Hennen im Junghennenalter ohne Wartezeit, die nicht brüten', () => {
    const s = hof();
    const jung = (f: (a: Animal) => void = () => {}) => { const a = tier(s, { ageDays: 15 }); f(a); return a; };
    const passt = jung();
    const grenze = jung(a => { a.withdrawalUntil = s.day - 1; a.conditions = [{ id: 'milben', severity: 30 }]; });
    jung(a => { a.sex = 'hahn'; });
    jung(a => { a.broodEggs = [{ breed: 'hybrid', fertile: true }]; });
    jung(a => { a.withdrawalUntil = s.day; });
    jung(a => { a.conditions = [{ id: 'milben', severity: 31 }]; });
    tier(s, { ageDays: 200 });
    tier(s, { ageDays: 5 });
    expect(A.orderAnimals(s, 'junghenne')).toEqual([passt, grenze]);
  });

  it('Junghennen behalten ihre Reihenfolge (nicht nach Alter sortiert)', () => {
    const s = hof();
    const jung = tier(s, { ageDays: 12 });
    const alt = tier(s, { ageDays: 20 });
    expect(A.orderAnimals(s, 'junghenne')).toEqual([jung, alt]);
  });

  it('unbekannter Auftrag', () => {
    const s = hof();
    s.orders = [auftrag({ id: 1 })];
    expect(A.fulfillOrder(s, 99)).toEqual({ ok: false, msg: 'Auftrag nicht mehr verfügbar.' });
  });

  it('Suppenhühner: ab genau 240 Tagen, die ältesten zuerst', () => {
    const s = hof();
    const a = tier(s, { ageDays: SOUP_AGE });
    tier(s, { ageDays: SOUP_AGE - 1 });
    const c = tier(s, { ageDays: 280 });
    tier(s, { ageDays: 15 });
    expect(A.orderAnimals(s, 'suppenhuhn')).toEqual([c, a]);
  });

  it('Eier für Aufträge: Sorten ohne Eier tauchen nicht auf', () => {
    const s = hof();
    s.eggs = { seide: 0, hybrid: 5 };
    expect(A.orderEggs(s, 3)).toEqual({ eggs: { hybrid: 3 }, hatch: 0 });
  });

  it('Eier-Auftrag: genau genug Eier reicht; Bruteier zuletzt; Lohn als Auftrag; andere Aufträge bleiben', () => {
    const s = hof();
    s.eggs = { hybrid: 1 };
    s.hatchEggs = [{ breed: 'hybrid', fertile: true }, { breed: 'hybrid', fertile: true }];
    s.orders = [auftrag({ id: 1, qty: 9 }), auftrag({ id: 2, qty: 2, reward: 10 })];
    expect(A.fulfillOrder(s, 2).ok).toBe(true);
    expect(s.eggs).toEqual({ hybrid: 0 });
    expect(s.hatchEggs).toHaveLength(1);
    expect(s.stats.eggsSold).toBe(2);
    expect(s.money).toBe(1010);
    expect(fin(s, 'auftraege')).toBe(10);
    expect(s.orders.map(o => o.id)).toEqual([1]);
  });

  it('Eier-Auftrag: zu wenig Eier', () => {
    const s = hof();
    s.eggs = { hybrid: 1 };
    s.orders = [auftrag({ qty: 2 })];
    expect(A.fulfillOrder(s, 1)).toEqual({ ok: false, msg: 'Dafür brauchst du 2 Eier im Lager, du hast 1.' });
  });

  it('Tier-Auftrag: liefert genau die bestellte Zahl', () => {
    const s = hof();
    const [a, b] = [tier(s, { ageDays: 15 }), tier(s, { ageDays: 15 })];
    s.orders = [auftrag({ id: 7, kind: 'junghenne', qty: 1 })];
    expect(A.fulfillOrder(s, 7).ok).toBe(true);
    expect(s.animals).toEqual([b]);
    expect(a.id).not.toBe(b.id);
  });

  it.each([
    ['junghenne', 'Dafür brauchst du 2 gesunde Junghennen, du hast 1.'],
    ['suppenhuhn', 'Dafür brauchst du 2 gesunde Hennen ab 2 Jahren, du hast 1.'],
  ] as const)('Tier-Auftrag %s: zu wenige Tiere – nichts wird geliefert', (kind, msg) => {
    const s = hof();
    tier(s, { ageDays: kind === 'junghenne' ? 15 : 300 });
    s.orders = [auftrag({ kind, qty: 2 })];
    expect(A.fulfillOrder(s, 1)).toEqual({ ok: false, msg });
    expect(s.animals).toHaveLength(1);
    expect(s.orders).toHaveLength(1);
  });
});

describe('Schulden', () => {
  it('ohne Schulden: eigene Meldung', () => {
    expect(A.repayDebt(hof())).toEqual({ ok: false, msg: 'Keine Schulden.' });
  });

  it('Meldung bei vollständiger und teilweiser Rückzahlung', () => {
    const s = hof();
    s.debt = 500;
    expect(A.repayDebt(s)).toEqual({ ok: true, msg: 'Alle Schulden zurückgezahlt!' });
    s.debt = 300; s.money = 100;
    expect(A.repayDebt(s)).toEqual({ ok: true, msg: '100.00 € zurückgezahlt. Rest: 200.00 €.' });
  });
});
