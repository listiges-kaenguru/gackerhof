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
const { advanceHour, refreshOffers } = await server.ssrLoadModule('/src/game/sim.ts');
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

// Game Over: Ein Spielstand, der wegen langer Pleite vorbei ist, zeigt beim Laden die Bilanz „Zurück ins Büro“
{
  const s = structuredClone(basis);
  Object.assign(s, { money: -80, loanUsed: true, brokeSince: 1, gameOver: true, gameOverReason: 'pleite' });
  const datei = join(dir, 'gameover.json');
  writeFileSync(datei, JSON.stringify(s));
  const seite = await browser.newPage();
  const absturz = [];
  seite.on('pageerror', e => absturz.push(e.message));
  await seite.goto(`http://127.0.0.1:${PORT}/`);
  await seite.setInputFiles('input[data-start-import]', datei);
  await seite.locator('[data-start="import-ok"]').click({ timeout: 1500 }).catch(() => {});
  const titel = await seite.locator('h2', { hasText: 'Zurück ins Büro' }).waitFor({ timeout: 3000 }).then(() => true, () => false);
  check('Game Over: Bilanz „Zurück ins Büro“ erscheint', titel);
  check('Game Over: Grund „zu lange im Minus“ genannt', (await seite.getByText('zu lange im Minus').count()) > 0);
  await seite.locator('[data-act="newgame-now"]').click({ timeout: 1500 }).catch(() => {});
  await seite.waitForTimeout(300);
  check('Game Over: „Nochmal versuchen“ führt zu einem neuen Hof', (await seite.locator('h2', { hasText: 'Zurück ins Büro' }).count()) === 0);
  check('Game Over: kein Absturz', absturz.length === 0, absturz[0]?.slice(0, 120));
  await seite.close();
}

// Aufträge: alle Arten werden angezeigt, Teillieferung und Ablehnen per Klick
{
  const s = structuredClone(basis);
  s.eggs = { hybrid: 10 };
  s.orders = [
    { id: 9001, customer: 'Dorfgemeinschaft (Erntedankfest)', kind: 'eier', qty: 48, reward: 60, dueDay: s.day + 12, big: true, delivered: 0, paid: 0 },
    { id: 9002, customer: 'Bio-Laden Grünkern', kind: 'eier', qty: 6, reward: 9, dueDay: s.day + 3, brown: true },
    { id: 9003, customer: 'Züchterin Frau Berger', kind: 'bruteier', breed: 'marans', qty: 6, reward: 20, dueDay: s.day + 6 },
    { id: 9004, customer: 'Familie Hofmann', kind: 'hahn', qty: 1, reward: 25, dueDay: s.day + 8 },
  ];
  s.nextId = 9100;
  s.customers = { 'Familie Hofmann': 3 };
  const datei = join(dir, 'auftraege.json');
  writeFileSync(datei, JSON.stringify(s));
  const seite = await browser.newPage();
  const absturz = [];
  seite.on('pageerror', e => absturz.push(e.message));
  await seite.goto(`http://127.0.0.1:${PORT}/`);
  await seite.setInputFiles('input[data-start-import]', datei);
  await seite.locator('[data-start="import-ok"]').click({ timeout: 1500 }).catch(() => {});
  await seite.waitForTimeout(300);
  await seite.locator('[data-act="open:markt:auftraege"]').first().click({ timeout: 1500 }).catch(async () => {
    await seite.locator('[data-act="tab:markt"]').click();
    await seite.locator('[data-act="mtab:auftraege"]').click();
  });
  await seite.waitForTimeout(200);
  const text = await seite.locator('.panel, body').first().innerText();
  check('Aufträge: alle vier Arten sichtbar', ['48 Eier', '6 braune Eier', '6 Bruteier Marans', '1 Hahn'].every(x => text.includes(x)));
  check('Aufträge: Stammkunde markiert', text.includes('Stammkunde'));
  check('Aufträge: Wochentag in der Frist', /[Bb]is (Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)/.test(text));
  const teil = seite.locator('[data-act="orderPart:9001"]');
  await teil.click(); await teil.click(); // Bestätigung
  await seite.waitForTimeout(200);
  check('Aufträge: Teillieferung gebucht', (await seite.getByText('Geliefert: 10 von 48').count()) > 0);
  const nein = seite.locator('[data-act="orderNo:9004"]');
  await nein.click(); await nein.click();
  await seite.waitForTimeout(200);
  check('Aufträge: Ablehnen entfernt den Auftrag', (await seite.locator('[data-act="orderNo:9004"]').count()) === 0);
  check('Aufträge: kein Absturz', absturz.length === 0, absturz[0]?.slice(0, 120));
  await seite.close();
}

