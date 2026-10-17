// Speichern, Laden und Import – auch mit kaputten oder präparierten Spielständen.
// Ein importierter Spielstand kommt aus einer fremden Datei: Er muss abgelehnt werden oder danach spielbar
// bleiben (48 Spielstunden ohne Fehler, Geld bleibt eine endliche Zahl).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceHour } from '../src/game/sim';
import { clearSave, createAnimal, exportSave, importSave, load, newGame, save } from '../src/game/state';
import type { GameState } from '../src/game/types';

/** Einfacher localStorage im Speicher; mit kaputt = true wirft jeder Zugriff (z. B. privater Modus, Speicher voll) */
function speicher(kaputt = false) {
  const daten = new Map<string, string>();
  const fehler = () => { throw new Error('Speicher gesperrt'); };
  return {
    getItem: (k: string) => (kaputt ? fehler() : daten.get(k) ?? null),
    setItem: (k: string, v: string) => (kaputt ? fehler() : void daten.set(k, v)),
    removeItem: (k: string) => (kaputt ? fehler() : void daten.delete(k)),
    daten,
  };
}

const basis = () => newGame({ farmName: 'Testhof', difficulty: 'mittel', plot: 'obst', seed: 42 });
const alsJson = (s: GameState, aenderung: (o: Record<string, unknown>) => void = () => {}) => {
  const o = JSON.parse(exportSave(s)) as Record<string, unknown>;
  aenderung(o);
  return JSON.stringify(o);
};
/** Abgelehnt (null) oder spielbar: 48 Stunden ohne Fehler, Geld endlich */
function abgelehntOderSpielbar(json: string) {
  const s = importSave(json);
  if (s === null) return;
  expect(() => { for (let i = 0; i < 48; i++) advanceHour(s); }).not.toThrow();
  expect(Number.isFinite(s.money)).toBe(true);
  expect(Array.isArray(s.animals)).toBe(true);
}

