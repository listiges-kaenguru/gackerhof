// Abgeleitete Werte aus dem Spielstand (keine Seiteneffekte außer log/toast).
import {
  AGE, BREEDS, BUTCHER_FEE, BUTCHER_PER_KG, CONTACTS, DAYS_PER_SEASON, DIFFICULTIES, FEED_SUPPLIES, FINANCE_ONE_OFF, ITEM,
  MAX_OVERCROWD, OUT_WINDOW, PLOTS, ROOST_HOUR, ROOST_WINDOW, SEASONS, STORAGE, VISIT_CLEAN, WALK_MINUTES,
} from './data';
import type { Animal, BreedId, Condition, ConditionId, FeedId, FinanceCat, FinanceMonth, GameState, LogEntry, Season, Stage } from './types';

export const diff = (s: GameState) => DIFFICULTIES[s.difficulty];
export const plot = (s: GameState) => PLOTS[s.plot];
export const has = (s: GameState, id: string) => s.extras.includes(id) || Object.values(s.equip).includes(id);

export const age = (s: GameState, a: Animal) => s.day - a.hatchedDay;
export function stage(s: GameState, a: Animal): Stage {
  const d = age(s, a);
  if (d < AGE.junghuhn) return 'kueken';
  if (d < AGE.erwachsen) return 'junghuhn';
  return 'erwachsen';
}
export const isSenior = (s: GameState, a: Animal) => age(s, a) >= AGE.senior;
export const living = (s: GameState) => s.animals.filter(a => !a.dead);
export const dead = (s: GameState) => s.animals.filter(a => a.dead);
/** Tiere, die im Stall/Auslauf leben (Küken sitzen in der Kükenstation) */
export const flock = (s: GameState) => living(s).filter(a => stage(s, a) !== 'kueken');
export const chicks = (s: GameState) => living(s).filter(a => stage(s, a) === 'kueken');
export const adultRoosters = (s: GameState) => living(s).filter(a => a.sex === 'hahn' && stage(s, a) === 'erwachsen');

export const seasonOfDay = (day: number): Season => SEASONS[Math.floor((day - 1) / DAYS_PER_SEASON) % 4];
export const season = (s: GameState) => seasonOfDay(s.day);
export const year = (s: GameState) => Math.floor((s.day - 1) / (DAYS_PER_SEASON * 4)) + 1;
export const dayOfSeason = (s: GameState) => ((s.day - 1) % DAYS_PER_SEASON) + 1;
export const isNight = (h: number) => h < 6 || h >= 21;

export function ageText(s: GameState, a: Animal): string {
  return daysText(age(s, a));
}
/** Spieltage als Alter: 1 Spieljahr = 120 Tage, 1 Monat = 10 Tage */
export function daysText(d: number): string {
  if (d < 0) return 'noch im Ei';
  if (d < 30) return `${d} Tage`;
  const y = Math.floor(d / 120);
  const m = Math.floor((d % 120) / 10);
  if (y === 0) return `${m} Monat${m === 1 ? '' : 'e'}`;
  return `${y} Jahr${y === 1 ? '' : 'e'}${m ? `, ${m} Mon.` : ''}`;
}
export function stageName(s: GameState, a: Animal): string {
  const st = stage(s, a);
  if (st === 'kueken') return 'Küken';
  if (st === 'junghuhn') return a.sex === 'hahn' ? 'Junghahn' : 'Junghenne';
  if (isSenior(s, a)) return a.sex === 'hahn' ? 'alter Hahn' : 'alte Henne';
  return a.sex === 'hahn' ? 'Hahn' : 'Henne';
}
/** Geschlecht ist erst ab Junghuhn erkennbar */
export const sexKnown = (s: GameState, a: Animal) => stage(s, a) !== 'kueken';

/* ---------------- Farbvarianten & Album ---------------- */
/** Farbvariante eines Tiers oder Eis (alte Spielstände: erste Variante) */
export function variantOf(breed: BreedId, variant?: string) {
  const vs = BREEDS[breed].variants;
  return vs.find(v => v.id === variant) ?? vs[0];
}
/** z. B. „Sussex rot“ */
export const breedLabel = (breed: BreedId, variant?: string) => `${BREEDS[breed].name} ${variantOf(breed, variant).name}`;
export const albumKey = (breed: BreedId, variant?: string) => `${breed}:${variantOf(breed, variant).id}`;
export const albumTotal = () => Object.values(BREEDS).reduce((t, b) => t + b.variants.length, 0);

