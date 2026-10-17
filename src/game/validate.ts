// Prüfung eines Spielstands aus fremder Quelle (Import-Datei, localStorage) vor dem Laden.
// Jeder Wert muss den erwarteten Typ und einen sinnvollen Bereich haben, jede Kennung muss es in den Spieldaten
// geben. So kann eine präparierte Datei weder das Spiel zum Absturz bringen noch über IDs oder Zahlen
// HTML in die Oberfläche schmuggeln. Felder, die erst spätere Versionen eingeführt haben (migrate() in state.ts
// ergänzt sie), sind optional – wenn vorhanden, werden sie genauso geprüft. Grenzen großzügig über dem, was das
// Spiel selbst erzeugt (z. B. Namen 24 Zeichen, Tagebuch 300 Einträge).
import { BREEDS, CONDITIONS, DIFFICULTIES, HATS, ITEM, PERSONALITIES, PLOTS, SUPPLY } from './data';
import type { GameState } from './types';

type Obj = Record<string, unknown>;
const MAX_TEXT = 1000;
const MAX_LIST = 1000;
const MAX_ZAHL = 1e12;

const obj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, min = -MAX_ZAHL, max = MAX_ZAHL) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const int = (v: unknown, min = -MAX_ZAHL, max = MAX_ZAHL) => num(v, min, max) && Number.isInteger(v);
const str = (v: unknown, max = MAX_TEXT) => typeof v === 'string' && v.length <= max;
const bool = (v: unknown) => typeof v === 'boolean';
const oneOf = (v: unknown, werte: readonly unknown[]) => werte.includes(v);
const key = (v: unknown, tabelle: object) => typeof v === 'string' && Object.hasOwn(tabelle, v);
const list = (v: unknown, jedes: (x: unknown) => boolean, max = MAX_LIST) => Array.isArray(v) && v.length <= max && v.every(jedes);
const record = (v: unknown, wert: (x: unknown) => boolean) =>
  obj(v) && Object.keys(v).length <= MAX_LIST && Object.values(v).every(wert);
const optional = (o: Obj, feld: string, pruefung: (x: unknown) => boolean) => o[feld] === undefined || pruefung(o[feld]);

/** Rasse und (falls angegeben) Farbschlag müssen in BREEDS stehen */
const breedOk = (o: Obj) => key(o.breed, BREEDS)
  && optional(o, 'variant', v => BREEDS[o.breed as keyof typeof BREEDS].variants.some(x => x.id === v));
const itemOk = (v: unknown, slot?: string) => key(v, ITEM) && (slot === undefined || ITEM[v as string].slot === slot);
const nullOr = (pruefung: (x: unknown) => boolean) => (v: unknown) => v === null || pruefung(v);

const hatchEgg = (v: unknown) => obj(v) && breedOk(v) && optional(v, 'fertile', bool);
const condition = (v: unknown) => obj(v) && key(v.id, CONDITIONS) && num(v.severity, 0, 1000);
const logEntry = (v: unknown) => obj(v) && int(v.day, -MAX_ZAHL) && num(v.hour, 0, 24) && str(v.text)
  && oneOf(v.kind, ['info', 'good', 'warn', 'bad']);

function animal(v: unknown): boolean {
  if (!obj(v)) return false;
  const zahlen = ['hatchedDay', 'maxAge', 'food', 'water', 'health', 'wellbeing', 'weight', 'withdrawalUntil',
    'eggsLaid', 'broodingUntil', 'broodyUntil', 'arrivedDay'];
  return int(v.id, 0) && str(v.name, 60) && breedOk(v) && oneOf(v.sex, ['henne', 'hahn'])
    && key(v.personality, PERSONALITIES) && zahlen.every(f => num(v[f]))
    && list(v.conditions, condition, 20) && list(v.broodEggs, hatchEgg, 50) && bool(v.dead)
    && list(v.history, x => str(x), MAX_LIST)
    && optional(v, 'immuneUntil', x => obj(x) && Object.keys(x).every(k => key(k, CONDITIONS)) && Object.values(x).every(y => num(y)))
    && optional(v, 'motherId', x => int(x, 0)) && optional(v, 'lastChanceUsed', bool) && optional(v, 'outside', bool)
    && optional(v, 'deathCause', x => str(x)) && optional(v, 'deathDay', x => num(x));
}

const offer = (v: unknown) => obj(v) && int(v.id, 0) && oneOf(v.kind, ['brutei', 'kueken', 'junghenne', 'legehenne', 'hahn'])
  && breedOk(v) && num(v.price, 0) && int(v.qty, 0, MAX_LIST) && str(v.seller, 200)
  && optional(v, 'hiddenAge', x => num(x)) && optional(v, 'hiddenMites', bool) && optional(v, 'checked', bool);
const order = (v: unknown) => obj(v) && int(v.id, 0) && str(v.customer, 200) && oneOf(v.kind, ['eier', 'junghenne', 'suppenhuhn'])
  && int(v.qty, 0, MAX_LIST) && num(v.reward, 0) && num(v.dueDay);
const showResult = (v: unknown) => obj(v) && int(v.animalId, 0) && str(v.name, 60) && breedOk(v) && num(v.points)
  && str(v.grade, 100) && num(v.prize) && bool(v.trophy);
