import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../src/game/data';
import { BROKE_WARN_DAYS, brokeDays, checkBroke, hasProspect } from '../src/game/pleite';
import { createAnimal, importSave, newGame } from '../src/game/state';
import type { Difficulty, GameState, Sex } from '../src/game/types';

const tier = (s: GameState, sex: Sex, ageDays: number) => s.animals.push(createAnimal(s, 'hybrid', { sex, ageDays }));

/** Hof im Minus, Kredit schon verbraucht, mit einer legenden Henne */
function pleite(difficulty: Difficulty = 'mittel', opts: { henne?: boolean; ergebnis?: number } = {}): GameState {
  const s = newGame({ farmName: 'Test', difficulty, plot: 'obst', seed: 7 });
  s.loanUsed = true;
  s.money = -50;
  if (opts.henne ?? true) tier(s, 'henne', 200);
  s.finance = { cur: {}, results: [opts.ergebnis ?? -40] };
  return s;
}

/** Spieltage einzeln weiterzählen und jeden Morgen prüfen, wie es das Spiel tut */
function tage(s: GameState, n: number) {
  for (let i = 0; i < n; i++) {
    s.day++;
    checkBroke(s);
  }
}

describe('Pleite-Zähler', () => {
  it('beginnt am ersten Tag im Minus bei 0 und zählt dann Tag für Tag', () => {
    const s = pleite();
    checkBroke(s);
    expect(brokeDays(s)).toBe(0);
    tage(s, 5);
    expect(brokeDays(s)).toBe(5);
  });

  it('zählt nicht, solange das Konto bei 0 oder im Plus ist', () => {
    const s = pleite();
    s.money = 0;
    tage(s, 10);
    expect(brokeDays(s)).toBe(0);
    expect(s.brokeSince).toBeUndefined();
  });

  it('beginnt von vorn, sobald das Konto zwischendurch wieder im Plus ist', () => {
    const s = pleite();
    tage(s, 20);
    s.money = 5;
    tage(s, 1);
    expect(s.brokeSince).toBeUndefined();
    s.money = -1;
    tage(s, 3);
    expect(brokeDays(s)).toBe(2);
  });

  it('zählt nicht, solange es den Kredit noch gibt (der rettet das Konto)', () => {
    const s = pleite();
    s.loanUsed = false;
    checkBroke(s);
    expect(s.loanUsed).toBe(true);
    expect(s.money).toBeGreaterThanOrEqual(0);
    expect(s.brokeSince).toBeUndefined();
  });

  it('Kredit: Opa Heinz zinslos 200 € auf „Mittel“, die Bank 300 € gegen 330 € auf „Schwer“', () => {
    const m = pleite('mittel');
    m.loanUsed = false;
    checkBroke(m);
    expect([m.money, m.debt]).toEqual([150, 200]);
    const s = pleite('schwer');
    s.loanUsed = false;
    checkBroke(s);
    expect([s.money, s.debt]).toEqual([250, 330]);
    expect(s.celebrations[0].title).toBe('Bankkredit');
    // Kredite zählen nicht ins laufende Ergebnis und täuschen so keine Aussicht vor
    expect(m.finance!.cur).toEqual({ kredit: 200 });
    expect(s.finance!.cur).toEqual({ kredit: 300 });
  });
});

describe('Warnung von Opa Heinz', () => {
  it(`kommt genau nach ${BROKE_WARN_DAYS} Tagen, nicht früher`, () => {
    const s = pleite();
    checkBroke(s);
    tage(s, BROKE_WARN_DAYS - 1);
    expect(s.celebrations).toHaveLength(0);
    tage(s, 1);
    expect(s.celebrations).toHaveLength(1);
    expect(s.celebrations[0].title).toMatch(/Opa Heinz/);
    expect(s.celebrations[0].lines.join(' ')).toMatch(/16 Tage/); // 30 − 14 Tage bleiben auf „Mittel“
    expect(s.toasts.map(t => [t.kind, t.text])).toEqual([['bad', expect.stringMatching(/Opa Heinz warnt.*16 Tagen/)]]);
  });

  it('Game Over nennt den Grund im Tagebuch und als Hinweis', () => {
    const leer = pleite('mittel', { henne: false });
    checkBroke(leer);
    expect(leer.toasts.map(t => [t.kind, t.text])).toEqual([['bad', expect.stringMatching(/keine Tiere/)]]);
    const p = pleite('schwer');
    checkBroke(p);
    tage(p, 21);
    expect(p.toasts.at(-1)).toMatchObject({ kind: 'bad', text: expect.stringMatching(/Zu lange pleite/) });
  });

  it('kommt in einer Pleite-Phase nur einmal', () => {
    const s = pleite();
    checkBroke(s);
    tage(s, 25);
    expect(s.celebrations).toHaveLength(1);
  });

  it('kommt nach einer Erholung in der nächsten Pleite-Phase wieder', () => {
    const s = pleite('leicht');
    checkBroke(s);
    tage(s, BROKE_WARN_DAYS);
    s.money = 10;
    tage(s, 1);
    s.money = -10;
    tage(s, BROKE_WARN_DAYS + 1);
    expect(s.celebrations).toHaveLength(2);
  });
});

