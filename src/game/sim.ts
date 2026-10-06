// Die Simulation läuft in Spielstunden. advanceHour() ist der einzige Taktgeber.
import {
  AGE, BREEDS, CONDITIONS, DAYS_PER_SEASON, ITEM, SEASON_NAMES, SELLERS,
} from './data';
import {
  addMoney, adultRoosters, age, chicks, crowding, diff, eventActive, flock, foxProtection,
  frozen, has, hawkProtection, hensOutside, isSenior, living, log, marderSafe, plot, ratSafe, round2,
  season, shade, stage, stars, autoWater, drinkerCap, feederCap,
} from './helpers';
import { between, chance, intBetween, pick, rand } from './rng';
import { chapterGoals, CHAPTERS, createAnimal, targetWeight } from './state';
import type { Animal, ConditionId, GameState, MarketOffer } from './types';

export function advanceHour(s: GameState) {
  if (s.gameOver) return;
  s.hour++;
  if (s.hour >= 24) {
    s.hour = 0;
    s.day++;
    newDay(s);
  }
  hourly(s);
  switch (s.hour) {
    case 6: morning(s); break;
    case 8: layEggs(s); break;
    case 10: hawkAlert(s); break;
    case 14: hawkAttack(s); stallpflichtCheck(s); break;
    case 19: if (s.day <= 5 && s.doorOpen && !has(s, 'autoklappe') && flock(s).length) log(s, '🌇 Es dämmert. Denk daran, abends die Hühnerklappe zu schließen!', 'warn', true); break;
    case 21: evening(s); break;
    case 23: nightPredators(s); break;
  }
  checkGoals(s);
}

/* ================================================================== */
/* Stündlich: Bedürfnisse                                             */
/* ================================================================== */
function hourly(s: GameState) {
  const d = diff(s);
  const night = s.hour < 6 || s.hour >= 21;
  const hot = s.temperature >= 28;
  const cold = s.temperature <= 2;
  const iced = frozen(s);
  if (autoWater(s) && s.equip.drinker) s.water = drinkerCap(s);

  // Ratten und Spatzen bedienen sich an offenen Futterstellen
  if (s.feed > 0 && !night && !ratSafe(s)) {
    const loss = s.equip.feeder === 'trog' ? 0.035 : 0.015;
    s.feed = Math.max(0, s.feed - s.feed * loss);
  }

  const crowd = crowding(s);
  for (const a of living(s)) {
    const st = stage(s, a);
    const rate = (night ? 0.35 : 1) * d.needDecay;
    const gluttony = a.personality === 'gefraessig' ? 1.2 : 1;
    a.food = clamp(a.food - 3.2 * rate * gluttony * (cold ? 1.25 : 1));
    a.water = clamp(a.water - 4.5 * rate * (hot ? 1.6 : 1));

    if (!night) {
      // Fressen
      if (st === 'kueken') {
        const need = 0.015;
        if (a.food < 85 && (s.inventory.kuekenstarter ?? 0) >= need) {
          s.inventory.kuekenstarter = round2(s.inventory.kuekenstarter - need);
          a.food = clamp(a.food + 14);
        }
      } else if (a.food < 85 && s.feed > 0 && s.equip.feeder) {
        const portion = 0.025 * (BREEDS[a.breed].weightHen / 2);
        s.feed = Math.max(0, s.feed - portion);
        a.food = clamp(a.food + 12);
      }
      // Trinken
      if (a.water < 85 && s.water > 0 && s.equip.drinker && !iced) {
        s.water = Math.max(0, s.water - (st === 'kueken' ? 0.02 : 0.06) * (hot ? 1.3 : 1));
        a.water = clamp(a.water + 15);
      }
    }

    // Gesundheit
    let dh = 0;
    if (a.food <= 0) dh -= 3.5; else if (a.food < 20) dh -= 1.2;
    if (a.water <= 0) dh -= 5; else if (a.water < 20) dh -= 1.8;
    for (const c of a.conditions) dh -= (c.severity / 100) * (c.id === 'schnupfen' || c.id === 'kokzidiose' ? 1.6 : 0.8);
    if (st === 'kueken' && !has(s, 'kuekenstation') && !motherCares(s, a)) dh -= 0.9; // friert
    if (hot && !shade(s) && !night && hensOutside(s)) dh -= 0.6;
    if (isSenior(s, a)) dh -= 0.05;
    if (dh === 0 && a.food > 50 && a.water > 50) dh = 0.6;
    a.health = clamp(a.health + dh);

    // Wohlbefinden strebt einem Zielwert entgegen
    let target = 80;
    if (crowd > 1) target -= 25 * Math.min(2, crowd - 1 + 0.5);
    if (s.cleanliness < 40) target -= 15;
    if (!hensOutside(s) && !night && st !== 'kueken') target -= 15;
    if (a.food < 40 || a.water < 40) target -= 20;
    if (a.conditions.some(c => c.id === 'milben')) target -= 15;
    if (hot && !shade(s)) target -= 10;
    if (adultRoosters(s).length > Math.max(1, Math.ceil(flock(s).filter(x => x.sex === 'henne').length / 8))) target -= 15; // Rangkämpfe
    a.wellbeing = clamp(a.wellbeing + Math.sign(target - a.wellbeing) * Math.min(2, Math.abs(target - a.wellbeing)));

    if (a.health <= 0) {
      if (d.lastChance && !a.lastChanceUsed) {
        a.lastChanceUsed = true;
        a.health = 12;
        log(s, `⚠️ ${a.name} ist sehr schwach. Letzte Chance: Bitte sofort versorgen und behandeln!`, 'bad', true);
      } else {
        die(s, a, causeOfDeath(a));
      }
    }
  }

  // Stall verschmutzt
  const dirt = flock(s).length * 0.055 * (s.equip.coop === 'kiste' ? 1.5 : s.equip.coop === 'mobil' ? 0.6 : 1);
  s.cleanliness = clamp(s.cleanliness - dirt);
}