// Ereignisse: Nachbar-Auswahl, verstecktes Nest und Ausbüxer per Antippen in der Szene
{
  const s = structuredClone(basis);
  const [h1, h2] = s.animals;
  s.hour = 11; s.minute = 0; s.speed = 0;
  s.eggs = { hybrid: 8 };
  s.hiddenNest = { henId: h1.id, since: s.day, eggs: 3, x: 400, y: 230 };
  h2.outside = true;
  s.escapee = { id: h2.id, since: s.day, x: 170, y: 246 };
  s.neighbor = { pending: true, warned: false, quietUntil: 0, darkened: false };
  s.celebrations = [{ emoji: '🐓', title: 'Der Nachbar beschwert sich', lines: ['Test'], choices: [
    { act: 'nachbar:eier', label: 'Eierkarton schenken' }, { act: 'nachbar:verdunkeln', label: 'Verdunkeln' }, { act: 'nachbar:ignorieren', label: 'Ignorieren' },
  ] }];
  const datei = join(dir, 'ereignisse.json');
  writeFileSync(datei, JSON.stringify(s));
  const seite = await browser.newPage();
  const absturz = [];
  seite.on('pageerror', e => absturz.push(e.message));
  await seite.goto(`http://127.0.0.1:${PORT}/`);
  await seite.setInputFiles('input[data-start-import]', datei);
  await seite.locator('[data-start="import-ok"]').click({ timeout: 1500 }).catch(() => {});
  await seite.waitForTimeout(400);
  // Meldung mit Auswahl erscheint gleich beim Laden
  const wahl = seite.locator('[data-act="nachbar:eier"]');
  check('Ereignisse: Nachbar zeigt Auswahlknöpfe', await wahl.waitFor({ timeout: 4000 }).then(() => true, () => false));
  await wahl.click({ timeout: 1500 }).catch(() => {});
  await seite.waitForTimeout(300);
  check('Ereignisse: Auswahl schließt die Meldung', !(await seite.locator('[data-act="nachbar:eier"]').isVisible()));
  check('Ereignisse: Eierkarton abgezogen', (await seite.getByText('Eierkarton verschenkt').count()) > 0);
  const nest = seite.locator('.hidden-nest');
  check('Ereignisse: Versteck in der Szene', (await nest.count()) === 1);
  await nest.dispatchEvent('click').catch(() => {});
  await seite.waitForTimeout(300);
  check('Ereignisse: Antippen findet das Versteck', (await seite.locator('.hidden-nest').count()) === 0);
  const ausreisser = seite.locator('[data-act="catch"]').first();
  check('Ereignisse: Ausbüxer zum Einfangen markiert', (await seite.locator('[data-act="catch"]').count()) > 0);
  await ausreisser.dispatchEvent('click').catch(() => {});
  await seite.waitForTimeout(300);
  check('Ereignisse: Einfangen klappt', (await seite.getByText('wieder im Auslauf').count()) > 0);
  check('Ereignisse: kein Absturz', absturz.length === 0, absturz[0]?.slice(0, 120));
  await seite.close();
}

