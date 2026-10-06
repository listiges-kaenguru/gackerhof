// Alles, was der Spieler tun kann. Jede Aktion liefert ein Ergebnis mit Meldung zurück.
import {
  BREEDS, CONDITIONS, DISPOSAL_COST, HEALTH_CHECK_COST, ITEM, MANURE_PRICE, SUPPLY, DIFFICULTIES,
} from './data';
import {
  addMoney, animalValue, butcherValue, coopCap, diff, drinkerCap, eggCount, eggValue, eventActive, feederCap,
  flock, frozen, has, isDaytime, living, log, outsideAnimals, round2, stage,
} from './helpers';
import { chance, intBetween } from './rng';
import { addCondition } from './sim';
import { createAnimal } from './state';
import type { ConditionId, Difficulty, FeedId, GameState } from './types';

export interface Result { ok: boolean; msg: string }
const ok = (msg: string): Result => ({ ok: true, msg });
const fail = (msg: string): Result => ({ ok: false, msg });

function pay(s: GameState, amount: number): boolean {
  if (s.money < amount) return false;
  addMoney(s, -amount);
  return true;
}

/* ---------------- Shop ---------------- */
export function itemPrice(s: GameState, id: string): number {
  const it = ITEM[id];
  if (id === 'auslauf') return it.price + s.runExtensions * 30;
  return it.price;
}
export function supplyPrice(s: GameState, id: string): number {
  const p = SUPPLY[id].price;
  const feed = ['koerner', 'legemehl', 'kuekenstarter'].includes(id);
  return round2(p * (feed && eventActive(s, 'futterteuer') ? 1.5 : 1));
}

/** Kann der Artikel gekauft werden? Liefert sonst den Grund. */
export function canBuy(s: GameState, id: string): string | null {
  const it = ITEM[id];
  if (it.slot && s.equip[it.slot] === id) return 'Bereits vorhanden';
  if (!it.slot && it.stack == null && (s.extras.includes(id) || s.cosmetics.includes(id))) return 'Bereits vorhanden';
  if (it.stack != null && s.runExtensions >= it.stack) return 'Maximal ausgebaut';
  if (id === 'auslauf' && !s.equip.fence) return 'Braucht zuerst einen Zaun';
  if (it.requires && s.equip.fence !== it.requires) return `Braucht ${ITEM[it.requires].name}`;
  if (it.plot && it.plot !== s.plot) return 'Nur auf dem Grundstück am Bach möglich';
  if (id === 'autofutter' && !s.equip.feeder) return 'Braucht zuerst eine Futterstelle';
  if (s.money < itemPrice(s, id)) return 'Nicht genug Geld';
  return null;
}

export function buyItem(s: GameState, id: string): Result {
  const it = ITEM[id];
  const why = canBuy(s, id);
  if (why) return fail(why);
  const price = itemPrice(s, id);
  let tradeIn = 0;
  if (it.slot) {
    const old = s.equip[it.slot];
    if (old) {
      tradeIn = round2(ITEM[old].price * 0.4);
      if (it.slot === 'fence' && old === 'enetz') removeExtra(s, 'geraet');
    }
    if (it.slot === 'coop') {
      const cap = it.cap ?? 0;
      if (flock(s).length > cap) log(s, `⚠️ Der neue Stall hat nur ${cap} Plätze für ${flock(s).length} Tiere!`, 'warn', true);
    }
  }
  if (s.money + tradeIn < price) return fail('Nicht genug Geld');
  addMoney(s, -price);
  if (tradeIn) addMoney(s, tradeIn);
  if (it.slot) {
    s.equip[it.slot] = id;
    if (it.slot === 'drinker') s.water = Math.min(s.water, it.cap ?? 0);
    if (it.slot === 'feeder') s.feed = Math.min(s.feed, it.cap ?? 0);
  } else if (it.cosmetic) {
    s.cosmetics.push(id);
    if (it.cosmetic === 'hat') s.hat = id;
  } else if (id === 'auslauf') {
    s.runExtensions++;
  } else {
    s.extras.push(id);
    if (id === 'flatterband') s.flatterbandSince = s.day;
  }
  log(s, `🛒 Gekauft: ${it.name} für ${price} €${tradeIn ? ` (alte Ausrüstung für ${tradeIn} € in Zahlung gegeben)` : ''}`, 'info');
  return ok(`${it.name} gekauft${tradeIn ? `, alte Ausrüstung für ${tradeIn.toFixed(2)} € in Zahlung gegeben` : ''}.`);
}

