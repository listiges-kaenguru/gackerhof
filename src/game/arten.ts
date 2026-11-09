// Weitere Geflügelarten: Laufenten, Gänse und Wachteln in eigenen Unterkünften.
// Gemeinsam mit den Hühnern: Futterplatz, Brutapparat, Eier einsammeln, Markt. Eigen: Unterkunft mit Wasser,
// Entenbecken, Grasweide der Gänse, Legen (hier statt in layEggs), Wohlbefinden.
import { AGE, BREEDS, POND_BAD, POND_DIRT, SEASON_LAY, SELLERS, SPECIES } from './data';
import {
  duckSnails, guardGoose, has, housed, living, othersOf, round2, season, speciesCap, speciesOf, stage,
} from './helpers';
import { between, chance, intBetween, pick } from './rng';
import { randomVariant } from './state';
import type { Animal, BreedId, GameState, MarketOffer, Species } from './types';

export { duckSnails, guardGoose, housed, othersOf, speciesCap, speciesOf };

type Other = Exclude<Species, 'huhn'>;
interface Result { ok: boolean; msg: string }

/** Ansteckungsgruppe: Arten in eigener Unterkunft bleiben unter sich; ohne Unterkunft und als Küken (Kükenstation)
 *  leben sie mit den Hühnern zusammen */
export function diseaseGroup(s: GameState, a: Animal): Species {
  const sp = speciesOf(a.breed);
  if (sp === 'huhn' || stage(s, a) === 'kueken' || !has(s, SPECIES[sp].house)) return 'huhn';
  return sp;
}

/** Brutdauer im Brutapparat (Spieltage) */
export const brutDays = (breed: BreedId) => {
  const sp = speciesOf(breed);
  return sp === 'huhn' ? AGE.brut : SPECIES[sp].brutDays;
};

/** Alle Tiere einer Art einschließlich Küken (für die Plätze in der Unterkunft) */
const headcount = (s: GameState, sp: Other) => living(s).filter(a => speciesOf(a.breed) === sp).length;

/** Warum ein Kauf nicht geht (null = geht) */
export function buyProblem(s: GameState, breed: BreedId, qty: number): string | null {
  const sp = speciesOf(breed);
  if (sp === 'huhn') return null;
  const d = SPECIES[sp];
  if (!housed(s, sp)) return `${d.plural} brauchen erst ${d.needs}.`;
  const cap = speciesCap(s, sp);
  if (headcount(s, sp) + qty > cap) return `${d.inHouse} ist kein Platz mehr (${cap} Plätze).`;
  return null;
}

/** Morgens um 8: Enten, Gänse und Wachteln legen ins Nest (mit Männchen derselben Art: Bruteier) */
export function layOthers(s: GameState) {
  const se = season(s);
  const all = othersOf(s);
  for (const a of all) {
    if (a.sex !== 'henne' || stage(s, a) !== 'erwachsen') continue;
    const sp = speciesOf(a.breed);
    let p = BREEDS[a.breed].layRate * SEASON_LAY[se];
    if (sp === 'gans' && se !== 'fruehling') p *= 0.08; // Gänse legen im Frühjahr
    if (sp === 'ente' && (s.pond ?? 0) < POND_BAD) p *= 0.5;
    if (a.food < 50 || a.water < 50) p *= 0.3;
    if (a.health < 60) p *= 0.5;
    if (!chance(s, Math.min(0.97, p))) continue;
    a.eggsLaid++;
    s.stats.eggsTotal++;
    const male = all.some(m => m.sex === 'hahn' && m.breed === a.breed && stage(s, m) === 'erwachsen');
    if (a.withdrawalUntil >= s.day) s.blockedEggs++;
    else if (male) s.nestHatchEggs.push({ breed: a.breed, variant: a.variant, fertile: chance(s, 0.85) });
    else s.nestEggs[a.breed] = (s.nestEggs[a.breed] ?? 0) + 1;
  }
}

/** Täglich: Das Entenbecken verschmutzt */
export function dailyOthers(s: GameState) {
  if (!has(s, 'becken')) return;
  const ducks = othersOf(s, 'ente').length;
  s.pond = Math.max(0, round2((s.pond ?? 100) - POND_DIRT * ducks));
}

export function cleanPond(s: GameState): Result {
  if (!has(s, 'becken')) return { ok: false, msg: 'Du hast kein Wasserbecken.' };
  if ((s.pond ?? 100) >= 95) return { ok: false, msg: 'Das Becken ist noch sauber.' };
  s.pond = 100;
  return { ok: true, msg: 'Becken gereinigt und frisches Wasser eingelassen.' };
}

/** Stündlich tagsüber: Wasser aus der eigenen Unterkunft, Gänse grasen. true = schon satt bzw. getränkt. */
export function otherDrinks(s: GameState, a: Animal): boolean {
  const sp = speciesOf(a.breed);
  return sp !== 'huhn' && stage(s, a) !== 'kueken' && has(s, SPECIES[sp].house);
}
export function otherGrazes(s: GameState, a: Animal): boolean {
  return speciesOf(a.breed) === 'gans' && stage(s, a) !== 'kueken' && has(s, 'grasweide');
}

/** Wohin das Wohlbefinden einer Ente, Gans oder Wachtel strebt */
export function otherWellbeingTarget(s: GameState, a: Animal): number {
  const sp = speciesOf(a.breed) as Other;
  let target = 80;
  if (!housed(s, sp)) target -= 25;
  if (has(s, SPECIES[sp].house) && headcount(s, sp) > speciesCap(s, sp)) target -= 25; // nur in der eigenen Unterkunft
  if (sp === 'ente' && (s.pond ?? 0) < POND_BAD) target -= 25;
  if (a.food < 40 || a.water < 40) target -= 20;
  return target;
}

/** Wöchentliche Marktangebote für Arten mit Unterkunft: Weibchen, Männchen, Bruteier */
export function othersOffers(s: GameState): MarketOffer[] {
  const out: MarketOffer[] = [];
  for (const sp of Object.keys(SPECIES) as Other[]) {
    if (!housed(s, sp)) continue;
    const breed = SPECIES[sp].breed;
    for (const kind of ['legehenne', 'hahn', 'brutei'] as const) {
      const base = BREEDS[breed].prices[kind];
      const price = Math.max(0.5, Math.round(base * between(s, 0.85, 1.2) * 2) / 2);
      const qty = kind === 'brutei' ? intBetween(s, 6, 10) : kind === 'hahn' ? 1 : intBetween(s, 2, 4);
      const o: MarketOffer = { id: s.nextId++, kind, breed, variant: randomVariant(s, breed), price, qty, seller: pick(s, SELLERS) };
      if (kind === 'legehenne') {
        o.hiddenAge = intBetween(s, 60, 300);
        o.hiddenMites = false;
      }
      out.push(o);
    }
  }
  return out;
}