function causeOfDeath(a: Animal): string {
  if (a.water <= 0) return 'verdurstet';
  if (a.food <= 0) return 'verhungert';
  const worst = [...a.conditions].sort((x, y) => y.severity - x.severity)[0];
  if (worst) return `an ${CONDITIONS[worst.id].name} gestorben`;
  return 'an Schwäche gestorben';
}
const motherCares = (s: GameState, a: Animal) =>
  a.motherId != null && s.animals.some(m => m.id === a.motherId && !m.dead);

export function die(s: GameState, a: Animal, cause: string, predator = false) {
  a.dead = true;
  a.deathCause = cause;
  a.deathDay = s.day;
  a.broodEggs = [];
  s.stats.deaths++;
  if (cause !== 'Altersschwäche') s.stats.deathsRecent.push(s.day);
  if (predator) {
    s.stats.predatorLosses++;
    // Vom Raubtier geholte Tiere hinterlassen nichts zum Entsorgen
    s.animals = s.animals.filter(x => x.id !== a.id);
    log(s, `🕊️ ${a.name} (${BREEDS[a.breed].name}) wurde ${cause}.`, 'bad', true);
  } else {
    log(s, `🕊️ ${a.name} (${BREEDS[a.breed].name}) ist ${cause === 'Altersschwäche' ? 'an Altersschwäche gestorben' : cause}. Das Tier muss entsorgt werden.`, 'bad', true);
  }
}

