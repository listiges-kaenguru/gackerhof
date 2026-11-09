import { describe, expect, it } from 'vitest';
import * as A from '../src/game/actions';
import { stars } from '../src/game/helpers';
import { checkGoals } from '../src/game/sim';
import { CHAPTERS, chapterGoals, createAnimal, importSave, newGame } from '../src/game/state';
import type { BreedId, GameState, Sex } from '../src/game/types';

const tier = (s: GameState, breed: BreedId, sex: Sex = 'henne', ageDays = 200) => {
  const a = createAnimal(s, breed, { sex, ageDays });
  s.animals.push(a);
  return a;
};
/** Hof in einem Kapitel (Ziele frisch) */
function hof(kapitel: number): GameState {
  const s = newGame({ farmName: 'Test', difficulty: 'mittel', plot: 'obst', seed: 3 });
  s.chapter = kapitel;
  s.goals = chapterGoals(kapitel);
  return s;
}
const erreicht = (s: GameState, id: string) => { checkGoals(s); return s.goals.find(g => g.id === id)?.done ?? false; };

describe('Kapitel 4 „Rassezucht“', () => {
  it('Titel, Belohnung und Ziele', () => {
    expect(CHAPTERS[4].title).toBe('Rassezucht');
    expect(CHAPTERS[4].reward).toBe(300);
    expect(CHAPTERS[4].goals.map(([id]) => id)).toEqual(['rassen3', 'schau', 'sehrgut', 'album8']);
  });

  it('3 Hühnerrassen gleichzeitig; Legehybriden, andere Arten und Küken zählen nicht', () => {
    const s = hof(4);
    tier(s, 'hybrid');
    tier(s, 'laufente');
    tier(s, 'sussex');
    tier(s, 'marans', 'henne', 2);
    expect(erreicht(s, 'rassen3')).toBe(false);
    tier(s, 'brahma', 'hahn');
    expect(erreicht(s, 'rassen3')).toBe(false);
    tier(s, 'marans', 'hahn', 15);
    expect(erreicht(s, 'rassen3')).toBe(true);
  });

  it('an einer Geflügelschau teilnehmen', () => {
    const s = hof(4);
    expect(erreicht(s, 'schau')).toBe(false);
    s.lastShow = { title: 'Kreis-Sommerschau', day: 40, results: [] };
    expect(erreicht(s, 'schau')).toBe(false);
    s.lastShow.results.push({ animalId: 1, name: 'Berta', breed: 'sussex', points: 90, grade: 'b', prize: 0, trophy: false });
    expect(erreicht(s, 'schau')).toBe(true);
    expect(erreicht(s, 'sehrgut')).toBe(false);
  });

  it('„sehr gut“ ab 93 Punkten; ohne Schau kein „sehr gut“', () => {
    const s = hof(4);
    expect(erreicht(s, 'sehrgut')).toBe(false);
    s.lastShow = { title: 'Kreis-Sommerschau', day: 40, results: [
      { animalId: 1, name: 'Berta', breed: 'sussex', points: 92, grade: 'g', prize: 0, trophy: false },
    ] };
    expect(erreicht(s, 'sehrgut')).toBe(false);
    s.lastShow.results.push({ animalId: 2, name: 'Hilde', breed: 'marans', points: 93, grade: 'sg', prize: 5, trophy: false });
    expect(erreicht(s, 'sehrgut')).toBe(true);
  });

  it('8 Album-Einträge', () => {
    const s = hof(4);
    s.album = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`x:${i}`, { day: 1, name: 'x' }]));
    expect(erreicht(s, 'album8')).toBe(false);
    s.album['x:8'] = { day: 1, name: 'x' };
    expect(erreicht(s, 'album8')).toBe(true);
  });
});

