import { BREEDS, DIFFICULTIES, HEN_NAMES, ROOSTER_NAMES, PERSONALITIES } from './data';
import { between, chance, pick } from './rng';
import type { Animal, BreedId, Difficulty, GameState, Goal, Personality, PlotId, Sex } from './types';
import { age, albumKey, living, stage } from './helpers';
import { ensureShow } from './show';

export const SAVE_VERSION = 1;
const SAVE_KEY = 'gackerhof-save-v1';

export function newGame(opts: { farmName: string; difficulty: Difficulty; plot: PlotId; seed?: number }): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    farmName: opts.farmName || 'Mein Hof',
    difficulty: opts.difficulty,
    plot: opts.plot,
    seed: opts.seed ?? Math.floor(Math.random() * 2 ** 31),
    day: 1,
    hour: 7,
    money: DIFFICULTIES[opts.difficulty].startMoney,
    debt: 0,
    loanUsed: false,
    speed: 1,
    equip: { fence: null, coop: null, drinker: null, feeder: null },
    extras: [],
    runExtensions: 0,
    cosmetics: [],
    hat: 'stroh',
    doorOpen: true,
    water: 0,
    feed: 0,
    feedType: null,
    cleanliness: 100,
    flatterbandSince: 0,
    kieselgurUntil: 0,
    inventory: { koerner: 0, legemehl: 0, kuekenstarter: 0, mehlwuermer: 0, einstreu: 1, kieselgur: 0, milbenspray: 0, wurmkur: 0, kokzidiostatikum: 0, mist: 0 },
    eggs: {},
    hatchEggs: [],
    nestEggs: {},
    nestHatchEggs: [],
    blockedEggs: 0,
    incubator: [],
    animals: [],
    nextId: 1,
    temperature: 12,
    eggPrice: 0.5,
    offers: [],
    offersDay: -99,
    marketVersion: 2,
    foxAlertDay: -1,
    marderAlertDay: -1,
    hawkAlertDay: -1,
    events: [],
    pasture: [100, 100],
    pastureSide: 0,
    pastureSwitchDay: 1,
    lightOn: true,
    album: {},
    trophies: [],
    tutorialOff: false,
    stats: {
      eggsSold: 0, eggsTotal: 0, hatched: 0, deaths: 0, deathsRecent: [], predatorLosses: 0, juniorsRaised: 0,
      income: 0, expenses: 0,
    },
    pendingCosts: 0,
    chapter: 1,
    goals: chapterGoals(1),
    log: [],
    toasts: [],
    report: null,
    banners: [],
    celebrations: [],
    gameOver: false,
  };
  ensureShow(s);
  return s;
}

export const CHAPTERS: Record<number, { title: string; reward: number; goals: [string, string][] }> = {
  1: {
    title: 'Die ersten Eier', reward: 50,
    goals: [
      ['zaun', 'Einen Zaun aufstellen'], ['stall', 'Einen Stall kaufen'], ['traenke', 'Eine Tränke aufstellen'],
      ['futter', 'Eine Futterstelle aufstellen'], ['huehner3', '3 Hühner halten'], ['eier10', '10 Eier verkaufen'],
    ],
  },
  2: {
    title: 'Eigene Nachzucht', reward: 100,
    goals: [
      ['hahn', 'Einen Hahn halten'], ['schlupf', 'Ein Küken schlüpfen lassen'], ['aufzucht', 'Ein Küken zum Junghuhn aufziehen'],
      ['fuchs50', 'Fuchsschutz auf mindestens 50 % bringen'],
    ],
  },
  3: {
    title: 'Der Hofladen', reward: 200,
    goals: [
      ['hofladen', 'Einen Hofladen eröffnen'], ['sterne3', '3 Sterne Hof-Ruf erreichen'], ['eier150', '150 Eier verkaufen'],
      ['tiere10', '10 Tiere gleichzeitig halten'],
    ],
  },
};
export function chapterGoals(ch: number): Goal[] {
  const c = CHAPTERS[ch];
  return c ? c.goals.map(([id, text]) => ({ id, text, done: false })) : [];
}