/* ================================================================== */
/* Tageswechsel                                                       */
/* ================================================================== */
function newDay(s: GameState) {
  const d = diff(s);
  // Monatsabrechnung
  for (const id of [...s.extras, ...Object.values(s.equip)]) if (id && ITEM[id]?.power) s.pendingCosts += ITEM[id].power!;
  if ((s.day - 1) % DAYS_PER_SEASON === 0) {
    const rent = plot(s).rent;
    const costs = round2(rent + s.pendingCosts);
    addMoney(s, -costs);
    log(s, `📅 Monatsabrechnung: Pacht ${rent} € + Strom/Wasser ${s.pendingCosts.toFixed(2)} € = ${costs.toFixed(2)} €`, 'info', true);
    s.pendingCosts = 0;
    log(s, `🍂 Der ${SEASON_NAMES[season(s)]} beginnt.`, 'info', true);
  }

  // Wetter
  const base = { fruehling: 12, sommer: 24, herbst: 10, winter: 0 }[season(s)];
  s.temperature = Math.round(base + between(s, -6, 7));
  if (s.temperature >= 30) log(s, `🥵 Hitzewelle: ${s.temperature} °C. Die Hühner brauchen viel Wasser und Schatten.`, 'warn', true);
  if (s.temperature < 0 && frozen(s) && s.equip.drinker) log(s, `🥶 Frost: ${s.temperature} °C. Die Tränke friert ein. Wasser muss täglich neu aufgefüllt werden.`, 'warn', true);

  // Eierpreis schwankt
  const target = eventActive(s, 'dorffest') ? 0.95 : 0.5;
  s.eggPrice = round2(Math.min(1.1, Math.max(0.3, s.eggPrice + (target - s.eggPrice) * 0.3 + between(s, -0.03, 0.03) * d.priceVolatility)));

  // Eier im Nest gehen kaputt oder werden gefressen
  const lossRate = 0.12 + (ratSafe(s) ? 0 : 0.15);
  let lost = 0;
  for (const k of Object.keys(s.nestEggs)) {
    const n = s.nestEggs[k];
    const l = Math.round(n * lossRate);
    s.nestEggs[k] = n - l;
    lost += l;
  }
  if (s.nestHatchEggs.length) s.nestHatchEggs = s.nestHatchEggs.filter(() => !chance(s, lossRate));
  if (lost > 0) log(s, `🥚 ${lost} ungesammelte Eier sind kaputtgegangen oder wurden von Ratten geholt.`, 'warn');

  // Altern, Wachsen, Tod durch Alter
  for (const a of living(s)) {
    const ad = age(s, a);
    if (ad === AGE.junghuhn) {
      s.stats.juniorsRaised++;
      log(s, `🐥 ${a.name} ist jetzt ein Jung${a.sex === 'hahn' ? 'hahn' : 'huhn'}. ${a.sex === 'hahn' ? 'Ein Hahn! 🐓' : 'Eine Henne! 🐔'}`, 'good', true);
      a.motherId = undefined;
    }
    if (ad === AGE.erwachsen) log(s, `🎉 ${a.name} ist erwachsen${a.sex === 'henne' ? ' und legt bald Eier' : ''}.`, 'good', true);
    if (ad === AGE.senior) log(s, `👵 ${a.name} kommt in die Jahre. Die Legeleistung lässt nach.`, 'info');
    a.weight = round2(a.weight + (targetWeight(s, a) - a.weight) * 0.3 - (a.food < 30 ? 0.05 : 0));
    if (ad >= a.maxAge) die(s, a, 'Altersschwäche');
  }

  diseases(s);
  brooding(s);

  // Tote, nicht entsorgte Tiere erhöhen das Krankheitsrisiko
  const bodies = s.animals.filter(a => a.dead && a.deathDay! < s.day);
  if (bodies.length) {
    for (const a of living(s)) if (chance(s, 0.08)) addCondition(s, a, 'schnupfen', 15);
    log(s, '⚠️ Ein totes Tier liegt noch im Gehege. Das ist ein Krankheitsrisiko!', 'warn', true);
  }

  // Raubtier-Spuren (Warnung einen Tag vorher)
  const f = flock(s).length + chicks(s).length;
  if (f > 0) {
    const autumn = season(s) === 'herbst' ? 1.5 : 1;
    if (chance(s, plot(s).fox * d.predator * autumn)) {
      s.foxAlertDay = s.day;
      log(s, `🦊 Fuchsspuren am Zaun entdeckt! Heute Nacht könnte er wiederkommen. (Fuchsschutz: ${Math.round(foxProtection(s) * 100)} %)`, 'warn', true);
    }
    if (!marderSafe(s) && chance(s, plot(s).marder * d.predator)) {
      s.marderAlertDay = s.day;
      log(s, '🦡 Marderkot neben dem Stall! Der Stall ist nicht mardersicher.', 'warn', true);
    }
  }

  // Ereignisse
  randomEvents(s);
  s.events = s.events.filter(e => e.until >= s.day);

  // Markt erneuert sich wöchentlich
  if (s.day - s.offersDay >= 7) refreshOffers(s);

  // Hofladen verkauft passiv
  if (has(s, 'hofladen')) {
    let quota = 2 + stars(s) * 3;
    let sold = 0, earned = 0;
    for (const k of Object.keys(s.eggs)) {
      const n = Math.min(quota, s.eggs[k]);
      if (n <= 0) continue;
      s.eggs[k] -= n; quota -= n; sold += n;
      earned += n * s.eggPrice * 1.5 * BREEDS[k as keyof typeof BREEDS].eggValue * d.sellBonus;
    }
    if (sold) {
      addMoney(s, round2(earned));
      s.stats.eggsSold += sold;
      log(s, `🏪 Hofladen: ${sold} Eier für ${earned.toFixed(2)} € verkauft.`, 'good');
    }
  }

  // Ruhephase für den Flatterband-Effekt etc.
  s.stats.deathsRecent = s.stats.deathsRecent.filter(x => x > s.day - 30);

  finances(s);
}

