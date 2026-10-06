// Abgeleitete Werte aus dem Spielstand (keine Seiteneffekte außer log/toast).
import {
  AGE, BREEDS, BUTCHER_FEE, BUTCHER_PER_KG, DAYS_PER_SEASON, DIFFICULTIES, ITEM, PLOTS, SEASONS,
} from './data';
import type { Animal, GameState, LogEntry, Season, Stage } from './types';

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
  if (has(s, 'untergrab')) p += 0.1;
  if (has(s, 'licht')) p += 0.05;
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
export const hensOutside = (s: GameState) => s.doorOpen && !isNight(s.hour) && !!s.equip.fence;
export const eventActive = (s: GameState, id: string) => s.events.some(e => e.id === id && e.until >= s.day);

/** Hof-Ruf in Sternen (1–5) */
export function stars(s: GameState): number {
  const f = living(s);
  if (f.length === 0) return 3;
  let score = 3;
  const avgHealth = f.reduce((t, a) => t + a.health, 0) / f.length;
  const avgWell = f.reduce((t, a) => t + a.wellbeing, 0) / f.length;
  if (avgHealth > 80) score += 0.75; else if (avgHealth < 50) score -= 1;
  if (avgWell > 70) score += 0.75; else if (avgWell < 40) score -= 0.75;
  const c = crowding(s);
  if (c <= 0.8) score += 0.5; else if (c > 1) score -= 1;
  if (s.cleanliness > 60) score += 0.5; else if (s.cleanliness < 30) score -= 1;
  const recent = s.stats.deathsRecent.filter(d => d > s.day - 30).length;
  if (recent >= 3) score -= 1.5; else if (recent >= 1) score -= 0.5;
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
