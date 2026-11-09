// Kundenaufträge: Wochentage, neue Aufträge mit Sonderwünschen und Großaufträgen, Stammkunden und verpasste Aufträge.
// Liefern und Ablehnen stehen in actions.ts.
import { BREEDS, BROWN_EGG_BREEDS, CUSTOMERS, SOUP_AGE } from './data';
import { age, flock, log, stage, stars } from './helpers';
import { between, chance, intBetween, pick } from './rng';
import type { BreedId, GameState, Order } from './types';

export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
/** Ab so vielen erfüllten Aufträgen ist ein Kunde Stammkunde */
export const REGULAR_AFTER = 3;
export const REGULAR_BONUS = 1.15;
export const SPECIAL_BONUS = 1.3;
/** Großaufträge gibt es ab diesem Hof-Ruf */
export const BIG_FIRST = 3;
/** Anteil des Lohns, der bei Großaufträgen schon für Teillieferungen gezahlt wird */
export const BIG_PARTIAL_SHARE = 0.8;
export const MISSED_DAYS = 14;
export const MISSED_POINTS = -0.3;
const MAX_ORDERS = 3;

/** Tag 1 ist ein Montag */
export const weekday = (day: number) => WEEKDAYS[(((day - 1) % 7) + 7) % 7];

/** Frist in Worten: „heute“, „morgen“, „bis Freitag“, „bis Freitag nächster Woche“ */
export function dueText(s: GameState, dueDay: number): string {
  const left = dueDay - s.day;
  if (left <= 0) return 'heute';
  if (left === 1) return 'morgen';
  const w = weekday(dueDay);
  if (left < 7) return `bis ${w}`;
  if (left < 14) return `bis ${w} nächster Woche`;
  return `bis ${w} in ${Math.floor(left / 7)} Wochen`;
}

export const isRegular = (s: GameState, customer: string) => (s.customers?.[customer] ?? 0) >= REGULAR_AFTER;

/** Was für ein Auftrag erzeugt wird; „braun“ und „gross“ werden zu Eier-Aufträgen */
export type OrderPlan = 'eier' | 'braun' | 'junghenne' | 'suppenhuhn' | 'hahn' | 'bruteier' | 'gross';

const adult = (s: GameState) => flock(s).filter(a => stage(s, a) === 'erwachsen');

/** Rassen, deren Bruteier der Hof liefern kann: Rassehenne und ein Hahn derselben Rasse */
function hatchBreeds(s: GameState): BreedId[] {
  const ad = adult(s);
  return [...new Set(ad.filter(a => a.sex === 'henne' && BREEDS[a.breed].showBreed
    && ad.some(r => r.sex === 'hahn' && r.breed === a.breed)).map(a => a.breed))];
}

/** Welche Aufträge der Hof gerade liefern könnte (Mehrfachnennung erhöht die Chance) */
export function possibleKinds(s: GameState): OrderPlan[] {
  const f = flock(s);
  const hens = adult(s).filter(a => a.sex === 'henne');
  if (!f.length) return [];
  const k: OrderPlan[] = ['eier', 'eier', 'eier', 'junghenne', 'suppenhuhn'];
  if (f.some(a => stage(s, a) !== 'erwachsen')) k.push('junghenne');
  if (f.some(a => a.sex === 'henne' && age(s, a) >= SOUP_AGE)) k.push('suppenhuhn', 'suppenhuhn');
  if (hens.some(a => BROWN_EGG_BREEDS.includes(a.breed))) k.push('braun');
  if (hatchBreeds(s).length) k.push('bruteier');
  if (f.some(a => a.sex === 'hahn')) k.push('hahn');
  return k;
}

/** Kunde wählen: Stammkunden kommen gern wieder */
function customerFor(s: GameState, list: string[]): string {
  const regulars = list.filter(c => isRegular(s, c));
  const preferRegular = chance(s, 0.5); // immer würfeln, damit die Zufallsfolge nicht vom Stammkunden-Stand abhängt
  return regulars.length && preferRegular ? pick(s, regulars) : pick(s, list);
}

