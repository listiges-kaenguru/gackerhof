// Gemüsebeet: säen im Frühling und Sommer, mit Hühnermist düngen, ernten, verkaufen oder an die Hühner verfüttern.
import { addMoney, duckSnails, flock, has, log, round2, season } from './helpers';
import type { GameState } from './types';

interface Result { ok: boolean; msg: string }
const ok = (msg: string): Result => ({ ok: true, msg });
const fail = (msg: string): Result => ({ ok: false, msg });

export const SEED_COST = 3;
export const GROW_DAYS = 20;
/** Ertrag in kg ohne Dünger; ein Sack Mist verdoppelt ihn */
export const BASE_YIELD = 4;
/** Marktpreis je kg; der Hofladen bringt das 1,5-Fache */
export const VEG_PRICE = 2.5;
/** Ein Kilo Gemüse reicht für so viele Tiere */
export const VEG_PER_KG = 5;

export type BedState = 'leer' | 'waechst' | 'reif';

export function bedState(s: GameState): BedState {
  if (!s.bed) return 'leer';
  return s.day - s.bed.sownDay >= GROW_DAYS ? 'reif' : 'waechst';
}

export function sow(s: GameState): Result {
  if (!has(s, 'beet')) return fail('Du hast noch kein Gemüsebeet.');
  if (s.bed) return fail('Im Beet wächst schon etwas.');
  const se = season(s);
  if (se !== 'fruehling' && se !== 'sommer') return fail('Gesät wird im Frühling und Sommer.');
  if (s.money < SEED_COST) return fail(`Saatgut kostet ${SEED_COST} €.`);
  addMoney(s, -SEED_COST, 'sonstiges');
  s.bed = { sownDay: s.day, fertilized: false };
  log(s, `🌱 Gemüse gesät. In ${GROW_DAYS} Tagen ist es reif.`, 'info');
  return ok(`Gesät! In ${GROW_DAYS} Tagen ist das Gemüse reif. Mit Mist gedüngt gibt es doppelt so viel.`);
}

export function fertilize(s: GameState): Result {
  const st = bedState(s);
  if (st === 'leer') return fail('Erst säen, dann düngen.');
  if (st === 'reif') return fail('Das Gemüse ist schon reif. Ernte es!');
  if (s.bed!.fertilized) return fail('Das Beet ist schon gedüngt.');
  if ((s.inventory.mist ?? 0) < 1) return fail('Kein Mist im Lager. Mist gibt es beim Ausmisten.');
  s.inventory.mist -= 1;
  s.bed!.fertilized = true;
  return ok('Mit einem Sack Hühnermist gedüngt. Das gibt doppelt so viel Gemüse.');
}

export function harvest(s: GameState): Result {
  const st = bedState(s);
  if (st === 'leer') return fail('Im Beet wächst nichts.');
  if (st === 'waechst') {
    const left = GROW_DAYS - (s.day - s.bed!.sownDay);
    return fail(`Noch nicht reif: noch ${left} Tag${left === 1 ? '' : 'e'}.`);
  }
  // Laufenten fressen die Schnecken: ein Viertel mehr
  const kg = BASE_YIELD * (s.bed!.fertilized ? 2 : 1) * (duckSnails(s) ? 1.25 : 1);
  s.inventory.gemuese = round2((s.inventory.gemuese ?? 0) + kg);
  s.bed = null;
  log(s, `🥕 ${kg} kg Gemüse geerntet.`, 'good');
  return ok(`${kg} kg Gemüse geerntet.`);
}

/** Täglich: Frost zerstört, was im Beet steht */
export function dailyBed(s: GameState) {
  if (!s.bed || s.temperature > 0) return;
  s.bed = null;
  log(s, '🥶 Frost! Das Gemüse im Beet ist erfroren.', 'warn', true);
}

export const vegPrice = (s: GameState) => VEG_PRICE * (has(s, 'hofladen') ? 1.5 : 1);

export function sellVegetables(s: GameState): Result {
  const kg = s.inventory.gemuese ?? 0;
  if (kg <= 0) return fail('Kein Gemüse im Lager.');
  const v = round2(kg * vegPrice(s));
  addMoney(s, v, 'gemuese');
  s.inventory.gemuese = 0;
  return ok(`${kg} kg Gemüse für ${v.toFixed(2)} € verkauft.`);
}

/** Gemüse an die Hühner: 1 kg je angefangene 5 Tiere, macht satt und zufrieden */
export function feedVegetables(s: GameState): Result {
  const f = flock(s);
  if (!f.length) return fail('Keine Hühner zum Füttern.');
  const need = Math.ceil(f.length / VEG_PER_KG);
  if ((s.inventory.gemuese ?? 0) < need) return fail(`Für ${f.length} Tiere brauchst du ${need} kg Gemüse.`);
  s.inventory.gemuese = round2(s.inventory.gemuese - need);
  for (const a of f) {
    a.food = Math.min(100, a.food + 25);
    a.wellbeing = Math.min(100, a.wellbeing + 10);
  }
  return ok(`${need} kg Gemüse verfüttert. Die Hühner picken begeistert.`);
}