const trophy = (v: unknown) => obj(v) && num(v.day) && str(v.title, 200) && str(v.animal, 60) && breedOk(v);

const STATS = ['eggsSold', 'eggsTotal', 'hatched', 'deaths', 'predatorLosses', 'juniorsRaised', 'income', 'expenses'];

/** true, wenn der Spielstand vollständig und in sich stimmig ist (vor migrate() aufrufen) */
export function isValidSave(v: unknown, saveVersion: number): v is GameState {
  if (!obj(v) || v.version !== saveVersion) return false;
  const s = v;
  const equip = s.equip, stats = s.stats;
  const grund = str(s.farmName, 60) && key(s.difficulty, DIFFICULTIES) && key(s.plot, PLOTS) && num(s.seed)
    && int(s.day, 1) && int(s.hour, 0, 23) && optional(s, 'minute', x => num(x, 0, 59))
    && num(s.money) && num(s.debt, 0) && bool(s.loanUsed) && oneOf(s.speed, [0, 1, 2, 4]);
  const ausruestung = obj(equip) && (['fence', 'coop', 'drinker', 'feeder'] as const).every(slot => nullOr(x => itemOk(x, slot))(equip[slot]))
    && list(s.extras, x => itemOk(x), 100) && int(s.runExtensions, 0, 100) && list(s.cosmetics, x => itemOk(x), 100)
    && nullOr(x => key(x, HATS))(s.hat);
  const stall = bool(s.doorOpen) && num(s.water, 0) && num(s.feed, 0) && nullOr(x => key(x, SUPPLY))(s.feedType)
    && num(s.cleanliness, 0, 100) && num(s.flatterbandSince) && num(s.kieselgurUntil)
    && optional(s, 'kraeuterUntil', x => num(x)) && optional(s, 'iceFreeUntil', x => num(x));
  const lager = record(s.inventory, x => num(x, 0)) && record(s.eggs, x => num(x, 0)) && record(s.nestEggs, x => num(x, 0))
    && list(s.hatchEggs, hatchEgg) && list(s.nestHatchEggs, hatchEgg) && num(s.blockedEggs, 0)
    && list(s.incubator, x => hatchEgg(x) && obj(x) && num(x.hatchDay) && bool(x.candled), 100);
  const tiere = list(s.animals, animal) && int(s.nextId, 0)
    && (s.animals as Obj[]).every(a => (a.id as number) < (s.nextId as number))
    && new Set((s.animals as Obj[]).map(a => a.id)).size === (s.animals as Obj[]).length;
  const markt = num(s.temperature, -100, 100) && num(s.eggPrice, 0) && list(s.offers, offer, 100) && int(s.offersDay, -MAX_ZAHL)
    && optional(s, 'marketVersion', x => int(x, 0)) && num(s.foxAlertDay) && num(s.marderAlertDay) && num(s.hawkAlertDay)
    && list(s.events, x => obj(x) && oneOf(x.id, ['dorffest', 'futterteuer', 'stallpflicht']) && num(x.until), 20)
    && optional(s, 'orders', x => list(x, order, 50));
  const spaeter = optional(s, 'pasture', x => list(x, y => num(y, 0, 100), 2) && (x as unknown[]).length === 2)
    && optional(s, 'pastureSide', x => oneOf(x, [0, 1])) && optional(s, 'pastureSwitchDay', x => num(x))
    && optional(s, 'lightOn', bool) && optional(s, 'tutorialOff', bool)
    && optional(s, 'album', x => record(x, y => obj(y) && num(y.day) && str(y.name, 60)))
    && optional(s, 'show', x => obj(x) && num(x.day) && str(x.title, 200) && oneOf(x.level, [1, 2])
      && list(x.entries, y => int(y, 0), 50) && bool(x.announced))
    && optional(s, 'lastShow', x => obj(x) && str(x.title, 200) && num(x.day) && list(x.results, showResult, 50))
    && optional(s, 'trophies', x => list(x, trophy, MAX_LIST))
    && optional(s, 'finance', x => obj(x) && record(x.cur, y => num(y)) && optional(x, 'prev', y => record(y, z => num(z)))
      && list(x.results, y => num(y), MAX_LIST))
    && optional(s, 'adviceDay', x => num(x))
    && optional(s, 'visit', nullOr(x => obj(x) && str(x.group, 200) && num(x.day) && num(x.fee, 0) && bool(x.accepted)))
    && optional(s, 'visitEffect', nullOr(x => obj(x) && num(x.until) && num(x.points)));
  const verlauf = obj(stats) && STATS.every(f => num(stats[f])) && list(stats.deathsRecent, x => num(x))
    && num(s.pendingCosts) && int(s.chapter, 1, 100)
    && list(s.goals, x => obj(x) && str(x.id, 100) && str(x.text) && bool(x.done), 100)
    && list(s.log, logEntry) && optional(s, 'toasts', x => Array.isArray(x))
    && optional(s, 'banners', x => list(x, y => str(y), 100))
    && optional(s, 'celebrations', x => list(x, y => obj(y) && str(y.emoji, 20) && str(y.title, 200) && list(y.lines, z => str(z), 50), 50))
    && nullOr(x => list(x, y => str(y), 100))(s.report) && bool(s.gameOver);
  return grund && ausruestung && stall && lager && tiere && markt && spaeter && verlauf;
}