/* ---------------- Weide & Licht ---------------- */
/** Zustand der gerade genutzten Weide (100 = frisch, 0 = völlig zertreten und verwurmt) */
export const pastureNow = (s: GameState) => (s.pasture ?? [100, 100])[has(s, 'wechselweide') ? s.pastureSide ?? 0 : 0];
/** Wurmrisiko durch die Weide: frisch 0,6×, abgenutzt bis 2× */
export const pastureWormFactor = (s: GameState) => 0.6 + (1 - pastureNow(s) / 100) * 1.4;
/** Stalllicht wirkt (und kostet Strom) nur im Herbst und Winter */
export function lightActive(s: GameState): boolean {
  if (!has(s, 'stalllicht') || s.lightOn === false) return false;
  const se = season(s);
  return se === 'herbst' || se === 'winter';
}

/* ---------------- Kapazitäten & Schutz ---------------- */
export const coopCap = (s: GameState) => (s.equip.coop ? ITEM[s.equip.coop].cap ?? 0 : 0);
export const runCap = (s: GameState) => (s.equip.fence ? (ITEM[s.equip.fence].run ?? 0) + s.runExtensions * 6 : 0);
export const drinkerCap = (s: GameState) => (s.equip.drinker ? ITEM[s.equip.drinker].cap ?? 0 : 0);
export const feederCap = (s: GameState) => (s.equip.feeder ? ITEM[s.equip.feeder].cap ?? 0 : 0);
/** Wie stark überbelegt? 1 = genau voll, >1 = zu eng */
export function crowding(s: GameState): number {
  const n = flock(s).length;
  const cap = Math.min(coopCap(s), runCap(s) || coopCap(s));
  if (n === 0) return 0;
  if (cap === 0) return 3;
  return n / cap;
}
export function foxProtection(s: GameState): number {
  if (!s.equip.fence) return 0;
  let p = ITEM[s.equip.fence].fox ?? 0;
  if (s.equip.fence === 'enetz' && has(s, 'geraet')) p = 0.85;
  // Zusatzschutz genau mit den Werten, die der Shop anzeigt
  for (const id of ['untergrab', 'licht']) if (has(s, id)) p += ITEM[id].fox ?? 0;
  return Math.min(0.97, p);
}
export function hawkProtection(s: GameState): number {
  let p = 0;
  if (has(s, 'netz')) p = 0.92;
  else {
    if (has(s, 'flatterband')) {
      // Gewöhnung: nach 20 Tagen kaum noch Wirkung
      const days = s.day - s.flatterbandSince;
      p += Math.max(0.03, 0.25 - days * 0.011);
    }
    if (has(s, 'unterstand')) p += 0.3;
    if (s.plot === 'obst') p += 0.2;
    if (adultRoosters(s).length) p += 0.15;
  }
  return Math.min(0.95, p);
}
export const marderSafe = (s: GameState) =>
  !!s.equip.coop && (!!ITEM[s.equip.coop].marderSafe || has(s, 'mardergitter'));
export const ratSafe = (s: GameState) => !!s.equip.feeder && !!ITEM[s.equip.feeder].ratSafe;
export const autoWater = (s: GameState) => has(s, 'pumpe') || has(s, 'leitung');
/** Stall ist gedämmt und zugfrei: weniger Atemwegsinfekte im Herbst und Winter */
export const insulated = (s: GameState) => has(s, 'daemmung') || s.equip.coop === 'gartenhaus' || s.equip.coop === 'mobil';
/** Kräuter im Trinkwasser wirken gerade */
export const herbsActive = (s: GameState) => (s.kraeuterUntil ?? 0) >= s.day;
/** Ansteckung: Faktor je Stallgenosse. Bis CONTACTS Tiere 1, darüber wächst die Zahl der engen Kontakte
 *  nur mit der Wurzel der Herdengröße (others × Faktor = Wurzel aus CONTACTS × others). */