function removeExtra(s: GameState, id: string) {
  s.extras = s.extras.filter(x => x !== id);
}

/** Gebrauchte Ausrüstung verkaufen (40 % des Neupreises) */
export function sellItem(s: GameState, id: string): Result {
  const it = ITEM[id];
  if (it.cosmetic) return fail('Gimmicks kann man nicht verkaufen.');
  const value = round2(it.price * 0.4);
  if (it.slot && s.equip[it.slot] === id) {
    if (it.slot === 'coop' && flock(s).length) return fail('Ohne Stall wüssten deine Hühner nicht, wohin. Erst Ersatz kaufen.');
    s.equip[it.slot] = null;
    if (it.slot === 'fence') { removeExtra(s, 'geraet'); s.runExtensions = 0; }
    if (it.slot === 'drinker') s.water = 0;
    if (it.slot === 'feeder') { s.feed = 0; removeExtra(s, 'autofutter'); }
  } else if (s.extras.includes(id)) {
    removeExtra(s, id);
  } else return fail('Nicht vorhanden.');
  addMoney(s, value);
  log(s, `💶 Verkauft: ${it.name} für ${value.toFixed(2)} €`, 'info');
  return ok(`${it.name} für ${value.toFixed(2)} € verkauft.`);
}

export function buySupply(s: GameState, id: string, times = 1): Result {
  const sp = SUPPLY[id];
  const price = round2(supplyPrice(s, id) * times);
  if (!pay(s, price)) return fail('Nicht genug Geld');
  s.inventory[id] = round2((s.inventory[id] ?? 0) + sp.amount * times);
  return ok(`${sp.amount * times} ${sp.unit} ${sp.name} gekauft.`);
}

export function wearHat(s: GameState, id: string | null): Result {
  if (id && id !== 'stroh' && !s.cosmetics.includes(id)) return fail('Nicht gekauft.');
  s.hat = id;
  return ok('Steht dir gut!');
}

/* ---------------- Hof ---------------- */
export function toggleDoor(s: GameState): Result {
  if (!s.equip.coop) return fail('Du hast noch keinen Stall.');
  s.doorOpen = !s.doorOpen;
  if (s.doorOpen) {
    // Ausgesperrte Hühner nutzen die Gelegenheit; tagsüber gehen alle raus
    for (const a of flock(s)) if (a.broodingUntil <= s.day && s.equip.fence) a.outside = isDaytime(s.hour);
    return ok(isDaytime(s.hour) ? 'Klappe auf: Die Hühner dürfen raus.' : 'Klappe auf: Die Hühner gehen in den Stall.');
  }
  const out = outsideAnimals(s);
  if (out.length) {
    return ok(`Klappe zu – aber ${out.length === 1 ? `${out[0].name} ist` : `${out.length} Hühner sind`} noch draußen und jetzt ausgesperrt! Mit Futter reinlocken oder Klappe wieder öffnen.`);
  }
  return ok('Klappe zu: Alle Hühner sind im Stall.');
}

/** Hühner mit Futter in den Stall locken und die Klappe schließen */
export function lureIn(s: GameState): Result {
  if (!s.equip.coop) return fail('Du hast noch keinen Stall.');
  const out = outsideAnimals(s);
  if (!out.length) return fail('Alle Hühner sind schon im Stall.');
  const bait = (['koerner', 'legemehl', 'mehlwuermer'] as const).find(id => (s.inventory[id] ?? 0) >= (id === 'mehlwuermer' ? 1 : 0.2));
  if (!bait) return fail('Ohne Futter oder Mehlwürmer im Lager lassen sich die Hühner nicht locken.');
  s.inventory[bait] = round2(s.inventory[bait] - (bait === 'mehlwuermer' ? 1 : 0.2));
  for (const a of out) a.outside = false;
  s.doorOpen = false;
  return ok(`Mit ${bait === 'mehlwuermer' ? 'Mehlwürmern' : 'ein paar Körnern'} gelockt: ${out.length} Hühner sind im Stall, die Klappe ist zu.`);
}

