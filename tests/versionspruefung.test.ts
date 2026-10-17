// Versionsprüfung gegen GitHub – ohne Netz: fetch, localStorage und die Uhr sind gemockt.
// Jeder Test lädt src/ui/update.ts frisch, weil das Modul sich Ergebnis und Start merkt.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const JETZT = new Date('2026-10-17T12:00:00Z').getTime();
const SCHLUESSEL = 'gackerhof-release';
let speicher: Map<string, string>;

/** Gespeichertes Ergebnis; vi.waitFor stellt die gemockte Uhr je Durchlauf um 50 ms vor → enges Zeitfenster */
function gemerkt() {
  const c = JSON.parse(speicher.get(SCHLUESSEL)!);
  expect(c.checked).toBeGreaterThanOrEqual(JETZT);
  expect(c.checked).toBeLessThan(JETZT + 5000);
  return c.version;
}
function antwort(tag: unknown, ok = true) {
  return vi.fn(async () => ({ ok, json: async () => ({ tag_name: tag }) }));
}
async function modul() {
  vi.resetModules();
  return import('../src/ui/update');
}
/** updateInfo aufrufen, auf den Rückruf warten, dann den neuen Text holen */
async function pruefen(aktuell = '0.4.0') {
  const { updateInfo } = await modul();
  const fertig = vi.fn();
  const vorher = updateInfo(aktuell, fertig);
  await vi.waitFor(() => expect(fertig).toHaveBeenCalled());
  return { vorher, nachher: updateInfo(aktuell, fertig), fertig };
}

beforeEach(() => {
  speicher = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => speicher.get(k) ?? null,
    setItem: (k: string, v: string) => void speicher.set(k, v),
  });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(JETZT);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Versionsprüfung', () => {
  it('meldet eine neue Version mit Link und merkt sich das Ergebnis', async () => {
    vi.stubGlobal('fetch', antwort('v9.9.9'));
    const { vorher, nachher } = await pruefen();
    expect(vorher).toBe('Suche nach neuer Version …');
    expect(nachher).toContain('Version 9.9.9 ist erschienen');
    expect(nachher).toContain('href="https://github.com/listiges-kaenguru/gackerhof/releases/latest"');
    expect(gemerkt()).toBe('9.9.9');
  });

  it.each([['gleiche', 'v0.4.0'], ['ältere', 'v0.3.9']])('meldet bei %s Version: neueste', async (_, tag) => {
    vi.stubGlobal('fetch', antwort(tag));
    expect((await pruefen()).nachher).toBe('Das ist die neueste Version.');
  });

  it('bleibt ohne Netz still und merkt sich den Fehlschlag', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Netzwerkfehler'); }));
    expect((await pruefen()).nachher).toBe('');
    expect(gemerkt()).toBeNull();
  });

  it('bleibt bei einer Fehlerantwort (z. B. Ratenlimit) still', async () => {
    vi.stubGlobal('fetch', antwort('v9.9.9', false));
    expect((await pruefen()).nachher).toBe('');
  });

  it.each([
    ['HTML im Tag', 'v9.9.9"><img src=x onerror=alert(1)>'],
    ['Skript', '<script>alert(1)</script>'],
    ['Zahl statt Text', 999],
    ['fehlt', undefined],
  ])('übernimmt keinen präparierten Tag (%s)', async (_, tag) => {
    vi.stubGlobal('fetch', antwort(tag));
    const { nachher } = await pruefen();
    expect(nachher).toBe('');
    expect(nachher).not.toContain('<img');
  });

  it('fragt bei frischem Ergebnis im Speicher nicht erneut', async () => {
    speicher.set(SCHLUESSEL, JSON.stringify({ version: '9.9.9', checked: JETZT - 3600_000 }));
    const abruf = antwort('v1.0.0');
    vi.stubGlobal('fetch', abruf);
    expect((await pruefen()).nachher).toContain('Version 9.9.9');
    expect(abruf).not.toHaveBeenCalled();
  });

  it('fragt nach mehr als einem Tag erneut', async () => {
    speicher.set(SCHLUESSEL, JSON.stringify({ version: '9.9.9', checked: JETZT - 25 * 3600_000 }));
    const abruf = antwort('v0.4.0');
    vi.stubGlobal('fetch', abruf);
    expect((await pruefen()).nachher).toBe('Das ist die neueste Version.');
    expect(abruf).toHaveBeenCalledOnce();
  });

  it('fragt bei kaputtem Speicherinhalt neu', async () => {
    speicher.set(SCHLUESSEL, '{kaputt');
    const abruf = antwort('v0.4.0');
    vi.stubGlobal('fetch', abruf);
    await pruefen();
    expect(abruf).toHaveBeenCalledOnce();
  });

  it('fragt auch bei mehrfachem Öffnen nur einmal', async () => {
    const abruf = antwort('v0.4.0');
    vi.stubGlobal('fetch', abruf);
    const { updateInfo } = await modul();
    const fertig = vi.fn();
    updateInfo('0.4.0', fertig); updateInfo('0.4.0', fertig); updateInfo('0.4.0', fertig);
    await vi.waitFor(() => expect(fertig).toHaveBeenCalled());
    expect(abruf).toHaveBeenCalledOnce();
  });

  it('läuft weiter, wenn der Speicher gesperrt ist', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('gesperrt'); }, setItem: () => { throw new Error('gesperrt'); } });
    vi.stubGlobal('fetch', antwort('v9.9.9'));
    expect((await pruefen()).nachher).toContain('Version 9.9.9');
  });
});

describe('Versionsvergleich, Grenzfälle', async () => {
  const { compareVersions, versionFromTag } = await import('../src/ui/update');
  it('vergleicht stellenweise numerisch', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('2.0.0', '10.0.0')).toBeLessThan(0);
  });
  it.each(['v1.2.3.4', 'V1.2.3', ' v1.2.3', 'v1.2', '1.2.3-rc1', ''])('lehnt den Tag „%s“ ab', tag => {
    expect(versionFromTag(tag)).toBeNull();
  });
});
