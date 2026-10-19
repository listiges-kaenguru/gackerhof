// Mutation Testing starten: npm run test:mutation (Umfang „kern“) bzw. npm run test:mutation:alle.
// Weitere Argumente gehen an Stryker, z. B. npm run test:mutation -- --concurrency 2.
// Läuft mit Nodes Type-Stripping (Node ≥ 22.18) direkt als .ts.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashEingaben, istUmfang, mussErzwingen, relevanteDatei, strykerArgumente, zwischendatei } from './mutation-logik.ts';

const argv = process.argv.slice(2);
const umfang = argv[0] && !argv[0].startsWith('-') ? argv.shift()! : 'kern';
if (!istUmfang(umfang)) {
  console.error(`Unbekannter Umfang „${umfang}“ (erlaubt: kern, alle)`);
  process.exit(2);
}

function dateienUnter(ordner: string): string[] {
  return readdirSync(ordner, { withFileTypes: true }).flatMap(e => {
    const pfad = `${ordner}/${e.name}`;
    return e.isDirectory() ? dateienUnter(pfad) : [pfad];
  });
}

const kandidaten = [...dateienUnter('tests'), 'stryker.config.json', 'vite.config.ts', 'package-lock.json'];
const eingaben = kandidaten.filter(p => relevanteDatei(p) && existsSync(p))
  .map(name => ({ name, inhalt: readFileSync(name, 'utf8') }));
const hash = await hashEingaben(eingaben);

const hashDatei = zwischendatei(umfang).replace(/\.json$/, '.hash');
const gespeichert = existsSync(hashDatei) ? readFileSync(hashDatei, 'utf8') : null;
const erzwingen = mussErzwingen(gespeichert, hash, existsSync(zwischendatei(umfang)));
if (erzwingen) console.log('Tests oder Konfiguration geändert – alle Mutanten werden neu geprüft (--force).');

const ergebnis = spawnSync(join('node_modules', '.bin', 'stryker'), [...strykerArgumente(umfang, erzwingen), ...argv],
  { stdio: 'inherit' });
if (ergebnis.status === 0) writeFileSync(hashDatei, `${hash}\n`);
process.exit(ergebnis.status ?? 1);