export function createAnimal(
  s: GameState,
  breed: BreedId,
  opts: { sex?: Sex; ageDays?: number; history?: string; motherId?: number; variant?: string } = {},
): Animal {
  const sex: Sex = opts.sex ?? (chance(s, 0.5) ? 'henne' : 'hahn');
  const b = BREEDS[breed];
  const usedNames = new Set(living(s).map(a => a.name));
  const pool = (sex === 'henne' ? HEN_NAMES : ROOSTER_NAMES).filter(n => !usedNames.has(n));
  const name = pool.length ? pick(s, pool) : `${sex === 'henne' ? 'Henne' : 'Hahn'} ${s.nextId}`;
  const ageDays = opts.ageDays ?? 0;
  const pers = pick(s, Object.keys(PERSONALITIES) as Personality[]);
  const a: Animal = {
    id: s.nextId++,
    name,
    breed,
    variant: opts.variant ?? randomVariant(s, breed),
    sex,
    hatchedDay: s.day - ageDays,
    maxAge: Math.round(between(s, b.life[0], b.life[1])),
    personality: pers === 'bruetig' && sex === 'hahn' ? 'mutig' : pers,
    food: 90,
    water: 90,
    health: 100,
    wellbeing: 75,
    weight: 0,
    conditions: [],
    withdrawalUntil: 0,
    eggsLaid: 0,
    broodingUntil: 0,
    broodEggs: [],
    broodyUntil: 0,
    motherId: opts.motherId,
    dead: false,
    arrivedDay: s.day,
    history: opts.history ? [opts.history] : [],
  };
  a.weight = targetWeight(s, a);
  return a;
}

/** Zufällige Farbvariante: Die erste ist die häufigste */
export function randomVariant(s: GameState, breed: BreedId, uniform = false): string {
  const vs = BREEDS[breed].variants;
  if (!uniform && chance(s, 0.6)) return vs[0].id;
  return pick(s, uniform ? vs : vs.slice(1)).id;
}

export function targetWeight(s: GameState, a: Animal): number {
  const b = BREEDS[a.breed];
  const full = a.sex === 'hahn' ? b.weightRooster : b.weightHen;
  const f = Math.min(1, 0.05 + age(s, a) / 30);
  return Math.round(full * f * (0.9 + 0.2 * (a.health / 100)) * 100) / 100;
}

/* ---------------- Speichern & Laden ---------------- */
export function save(s: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, toasts: [] }));
  } catch { /* Speicher voll oder gesperrt – Spiel läuft trotzdem weiter */ }
}
export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    if (s.version !== SAVE_VERSION) return null;
    return migrate(s);
  } catch {
    return null;
  }
}
/** Ältere Spielstände (Prototyp 1.0.0) um neue Felder ergänzen */
function migrate(s: GameState): GameState {
  s.toasts = [];
  s.banners ??= [];
  s.celebrations ??= [];
  // 0.3.0: Weide, Stalllicht, Album, Geflügelschau, Tutorial
  s.pasture ??= [100, 100];
  s.pastureSide ??= 0;
  s.pastureSwitchDay ??= s.day;
  s.lightOn ??= true;
  s.trophies ??= [];
  // Laufende Spielstände brauchen kein Tutorial mehr
  s.tutorialOff ??= s.stats.eggsSold > 0 || s.chapter > 1;
  if (!s.album) {
    s.album = {};
    for (const a of living(s)) {
      if (stage(s, a) !== 'kueken') s.album[albumKey(a.breed, a.variant)] ??= { day: s.day, name: a.name };
    }
  }
  ensureShow(s);
  if (!s.marketVersion) {
    // Ältere Spielstände: Markt sofort neu bestücken (mit Hahn und Bruteiern)
    s.marketVersion = 2;
    s.offersDay = -99;
  }
  return s;
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignorieren */ }
}
export function exportSave(s: GameState): string {
  return JSON.stringify(s);
}
export function importSave(json: string): GameState | null {
  try {
    const s = JSON.parse(json) as GameState;
    if (s.version !== SAVE_VERSION || !Array.isArray(s.animals)) return null;
    return migrate(s);
  } catch {
    return null;
  }
}