function finances(s: GameState) {
  if (s.money >= 0) return;
  const d = diff(s);
  if (!s.loanUsed) {
    s.loanUsed = true;
    if (d.opaLoan) {
      addMoney(s, 200);
      s.debt += 200;
      log(s, '👴 Opa Heinz hilft aus: „Hier sind 200 €. Zahl sie zurück, wenn es wieder läuft.“ (zinslos)', 'info', true);
    } else {
      addMoney(s, 300);
      s.debt += 330;
      log(s, '🏦 Die Bank gibt dir einen Kredit über 300 € (Rückzahlung 330 €).', 'info', true);
    }
    return;
  }
  // Kein Kredit mehr: Spiel vorbei, wenn auch keine Tiere mehr da sind
  if (living(s).length === 0 && s.money < 0) {
    s.gameOver = true;
    log(s, '😢 Kein Geld und keine Tiere mehr. Der Hof muss aufgeben.', 'bad', true);
  }
}

/* ================================================================== */
/* Krankheiten                                                        */
/* ================================================================== */
export function addCondition(s: GameState, a: Animal, id: ConditionId, severity = 10) {
  const c = a.conditions.find(x => x.id === id);
  if (c) return;
  a.conditions.push({ id, severity });
  const def = CONDITIONS[id];
  log(s, `${def.emoji} ${a.name} zeigt Anzeichen von ${def.name}: ${def.sign}.`, 'warn', true);
}

function diseases(s: GameState) {
  const d = diff(s);
  const se = season(s);
  const wet = plot(s).wet;
  const mobil = s.equip.coop === 'mobil' ? 0.5 : 1;
  const crowd = crowding(s);
  const crowdF = crowd > 1 ? 1 + (crowd - 1) * 2 : 1;
  const all = living(s);

  for (const a of all) {
    const st = stage(s, a);
    // Fortschreiten bestehender Krankheiten
    for (const c of a.conditions) {
      let g = CONDITIONS[c.id].growth * d.disease;
      if (c.id === 'milben' && s.kieselgurUntil >= s.day) g *= 0.3;
      c.severity = Math.min(100, c.severity + g);
    }
    // Neue Krankheiten
    let pMilben = 0.02 * (s.cleanliness < 50 ? 2 : 1) * (se === 'sommer' ? 2 : 1) * (has(s, 'sandbad') ? 0.4 : 1) * (s.kieselgurUntil >= s.day ? 0.2 : 1) * mobil * crowdF;
    let pWurm = 0.01 * wet * (s.cleanliness < 40 ? 1.8 : 1) * mobil;
    let pSchnupfen = 0.006 * wet * (se === 'herbst' || se === 'winter' ? 2 : 1) * (s.temperature < 3 ? 1.5 : 1) * (s.equip.coop === 'kiste' ? 1.6 : 1) * crowdF;
    if (st === 'kueken') {
      pMilben = 0;
      pWurm = 0;
      if (chance(s, 0.03 * d.disease * (s.cleanliness < 60 ? 2 : 1))) addCondition(s, a, 'kokzidiose');
    }
    if (a.health < 50) { pSchnupfen *= 2; pWurm *= 1.5; }
    if (chance(s, pMilben * d.disease)) addCondition(s, a, 'milben');
    if (chance(s, pWurm * d.disease)) addCondition(s, a, 'wuermer');
    if (chance(s, pSchnupfen * d.disease)) addCondition(s, a, 'schnupfen');
  }
  // Ansteckung
  for (const a of all) {
    for (const c of [...a.conditions]) {
      const def = CONDITIONS[c.id];
      for (const b of all) {
        if (b === a) continue;
        if ((c.id === 'kokzidiose') !== (stage(s, b) === 'kueken')) continue;
        if (chance(s, def.contagious * (c.severity / 100) * d.disease * 0.5)) addCondition(s, b, c.id, 5);
      }
    }
  }
}