export function refillWater(s: GameState): Result {
  if (!s.equip.drinker) return fail('Du hast noch keine Tränke.');
  const cap = drinkerCap(s);
  if (s.water >= cap - 0.01 && !frozen(s)) return fail('Die Tränke ist schon voll.');
  s.water = cap;
  return ok(frozen(s) ? 'Eis aufgehackt und frisches Wasser eingefüllt. Es friert bald wieder ein.' : 'Tränke aufgefüllt.');
}

export function refillFeed(s: GameState, type?: FeedId): Result {
  if (!s.equip.feeder) return fail('Du hast noch keine Futterstelle.');
  const t: FeedId | null = type ?? ((s.inventory.legemehl ?? 0) > 0 ? 'legemehl' : (s.inventory.koerner ?? 0) > 0 ? 'koerner' : null);
  if (!t || (s.inventory[t] ?? 0) <= 0) return fail('Kein Futter im Lager. Kauf welches im Shop unter „Futter & Medizin“.');
  const space = round2(feederCap(s) - s.feed);
  if (space <= 0.05) return fail('Die Futterstelle ist schon voll.');
  const amount = Math.min(space, s.inventory[t]);
  s.inventory[t] = round2(s.inventory[t] - amount);
  s.feed = round2(s.feed + amount);
  s.feedType = t;
  return ok(`${amount.toFixed(1)} kg ${SUPPLY[t].name} eingefüllt.`);
}

export function collectEggs(s: GameState): Result {
  const n = eggCount(s.nestEggs);
  const h = s.nestHatchEggs.length;
  const b = s.blockedEggs;
  if (n + h + b === 0) return fail('Im Nest liegen keine Eier.');
  for (const [k, v] of Object.entries(s.nestEggs)) s.eggs[k] = (s.eggs[k] ?? 0) + v;
  s.hatchEggs.push(...s.nestHatchEggs);
  s.nestEggs = {};
  s.nestHatchEggs = [];
  s.blockedEggs = 0;
  const parts = [];
  if (n) parts.push(`${n} Speiseei${n > 1 ? 'er' : ''}`);
  if (h) parts.push(`${h} Brutei${h > 1 ? 'er' : ''} (vom Hahn befruchtet)`);
  let msg = `🥚 Eingesammelt: ${parts.join(' und ') || 'keine verkaufbaren Eier'}.`;
  if (b) msg += ` ${b} Ei${b > 1 ? 'er' : ''} mit Medikamenten-Wartezeit entsorgt.`;
  return ok(msg);
}

export function cleanCoop(s: GameState): Result {
  if (!s.equip.coop) return fail('Du hast noch keinen Stall.');
  if (s.cleanliness > 90) return fail('Der Stall ist noch sauber.');
  if ((s.inventory.einstreu ?? 0) < 1) return fail('Keine Einstreu im Lager. Kauf Stroh im Shop.');
  s.inventory.einstreu -= 1;
  const mist = Math.max(1, Math.round((100 - s.cleanliness) / 25));
  s.inventory.mist = (s.inventory.mist ?? 0) + mist;
  s.cleanliness = 100;
  return ok(`Stall ausgemistet und frisch eingestreut. ${mist} Sack Mist kannst du als Dünger verkaufen.`);
}