/** Einen Auftrag erzeugen (Lohn mit Ruf-, Sonderwunsch- und Stammkunden-Bonus) */
export function createOrder(s: GameState, plan: OrderPlan): Order {
  const st = stars(s);
  const bonus = 1 + (st - 3) * 0.1;
  const o: Order = { id: s.nextId++, customer: customerFor(s, CUSTOMERS[plan]), kind: 'eier', qty: 0, reward: 0, dueDay: 0 };
  let base: number;
  switch (plan) {
    case 'eier':
    case 'braun':
      o.qty = intBetween(s, 1, plan === 'braun' ? 3 : 5) * 6;
      base = o.qty * 0.5 * between(s, 1.5, 1.9);
      o.dueDay = s.day + intBetween(s, 3, 6);
      if (plan === 'braun') o.brown = true;
      break;
    case 'gross':
      o.qty = intBetween(s, 8, 16) * 6;
      base = o.qty * 0.5 * between(s, 1.6, 1.9);
      o.dueDay = s.day + intBetween(s, 10, 14);
      o.big = true;
      o.delivered = 0;
      o.paid = 0;
      break;
    case 'junghenne':
      o.kind = 'junghenne';
      o.qty = intBetween(s, 1, 3);
      base = o.qty * between(s, 26, 34);
      o.dueDay = s.day + intBetween(s, 6, 12);
      break;
    case 'suppenhuhn':
      o.kind = 'suppenhuhn';
      o.qty = intBetween(s, 1, 2);
      base = o.qty * between(s, 13, 17);
      o.dueDay = s.day + intBetween(s, 4, 8);
      break;
    case 'hahn':
      o.kind = 'hahn';
      o.qty = 1;
      base = between(s, 18, 26);
      o.dueDay = s.day + intBetween(s, 5, 10);
      break;
    case 'bruteier': {
      o.kind = 'bruteier';
      const breeds = hatchBreeds(s);
      o.breed = breeds.length ? pick(s, breeds) : 'sussex';
      o.qty = intBetween(s, 1, 2) * 6;
      base = o.qty * BREEDS[o.breed].prices.brutei;
      o.dueDay = s.day + intBetween(s, 6, 10);
      break;
    }
  }
  const special = plan === 'braun' || plan === 'bruteier' || plan === 'hahn' ? SPECIAL_BONUS : 1;
  o.reward = Math.round(base * bonus * special * (isRegular(s, o.customer) ? REGULAR_BONUS : 1));
  return o;
}

/** Beschreibung eines Auftrags, z. B. „12 braune Eier“ */
export function orderWhat(o: Order): string {
  const n = o.qty, plural = n > 1;
  switch (o.kind) {
    case 'eier': return `${n} ${o.brown ? 'braune ' : ''}Eier`;
    case 'junghenne': return `${n} Junghenne${plural ? 'n' : ''}`;
    case 'suppenhuhn': return `${n} ${plural ? 'Suppenhühner' : 'Suppenhuhn'}`;
    case 'hahn': return `${n} ${plural ? 'Hähne' : 'Hahn'}`;
    case 'bruteier': return `${n} Bruteier ${o.breed ? BREEDS[o.breed].name : ''}`.trim();
  }
}

/** Täglich: verpasste Aufträge abrechnen, neue Kundschaft */
export function dailyOrders(s: GameState) {
  s.orders ??= [];
  const missed = s.orders.filter(x => x.dueDay < s.day);
  for (const o of missed) {
    log(s, `📋 Auftrag verpasst: ${o.customer} hat sich anderswo eingedeckt. Das spricht sich herum.`, 'warn', true);
    const c = (s.customers ??= {});
    if (c[o.customer]) c[o.customer] = Math.max(0, c[o.customer] - 2);
    const active = s.orderEffect && s.orderEffect.until >= s.day ? s.orderEffect.points : 0;
    s.orderEffect = { until: s.day + MISSED_DAYS, points: Math.max(-1, Math.round((active + MISSED_POINTS) * 10) / 10) };
  }
  s.orders = s.orders.filter(x => x.dueDay >= s.day);
  if (s.orderEffect && s.orderEffect.until < s.day) s.orderEffect = null;
  if (s.day < 4) return;

  const st = stars(s);
  // Großauftrag: selten, ab drei Sternen, höchstens einer
  if (st >= BIG_FIRST && !s.orders.some(o => o.big) && flock(s).some(a => a.sex === 'henne') && chance(s, 0.04)) {
    announce(s, createOrder(s, 'gross'));
  }
  const kinds = possibleKinds(s);
  if (s.orders.filter(o => !o.big).length >= MAX_ORDERS || !kinds.length) return;
  // Ein guter Ruf und Stammkunden bringen mehr Kundschaft
  const regulars = Object.keys(s.customers ?? {}).filter(c => isRegular(s, c)).length;
  if (!chance(s, 0.15 + st * 0.05 + Math.min(3, regulars) * 0.05)) return;
  announce(s, createOrder(s, pick(s, kinds)));
}

function announce(s: GameState, o: Order) {
  s.orders!.push(o);
  const who = isRegular(s, o.customer) ? `Stammkunde ${o.customer}` : o.customer;
  log(s, `📋 Neuer ${o.big ? 'Großauftrag' : 'Auftrag'}: ${who} möchte ${orderWhat(o)} für ${o.reward} € (${dueText(s, o.dueDay)}).`, 'good', true);
}