/* ================================================================== */
/* Brut                                                               */
/* ================================================================== */
function brooding(s: GameState) {
  // Brutapparat
  const due = s.incubator.filter(e => e.hatchDay <= s.day);
  if (due.length) {
    s.incubator = s.incubator.filter(e => e.hatchDay > s.day);
    hatch(s, due, undefined, 'Brutapparat');
  }
  // Schieren am 3. Bruttag (Brutapparat)
  for (const e of s.incubator) {
    if (!e.candled && e.hatchDay - s.day <= AGE.brut - 3) {
      e.candled = true;
    }
  }
  const bad = s.incubator.filter(e => e.candled && !e.fertile);
  if (bad.length) {
    s.incubator = s.incubator.filter(e => !(e.candled && !e.fertile));
    log(s, `🔦 Schieren: ${bad.length} Ei${bad.length > 1 ? 'er waren' : ' war'} unbefruchtet und wurde${bad.length > 1 ? 'n' : ''} aussortiert.`, 'info', true);
  }

  // Glucken
  for (const a of living(s)) {
    if (a.broodingUntil && a.broodingUntil <= s.day && a.broodEggs.length) {
      const eggs = a.broodEggs;
      a.broodEggs = [];
      a.broodingUntil = 0;
      hatch(s, eggs, a, `Glucke ${a.name}`);
    }
    // Brütigkeit im Frühling/Sommer
    const se = season(s);
    if (a.sex === 'henne' && stage(s, a) === 'erwachsen' && !a.broodingUntil && a.broodyUntil < s.day && (se === 'fruehling' || se === 'sommer')) {
      const p = BREEDS[a.breed].broody * (a.personality === 'bruetig' ? 2 : 1) * 0.08;
      if (chance(s, p)) {
        a.broodyUntil = s.day + 3;
        log(s, `🪺 ${a.name} ist brütig geworden! Du kannst ihr in den nächsten 3 Tagen Bruteier unterlegen.`, 'good', true);
      }
    }
  }
}

function hatch(s: GameState, eggs: { breed: keyof typeof BREEDS; fertile: boolean }[], mother: Animal | undefined, where: string) {
  let n = 0;
  for (const e of eggs) {
    if (!e.fertile) continue;
    if (!chance(s, 0.9)) continue; // einige Küken schaffen den Schlupf nicht
    const c = createAnimal(s, e.breed, { ageDays: 0, history: `Geschlüpft (${where})`, motherId: mother?.id });
    s.animals.push(c);
    n++;
  }
  s.stats.hatched += n;
  if (n > 0) log(s, `🐣 ${n} Küken ${n > 1 ? 'sind' : 'ist'} geschlüpft (${where})!${!has(s, 'kuekenstation') && !mother ? ' Sie brauchen dringend eine Kükenstation mit Wärmelampe!' : ''}${(s.inventory.kuekenstarter ?? 0) < 1 ? ' Kükenstarter-Futter nicht vergessen!' : ''}`, 'good', true);
  else log(s, `🥚 Aus den Eiern (${where}) ist leider nichts geschlüpft.`, 'warn', true);
}