export function giveTreat(s: GameState): Result {
  if ((s.inventory.mehlwuermer ?? 0) < 1) return fail('Keine Mehlwürmer im Lager.');
  if (!living(s).length) return fail('Keine Tiere da.');
  s.inventory.mehlwuermer -= 1;
  for (const a of living(s)) {
    a.wellbeing = Math.min(100, a.wellbeing + 20);
    a.food = Math.min(100, a.food + 10);
  }
  return ok('🪱 Mehlwürmer verstreut. Die Hühner flippen fast aus vor Freude!');
}

/* ---------------- Tiere ---------------- */
function animal(s: GameState, id: number) {
  return s.animals.find(a => a.id === id);
}

export function treat(s: GameState, animalId: number, cond: ConditionId, cureId: string): Result {
  const a = animal(s, animalId);
  if (!a || a.dead) return fail('Tier nicht gefunden.');
  const c = a.conditions.find(x => x.id === cond);
  if (!c) return fail('Das Tier hat diese Krankheit nicht.');
  const cure = CONDITIONS[cond].cures.find(x => x.id === cureId)!;
  if (cure.vetPrice != null) {
    const price = round2(cure.vetPrice * diff(s).vetFactor);
    if (!pay(s, price)) return fail(`Der Tierarzt kostet ${price} €. Nicht genug Geld.`);
  } else if ((s.inventory[cureId] ?? 0) >= 1) {
    s.inventory[cureId] -= 1;
  } else {
    const price = supplyPrice(s, cureId);
    if (!pay(s, price)) return fail(`${SUPPLY[cureId].name} kostet ${price} €. Nicht genug Geld.`);
  }
  c.severity -= cure.effect;
  if (cureId === 'kieselgur') s.kieselgurUntil = s.day + 10;
  if (c.severity <= 0) a.conditions = a.conditions.filter(x => x !== c);
  if (cure.withdrawal) a.withdrawalUntil = s.day + cure.withdrawal;
  const healed = c.severity <= 0;
  return ok(`${cure.label}: ${a.name} ${healed ? 'ist wieder gesund' : 'geht es besser, aber der Befall ist noch nicht weg'}.${cure.withdrawal ? ` Wartezeit ${cure.withdrawal} Tage: keine Eier verkaufen, nicht schlachten.` : ''}`);
}

export function disposeBody(s: GameState, id: number): Result {
  const a = animal(s, id);
  if (!a || !a.dead) return fail('Nicht gefunden.');
  if (!pay(s, DISPOSAL_COST)) return fail(`Die Tierkörperbeseitigung kostet ${DISPOSAL_COST} €. Nicht genug Geld.`);
  s.animals = s.animals.filter(x => x.id !== id);
  log(s, `🕊️ ${a.name} wurde von der Tierkörperbeseitigung abgeholt (${DISPOSAL_COST} €).`, 'info');
  return ok(`${a.name} wurde abgeholt. Kosten: ${DISPOSAL_COST} €.`);
}

export function sellAnimal(s: GameState, id: number): Result {
  const a = animal(s, id);
  if (!a || a.dead) return fail('Nicht gefunden.');
  if (a.broodEggs.length) return fail(`${a.name} brütet gerade.`);
  const v = animalValue(s, a);
  addMoney(s, v);
  s.animals = s.animals.filter(x => x.id !== id);
  log(s, `💶 ${a.name} auf dem Geflügelmarkt verkauft für ${v.toFixed(2)} €.`, 'info');
  return ok(`${a.name} für ${v.toFixed(2)} € verkauft.`);
}

export function butcher(s: GameState, id: number): Result {
  const a = animal(s, id);
  if (!a || a.dead) return fail('Nicht gefunden.');
  if (stage(s, a) === 'kueken') return fail('Küken nimmt der Schlachter nicht an.');
  if (a.withdrawalUntil >= s.day) return fail(`${a.name} hat noch Medikamenten-Wartezeit bis Tag ${a.withdrawalUntil}.`);
  if (a.conditions.some(c => c.severity > 30)) return fail('Kranke Tiere nimmt der Schlachter nicht an.');
  if (a.broodEggs.length) return fail(`${a.name} brütet gerade.`);
  const v = butcherValue(s, a);
  addMoney(s, v);
  s.animals = s.animals.filter(x => x.id !== id);
  log(s, `🔪 ${a.name} wurde zum Schlachter gebracht. Erlös nach Gebühr: ${v.toFixed(2)} €.`, 'info');
  return ok(`${a.name} zum Schlachter gebracht. Erlös: ${v.toFixed(2)} €.`);
}

