// Ereignisse zum Mitmachen: verstecktes Nest suchen, ausgebüxtes Huhn einfangen, Nachbar und Hahn.
// Die Szene zeigt Nest und Ausbüxer an ihren Positionen (Koordinaten der Szene, 480 × 270).
import { addMoney, eggUnitPrice, flock, has, isDaytime, log, season, stage } from './helpers';
import { between, chance, pick } from './rng';
import { die } from './sim';
import type { BreedId, GameState } from './types';

interface Result { ok: boolean; msg: string }
const ok = (msg: string): Result => ({ ok: true, msg });
const fail = (msg: string): Result => ({ ok: false, msg });

/** Eier im Versteck verderben nach so vielen Tagen */
export const NEST_DAYS = 5;
/** Wo ein Versteck liegen kann (im Auslauf) */
export const NEST_REGION = { x0: 262, x1: 448, y0: 192, y1: 246 };
/** Wo ein Ausbüxer herumläuft (vor dem Stall, außerhalb des Zauns) */
export const ESCAPE_REGION = { x0: 132, x1: 218, y0: 238, y1: 254 };
/** Wahrscheinlichkeit, dass der Fuchs einen Ausbüxer nachts holt */
export const ESCAPE_FOX = 0.7;
export const GIFT_EGGS = 6;
export const QUIET_DAYS = 30;
export const DARKEN_COST = 20;
export const NEIGHBOR_FINE = 50;

const adultHens = (s: GameState) => flock(s).filter(a => a.sex === 'henne' && stage(s, a) === 'erwachsen' && a.broodingUntil <= s.day);
const point = (s: GameState, r: typeof NEST_REGION) => ({ x: Math.round(between(s, r.x0, r.x1)), y: Math.round(between(s, r.y0, r.y1)) });

/* ---------------- Verstecktes Nest ---------------- */
export function startHiddenNest(s: GameState): boolean {
  if (s.hiddenNest || !s.equip.fence) return false;
  const hens = adultHens(s);
  if (!hens.length) return false;
  const h = pick(s, hens);
  s.hiddenNest = { henId: h.id, since: s.day, eggs: 0, ...point(s, NEST_REGION) };
  log(s, `🔍 ${h.name} legt nicht mehr ins Stallnest. Sie hat sich wohl ein Versteck im Auslauf gesucht. Such es, bevor die Eier verderben!`, 'info', true);
  return true;
}

/** Beim Legen: Eier der Henne mit Versteck landen dort (true = Ei ist versorgt) */
export function layHidden(s: GameState, henId: number): boolean {
  if (s.hiddenNest?.henId !== henId) return false;
  s.hiddenNest.eggs++;
  return true;
}

export function findNest(s: GameState): Result {
  const n = s.hiddenNest;
  if (!n) return fail('Hier ist kein Versteck.');
  const hen = s.animals.find(a => a.id === n.henId);
  const breed: BreedId = hen?.breed ?? 'hybrid';
  s.hiddenNest = null;
  if (n.eggs > 0) s.eggs[breed] = (s.eggs[breed] ?? 0) + n.eggs;
  const msg = n.eggs > 0
    ? `Gefunden! ${n.eggs} Eier lagen im Versteck. Sie sind jetzt im Lager.`
    : 'Gefunden! Das Versteck ist noch leer. Jetzt legt sie wieder ins Stallnest.';
  log(s, `🔍 Verstecktes Nest gefunden${n.eggs > 0 ? `: ${n.eggs} Eier` : ''}.`, 'good');
  return ok(msg);
}

/* ---------------- Ausgebüxtes Huhn ---------------- */
export function startEscape(s: GameState): boolean {
  if (s.escapee || !s.equip.fence || !isDaytime(s.hour)) return false;
  const out = flock(s).filter(a => a.outside); // flock: ohne Küken
  if (!out.length) return false;
  const a = pick(s, out);
  s.escapee = { id: a.id, since: s.day, ...point(s, ESCAPE_REGION) };
  log(s, `🏃 ${a.name} ist ausgebüxt und läuft vor dem Zaun herum! Tipp sie an, um sie einzufangen, bevor es dunkel wird.`, 'warn', true);
  return true;
}

export function catchEscapee(s: GameState): Result {
  const e = s.escapee;
  if (!e) return fail('Niemand ist ausgebüxt.');
  s.escapee = null;
  const a = s.animals.find(x => x.id === e.id && !x.dead);
  if (!a) return fail('Das Tier ist nicht mehr da.');
  a.outside = true;
  log(s, `🏃 ${a.name} eingefangen und zurück in den Auslauf gebracht.`, 'good');
  return ok(`${a.name} ist wieder im Auslauf.`);
}

/** Um 21 Uhr: Wer noch draußen ist, wird meist vom Fuchs geholt */
export function eveningEscapee(s: GameState) {
  const e = s.escapee;
  if (!e) return;
  s.escapee = null;
  const a = s.animals.find(x => x.id === e.id && !x.dead);
  if (!a) return;
  if (chance(s, ESCAPE_FOX)) {
    die(s, a, 'vom Fuchs geholt, nachdem es ausgebüxt war', true);
  } else {
    a.outside = false;
    log(s, `🏃 ${a.name} hat sich in der Dämmerung selbst zurück in den Stall geschlichen. Glück gehabt!`, 'info', true);
  }
}

/* ---------------- Nachbar und Hahn ---------------- */
export type NeighborOption = 'eier' | 'verdunkeln' | 'ignorieren';

const neighborState = (s: GameState) => (s.neighbor ??= { pending: false, warned: false, quietUntil: 0, darkened: false });