// Gemüsebeet: ernten, säen, verfüttern und verkaufen über die Oberfläche
{
  const s = structuredClone(basis);
  s.money = 500;
  s.extras.push('beet');
  s.day = 30; s.hour = 11; s.speed = 0;
  s.bed = { sownDay: 5, fertilized: true };
  const datei = join(dir, 'beet.json');
  writeFileSync(datei, JSON.stringify(s));
  const seite = await browser.newPage();
  const absturz = [];
  seite.on('pageerror', e => absturz.push(e.message));
  await seite.goto(`http://127.0.0.1:${PORT}/`);
  await seite.setInputFiles('input[data-start-import]', datei);
  await seite.locator('[data-start="import-ok"]').click({ timeout: 1500 }).catch(() => {});
  await seite.waitForTimeout(300);
  check('Beet: in der Szene', (await seite.locator('g.bed').count()) === 1);
  await seite.locator('[data-act="tab:hof"]').click();
  await seite.locator('.panel [data-act="harvest"]').click({ timeout: 1500 }).catch(() => {});
  await seite.waitForTimeout(200);
  check('Beet: Ernte (gedüngt 8 kg)', (await seite.getByText('8 kg Gemüse geerntet').count()) > 0);
  await seite.locator('.panel [data-act="sow"]').click({ timeout: 1500 }).catch(() => {});
  await seite.waitForTimeout(200);
  check('Beet: neu gesät', (await seite.getByText('reif in 20 Tagen').count()) > 0);
  await seite.locator('[data-act="tab:lager"]').click();
  await seite.locator('.panel [data-act="feedVeg"]').click({ timeout: 1500 }).catch(() => {});
  await seite.waitForTimeout(200);
  check('Beet: Gemüse verfüttert', (await seite.getByText('Gemüse verfüttert').count()) > 0);
  await seite.locator('[data-act="tab:markt"]').click();
  await seite.locator('[data-act="mtab:verkaufen"]').click();
  await seite.locator('.panel [data-act="sellVeg"]').click({ timeout: 1500 }).catch(() => {});
  await seite.waitForTimeout(200);
  check('Beet: Gemüse verkauft', (await seite.getByText(/kg Gemüse für .* verkauft/).count()) > 0);
  check('Beet: kein Absturz', absturz.length === 0, absturz[0]?.slice(0, 120));
  await seite.close();
}

// Weitere Geflügelarten: breitere Welt, Becken reinigen, Bezeichnungen und Markt
{
  const s = structuredClone(basis);
  s.money = 3000;
  for (const id of ['entenhaus', 'becken', 'gaensestall', 'grasweide', 'voliere']) A.buyItem(s, id);
  for (const [b, sex] of [['laufente', 'henne'], ['laufente', 'hahn'], ['gans', 'henne'], ['wachtel', 'henne']]) s.animals.push(createAnimal(s, b, { sex, ageDays: 200 }));
  s.pond = 20;
  s.hour = 11; s.speed = 0;
  refreshOffers(s);
  const datei = join(dir, 'arten.json');
  writeFileSync(datei, JSON.stringify(s));
  const seite = await browser.newPage({ viewport: { width: 1366, height: 800 } });
  const absturz = [];
  seite.on('pageerror', e => absturz.push(e.message));
  await seite.goto(`http://127.0.0.1:${PORT}/`);
  await seite.setInputFiles('input[data-start-import]', datei);
  await seite.locator('[data-start="import-ok"]').click({ timeout: 1500 }).catch(() => {});
  await seite.waitForTimeout(400);
  const vb = await seite.locator('svg.scene').getAttribute('viewBox');
  check('Arten: Welt 720 breit, ganz sichtbar', vb?.split(' ')[2] === '720', vb);
  check('Arten: Becken, Gänsestall und Voliere in der Szene', (await seite.locator('[aria-label="Entenbecken"],[aria-label="Gänsestall"],[aria-label="Wachtelvoliere"]').count()) === 3);
  await seite.locator('[data-act="cleanPond"]').first().click({ timeout: 1500 }).catch(() => {});
  await seite.waitForTimeout(200);
  check('Arten: Becken gereinigt', (await seite.getByText('Becken gereinigt').count()) > 0);
  await seite.locator('[data-act="tab:tiere"]').click();
  await seite.waitForTimeout(200);
  const tiere = await seite.locator('.panel').innerText();
  check('Arten: Erpel, Gans und Wachtel in der Tierliste', ['Erpel', 'Gans', 'Wachtel'].every(x => tiere.includes(x)));
  await seite.locator('[data-act="tab:markt"]').click();
  await seite.locator('[data-act="mtab:kaufen"]').click().catch(() => {});
  await seite.waitForTimeout(200);
  check('Arten: Markt bietet Enten an', (await seite.locator('.panel').getByText('Ente „ca. 1 Jahr“').count()) > 0);
  check('Arten: kein Absturz', absturz.length === 0, absturz[0]?.slice(0, 120));
  await seite.close();
}

await browser.close();
await server.close();
console.log(`${FAELLE.length * 3 + 30} Prüfungen, ${fehler} fehlgeschlagen`);
process.exit(fehler ? 1 : 0);