/* ================================================================== */
/* Tagesablauf                                                        */
/* ================================================================== */
function morning(s: GameState) {
  if (has(s, 'autoklappe') && !(eventActive(s, 'stallpflicht') && !has(s, 'netz'))) s.doorOpen = true;
  if (has(s, 'autofutter') && s.equip.feeder) {
    const type = (s.inventory.legemehl ?? 0) > 0 ? 'legemehl' : (s.inventory.koerner ?? 0) > 0 ? 'koerner' : null;
    if (type) {
      const amount = Math.min(feederCap(s) - s.feed, s.inventory[type]);
      if (amount > 0) {
        s.inventory[type] = round2(s.inventory[type] - amount);
        s.feed = round2(s.feed + amount);
        s.feedType = type;
      }
    } else if (flock(s).length) log(s, '⚙️ Die automatische Fütterung hat kein Futter mehr im Lager!', 'warn', true);
  }
}

function evening(s: GameState) {
  if (has(s, 'autoklappe')) s.doorOpen = false;
}

function layEggs(s: GameState) {
  const rooster = adultRoosters(s).length > 0;
  const se = season(s);
  const seasonF = { fruehling: 1.1, sommer: 1, herbst: 0.6, winter: 0.45 }[se];
  let laid = 0;
  for (const a of flock(s)) {
    if (a.sex !== 'henne' || stage(s, a) !== 'erwachsen' || a.broodingUntil > s.day) continue;
    const b = BREEDS[a.breed];
    let p = b.layRate * seasonF;
    if (b.coldHardy && se === 'winter') p *= 1.4;
    if (a.food < 50 || a.water < 50) p *= 0.3;
    if (a.health < 60) p *= 0.5;
    if (a.wellbeing < 40) p *= 0.6;
    if (a.conditions.some(c => c.severity > 40)) p *= 0.5;
    if (isSenior(s, a)) p *= 0.55;
    if (s.feedType === 'legemehl' && s.feed > 0) p *= 1.15;
    if (!chance(s, Math.min(0.97, p))) continue;
    a.eggsLaid++;
    laid++;
    s.stats.eggsTotal++;
    if (a.withdrawalUntil >= s.day) {
      s.blockedEggs++;
    } else if (rooster) {
      s.nestHatchEggs.push({ breed: a.breed, fertile: chance(s, 0.85) });
    } else {
      s.nestEggs[a.breed] = (s.nestEggs[a.breed] ?? 0) + 1;
    }
  }
  if (laid > 0 && s.stats.eggsTotal === laid) log(s, '🥚 Das allererste Ei liegt im Nest! Tippe auf die Eier, um sie einzusammeln.', 'good', true);
}

/* ================================================================== */
/* Raubtiere                                                          */
/* ================================================================== */
function hawkAlert(s: GameState) {
  if (!hensOutside(s) || flock(s).length === 0) return;
  const p = plot(s).hawk * diff(s).predator * (1 - hawkProtection(s) * 0.6);
  if (chance(s, p)) {
    s.hawkAlertDay = s.day;
    log(s, '🦅 Ein Habicht kreist über dem Hof! Schließ die Klappe, damit die Hühner im Stall bleiben.', 'warn', true);
  }
}

function hawkAttack(s: GameState) {
  if (s.hawkAlertDay !== s.day || !hensOutside(s)) return;
  const victims = flock(s).filter(a => stage(s, a) === 'junghuhn' || BREEDS[a.breed].weightHen < 3);
  if (!victims.length) return;
  if (chance(s, 0.65 * (1 - hawkProtection(s)))) {
    const v = pick(s, victims);
    die(s, v, 'vom Habicht geschlagen', true);
    report(s, `🦅 Der Habicht hat ${v.name} erwischt. (Greifvogelschutz: ${Math.round(hawkProtection(s) * 100)} %)`);
  } else {
    log(s, '🦅 Der Habicht ist ohne Beute abgezogen.', 'good', true);
  }
}