/** Der Nachbar beschwert sich (nur mit erwachsenem Hahn). true, wenn er geklingelt hat. */
export function neighborComplains(s: GameState): boolean {
  if (!flock(s).some(a => a.sex === 'hahn' && stage(s, a) === 'erwachsen')) return false;
  const n = neighborState(s);
  if (n.pending || s.day < n.quietUntil) return false;
  if (n.warned) {
    n.warned = false;
    addMoney(s, -NEIGHBOR_FINE, 'sonstiges');
    log(s, `📢 Der Nachbar hat sich beim Ordnungsamt über den Hahn beschwert: ${NEIGHBOR_FINE} € Bußgeld.`, 'bad', true);
    s.celebrations.push({ emoji: '📢', title: 'Bußgeld wegen Ruhestörung', lines: [
      `Du hattest die letzte Beschwerde ignoriert. Jetzt hat der Nachbar das Ordnungsamt eingeschaltet: ${NEIGHBOR_FINE} € Bußgeld.`,
      '💡 Ein verdunkelter Stall hält den Hahn morgens länger ruhig.',
    ] });
    return true;
  }
  n.pending = true;
  log(s, '📢 Der Nachbar klingelt: Dein Hahn kräht ihm zu früh.', 'warn', true);
  s.celebrations.push({
    emoji: '🐓', title: 'Der Nachbar beschwert sich',
    lines: ['„Ihr Hahn kräht jeden Morgen um halb fünf! Ich kann nicht mehr schlafen.“', 'Was machst du?'],
    choices: [
      { act: 'nachbar:eier', label: `🥚 Eierkarton schenken (${GIFT_EGGS} Eier)` },
      { act: 'nachbar:verdunkeln', label: `🌑 Stall verdunkeln (${DARKEN_COST} €)` },
      { act: 'nachbar:ignorieren', label: '🙉 Ignorieren' },
    ],
  });
  return true;
}

/** Eier für den Nachbarn: die günstigsten Speiseeier zuerst */
function giveEggs(s: GameState, n: number): boolean {
  const keys = Object.keys(s.eggs).filter(k => s.eggs[k] > 0).sort((a, b) => eggUnitPrice(s, a as BreedId) - eggUnitPrice(s, b as BreedId));
  if (keys.reduce((t, k) => t + s.eggs[k], 0) < n) return false;
  for (const k of keys) {
    const take = Math.min(n, s.eggs[k]);
    s.eggs[k] -= take;
    n -= take;
  }
  return true;
}

export function neighborChoice(s: GameState, option: NeighborOption): Result {
  const n = s.neighbor;
  if (!n?.pending) return fail('Gerade gibt es keine Beschwerde.');
  switch (option) {
    case 'eier':
      if (!giveEggs(s, GIFT_EGGS)) return fail(`Dafür brauchst du ${GIFT_EGGS} Eier im Lager.`);
      n.quietUntil = s.day + QUIET_DAYS;
      n.warned = false;
      log(s, `🥚 Der Nachbar freut sich über den Eierkarton. Für ${QUIET_DAYS} Tage ist Ruhe.`, 'good');
      break;
    case 'verdunkeln':
      if (s.money < DARKEN_COST) return fail(`Dafür brauchst du ${DARKEN_COST} €.`);
      addMoney(s, -DARKEN_COST, 'ausruestung');
      n.darkened = true;
      n.warned = false;
      log(s, '🌑 Stall verdunkelt: Der Hahn kräht jetzt erst, wenn es hell wird. Der Nachbar beschwert sich seltener.', 'good');
      break;
    case 'ignorieren':
      n.warned = true;
      log(s, '🙉 Beschwerde ignoriert. Beim nächsten Mal droht ein Bußgeld.', 'warn');
      break;
    default:
      return fail('Unbekannte Auswahl.');
  }
  n.pending = false;
  return ok({ eier: 'Eierkarton verschenkt. Der Nachbar ist besänftigt.', verdunkeln: 'Der Stall ist jetzt verdunkelt.', ignorieren: 'Du ignorierst die Beschwerde.' }[option]);
}

/* ---------------- Täglich ---------------- */
export function dailyEvents(s: GameState) {
  const nest = s.hiddenNest;
  if (nest) {
    const hen = s.animals.find(a => a.id === nest.henId && !a.dead);
    if (!hen || s.day - nest.since >= NEST_DAYS) {
      s.hiddenNest = null;
      if (nest.eggs > 0) log(s, `🔍 Das Versteck wurde nicht gefunden: ${nest.eggs} Eier sind verdorben.${hen ? ` ${hen.name} legt jetzt wieder ins Stallnest.` : ''}`, 'warn', true);
    }
  } else if (s.day >= 6 && chance(s, 0.03)) {
    startHiddenNest(s);
  }
  if (s.day >= 6) {
    const n = s.neighbor;
    if (chance(s, n?.darkened ? 0.008 : 0.025)) neighborComplains(s);
  }
}

/** Stündlich tagsüber: Ein schwacher Zaun lässt öfter ein Huhn entwischen */
export function hourlyEscape(s: GameState) {
  if (s.escapee && !s.animals.some(a => a.id === s.escapee!.id && !a.dead)) s.escapee = null;
  // Im Winter bleiben die Hühner nah am Stall
  if (s.hour !== 11 || s.day < 6 || s.escapee || !s.equip.fence || season(s) === 'winter') return;
  const fence = s.equip.fence;
  const p = fence === 'knoten' ? 0.04 : fence === 'maschen' ? 0.015 : 0.025;
  if (chance(s, p * (has(s, 'netz') ? 0.3 : 1))) startEscape(s);
}

/** Für die Prüfung von Spielständen */
export const CHOICE_ACTS = ['nachbar:eier', 'nachbar:verdunkeln', 'nachbar:ignorieren'];