describe('Import eines Spielstands', () => {
  it('übernimmt einen exportierten Spielstand unverändert', () => {
    const s = basis();
    for (let i = 0; i < 30; i++) advanceHour(s);
    const zurueck = importSave(exportSave(s))!;
    expect(zurueck).not.toBeNull();
    expect({ ...zurueck, toasts: [] }).toEqual({ ...s, toasts: [] });
  });

  it.each([
    ['kaputtes JSON', '{"version":'],
    ['leere Datei', ''],
    ['null', 'null'],
    ['Text', '"Spielstand"'],
    ['Zahl', '42'],
    ['Liste', '[]'],
  ])('lehnt %s ab', (_, json) => {
    expect(importSave(json)).toBeNull();
  });

  it('lehnt eine fremde Version ab', () => {
    expect(importSave(alsJson(basis(), o => { o.version = 99; }))).toBeNull();
    expect(importSave(alsJson(basis(), o => { o.version = '1'; }))).toBeNull();
  });

  it('lehnt Spielstände ohne Tierliste ab', () => {
    expect(importSave(alsJson(basis(), o => { delete o.animals; }))).toBeNull();
    expect(importSave(alsJson(basis(), o => { o.animals = 'keine'; }))).toBeNull();
  });

  it.each([
    ['leeres Tier', (o: Record<string, unknown>) => { o.animals = [{}]; }],
    ['null als Tier', (o: Record<string, unknown>) => { o.animals = [null]; }],
    ['Geld als Text', (o: Record<string, unknown>) => { o.money = '1000'; }],
    ['Geld unendlich', (o: Record<string, unknown>) => { o.money = 1e309; }],
    ['negativer Tag', (o: Record<string, unknown>) => { o.day = -5; }],
    ['Stunde 99', (o: Record<string, unknown>) => { o.hour = 99; }],
    ['Lager null', (o: Record<string, unknown>) => { o.inventory = null; }],
    ['unbekannte Schwierigkeit', (o: Record<string, unknown>) => { o.difficulty = 'unmoeglich'; }],
    ['unbekanntes Grundstück', (o: Record<string, unknown>) => { o.plot = 'mond'; }],
    ['Ausrüstung fehlt', (o: Record<string, unknown>) => { delete o.equip; }],
  ])('%s: abgelehnt oder weiter spielbar', (_, aenderung) => {
    abgelehntOderSpielbar(alsJson(basis(), aenderung));
  });

  // Genau ein Feld eines sonst gültigen Hofs mit Tieren verfälscht: Die Prüfung muss genau dieses Feld erkennen
  const mitTieren = () => {
    const s = basis();
    for (let i = 0; i < 24 * 3; i++) advanceHour(s);
    s.animals.push(createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 200 }), createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 200 }));
    expect(importSave(exportSave(s))).not.toBeNull();
    return s;
  };
  type Tier = Record<string, unknown>;
  it.each([
    ['Tier-ID als Text mit HTML', (o: Record<string, unknown>) => { (o.animals as Tier[])[0].id = '1"><img src=x onerror=alert(1)>'; }],
    ['Tier-ID negativ', (o: Record<string, unknown>) => { (o.animals as Tier[])[0].id = -1; }],
    ['Tier-ID nicht unter nextId', (o: Record<string, unknown>) => { o.nextId = 0; }],
    ['doppelte Tier-ID', (o: Record<string, unknown>) => { (o.animals as Tier[])[1].id = (o.animals as Tier[])[0].id; }],
    ['unbekannte Rasse', (o: Record<string, unknown>) => { (o.animals as Tier[])[0].breed = 'drache'; }],
    ['unbekannte Rasse bei Bruteiern', (o: Record<string, unknown>) => { o.hatchEggs = [{ breed: 'drache' }]; }],
    ['unbekannte Rasse im Marktangebot', (o: Record<string, unknown>) => { (o.offers as Tier[])[0].breed = 'drache'; }],
    ['unbekannter Farbschlag', (o: Record<string, unknown>) => { (o.animals as Tier[])[0].variant = '<b>x</b>'; }],
    ['Statistik als Text', (o: Record<string, unknown>) => { (o.stats as Record<string, unknown>).eggsSold = '<img src=x onerror=alert(1)>'; }],
    ['Statistik fehlt', (o: Record<string, unknown>) => { delete (o.stats as Record<string, unknown>).income; }],
  ])('lehnt ab: %s', (_, aenderung) => {
    expect(importSave(alsJson(mitTieren(), aenderung))).toBeNull();
  });

  // Optionale Felder, die ein frischer Hof noch nicht hat (Schau, Besuch, Finanzen …): gefüllt gültig, verfälscht abgelehnt
  type O = Record<string, unknown>;
  const voll = (o: O) => {
    o.incubator = [{ breed: 'hybrid', hatchDay: 30, candled: false }];
    o.show = { day: 20, title: 'Kreisschau', level: 1, entries: [1], announced: true };
    o.lastShow = { title: 'Frühjahrsschau', day: 5, results: [{ animalId: 1, name: 'Berta', breed: 'hybrid', points: 90, grade: 'sg', prize: 5, trophy: false }] };
    o.trophies = [{ day: 5, title: 'Pokal', animal: 'Berta', breed: 'hybrid' }];
    o.album = { hybrid: { day: 2, name: 'Berta' } };
    o.finance = { cur: { eier: 3 }, prev: { futter: -2 }, results: [1, -2] };
    o.visit = { group: 'Kita', day: 9, fee: 20, accepted: false };
    o.visitEffect = { until: 12, points: 3 };
    o.celebrations = [{ emoji: '🎉', title: 'Geschafft', lines: ['eins'] }];
    o.report = ['Tagesbericht'];
  };
  it('übernimmt einen Spielstand mit allen optionalen Feldern', () => {
    const s = importSave(alsJson(basis(), voll));
    expect(s).not.toBeNull();
    expect(s!.show?.title).toBe('Kreisschau');
    expect(s!.visit?.group).toBe('Kita');
  });
  it.each([
    ['Brutei ohne Schlupftag', (o: O) => { (o.incubator as O[])[0].hatchDay = 'bald'; }],
    ['Schau mit Stufe 3', (o: O) => { (o.show as O).level = 3; }],
    ['Schau-Teilnehmer als Text', (o: O) => { (o.show as O).entries = ['<b>'] ; }],
    ['Schau-Ergebnis ohne Punkte', (o: O) => { ((o.lastShow as O).results as O[])[0].points = '100'; }],
    ['Pokal mit unbekannter Rasse', (o: O) => { (o.trophies as O[])[0].breed = 'drache'; }],
    ['Album-Eintrag ohne Namen', (o: O) => { (o.album as O).hybrid = { day: 2 }; }],
    ['Finanzen mit Text', (o: O) => { (o.finance as O).cur = { eier: '<img>' }; }],
    ['Finanzen Vormonat kaputt', (o: O) => { (o.finance as O).prev = 'x'; }],
    ['Besuch mit negativer Gebühr', (o: O) => { (o.visit as O).fee = -5; }],
    ['Besuchseffekt ohne Punkte', (o: O) => { o.visitEffect = { until: 3 }; }],
    ['Feier mit Zeilen als Text', (o: O) => { (o.celebrations as O[])[0].lines = 'eine'; }],
    ['Bericht mit Zahl', (o: O) => { o.report = [42]; }],
    ['Weide mit drei Werten', (o: O) => { o.pasture = [1, 2, 3]; }],
    ['Ereignis unbekannt', (o: O) => { o.events = [{ id: 'erdbeben', until: 3 }]; }],
  ])('lehnt ab: %s', (_, aenderung) => {
    expect(importSave(alsJson(basis(), o => { voll(o); aenderung(o); }))).toBeNull();
  });

  it('verschmutzt keine Prototypen (__proto__ im Spielstand)', () => {
    const json = alsJson(basis()).replace(/^\{/, '{"__proto__":{"verschmutzt":true},"constructor":{"prototype":{"auch":true}},');
    const s = importSave(json);
    if (s) for (let i = 0; i < 5; i++) advanceHour(s);
    expect(({} as Record<string, unknown>).verschmutzt).toBeUndefined();
    expect(({} as Record<string, unknown>).auch).toBeUndefined();
  });

  it('bleibt bei einer sehr großen Datei schnell', () => {
    const riesig = alsJson(basis(), o => { o.farmName = 'x'.repeat(10_000_000); });
    const start = performance.now();
    importSave(riesig);
    expect(performance.now() - start).toBeLessThan(2000);
  });

  it('ergänzt bei älteren Spielständen die neuen Felder', () => {
    const json = alsJson(basis(), o => {
      for (const k of ['pasture', 'pastureSide', 'pastureSwitchDay', 'lightOn', 'trophies', 'album', 'marketVersion', 'banners']) delete o[k];
    });
    const s = importSave(json)!;
    expect(s.pasture).toEqual([100, 100]);
    expect(s.lightOn).toBe(true);
    expect(s.trophies).toEqual([]);
    expect(s.marketVersion).toBe(2);
    expect(() => { for (let i = 0; i < 24; i++) advanceHour(s); }).not.toThrow();
  });
});

