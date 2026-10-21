#!/usr/bin/env node
// Browsertest: präparierte Spielstände über das echte Dateifeld importieren und prüfen, dass kein
// eingeschleuster Code läuft und das Spiel nicht abstürzt. Jeder Fall läuft in einer frischen Browser-Seite.
// Braucht Playwright und Chromium (Pfad zur package.json in $PW), am besten in einem Container:
//   node tests/browser.mjs
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.PW) { console.error('$PW fehlt – zeigt auf die package.json eines installierten Playwright (siehe README)'); process.exit(2); }
const { chromium } = createRequire(process.env.PW)('playwright');
const { createServer } = await import(createRequire(join(ROOT, 'package.json')).resolve('vite'));

const PORT = Number(process.env.TEST_PORT || 5190);
const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1' } });
await server.listen();
const { newGame, createAnimal } = await server.ssrLoadModule('/src/game/state.ts');
const { advanceHour } = await server.ssrLoadModule('/src/game/sim.ts');
const A = await server.ssrLoadModule('/src/game/actions.ts');

// Ausgangslage: ein laufender Hof mit Stall und drei Hühnern (fester Seed, wie in tests/sim.test.ts)
const basis = newGame({ farmName: 'Testhof', difficulty: 'mittel', plot: 'obst', seed: 7 });
for (const id of ['knoten', 'kiste', 'eimer', 'trog']) A.buyItem(basis, id);
for (let i = 0; i < 3; i++) basis.animals.push(createAnimal(basis, 'hybrid', { sex: 'henne', ageDays: 40 }));
for (let i = 0; i < 30; i++) advanceHour(basis);
if (!basis.animals.length) throw new Error('Ausgangslage ohne Tiere – Test passt nicht mehr zum Spiel');

// Nutzlast: setzt bei Ausführung einen Zähler; als Text, als Attribut-Ausbruch und als SVG-Ausbruch
const XSS = '<img src=x onerror="window.__xss=(window.__xss||0)+1">';
const AUS_ATTR = `"><img src=x onerror="window.__xss=(window.__xss||0)+1">`;
const FAELLE = [
  ['Hofname mit HTML', s => { s.farmName = XSS; }],
  ['Tiername mit HTML', s => { s.animals[0].name = XSS; }],
  ['Tier-ID bricht aus dem Attribut aus', s => { s.animals[0].id = AUS_ATTR; }],
  ['Zahlenfeld (verkaufte Eier) als HTML', s => { s.stats.eggsSold = XSS; }],
  ['Tagebuch-Eintrag mit HTML', s => { s.log.unshift({ day: 1, hour: 1, kind: 'info', text: XSS }); }],
  ['Hut-Kennung bricht aus dem Attribut aus', s => { s.hat = AUS_ATTR; s.cosmetics.push(AUS_ATTR); }],
  ['Rasse-Kennung bricht aus', s => { s.animals[0].breed = AUS_ATTR; }],
  ['Geld als HTML', s => { s.money = XSS; }],
];

const dir = mkdtempSync(join(tmpdir(), 'gackerhof-import-'));
const browser = await chromium.launch();
let fehler = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` ${info}`}`); if (!ok) fehler++; };

for (const [name, aendern] of FAELLE) {
  const s = structuredClone(basis);
  aendern(s);
  const datei = join(dir, 'spielstand.json');
  writeFileSync(datei, JSON.stringify(s));
  const seite = await browser.newPage();
  const absturz = [];
  let dialoge = 0;
  seite.on('pageerror', e => absturz.push(e.message));
  seite.on('dialog', d => { dialoge++; d.dismiss(); });
  await seite.goto(`http://127.0.0.1:${PORT}/`);
  await seite.setInputFiles('input[data-start-import]', datei);
  // Ohne gespeicherten Hof startet der Import direkt; sonst erst bestätigen
  await seite.locator('[data-start="import-ok"]').click({ timeout: 1500 }).catch(() => {});
  await seite.waitForTimeout(500);
  // Alle Panels öffnen, damit möglichst viele Felder gerendert werden, und ein Tier antippen
  for (const tab of ['tiere', 'hof', 'shop', 'markt', 'lager', 'mehr']) {
    await seite.locator(`[data-act="tab:${tab}"]`).click({ timeout: 1500 }).catch(() => {});
    await seite.waitForTimeout(150);
  }
  await seite.locator('[data-act="tab:tiere"]').click({ timeout: 1500 }).catch(() => {});
  await seite.locator('.animal-row').first().click({ timeout: 1500 }).catch(() => {});
  await seite.waitForTimeout(300);
  const xss = await seite.evaluate(() => window.__xss ?? 0);
  const laeuft = await seite.locator('[data-act="tab:mehr"]').count();
  check(`${name}: kein eingeschleuster Code`, xss === 0 && dialoge === 0, `(${xss} Ausführungen, ${dialoge} Dialoge)`);
  check(`${name}: kein Absturz`, absturz.length === 0, absturz[0]?.slice(0, 120));
  check(`${name}: Spiel läuft oder lehnt ab`, laeuft > 0 || (await seite.locator('.bad').count()) > 0);
  await seite.close();
}

await browser.close();
await server.close();
console.log(`${FAELLE.length * 3} Prüfungen, ${fehler} fehlgeschlagen`);
process.exit(fehler ? 1 : 0);