describe('Game Over nach langer Pleite', () => {
  it.each([['leicht', 60], ['mittel', 30], ['schwer', 21]] as const)('%s: nach %i Tagen ohne Aussicht, nicht einen Tag früher', (d, limit) => {
    expect(DIFFICULTIES[d].brokeDays).toBe(limit);
    const s = pleite(d);
    checkBroke(s);
    tage(s, limit - 1);
    expect(s.gameOver).toBe(false);
    tage(s, 1);
    expect(s.gameOver).toBe(true);
    expect(s.gameOverReason).toBe('pleite');
  });

  it('gibt es nicht, solange eine legende Henne da ist und der letzte Monat im Plus war', () => {
    const s = pleite('mittel', { ergebnis: 12 });
    checkBroke(s);
    tage(s, 90);
    expect(s.gameOver).toBe(false);
  });

  it('kommt, sobald die Aussicht wegfällt, auch nach Ablauf der Frist', () => {
    const s = pleite('mittel', { ergebnis: 12 });
    checkBroke(s);
    tage(s, 40);
    expect(s.gameOver).toBe(false);
    s.finance!.results.push(-3);
    tage(s, 1);
    expect(s.gameOver).toBe(true);
  });

  it('gibt es auch bei Plus im letzten Monat, wenn keine Henne mehr legt', () => {
    const s = pleite('mittel', { henne: false, ergebnis: 12 });
    tier(s, 'hahn', 200);
    checkBroke(s);
    tage(s, 30);
    expect(s.gameOver).toBe(true);
  });

  it('ohne Tiere und ohne Geld ist sofort Schluss (bisherige Regel)', () => {
    const s = pleite('mittel', { henne: false });
    checkBroke(s);
    expect(s.gameOver).toBe(true);
    expect(s.gameOverReason).toBe('leer');
  });
});

describe('Aussicht', () => {
  it('Junghennen, Küken und alte Hennen zählen nicht als legende Henne', () => {
    const s = pleite('mittel', { henne: false, ergebnis: 5 });
    tier(s, 'henne', 3);
    tier(s, 'henne', 15); // Junghenne (10–24 Tage)
    tier(s, 'henne', 3000);
    expect(hasProspect(s)).toBe(false);
    tier(s, 'henne', 200);
    expect(hasProspect(s)).toBe(true);
  });

  it('nutzt den laufenden Monat, solange noch keiner abgeschlossen ist', () => {
    const s = pleite();
    s.finance = { cur: { eier: 30, futter: -10 }, results: [] };
    expect(hasProspect(s)).toBe(true);
    s.finance = { cur: { eier: 5, futter: -10 }, results: [] };
    expect(hasProspect(s)).toBe(false);
    delete s.finance;
    expect(hasProspect(s)).toBe(false);
  });

  it('ein Monat mit genau 0 € Ergebnis gilt als Aussicht', () => {
    expect(hasProspect(pleite('mittel', { ergebnis: 0 }))).toBe(true);
  });
});

describe('Spielstand', () => {
  it('neue Felder werden gespeichert und beim Import geprüft', () => {
    const s = pleite();
    checkBroke(s);
    tage(s, BROKE_WARN_DAYS);
    expect(importSave(JSON.stringify(s))?.brokeWarned).toBe(true);
    for (const [feld, wert] of [['brokeSince', 'x'], ['brokeSince', 1.5], ['brokeWarned', 1], ['gameOverReason', 'boom']] as const) {
      const kaputt = { ...JSON.parse(JSON.stringify(s)), [feld]: wert };
      expect(importSave(JSON.stringify(kaputt)), `${feld}=${wert}`).toBeNull();
    }
  });
});