function nightPredators(s: GameState) {
  const d = diff(s);
  // Fuchs
  if (s.foxAlertDay === s.day) {
    const prot = foxProtection(s);
    const targets = flock(s);
    if (targets.length && chance(s, 0.75 * (1 - prot))) {
      // Über den Zaun gekommen – jetzt entscheidet der Stall
      const coopSafety = s.equip.coop ? ITEM[s.equip.coop].coopSafety ?? 0 : 0;
      const exposed = s.doorOpen || !s.equip.coop;
      if (exposed || chance(s, 1 - coopSafety)) {
        const n = Math.min(targets.length, exposed ? intBetween(s, 1, 3) : 1);
        const names: string[] = [];
        for (let i = 0; i < n; i++) {
          const v = pick(s, flock(s));
          names.push(v.name);
          die(s, v, 'vom Fuchs geholt', true);
        }
        const why = !s.equip.fence ? 'Es gibt keinen Zaun.' : s.doorOpen ? 'Die Klappe stand offen!' : 'Er kam durch den Zaun und in den Stall.';
        report(s, `🦊 Der Fuchs war da und hat ${names.join(', ')} geholt. ${why}`);
      } else {
        report(s, '🦊 Der Fuchs war im Gehege, aber der Stall war sicher verschlossen. Glück gehabt!');
      }
    } else if (targets.length) {
      log(s, `🦊 Der Fuchs hat es nicht durch den Zaun geschafft. (Fuchsschutz: ${Math.round(prot * 100)} %)`, 'good');
      s.report = [...(s.report ?? []), `🦊 Der Fuchs war in der Nacht da, ist aber nicht durch den Zaun gekommen. 💪`];
    }
    s.foxAlertDay = -1;
  }
  // Marder
  if (s.marderAlertDay === s.day && !marderSafe(s)) {
    const targets = [...flock(s), ...chicks(s)];
    if (targets.length && chance(s, 0.55 * d.predator)) {
      const v = pick(s, targets);
      die(s, v, 'vom Marder getötet', true);
      report(s, `🦡 Ein Marder ist in den Stall eingedrungen und hat ${v.name} getötet. Ein mardersicheres Gitter hilft.`);
    }
    s.marderAlertDay = -1;
  }
}

function report(s: GameState, text: string) {
  s.report = [...(s.report ?? []), text];
  log(s, text, 'bad');
}

/* ================================================================== */
/* Ereignisse                                                         */
/* ================================================================== */
function randomEvents(s: GameState) {
  if (s.day < 5) return;
  const r = rand(s);
  const se = season(s);
  if (r < 0.03) {
    if (eventActive(s, 'dorffest')) return;
    s.events.push({ id: 'dorffest', until: s.day + 2 });
    log(s, '🎪 Dorffest! Für 3 Tage zahlen die Leute auf dem Markt fast doppelt so viel für Eier.', 'good', true);
  } else if (r < 0.055) {
    if (eventActive(s, 'futterteuer')) return;
    s.events.push({ id: 'futterteuer', until: s.day + 4 });
    log(s, '📦 Lieferengpass beim Landhandel: Futter kostet 5 Tage lang 50 % mehr.', 'warn', true);
  } else if (r < 0.075) {
    if ((se !== 'herbst' && se !== 'winter') || eventActive(s, 'stallpflicht')) return;
    s.events.push({ id: 'stallpflicht', until: s.day + 6 });
    log(s, `📢 Stallpflicht wegen Vogelgrippe für 7 Tage! Die Hühner dürfen nicht in den offenen Auslauf${has(s, 'netz') ? '. Dein Volierennetz zählt als geschlossener Auslauf.' : '. Halte die Klappe geschlossen, sonst droht ein Bußgeld.'}`, 'warn', true);
  } else if (r < 0.085) {
    const b = pick(s, ['marans', 'brahma', 'seide', 'sussex'] as const);
    for (let i = 0; i < 4; i++) s.hatchEggs.push({ breed: b, fertile: chance(s, 0.8) });
    log(s, `👴 Opa Heinz schaut vorbei und schenkt dir 4 Bruteier der Rasse ${BREEDS[b].name}!`, 'good', true);
  }
}

