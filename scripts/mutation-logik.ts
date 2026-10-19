// Logik des Startskripts für Mutation Testing (scripts/mutation.ts), ohne Dateizugriffe, damit sie testbar bleibt.

/** Was mutiert wird: „kern“ (Standard) sind die sicherheits- und geldrelevanten Teile, „alle“ nimmt den Umfang aus
 *  stryker.config.json (ganze Spiellogik, Komplettlauf mehrere Stunden). */
export const UMFAENGE = {
  kern: ['src/game/validate.ts', 'src/game/state.ts', 'src/game/actions.ts'],
  alle: null,
} as const satisfies Record<string, readonly string[] | null>;

export type Umfang = keyof typeof UMFAENGE;

export function istUmfang(umfang: string): umfang is Umfang {
  return Object.hasOwn(UMFAENGE, umfang);
}

export function zwischendatei(umfang: Umfang): string {
  return `reports/mutation/inkrementell-${umfang}.json`;
}

export function strykerArgumente(umfang: string, erzwingen: boolean): string[] {
  if (!istUmfang(umfang)) throw new Error(`Unbekannter Umfang „${umfang}“ (erlaubt: ${Object.keys(UMFAENGE).join(', ')})`);
  const args = ['run', '--incremental', '--incrementalFile', zwischendatei(umfang)];
  const dateien = UMFAENGE[umfang];
  if (dateien) args.push('--mutate', dateien.join(','));
  if (erzwingen) args.push('--force');
  return args;
}

/** Stryker übernimmt im inkrementellen Modus mit dem Command-Runner jedes alte Ergebnis, auch wenn sich Tests geändert
 *  haben. Deshalb: Neulauf erzwingen, sobald der Hash über Tests und Konfiguration nicht mehr passt. */
export function mussErzwingen(gespeichert: string | null, aktuell: string, zwischendateiVorhanden: boolean): boolean {
  if (!zwischendateiVorhanden) return false;
  return (gespeichert ?? '').trim() !== aktuell;
}

/** Dateien, deren Änderung die Testergebnisse beeinflusst. Quellcode erkennt Stryker selbst. */
export function relevanteDatei(pfad: string): boolean {
  if (['stryker.config.json', 'vite.config.ts', 'package-lock.json'].includes(pfad)) return true;
  return pfad.startsWith('tests/') && pfad !== 'tests/browser.mjs';
}

export async function hashEingaben(dateien: readonly { name: string; inhalt: string }[]): Promise<string> {
  const sortiert = [...dateien].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).map(d => [d.name, d.inhalt]);
  const daten = new TextEncoder().encode(JSON.stringify(sortiert));
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', daten));
  return [...hash].map(b => b.toString(16).padStart(2, '0')).join('');
}