export function rename(s: GameState, id: number, name: string): Result {
  const a = animal(s, id);
  const n = name.trim().slice(0, 24);
  if (!a || !n) return fail('Ungültiger Name.');
  a.name = n;
  return ok(`Das Tier heißt jetzt ${n}.`);
}

/* ---------------- Markt ---------------- */
export function buyOffer(s: GameState, offerId: number, qty = 1): Result {
  const o = s.offers.find(x => x.id === offerId);
  if (!o || o.qty < qty) return fail('Angebot nicht mehr verfügbar.');
  if (o.kind !== 'brutei' && o.kind !== 'kueken' && !s.equip.coop) return fail('Erst einen Stall kaufen, dann Tiere!');
  if (o.kind === 'kueken' && !s.equip.coop && !has(s, 'kuekenstation')) return fail('Küken brauchen eine Kükenstation oder einen Stall.');
  const price = round2(o.price * qty);
  if (!pay(s, price)) return fail('Nicht genug Geld.');
  o.qty -= qty;
  const names: string[] = [];
  for (let i = 0; i < qty; i++) {
    if (o.kind === 'brutei') {
      s.hatchEggs.push({ breed: o.breed, fertile: chance(s, 0.75) });
      continue;
    }
    const opts = {
      kueken: { ageDays: 1 },
      junghenne: { ageDays: intBetween(s, 20, 23), sex: 'henne' as const },
      legehenne: { ageDays: o.hiddenAge ?? 120, sex: 'henne' as const },
      hahn: { ageDays: intBetween(s, 40, 160), sex: 'hahn' as const },
    }[o.kind];
    const a = createAnimal(s, o.breed, { ...opts, history: `Gekauft bei ${o.seller}` });
    if (o.kind === 'legehenne' && o.hiddenMites) a.conditions.push({ id: 'milben', severity: 25 });
    s.animals.push(a);
    names.push(a.name);
  }
  if (o.qty <= 0) s.offers = s.offers.filter(x => x !== o);
  let msg = o.kind === 'brutei'
    ? `${qty} Brutei${qty > 1 ? 'er' : ''} (${BREEDS[o.breed].name}) ins Lager gelegt.`
    : `Willkommen auf dem Hof: ${names.join(', ')}!`;
  if (o.kind !== 'brutei' && o.kind !== 'kueken' && flock(s).length > coopCap(s)) msg += ' ⚠️ Der Stall ist jetzt überbelegt.';
  if (o.kind === 'kueken' && !has(s, 'kuekenstation')) msg += ' ⚠️ Küken brauchen eine Kükenstation mit Wärmelampe!';
  if (o.kind === 'kueken' && (s.inventory.kuekenstarter ?? 0) < 1) msg += ' Kükenstarter-Futter nicht vergessen!';
  log(s, `🐣 Markt: ${msg}`, 'info');
  return ok(msg);
}

export function healthCheck(s: GameState, offerId: number): Result {
  const o = s.offers.find(x => x.id === offerId);
  if (!o || o.kind !== 'legehenne') return fail('Nicht möglich.');
  if (o.checked) return fail('Schon geprüft.');
  if (!pay(s, HEALTH_CHECK_COST)) return fail('Nicht genug Geld.');
  o.checked = true;
  return ok('Gesundheitscheck durchgeführt.');
}

export function sellEggs(s: GameState): Result {
  const n = eggCount(s.eggs);
  if (!n) return fail('Keine Eier im Lager.');
  const v = eggValue(s, s.eggs);
  addMoney(s, v);
  s.eggs = {};
  s.stats.eggsSold += n;
  log(s, `💶 ${n} Eier auf dem Markt verkauft für ${v.toFixed(2)} €.`, 'good');
  return ok(`${n} Eier für ${v.toFixed(2)} € verkauft.`);
}