describe('Speichern und Laden im Browser-Speicher', () => {
  let lokal: ReturnType<typeof speicher>;
  beforeEach(() => { lokal = speicher(); vi.stubGlobal('localStorage', lokal); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('lädt einen gespeicherten Spielstand', () => {
    const s = basis();
    save(s);
    expect(load()?.farmName).toBe('Testhof');
  });
  it('liefert nichts ohne Spielstand oder nach dem Löschen', () => {
    expect(load()).toBeNull();
    save(basis());
    clearSave();
    expect(load()).toBeNull();
  });
  it('liefert nichts bei kaputtem oder fremdem Inhalt', () => {
    lokal.daten.set('gackerhof-save-v1', '{kaputt');
    expect(load()).toBeNull();
    lokal.daten.set('gackerhof-save-v1', JSON.stringify({ version: 99 }));
    expect(load()).toBeNull();
  });
  it('liefert nichts bei verändertem Inhalt mit gültiger Version (localStorage ist eine fremde Quelle)', () => {
    lokal.daten.set('gackerhof-save-v1', alsJson(basis(), o => { o.animals = [{ id: '<img src=x onerror=alert(1)>' }]; }));
    expect(load()).toBeNull();
    lokal.daten.set('gackerhof-save-v1', alsJson(basis(), o => { o.money = 'viel'; }));
    expect(load()).toBeNull();
    lokal.daten.set('gackerhof-save-v1', alsJson(basis()));
    expect(load()?.farmName).toBe('Testhof');
  });
  it('speichert keine Hinweis-Meldungen mit', () => {
    const s = basis();
    s.toasts = [{ id: 1, text: 'flüchtig', kind: 'info' } as never];
    save(s);
    expect(JSON.parse(lokal.daten.get('gackerhof-save-v1')!).toasts).toEqual([]);
  });
  it('läuft weiter, wenn der Speicher gesperrt ist', () => {
    vi.stubGlobal('localStorage', speicher(true));
    expect(() => save(basis())).not.toThrow();
    expect(load()).toBeNull();
    expect(() => clearSave()).not.toThrow();
  });
});

describe('Spielstände früherer Versionen', () => {
  // Echte Exporte, erzeugt mit dem Code der jeweiligen Version (Hof mit 4 Hühnern nach 10 Spieltagen)
  const dateien = import.meta.glob<string>('./spielstaende/*.json', { query: '?raw', import: 'default', eager: true });
  it.each(['v0.2.1', 'v0.3.3', 'v0.4.0'])('lädt einen Spielstand aus %s und spielt weiter', tag => {
    const json = dateien[`./spielstaende/${tag}.json`];
    expect(json).toBeTypeOf('string');
    const s = importSave(json);
    expect(s).not.toBeNull();
    expect(s!.farmName).toBe(`Hof aus ${tag}`);
    expect(s!.animals).toHaveLength(4);
    expect(() => { for (let i = 0; i < 48; i++) advanceHour(s!); }).not.toThrow();
    expect(Number.isFinite(s!.money)).toBe(true);
  });
});
