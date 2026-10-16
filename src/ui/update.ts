// Versionsprüfung: Vergleich mit dem neuesten Release auf GitHub.
// Der Browser fragt die GitHub-API höchstens einmal am Tag (Ergebnis im localStorage) und erst, wenn
// „Mehr“ geöffnet wird. Ohne Netz oder bei Fehlern bleibt es still; das Spiel braucht die Prüfung nicht.
import { SOURCE_URL } from './links';

const RELEASE_API = 'https://api.github.com/repos/listiges-kaenguru/gackerhof/releases/latest';
const RELEASES_URL = `${SOURCE_URL}/releases/latest`;
const STORE_KEY = 'gackerhof-release';
const MAX_AGE = 24 * 3600 * 1000;

interface Cached { version: string | null; checked: number }

let latest: string | null | undefined; // undefined = noch nicht geprüft
let started = false;

/** SemVer ohne Vorabversionen vergleichen: < 0, 0 oder > 0 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

/** Versionsnummer aus einem Tag wie „v0.3.3“, sonst null */
export function versionFromTag(tag: unknown): string | null {
  return typeof tag === 'string' ? /^v?(\d+\.\d+\.\d+)$/.exec(tag)?.[1] ?? null : null;
}

function readCache(): Cached | null {
  try {
    const c = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as Cached | null;
    return c && typeof c.checked === 'number' ? c : null;
  } catch { return null; }
}

async function check(onDone: () => void) {
  const cached = readCache();
  if (cached && Date.now() - cached.checked < MAX_AGE) { latest = cached.version; onDone(); return; }
  try {
    const res = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(5000) });
    latest = res.ok ? versionFromTag((await res.json()).tag_name) : null;
  } catch { latest = null; }
  // Auch Fehlschläge merken, damit ein gesperrtes Netz nicht bei jedem Öffnen erneut gefragt wird
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ version: latest, checked: Date.now() })); } catch { /* egal */ }
  onDone();
}

/** Zeile unter der Versionsnummer; startet beim ersten Aufruf die Prüfung, onDone zeichnet neu */
export function updateInfo(current: string, onDone: () => void): string {
  if (!started) { started = true; void check(onDone); }
  if (latest === undefined) return 'Suche nach neuer Version …';
  if (latest === null) return '';
  if (compareVersions(latest, current) > 0) {
    return `🆕 Version ${latest} ist erschienen. <a href="${RELEASES_URL}" target="_blank" rel="noopener">Zum Release auf GitHub</a>`;
  }
  return 'Das ist die neueste Version.';
}