export function hatchEggValue(s: GameState): number {
  return round2(s.hatchEggs.reduce((t, e) => t + BREEDS[e.breed].prices.brutei * 0.7, 0) * diff(s).sellBonus);
}
export function sellHatchEggs(s: GameState, asFood = false): Result {
  const n = s.hatchEggs.length;
  if (!n) return fail('Keine Bruteier im Lager.');
  let v: number;
  if (asFood) {
    const map: Record<string, number> = {};
    for (const e of s.hatchEggs) map[e.breed] = (map[e.breed] ?? 0) + 1;
    v = eggValue(s, map);
  } else v = hatchEggValue(s);
  addMoney(s, v);
  s.hatchEggs = [];
  s.stats.eggsSold += n;
  return ok(`${n} Eier ${asFood ? 'als Speiseeier' : 'als Bruteier'} für ${v.toFixed(2)} € verkauft.`);
}

export function sellManure(s: GameState): Result {
  const n = s.inventory.mist ?? 0;
  if (n < 1) return fail('Kein Mist im Lager.');
  const v = n * MANURE_PRICE;
  addMoney(s, v);
  s.inventory.mist = 0;
  return ok(`${n} Sack Hühnermist als Dünger verkauft: ${v.toFixed(2)} €.`);
}

/* ---------------- Brut ---------------- */
export function incubate(s: GameState, n: number): Result {
  if (!has(s, 'brutapparat')) return fail('Du brauchst einen Brutapparat.');
  const free = 12 - s.incubator.length;
  const k = Math.min(n, free, s.hatchEggs.length);
  if (k <= 0) return fail(free <= 0 ? 'Der Brutapparat ist voll.' : 'Keine Bruteier im Lager.');
  const eggs = s.hatchEggs.splice(0, k);
  for (const e of eggs) s.incubator.push({ ...e, hatchDay: s.day + 7, candled: false });
  return ok(`${k} Brutei${k > 1 ? 'er' : ''} in den Brutapparat gelegt. Schlupf in 7 Tagen.`);
}

export function setUnderHen(s: GameState, henId: number): Result {
  const a = animal(s, henId);
  if (!a || a.dead) return fail('Nicht gefunden.');
  if (a.broodyUntil < s.day) return fail(`${a.name} ist nicht brütig.`);
  const k = Math.min(8, s.hatchEggs.length);
  if (!k) return fail('Keine Bruteier im Lager.');
  a.broodEggs = s.hatchEggs.splice(0, k);
  a.broodingUntil = s.day + 7;
  a.broodyUntil = 0;
  return ok(`${a.name} brütet jetzt ${k} Eier aus. Schlupf in 7 Tagen.`);
}

/* ---------------- Sonstiges ---------------- */
export function repayDebt(s: GameState): Result {
  if (s.debt <= 0) return fail('Keine Schulden.');
  const amount = Math.min(s.debt, Math.max(0, s.money));
  if (amount <= 0) return fail('Kein Geld zum Zurückzahlen.');
  addMoney(s, -amount);
  s.debt = round2(s.debt - amount);
  return ok(s.debt <= 0 ? 'Alle Schulden zurückgezahlt!' : `${amount.toFixed(2)} € zurückgezahlt. Rest: ${s.debt.toFixed(2)} €.`);
}

const ORDER: Difficulty[] = ['leicht', 'mittel', 'schwer'];
export function lowerDifficulty(s: GameState, to: Difficulty): Result {
  if (ORDER.indexOf(to) >= ORDER.indexOf(s.difficulty)) return fail('Der Schwierigkeitsgrad kann nur gesenkt werden.');
  s.difficulty = to;
  return ok(`Schwierigkeitsgrad ist jetzt ${DIFFICULTIES[to].name}.`);
}

/** Für Tests und Debug: Krankheit auslösen */
export function infect(s: GameState, id: number, c: ConditionId) {
  const a = animal(s, id);
  if (a) addCondition(s, a, c);
}

