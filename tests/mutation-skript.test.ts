// Startskript für Mutation Testing (scripts/mutation.ts): Umfang, inkrementeller Modus und wann ein Neulauf nötig ist.
// Der Command-Runner meldet Stryker keine Testzuordnung, deshalb würde Stryker nach geänderten Tests alte Ergebnisse
// übernehmen – das Skript erkennt solche Änderungen über einen Hash und erzwingt dann einen Neulauf.
import { describe, expect, it } from 'vitest';
import { hashEingaben, mussErzwingen, relevanteDatei, strykerArgumente, UMFAENGE } from '../scripts/mutation-logik';

describe('Umfang', () => {
  it('Standardumfang „kern“ mutiert nur validate, state und actions', () => {
    expect(UMFAENGE.kern).toEqual(['src/game/validate.ts', 'src/game/state.ts', 'src/game/actions.ts']);
    const args = strykerArgumente('kern', false);
    expect(args).toContain('--mutate');
    expect(args[args.indexOf('--mutate') + 1]).toBe('src/game/validate.ts,src/game/state.ts,src/game/actions.ts');
  });

  it('„alle“ übernimmt den Umfang aus stryker.config.json (kein --mutate)', () => {
    expect(UMFAENGE.alle).toBeNull();
    expect(strykerArgumente('alle', false)).not.toContain('--mutate');
  });

  it('läuft immer inkrementell, mit eigener Zwischendatei je Umfang unter reports/', () => {
    for (const umfang of ['kern', 'alle']) {
      const args = strykerArgumente(umfang, false);
      expect(args[0]).toBe('run');
      expect(args).toContain('--incremental');
      expect(args[args.indexOf('--incrementalFile') + 1]).toBe(`reports/mutation/inkrementell-${umfang}.json`);
      expect(args).not.toContain('--force');
    }
  });

  it('hängt --force nur an, wenn ein Neulauf erzwungen wird', () => {
    expect(strykerArgumente('kern', true)).toContain('--force');
    expect(strykerArgumente('alle', true)).toContain('--force');
  });

  it('lehnt unbekannte, leere und gefährliche Umfänge ab', () => {
    for (const umfang of ['', 'KERN', 'sim', '../x', 'kern;rm -rf /', 'toString', '__proto__']) {
      expect(() => strykerArgumente(umfang, false)).toThrow(/Unbekannter Umfang/);
    }
  });
});

describe('Neulauf erzwingen', () => {
  it('nutzt alte Ergebnisse, wenn Bericht da ist und sich nichts geändert hat', () => {
    expect(mussErzwingen('abc', 'abc', true)).toBe(false);
  });

  it('erzwingt einen Neulauf bei geänderten Tests oder Konfiguration', () => {
    expect(mussErzwingen('abc', 'abd', true)).toBe(true);
  });

  it('erzwingt einen Neulauf, wenn kein Hash gespeichert ist (z. B. abgebrochener erster Lauf)', () => {
    expect(mussErzwingen(null, 'abc', true)).toBe(true);
    expect(mussErzwingen('', 'abc', true)).toBe(true);
  });

  it('braucht ohne Zwischendatei kein --force (Stryker testet ohnehin alles)', () => {
    expect(mussErzwingen(null, 'abc', false)).toBe(false);
    expect(mussErzwingen('alt', 'abc', false)).toBe(false);
  });

  it('ignoriert Leerraum um den gespeicherten Hash (Zeilenende in der Datei)', () => {
    expect(mussErzwingen('abc\n', 'abc', true)).toBe(false);
  });
});

describe('Hash über Tests und Konfiguration', () => {
  const basis = [
    { name: 'tests/sim.test.ts', inhalt: 'it("a")' },
    { name: 'stryker.config.json', inhalt: '{}' },
  ];

  it('ist ein SHA-256 in Hex und für gleiche Eingaben gleich', async () => {
    const h = await hashEingaben(basis);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashEingaben(basis.map(d => ({ ...d })))).toBe(h);
  });

  it('hängt nicht von der Reihenfolge ab', async () => {
    expect(await hashEingaben([...basis].reverse())).toBe(await hashEingaben(basis));
  });

  it('ändert sich bei geändertem, neuem, gelöschtem oder umbenanntem Test', async () => {
    const h = await hashEingaben(basis);
    expect(await hashEingaben([{ ...basis[0], inhalt: 'it("b")' }, basis[1]])).not.toBe(h);
    expect(await hashEingaben([...basis, { name: 'tests/neu.test.ts', inhalt: '' }])).not.toBe(h);
    expect(await hashEingaben([basis[1]])).not.toBe(h);
    expect(await hashEingaben([{ ...basis[0], name: 'tests/sim2.test.ts' }, basis[1]])).not.toBe(h);
  });

  it('lässt sich nicht durch Verschieben von Text zwischen Name und Inhalt austricksen', async () => {
    const a = await hashEingaben([{ name: 'tests/a', inhalt: 'bc' }]);
    const b = await hashEingaben([{ name: 'tests/ab', inhalt: 'c' }]);
    expect(a).not.toBe(b);
  });

  it('kommt mit leerer Liste und Unicode zurecht', async () => {
    expect(await hashEingaben([])).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashEingaben([{ name: 'tests/ä.test.ts', inhalt: '🐔' }])).not.toBe(await hashEingaben([]));
  });
});

describe('Welche Dateien zählen', () => {
  it('Vitest-Tests, Spielstände und die Konfiguration zählen', () => {
    for (const p of ['tests/sim.test.ts', 'tests/spielstaende/v0.4.0.json', 'stryker.config.json', 'vite.config.ts',
      'package-lock.json']) {
      expect(relevanteDatei(p), p).toBe(true);
    }
  });

  it('Browsertest, Quellcode und Berichte zählen nicht (Quellcode prüft Stryker selbst)', () => {
    for (const p of ['tests/browser.mjs', 'src/game/sim.ts', 'reports/mutation/mutation.json', 'README.md', '']) {
      expect(relevanteDatei(p), p).toBe(false);
    }
  });
});