function stallpflichtCheck(s: GameState) {
  if (!eventActive(s, 'stallpflicht') || has(s, 'netz') || !hensOutside(s) || !flock(s).length) return;
  if (chance(s, 0.35)) {
    addMoney(s, -40);
    log(s, '👮 Kontrolle vom Veterinäramt: Die Hühner waren trotz Stallpflicht draußen. Bußgeld 40 €.', 'bad', true);
  }
}

/* ================================================================== */
/* Markt                                                              */
/* ================================================================== */
export function refreshOffers(s: GameState) {
  s.offersDay = s.day;
  const offers: MarketOffer[] = [];
  const kinds: MarketOffer['kind'][] = ['brutei', 'kueken', 'junghenne', 'junghenne', 'legehenne', 'legehenne', 'hahn'];
  const n = intBetween(s, 6, 8);
  const breeds = Object.keys(BREEDS) as (keyof typeof BREEDS)[];
  for (let i = 0; i < n; i++) {
    const kind = i < 2 ? (i === 0 ? 'junghenne' : 'legehenne') : pick(s, kinds);
    const breed = i < 2 ? 'hybrid' : pick(s, breeds);
    const base = BREEDS[breed].prices[kind];
    const price = Math.max(1, Math.round(base * between(s, 0.85, 1.2) * 2) / 2);
    const qty = kind === 'brutei' ? intBetween(s, 6, 12) : kind === 'hahn' ? intBetween(s, 1, 2) : intBetween(s, 2, 6);
    const o: MarketOffer = { id: s.nextId++, kind, breed, price, qty, seller: pick(s, SELLERS) };
    if (kind === 'legehenne') {
      o.hiddenAge = intBetween(s, 40, 420);
      o.hiddenMites = chance(s, 0.25);
    }
    offers.push(o);
  }
  s.offers = offers;
}

/* ================================================================== */
/* Ziele                                                              */
/* ================================================================== */
export function checkGoals(s: GameState) {
  const tests: Record<string, () => boolean> = {
    zaun: () => !!s.equip.fence,
    stall: () => !!s.equip.coop,
    traenke: () => !!s.equip.drinker,
    futter: () => !!s.equip.feeder,
    huehner3: () => flock(s).length >= 3,
    eier10: () => s.stats.eggsSold >= 10,
    hahn: () => living(s).some(a => a.sex === 'hahn' && stage(s, a) !== 'kueken'),
    schlupf: () => s.stats.hatched >= 1,
    aufzucht: () => s.stats.juniorsRaised >= 1,
    fuchs50: () => foxProtection(s) >= 0.5,
    hofladen: () => has(s, 'hofladen'),
    sterne3: () => stars(s) >= 3 && flock(s).length >= 3,
    eier150: () => s.stats.eggsSold >= 150,
    tiere10: () => living(s).length >= 10,
  };
  let changed = false;
  for (const g of s.goals) {
    if (!g.done && tests[g.id]?.()) {
      g.done = true;
      changed = true;
      log(s, `✅ Ziel erreicht: ${g.text}`, 'good', true);
    }
  }
  if (changed && s.goals.length && s.goals.every(g => g.done)) {
    const ch = CHAPTERS[s.chapter];
    addMoney(s, ch.reward);
    log(s, `🏆 Kapitel ${s.chapter} „${ch.title}“ geschafft! Opa Heinz ist stolz und schenkt dir ${ch.reward} €.`, 'good', true);
    s.chapter++;
    s.goals = chapterGoals(s.chapter);
    if (CHAPTERS[s.chapter]) log(s, `📖 Kapitel ${s.chapter}: „${CHAPTERS[s.chapter].title}“ beginnt.`, 'info', true);
  }
}

/* ================================================================== */
/* Hilfsfunktionen                                                    */
/* ================================================================== */
function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}
