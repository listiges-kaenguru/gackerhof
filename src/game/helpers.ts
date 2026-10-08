// Abgeleitete Werte aus dem Spielstand (keine Seiteneffekte außer log/toast).
import {
  AGE, BREEDS, BUTCHER_FEE, BUTCHER_PER_KG, DAYS_PER_SEASON, DIFFICULTIES, ITEM, MAX_OVERCROWD, OUT_WINDOW, PLOTS,
  ROOST_HOUR, ROOST_WINDOW, SEASONS, WALK_MINUTES,
} from './data';
import type { Animal, BreedId, GameState, LogEntry, Season, Stage } from './types';

export const diff = (s: GameState) => DIFFICULTIES[s.difficulty];
export const plot = (s: GameState) => PLOTS[s.plot];
export const has = (s: GameState, id: string) => s.extras.includes(id) || Object.values(s.equip).includes(id);
export const owns = (s: GameState, id: string) => has(s, id) || s.cosmetics.includes(id);

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

export function season(s: GameState): Season {
  return SEASONS[Math.floor((s.day - 1) / DAYS_PER_SEASON) % 4];
}
export const year = (s: GameState) => Math.floor((s.day - 1) / (DAYS_PER_SEASON * 4)) + 1;
export const dayOfSeason = (s: GameState) => ((s.day - 1) % DAYS_PER_SEASON) + 1;
export const isNight = (h: number) => h < 6 || h >= 21;
export function dayPhase(h: number): 'nacht' | 'morgen' | 'tag' | 'abend' {
  if (h >= 21 || h < 5) return 'nacht';
  if (h < 9) return 'morgen';
  if (h < 18) return 'tag';
  return 'abend';
}

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
export const lightActive = (s: GameState) => has(s, 'stalllicht') && s.lightOn !== false && (season(s) === 'herbst' || season(s) === 'winter');

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
export const frozen = (s: GameState) =>
  s.temperature < 0 && !(s.equip.drinker && ITEM[s.equip.drinker].frostSafe) && !has(s, 'leitung');
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
  ];
}
/** Hof-Ruf in Sternen (1–5) */
export function stars(s: GameState): number {
  const factors = starFactors(s);
  if (!factors.length) return 3;
  const score = 3 + factors.reduce((t, x) => t + x.points, 0);
  return Math.max(1, Math.min(5, Math.round(score)));
}

/* ---------------- Preise ---------------- */
export const eggCount = (eggs: Record<string, number>) => Object.values(eggs).reduce((a, b) => a + b, 0);
export function eggValue(s: GameState, eggs: Record<string, number>, factor = 1): number {
  let v = 0;
  for (const [b, n] of Object.entries(eggs)) v += n * s.eggPrice * BREEDS[b as keyof typeof BREEDS].eggValue;
  return round2(v * factor * diff(s).sellBonus);
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
  n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

/* ---------------- Meldungen ---------------- */
export function log(s: GameState, text: string, kind: LogEntry['kind'] = 'info', toast = false) {
  const e = { day: s.day, hour: s.hour, text, kind };
  s.log.unshift(e);
  if (s.log.length > 300) s.log.length = 300;
  if (toast) s.toasts.push(e);
}
export function addMoney(s: GameState, amount: number) {
  s.money = round2(s.money + amount);
  if (amount > 0) s.stats.income = round2(s.stats.income + amount);
  else s.stats.expenses = round2(s.stats.expenses - amount);
}