export const contactFactor = (others: number) => Math.min(1, Math.sqrt(CONTACTS / Math.max(1, others)));
/** Immun gegen diese Krankheit (nach überstandener Erkrankung) */
export const immune = (s: GameState, a: Animal, id: ConditionId) => (a.immuneUntil?.[id] ?? 0) >= s.day;
/** Wie lange nach dem Eisaufhacken getrunken werden kann (Spielstunden) */
export const ICE_FREE_HOURS = 6;
/** Fortlaufende Spielstunde, z. B. für Fristen innerhalb eines Tages */
export const hourIndex = (s: GameState) => s.day * 24 + s.hour;
/** Die Tränke friert bei Frost ein (beheizte Tränke, Wasserleitung und Bachpumpe nicht) */
export const freezes = (s: GameState) =>
  s.temperature < 0 && !(s.equip.drinker && ITEM[s.equip.drinker].frostSafe) && !has(s, 'leitung') && !has(s, 'pumpe');
/** Die Tränke ist gerade zugefroren: Frost und das Eis ist nicht (mehr) aufgehackt */
export const frozen = (s: GameState) => freezes(s) && (s.iceFreeUntil ?? 0) <= hourIndex(s);
export const shade = (s: GameState) => plot(s).shade || has(s, 'unterstand');
/** Tiere im Auslauf (Küken und brütende Hennen bleiben drinnen) */
export const outsideAnimals = (s: GameState) => flock(s).filter(a => a.outside);
/** Draußen bei geschlossener Klappe: ausgesperrt */
export const lockedOut = (s: GameState) => (s.doorOpen ? [] : outsideAnimals(s));
export const isDaytime = (h: number) => h >= 6 && h < 20;
/** Uhrzeit in Minuten seit Mitternacht */
export const minuteOfDay = (s: GameState) => s.hour * 60 + (s.minute ?? 0);
/** Individuelle Schlafenszeit: jedes Huhn geht zu seiner Zeit, scheue früher, neugierige später */
export function roostTime(a: Animal): number {
  let off = (a.id * 37) % (ROOST_WINDOW - 20);
  if (a.personality === 'scheu') off -= 10;
  if (a.personality === 'neugierig' || a.personality === 'mutig') off += 15;
  return ROOST_HOUR * 60 + Math.max(0, Math.min(ROOST_WINDOW, off));
}
/** Ankunft im Stall nach dem Fußweg */
export const roostArrival = (a: Animal) => roostTime(a) + WALK_MINUTES;
export const outTime = (a: Animal) => 6 * 60 + ((a.id * 53) % OUT_WINDOW);
/** Ist das Huhn gerade auf dem Weg in den Stall? */
export function headingIn(s: GameState, a: Animal): boolean {
  const t = minuteOfDay(s);
  return !!a.outside && s.doorOpen && (t >= roostTime(a) || t < 6 * 60);
}
/** So viele Tiere passen höchstens in den Stall */
export const maxInside = (s: GameState) => Math.floor(coopCap(s) * MAX_OVERCROWD);
export const eventActive = (s: GameState, id: string) => s.events.some(e => e.id === id && e.until >= s.day);