describe('Kapitel 5 „Der große Hof“', () => {
  it('Titel, Belohnung und Ziele', () => {
    expect(CHAPTERS[5].title).toBe('Der große Hof');
    expect(CHAPTERS[5].reward).toBe(500);
    expect(CHAPTERS[5].goals.map(([id]) => id)).toEqual(['tiere25', 'sterne4', 'art', 'eier1000', 'auftraege10']);
  });

  it('25 Tiere (alle Arten, auch Küken)', () => {
    const s = hof(5);
    for (let i = 0; i < 24; i++) tier(s, i % 2 ? 'hybrid' : 'wachtel', 'henne', i < 4 ? 2 : 200);
    expect(erreicht(s, 'tiere25')).toBe(false);
    tier(s, 'gans');
    expect(erreicht(s, 'tiere25')).toBe(true);
  });

  it('eine weitere Geflügelart halten (kein Küken)', () => {
    const s = hof(5);
    tier(s, 'laufente', 'henne', 2);
    expect(erreicht(s, 'art')).toBe(false);
    tier(s, 'wachtel', 'hahn', 15);
    expect(erreicht(s, 'art')).toBe(true);
  });

  it('1.000 verkaufte Eier und 10 erfüllte Aufträge', () => {
    const s = hof(5);
    s.stats.eggsSold = 999;
    s.stats.ordersDone = 9;
    expect([erreicht(s, 'eier1000'), erreicht(s, 'auftraege10')]).toEqual([false, false]);
    s.stats.eggsSold = 1000;
    s.stats.ordersDone = 10;
    expect([erreicht(s, 'eier1000'), erreicht(s, 'auftraege10')]).toEqual([true, true]);
  });

  it('4 Sterne mit mindestens 3 Hühnern', () => {
    const s = hof(5);
    tier(s, 'gans');
    expect(erreicht(s, 'sterne4')).toBe(false);
    // ordentlicher Hof: viel Platz, halbwegs sauber, gesunde Hennen (ergibt genau 4 Sterne)
    const gut = hof(5);
    gut.money = 5000;
    for (const id of ['maschen', 'gartenhaus']) expect(A.buyItem(gut, id).ok).toBe(true);
    gut.cleanliness = 60;
    for (let i = 0; i < 2; i++) Object.assign(tier(gut, 'hybrid'), { health: 100, wellbeing: 60 });
    expect(erreicht(gut, 'sterne4')).toBe(false); // nur 2 Hühner
    Object.assign(tier(gut, 'hybrid'), { health: 100, wellbeing: 60 });
    expect(stars(gut)).toBe(4);
    expect(erreicht(gut, 'sterne4')).toBe(true);
    const drei = hof(5);
    drei.money = 5000;
    for (const id of ['maschen', 'gartenhaus']) expect(A.buyItem(drei, id).ok).toBe(true);
    drei.cleanliness = 20;
    for (let i = 0; i < 3; i++) Object.assign(tier(drei, 'hybrid'), { health: 100, wellbeing: 60 });
    expect(stars(drei)).toBe(3);
    expect(erreicht(drei, 'sterne4')).toBe(false);
  });
});

describe('Übergänge', () => {
  it('nach Kapitel 3 beginnt Kapitel 4, nach 4 Kapitel 5', () => {
    const s = hof(3);
    for (const g of s.goals) g.done = true;
    s.goals[0].done = false;
    s.extras.push('hofladen');
    checkGoals(s);
    expect(s.chapter).toBe(4);
    expect(s.goals.map(g => g.id)).toEqual(['rassen3', 'schau', 'sehrgut', 'album8']);
    expect(s.celebrations.at(-1)?.lines.join(' ')).toMatch(/Kapitel 4: „Rassezucht“/);
  });

  it('nach Kapitel 5: Abschlussmeldung, Belohnung 500 €', () => {
    const s = hof(5);
    for (const g of s.goals) g.done = true;
    s.goals[0].done = false;
    for (let i = 0; i < 25; i++) tier(s, 'hybrid');
    const vorher = s.money;
    checkGoals(s);
    expect(s.money).toBe(vorher + 500);
    expect(s.chapter).toBe(6);
    expect(s.goals).toEqual([]);
    const c = s.celebrations.at(-1)!;
    expect(c.lines.join(' ')).toMatch(/alle Kapitel/);
    expect(c.lines.join(' ')).toMatch(/großen Hof/);
  });

  it('alter Spielstand nach Kapitel 3 (ohne Ziele) bekommt beim Laden die Ziele von Kapitel 4', () => {
    const s = hof(4);
    s.goals = [];
    const t = importSave(JSON.stringify(s));
    expect(t?.chapter).toBe(4);
    expect(t?.goals.map(g => g.id)).toEqual(['rassen3', 'schau', 'sehrgut', 'album8']);
  });

  it('nach dem letzten Kapitel bleiben die Ziele leer', () => {
    const s = hof(6);
    expect(s.goals).toEqual([]);
    expect(importSave(JSON.stringify(s))?.goals).toEqual([]);
  });

  it('laufende Ziele werden beim Laden nicht zurückgesetzt', () => {
    const s = hof(4);
    s.goals[1].done = true;
    expect(importSave(JSON.stringify(s))?.goals[1].done).toBe(true);
  });
});