export interface StarFactor {
  label: string;
  value: string;
  points: number; // Beitrag zum Hof-Ruf
  max: number; // bestmöglicher Beitrag
  tip: string;
}
/** Hof-Ruf aufgeschlüsselt: Grundwert 3 Sterne plus/minus diese Faktoren */
export function starFactors(s: GameState): StarFactor[] {
  const f = living(s);
  if (f.length === 0) return [];
  const avgHealth = f.reduce((t, a) => t + a.health, 0) / f.length;
  const avgWell = f.reduce((t, a) => t + a.wellbeing, 0) / f.length;
  const c = crowding(s);
  const recent = s.stats.deathsRecent.filter(d => d > s.day - 30).length;
  return [
    { label: 'Gesundheit', value: `Ø ${Math.round(avgHealth)} %`, max: 0.75,
      points: avgHealth > 80 ? 0.75 : avgHealth < 50 ? -1 : 0,
      tip: 'Über 80 %: Futter und Wasser nie ausgehen lassen, Krankheiten früh behandeln.' },
    { label: 'Wohlbefinden', value: `Ø ${Math.round(avgWell)} %`, max: 0.75,
      points: avgWell > 70 ? 0.75 : avgWell < 40 ? -0.75 : 0,
      tip: 'Über 70 %: tagsüber Auslauf, Platz, Schatten, Mehlwürmer, nicht zu viele Hähne.' },
    { label: 'Platz', value: `${Math.round(c * 100)} % belegt`, max: 0.5,
      points: c <= 0.8 ? 0.5 : c > 1 ? -1 : 0,
      tip: 'Höchstens 80 % von Stall und Auslauf belegen. Größerer Stall oder Auslauf hilft.' },
    { label: 'Sauberkeit', value: `${Math.round(s.cleanliness)} %`, max: 0.5,
      points: s.cleanliness > 60 ? 0.5 : s.cleanliness < 30 ? -1 : 0,
      tip: 'Über 60 %: regelmäßig ausmisten (Einstreu im Shop).' },
    { label: 'Todesfälle (30 Tage)', value: String(recent), max: 0,
      points: recent >= 3 ? -1.5 : recent >= 1 ? -0.5 : 0,
      tip: 'Jeder Verlust durch Raubtiere, Krankheit oder Vernachlässigung kostet Ansehen. Altersschwäche zählt nicht.' },
    ...(s.visitEffect && s.visitEffect.until >= s.day ? [{
      label: 'Letzter Hofbesuch', value: s.visitEffect.points > 0 ? 'begeistert' : 'enttäuscht', max: s.visitEffect.points > 0 ? s.visitEffect.points : 0,
      points: s.visitEffect.points,
      tip: `Wirkt noch bis Tag ${s.visitEffect.until}. Hofbesuche gibt es ab 4 Sternen, sie brauchen einen sauberen Stall und gesunde Tiere.`,
    }] : []),
  ];
}
/** Hof-Ruf in Sternen (1–5) */
export function stars(s: GameState): number {
  const factors = starFactors(s);
  if (!factors.length) return 3;
  const score = 3 + factors.reduce((t, x) => t + x.points, 0);
  return Math.max(1, Math.min(5, Math.round(score)));
}

/* ---------------- Vorräte ---------------- */
export const eggCount = (eggs: Record<string, number>) => Object.values(eggs).reduce((a, b) => a + b, 0);
/** Alle Eier im Nest, auch Bruteier und solche mit Wartezeit */
export const nestCount = (s: GameState) => eggCount(s.nestEggs) + s.nestHatchEggs.length + s.blockedEggs;
/** Eingesammelte Speise- und Bruteier im Lager */
export const storedEggCount = (s: GameState) => eggCount(s.eggs) + s.hatchEggs.length;
/** Körnerfutter und Legemehl im Lager (kg) */
export const grainStock = (s: GameState) => (s.inventory.koerner ?? 0) + (s.inventory.legemehl ?? 0);
/** Welches Futter beim Auffüllen genommen wird: Legemehl vor Körnern */
export function defaultFeed(s: GameState): FeedId | null {
  if ((s.inventory.legemehl ?? 0) > 0) return 'legemehl';
  if ((s.inventory.koerner ?? 0) > 0) return 'koerner';
  return null;
}
/** Die schwerste Krankheit eines Tiers (bei Gleichstand die zuerst aufgetretene) */
export function worstCondition(a: Animal): Condition | undefined {
  let worst: Condition | undefined;
  for (const c of a.conditions) if (!worst || c.severity > worst.severity) worst = c;
  return worst;
}

/* ---------------- Preise ---------------- */
/** Preis eines Eis dieser Rasse: Tagespreis × Rassenfaktor × Bonus der Schwierigkeit (factor: 1,5 im Hofladen) */
export function eggUnitPrice(s: GameState, breed: BreedId, factor = 1): number {
  return round2(s.eggPrice * BREEDS[breed].eggValue * factor * diff(s).sellBonus);
}
/** Wert dieser Eier: Summe der gerundeten Stückpreise, damit die Aufschlüsselung immer aufgeht */
export function eggValue(s: GameState, eggs: Record<string, number>, factor = 1): number {
  let v = 0;
  for (const [b, n] of Object.entries(eggs)) v += n * eggUnitPrice(s, b as BreedId, factor);
  return round2(v);
}
/** Aufschlüsselung für die Anzeige, z. B. „1× Legehybride à 0,51 € · 1× Marans à 1,02 €“ (ohne Umbruch innerhalb eines Postens) */
export function eggBreakdown(s: GameState, eggs: Record<string, number>, factor = 1): string {
  return (Object.entries(eggs).filter(([, n]) => n > 0) as [BreedId, number][])
    .sort(([a], [b]) => eggUnitPrice(s, a) - eggUnitPrice(s, b))
    .map(([b, n]) => `${n}×\u00a0${BREEDS[b].name} à\u00a0${euro(eggUnitPrice(s, b, factor))}`).join(' · ');
}
export function animalValue(s: GameState, a: Animal): number {
  const b = BREEDS[a.breed];
  const st = stage(s, a);
  let base = st === 'kueken' ? b.prices.kueken : st === 'junghuhn' ? b.prices.junghenne * 0.85 : a.sex === 'hahn' ? b.prices.hahn : b.prices.legehenne;
  if (a.sex === 'hahn' && st !== 'kueken') base *= 0.6; // Hähne will kaum jemand
  if (isSenior(s, a)) base *= 0.35;
  base *= 0.4 + 0.6 * (a.health / 100);
  if (a.conditions.length) base *= 0.6;
  return round2(Math.max(1, base * 0.8 * diff(s).sellBonus));
}
export function butcherValue(s: GameState, a: Animal): number {
  return round2(Math.max(0, a.weight * BUTCHER_PER_KG * diff(s).sellBonus - BUTCHER_FEE));
}
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const euro = (n: number) =>
  // Number(): zweite Sicherung, falls doch einmal kein Zahlwert ankommt – ein Text bliebe sonst unverändert (HTML)
  (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

/* ---------------- Meldungen ---------------- */
export function log(s: GameState, text: string, kind: LogEntry['kind'] = 'info', toast = false) {
  const e = { day: s.day, hour: s.hour, text, kind };
  s.log.unshift(e);
  if (s.log.length > 300) s.log.length = 300;
  if (toast) s.toasts.push(e);
}
export function addMoney(s: GameState, amount: number, cat: FinanceCat) {
  s.money = round2(s.money + amount);
  if (amount > 0) s.stats.income = round2(s.stats.income + amount);
  else s.stats.expenses = round2(s.stats.expenses - amount);
  const f = (s.finance ??= { cur: {}, results: [] });
  f.cur[cat] = round2((f.cur[cat] ?? 0) + amount);
}
/** Laufendes Ergebnis eines Monats: alles außer Investitionen, Krediten und Geschenken */
export function monthResult(m: FinanceMonth): number {
  return round2(Object.entries(m).reduce((t, [k, v]) => FINANCE_ONE_OFF.includes(k as FinanceCat) ? t : t + (v ?? 0), 0));
}

/** Was einem Hofbesuch heute nicht gefallen würde (leer: alles in Ordnung) */
export function visitProblems(s: GameState): string[] {
  const out: string[] = [];
  if (flock(s).length < 3) out.push('Es gibt kaum Hühner zu sehen.');
  if (s.cleanliness < VISIT_CLEAN) out.push(`Der Stall ist nicht sauber genug (${Math.round(s.cleanliness)} %, nötig sind ${VISIT_CLEAN} %).`);
  const sick = living(s).filter(a => a.conditions.length);
  if (sick.length) out.push(`Kranke Tiere: ${sick.map(a => a.name).join(', ')}.`);
  if (dead(s).length) out.push('Ein totes Tier liegt noch im Gehege.');
  return out;
}

/* ---------------- Lager ---------------- */
/** Platz im Lager: Futter (kg) und Stroh (Ballen) */
export function storageCap(s: GameState) {
  const shed = has(s, 'schuppen');
  return { feed: shed ? STORAGE.feedShed : STORAGE.feed, straw: shed ? STORAGE.strawShed : STORAGE.straw };
}
/** Futter im Lager (kg), alle Sorten zusammen */
export const feedStock = (s: GameState) => round2(FEED_SUPPLIES.reduce((t, id) => t + (s.inventory[id] ?? 0), 0));
