// Die Simulation läuft in Spielstunden. advanceHour() ist der einzige Taktgeber.
import {
  AGE, BREEDS, CONDITIONS, CUSTOMERS, ITEM, SEASON_LAY, SEASON_LAY_LIGHT, SEASON_NAMES, SELLERS, SOUP_AGE,
} from './data';
import { registerAlbum } from './album';
import {
  addMoney, adultRoosters, age, autoWater, breedLabel, chicks, contactFactor, crowding, dayOfSeason, defaultFeed, diff,
  drinkerCap, eventActive, feederCap, flock, foxProtection, freezes, frozen, has, hawkProtection, herbsActive,
  ICE_FREE_HOURS, immune, insulated, isNight, isSenior, lightActive, living, lockedOut, log, marderSafe, maxInside,
  minuteOfDay, outsideAnimals, outTime, pastureWormFactor, plot, ratSafe, roostArrival, round2, season, shade, stage, stars,
  worstCondition,
} from './helpers';
import { between, chance, intBetween, pick, rand } from './rng';
import { announceShow, ensureShow, runShow } from './show';
import { chapterGoals, CHAPTERS, createAnimal, randomVariant, targetWeight } from './state';
import type { Animal, BreedId, ConditionId, GameState, HatchEgg, MarketOffer, Order, Season } from './types';

/** Feinster Takt: eine Spielminute. Die Hühner bewegen sich minutengenau, alles andere läuft stündlich. */
export function advanceMinute(s: GameState) {
  if (s.gameOver) return;
  const m = (s.minute ?? 0) + 1;
  if (m >= 60) {
    advanceHour(s);
  } else {
    s.minute = m;
    moveFlock(s);
  }
}

/** Eine volle Spielstunde weiter (setzt die Minute auf 0) */
export function advanceHour(s: GameState) {
  if (s.gameOver) return;
  s.minute = 0;
  s.hour++;
  if (s.hour >= 24) {
    s.hour = 0;
    s.day++;
    newDay(s);
  }
  moveFlock(s);
  hourly(s);
  switch (s.hour) {
    case 6: morning(s); break;
    case 8: layEggs(s); break;
    case 10: hawkAlert(s); break;
    case 12: runShow(s); break;
    case 14: hawkAttack(s); stallpflichtCheck(s); break;
    case 19: if (s.day <= 5 && s.doorOpen && !has(s, 'autoklappe') && flock(s).length) log(s, '🌇 Es dämmert. Denk daran, abends die Hühnerklappe zu schließen!', 'warn', true); break;
    case 21: roost(s); evening(s); break;
    case 23: nightPredators(s); break;
  }
  checkGoals(s);
}

/* ================================================================== */
/* Stündlich: Bedürfnisse                                             */
/* ================================================================== */
function hourly(s: GameState) {
  const d = diff(s);
  const night = isNight(s.hour);
  const hot = s.temperature >= 28;
  const cold = s.temperature <= 2;
  const iced = frozen(s);
  const sunny = hot && !shade(s);
  const rate = (night ? 0.35 : 1) * d.needDecay;
  if (autoWater(s) && s.equip.drinker) s.water = drinkerCap(s);

  // Ratten und Spatzen bedienen sich an offenen Futterstellen
  if (s.feed > 0 && !night && !ratSafe(s)) {
    const loss = s.equip.feeder === 'trog' ? 0.035 : 0.015;
    s.feed = Math.max(0, s.feed - s.feed * loss);
  }

  const crowd = crowding(s);
  // Zu viele Hähne für die Hennen: Rangkämpfe. Ändert sich nur, wenn ein Tier stirbt.
  const roosterFights = () => adultRoosters(s).length > Math.max(1, Math.ceil(flock(s).filter(x => x.sex === 'henne').length / 8));
  let fights = roosterFights();
  for (const a of living(s)) {
    const st = stage(s, a);
    const freezing = chickFreezing(s, a); // friert ohne Wärmelampe oder Glucke
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
    if (freezing) dh -= 2.2;
    if (sunny && !night && a.outside) dh -= 0.6;
    if (night && a.outside && s.temperature < 8) dh -= 0.4; // ausgesperrt in der kalten Nacht
    if (isSenior(s, a)) dh -= 0.05;
    if (dh === 0 && a.food > 50 && a.water > 50) dh = 0.6;
    a.health = clamp(a.health + dh);

    // Wohlbefinden strebt einem Zielwert entgegen
    let target = 80;
    if (crowd > 1) target -= 25 * Math.min(2, crowd - 1 + 0.5);
    if (s.cleanliness < 40) target -= 15;
    if (!a.outside && !night && st !== 'kueken') target -= 15; // eingesperrt
    if (night && a.outside) target -= 30; // ausgesperrt
    if (freezing) target -= 30;
    if (a.food < 40 || a.water < 40) target -= 20;
    if (a.conditions.some(c => c.id === 'milben')) target -= 15;
    if (sunny) target -= 10;
    if (fights) target -= 15;
    a.wellbeing = clamp(a.wellbeing + Math.sign(target - a.wellbeing) * Math.min(2, Math.abs(target - a.wellbeing)));

    if (a.health <= 0) {
      if (d.lastChance && !a.lastChanceUsed) {
        a.lastChanceUsed = true;
        a.health = 12;
        log(s, `⚠️ ${a.name} ist sehr schwach. Letzte Chance: Bitte sofort versorgen und behandeln!`, 'bad', true);
      } else {
        die(s, a, causeOfDeath(a));
        fights = roosterFights();
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
  const worst = worstCondition(a);
  if (worst) return `an ${CONDITIONS[worst.id].name} gestorben`;
  return 'an Schwäche gestorben';
}
const motherCares = (s: GameState, a: Animal) =>
  a.motherId != null && s.animals.some(m => m.id === a.motherId && !m.dead);
/** Küken brauchen Wärme: Kükenstation mit Wärmelampe oder eine Glucke */
export const chickFreezing = (s: GameState, a: Animal) =>
  !a.dead && stage(s, a) === 'kueken' && !has(s, 'kuekenstation') && !motherCares(s, a);

/**
 * Wo sind die Hühner? Tagsüber gehen sie durch die offene Klappe in den Auslauf,
 * in der Dämmerung von selbst zurück in den Stall – aber nur, wenn die Klappe offen ist.
 */
export function moveFlock(s: GameState) {
  const t = minuteOfDay(s);
  const all = flock(s);
  let inside = all.filter(a => !a.outside).length;
  const cap = maxInside(s);
  for (const a of all) {
    if (a.broodingUntil > s.day || !s.equip.coop || !s.equip.fence) {
      if (a.outside) inside++;
      a.outside = false;
      continue;
    }
    // Klappe zu: Wer drinnen ist, bleibt drinnen; wer draußen ist, bleibt ausgesperrt
    if (!s.doorOpen) continue;
    const wantsOut = t >= outTime(a) && t < roostArrival(a) && t >= 6 * 60;
    if (wantsOut && !a.outside) {
      a.outside = true;
      inside--;
    } else if (!wantsOut && a.outside && (t >= roostArrival(a) || t < 6 * 60)) {
      // angekommen – aber nur, wenn noch Platz im Stall ist
      if (inside < cap) {
        a.outside = false;
        inside++;
      }
    }
  }
}

function roost(s: GameState) {
  const out = outsideAnimals(s);
  if (!out.length) return;
  const names = (list: Animal[]) => (list.length === 1 ? `${list[0].name} steht` : `${list.length} Hühner stehen`);
  if (s.doorOpen) {
    log(s, `🏠 Der Stall ist voll! ${names(out)} draußen und ${out.length === 1 ? 'muss' : 'müssen'} die Nacht im Freien verbringen. Mehr als ${maxInside(s)} Tiere passen nicht hinein.`, 'bad', true);
  } else {
    log(s, `🚪 ${names(out)} vor der verschlossenen Klappe und ${out.length === 1 ? 'kommt' : 'kommen'} nicht in den Stall! Klappe öffnen oder mit Futter reinlocken.`, 'bad', true);
  }
}

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
/** Durchschnittstemperatur je Jahreszeit (°C) */
const SEASON_TEMP: Record<Season, number> = { fruehling: 12, sommer: 24, herbst: 10, winter: 0 };

function newDay(s: GameState) {
  const d = diff(s);
  // Monatsabrechnung
  for (const id of [...s.extras, ...Object.values(s.equip)]) {
    if (id === 'stalllicht' && !lightActive(s)) continue; // Zeitschaltuhr: Strom nur im Herbst und Winter
    if (id && ITEM[id]?.power) s.pendingCosts += ITEM[id].power!;
  }
  if (dayOfSeason(s) === 1) {
    const rent = plot(s).rent;
    const costs = round2(rent + s.pendingCosts);
    addMoney(s, -costs);
    log(s, `📅 Monatsabrechnung: Pacht ${rent} € + Strom/Wasser ${s.pendingCosts.toFixed(2)} € = ${costs.toFixed(2)} €`, 'info', true);
    s.pendingCosts = 0;
    log(s, `🍂 Der ${SEASON_NAMES[season(s)]} beginnt.`, 'info', true);
  }

  // Wetter
  s.temperature = Math.round(SEASON_TEMP[season(s)] + between(s, -6, 7));
  if (s.temperature >= 30) log(s, `🥵 Hitzewelle: ${s.temperature} °C. Die Hühner brauchen viel Wasser und Schatten.`, 'warn', true);
  if (freezes(s) && s.equip.drinker) log(s, `🥶 Frost: ${s.temperature} °C. Die Tränke friert ein. Hack morgens das Eis auf und füll frisches Wasser ein, dann können die Hühner etwa ${ICE_FREE_HOURS} Stunden trinken. Eine beheizte Tränke friert nicht ein.`, 'warn', true);

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
      registerAlbum(s, a);
    }
    if (ad === AGE.erwachsen) log(s, `🎉 ${a.name} ist erwachsen${a.sex === 'henne' ? ' und legt bald Eier' : ''}.`, 'good', true);
    if (ad === AGE.senior) log(s, `👵 ${a.name} kommt in die Jahre. Die Legeleistung lässt nach.`, 'info');
    a.weight = round2(a.weight + (targetWeight(s, a) - a.weight) * 0.3 - (a.food < 30 ? 0.05 : 0));
    if (ad >= a.maxAge) die(s, a, 'Altersschwäche');
  }

  pasture(s);
  diseases(s);
  brooding(s);
  const cold = chicks(s).filter(a => chickFreezing(s, a));
  if (cold.length) log(s, `🥶 ${cold.length} Küken frieren ohne Wärmelampe und werden schwächer! Eine Kükenstation hilft.`, 'bad', true);

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
  orders(s);
  ensureShow(s);
  announceShow(s);

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
      earned += n * s.eggPrice * 1.5 * BREEDS[k as BreedId].eggValue * d.sellBonus;
    }
    if (sold) {
      addMoney(s, round2(earned));
      s.stats.eggsSold += sold;
      log(s, `🏪 Hofladen: ${sold} Eier für ${earned.toFixed(2)} € verkauft.`, 'good');
    }
  }

  // Nur Todesfälle der letzten 30 Tage zählen für den Hof-Ruf
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
      log(s, '👴 Opa Heinz hilft aus: „Hier sind 200 €. Zahl sie zurück, wenn es wieder läuft.“ (zinslos)', 'info');
      s.celebrations.push({ emoji: '👴', title: 'Opa Heinz hilft aus', lines: ['„Dein Konto ist im Minus. Hier sind 200 €. Zahl sie zurück, wenn es wieder läuft.“', 'Der Kredit ist zinslos. Zurückzahlen kannst du unter „Mehr → Finanzen“.', 'Diese Hilfe gibt es nur einmal!'] });
    } else {
      addMoney(s, 300);
      s.debt += 330;
      log(s, '🏦 Die Bank gibt dir einen Kredit über 300 € (Rückzahlung 330 €).', 'info');
      s.celebrations.push({ emoji: '🏦', title: 'Bankkredit', lines: ['Dein Konto ist im Minus. Die Bank gibt dir einen Kredit über 300 €.', 'Zurückzuzahlen sind 330 €. Einen weiteren Kredit gibt es nicht.'] });
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
  if (a.conditions.some(x => x.id === id) || immune(s, a, id)) return;
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
  // Überbelegung: Krankheiten breiten sich deutlich schneller aus
  const crowdF = crowd > 1 ? 1 + (crowd - 1) * 5 : 1;
  const herbs = herbsActive(s);
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
    let pWurm = 0.01 * wet * (s.cleanliness < 40 ? 1.8 : 1) * mobil * pastureWormFactor(s);
    // Ein gedämmter, zugfreier Stall hebt den Nachteil von Herbst, Winter, Kälte und zugiger Holzkiste auf
    const warm = insulated(s);
    let pSchnupfen = 0.006 * wet * (se === 'herbst' || se === 'winter' ? (warm ? 1 : 2) : 1) * (s.temperature < 3 && !warm ? 1.5 : 1)
      * (s.equip.coop === 'kiste' && !warm ? 1.6 : 1) * (herbs ? 0.4 : 1) * crowdF;
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
  // Ansteckung: in großen Herden wächst die Zahl der engen Kontakte nur mit der Wurzel der Herdengröße
  for (const a of all) {
    for (const c of [...a.conditions]) {
      const def = CONDITIONS[c.id];
      const others = all.filter(b => b !== a && (c.id === 'kokzidiose') === (stage(s, b) === 'kueken'));
      const contact = contactFactor(others.length);
      const resist = c.id === 'schnupfen' && herbs ? 0.4 : 1;
      for (const b of others) {
        if (chance(s, def.contagious * (c.severity / 100) * d.disease * 0.5 * contact * resist)) addCondition(s, b, c.id, 5);
      }
    }
  }
}

/* ================================================================== */
/* Weide                                                              */
/* ================================================================== */
/**
 * Scharrende Hühner zertreten das Gras, Wurmeier sammeln sich im Boden.
 * Mit Wechselweide erholt sich die ruhende Hälfte, das Hühnermobil zieht ohnehin auf frisches Gras um.
 */
function pasture(s: GameState) {
  s.pasture ??= [100, 100];
  const n = s.equip.fence ? flock(s).length : 0;
  const rotate = has(s, 'wechselweide');
  const active = rotate ? s.pastureSide ?? 0 : 0;
  const regrow = season(s) === 'winter' ? 0.5 : 1;
  const wear = n ? (1.2 + 0.25 * n) * (crowding(s) > 1 ? 1.5 : 1) * Math.sqrt(plot(s).wet) * (s.equip.coop === 'mobil' ? 0.5 : 1) : 0;
  for (const side of [0, 1] as const) {
    const p = s.pasture[side];
    if (side === active) s.pasture[side] = clamp(p - wear + 1 * regrow);
    else if (rotate) s.pasture[side] = clamp(p + 4 * regrow);
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
    if (e.hatchDay - s.day <= AGE.brut - 3) e.candled = true;
  }
  const isBad = (e: HatchEgg & { candled: boolean }) => e.candled && !e.fertile;
  const bad = s.incubator.filter(isBad);
  if (bad.length) {
    s.incubator = s.incubator.filter(e => !isBad(e));
    log(s, `🔦 Schieren: ${bad.length} Ei${bad.length > 1 ? 'er waren' : ' war'} unbefruchtet und wurde${bad.length > 1 ? 'n' : ''} aussortiert.`, 'info', true);
  }

  // Glucken; brütig werden Hennen nur im Frühling und Sommer
  const broodySeason = season(s) === 'fruehling' || season(s) === 'sommer';
  for (const a of living(s)) {
    if (a.broodingUntil && a.broodingUntil <= s.day && a.broodEggs.length) {
      const eggs = a.broodEggs;
      a.broodEggs = [];
      a.broodingUntil = 0;
      hatch(s, eggs, a, `Glucke ${a.name}`);
    }
    if (broodySeason && a.sex === 'henne' && stage(s, a) === 'erwachsen' && !a.broodingUntil && a.broodyUntil < s.day) {
      const p = BREEDS[a.breed].broody * (a.personality === 'bruetig' ? 2 : 1) * 0.08;
      if (chance(s, p)) {
        a.broodyUntil = s.day + 3;
        log(s, `🪺 ${a.name} ist brütig geworden! Du kannst ihr in den nächsten 3 Tagen Bruteier unterlegen.`, 'good', true);
      }
    }
  }
}

function hatch(s: GameState, eggs: HatchEgg[], mother: Animal | undefined, where: string) {
  let n = 0;
  for (const e of eggs) {
    if (!e.fertile) continue;
    if (!chance(s, 0.9)) continue; // einige Küken schaffen den Schlupf nicht
    const c = createAnimal(s, e.breed, { ageDays: 0, history: `Geschlüpft (${where})`, motherId: mother?.id, variant: e.variant ?? randomVariant(s, e.breed) });
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
    const type = defaultFeed(s);
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
  const roosters = adultRoosters(s).length;
  // Befruchtungsquote: Ein Hahn schafft gut 10 Hennen
  const hens = flock(s).filter(a => a.sex === 'henne' && stage(s, a) === 'erwachsen').length;
  const fertility = Math.min(0.9, (0.9 * roosters * 10) / Math.max(1, hens));
  const se = season(s);
  // Stalllicht verlängert im Herbst und Winter den Tag
  const seasonF = (lightActive(s) && SEASON_LAY_LIGHT[se]) || SEASON_LAY[se];
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
    } else if (roosters) {
      s.nestHatchEggs.push({ breed: a.breed, variant: chickVariant(s, a), fertile: chance(s, fertility) });
    } else {
      s.nestEggs[a.breed] = (s.nestEggs[a.breed] ?? 0) + 1;
    }
  }
  if (laid > 0 && s.stats.eggsTotal === laid) log(s, '🥚 Das allererste Ei liegt im Nest! Tippe auf die Eier, um sie einzusammeln.', 'good', true);
}

/** Farbe der Küken: von Mutter oder Vater (gleiche Rasse), selten eine Überraschung */
function chickVariant(s: GameState, hen: Animal): string {
  if (chance(s, 0.05)) return randomVariant(s, hen.breed, true);
  const fallback = BREEDS[hen.breed].variants[0].id;
  const fathers = adultRoosters(s).filter(r => r.breed === hen.breed);
  if (!fathers.length || chance(s, 0.5)) return hen.variant ?? fallback;
  return pick(s, fathers).variant ?? fallback;
}

/* ================================================================== */
/* Raubtiere                                                          */
/* ================================================================== */
function hawkAlert(s: GameState) {
  if (outsideAnimals(s).length === 0) return;
  const p = plot(s).hawk * diff(s).predator * (1 - hawkProtection(s) * 0.6);
  if (chance(s, p)) {
    s.hawkAlertDay = s.day;
    log(s, '🦅 Ein Habicht kreist über dem Hof! Locke die Hühner mit Futter in den Stall.', 'warn', true);
  }
}

function hawkAttack(s: GameState) {
  if (s.hawkAlertDay !== s.day) return;
  const victims = outsideAnimals(s).filter(a => stage(s, a) === 'junghuhn' || BREEDS[a.breed].weightHen < 3);
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
      // Über den Zaun gekommen – jetzt entscheidet der Stall:
      // offene Klappe oder kein Stall: alle in Gefahr; ausgesperrte Hühner zuerst; sonst kann er einbrechen
      const coopSafety = s.equip.coop ? ITEM[s.equip.coop].coopSafety ?? 0 : 0;
      const outside = lockedOut(s);
      let pool: Animal[] | null = null;
      let max = 1;
      if (s.doorOpen || !s.equip.coop) { pool = targets; max = intBetween(s, 1, 3); }
      else if (outside.length) { pool = outside; max = intBetween(s, 1, 3); }
      else if (chance(s, 1 - coopSafety)) pool = targets;
      if (pool) {
        const n = Math.min(pool.length, max);
        const names: string[] = [];
        for (let i = 0; i < n; i++) {
          const v = pick(s, pool.filter(a => !a.dead));
          names.push(v.name);
          die(s, v, 'vom Fuchs geholt', true);
        }
        const why = !s.equip.fence ? 'Es gibt keinen Zaun.' : s.doorOpen ? 'Die Klappe stand offen!'
          : outside.length ? 'Die Hühner waren ausgesperrt und saßen draußen vor der Klappe.' : 'Er kam durch den Zaun und in den Stall.';
        report(s, `🦊 Der Fuchs war da und hat ${names.join(', ')} geholt. ${why}`);
      } else {
        report(s, '🦊 Der Fuchs war im Gehege, aber der Stall war sicher verschlossen. Glück gehabt!');
      }
    } else if (targets.length) {
      log(s, `🦊 Der Fuchs hat es nicht durch den Zaun geschafft. (Fuchsschutz: ${Math.round(prot * 100)} %)`, 'good');
      addReport(s, '🦊 Der Fuchs war in der Nacht da, ist aber nicht durch den Zaun gekommen. 💪');
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

/** Zeile für den Morgenbericht */
function addReport(s: GameState, text: string) {
  s.report = [...(s.report ?? []), text];
}
/** Schlimme Nachricht: in den Morgenbericht und ins Tagebuch */
function report(s: GameState, text: string) {
  addReport(s, text);
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
    log(s, '🎪 Dorffest! Für 3 Tage zahlen die Leute auf dem Markt fast doppelt so viel für Eier.', 'good');
    s.celebrations.push({ emoji: '🎪', title: 'Dorffest!', lines: ['Im Dorf wird 3 Tage lang gefeiert.', '🥚 Die Leute zahlen auf dem Markt fast doppelt so viel für Eier.', 'Tipp: Sammle jetzt fleißig Eier und verkaufe sie, solange das Fest läuft.'] });
  } else if (r < 0.055) {
    if (eventActive(s, 'futterteuer')) return;
    s.events.push({ id: 'futterteuer', until: s.day + 4 });
    log(s, '📦 Lieferengpass beim Landhandel: Futter kostet 5 Tage lang 50 % mehr.', 'warn');
    s.celebrations.push({ emoji: '📦', title: 'Lieferengpass beim Landhandel', lines: ['Futter (Körner, Legemehl, Kükenstarter) kostet 5 Tage lang 50 % mehr.', 'Tipp: Wer noch Vorrat im Lager hat, ist jetzt fein raus. Sonst nur kleine Mengen kaufen.'] });
  } else if (r < 0.075) {
    if ((se !== 'herbst' && se !== 'winter') || eventActive(s, 'stallpflicht')) return;
    s.events.push({ id: 'stallpflicht', until: s.day + 6 });
    log(s, `📢 Stallpflicht wegen Vogelgrippe für 7 Tage! Die Hühner dürfen nicht in den offenen Auslauf${has(s, 'netz') ? '. Dein Volierennetz zählt als geschlossener Auslauf.' : '. Halte die Klappe geschlossen, sonst droht ein Bußgeld.'}`, 'warn');
    s.celebrations.push({ emoji: '📢', title: 'Stallpflicht wegen Vogelgrippe', lines: [
      'Das Veterinäramt ordnet für 7 Tage Stallpflicht an: Die Hühner dürfen nicht in den offenen Auslauf.',
      has(s, 'netz') ? '✅ Dein Volierennetz zählt als geschlossener Auslauf. Du musst nichts tun.' : '🚪 Halte die Klappe geschlossen (Hühner vorher reinlocken). Bei einer Kontrolle droht sonst ein Bußgeld von 40 €.',
      'Eingesperrte Hühner sind etwas unglücklicher. Das legt sich nach der Stallpflicht wieder.',
    ] });
  } else if (r < 0.085) {
    const b = pick(s, ['marans', 'brahma', 'seide', 'sussex'] as const);
    const variant = randomVariant(s, b, true);
    for (let i = 0; i < 4; i++) s.hatchEggs.push({ breed: b, variant, fertile: chance(s, 0.8) });
    log(s, `👴 Opa Heinz schaut vorbei und schenkt dir 4 Bruteier: ${breedLabel(b, variant)}!`, 'good');
    s.celebrations.push({ emoji: '🎁', title: 'Geschenk von Opa Heinz', lines: [`„Ich hab dir 4 Bruteier mitgebracht: ${breedLabel(b, variant)}. Mal sehen, was da schlüpft!“`, 'Du findest sie im Lager. Ausbrüten kannst du sie im Brutapparat oder unter einer brütigen Henne.'] });
  }
}

/* ================================================================== */
/* Kundenaufträge                                                     */
/* ================================================================== */
function orders(s: GameState) {
  s.orders ??= [];
  // abgelaufene Aufträge
  for (const o of s.orders.filter(x => x.dueDay < s.day)) {
    log(s, `📋 Auftrag verpasst: ${o.customer} hat sich anderswo eingedeckt.`, 'warn', true);
  }
  s.orders = s.orders.filter(x => x.dueDay >= s.day);
  const f = flock(s);
  if (s.day < 4 || s.orders.length >= 3 || !f.length) return;
  // Ein guter Ruf bringt mehr Kundschaft, und sie zahlt besser
  const st = stars(s);
  if (!chance(s, 0.15 + st * 0.05)) return;
  const kinds: Order['kind'][] = ['eier', 'eier', 'eier', 'junghenne', 'suppenhuhn'];
  if (f.some(a => stage(s, a) !== 'erwachsen')) kinds.push('junghenne');
  if (f.some(a => a.sex === 'henne' && age(s, a) >= SOUP_AGE)) kinds.push('suppenhuhn', 'suppenhuhn');
  const kind = pick(s, kinds);
  const bonus = 1 + (st - 3) * 0.1;
  const o = { id: s.nextId++, customer: pick(s, CUSTOMERS[kind]), kind, qty: 0, reward: 0, dueDay: 0 };
  if (kind === 'eier') {
    o.qty = intBetween(s, 1, 5) * 6;
    o.reward = Math.round(o.qty * 0.5 * between(s, 1.5, 1.9) * bonus);
    o.dueDay = s.day + intBetween(s, 3, 6);
  } else if (kind === 'junghenne') {
    o.qty = intBetween(s, 1, 3);
    o.reward = Math.round(o.qty * between(s, 26, 34) * bonus);
    o.dueDay = s.day + intBetween(s, 6, 12);
  } else {
    o.qty = intBetween(s, 1, 2);
    o.reward = Math.round(o.qty * between(s, 13, 17) * bonus);
    o.dueDay = s.day + intBetween(s, 4, 8);
  }
  s.orders.push(o);
  const plural = o.qty > 1;
  const what = { eier: `${o.qty} Eier`, junghenne: `${o.qty} Junghenne${plural ? 'n' : ''}`, suppenhuhn: `${o.qty} ${plural ? 'Suppenhühner' : 'Suppenhuhn'}` }[kind];
  log(s, `📋 Neuer Auftrag: ${o.customer} möchte ${what} für ${o.reward} € (bis Tag ${o.dueDay}).`, 'good', true);
}

function stallpflichtCheck(s: GameState) {
  if (!eventActive(s, 'stallpflicht') || has(s, 'netz') || !outsideAnimals(s).length) return;
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
  const n = intBetween(s, 7, 9);
  const breeds = Object.keys(BREEDS) as BreedId[];
  // Jede Woche fest dabei: Junghenne und Legehenne (Legehybride) sowie ein Hahn und Bruteier
  // in wechselnder Rasse. Der Rest ist Zufall.
  const fixed: [MarketOffer['kind'], BreedId | null][] = [
    ['junghenne', 'hybrid'], ['legehenne', 'hybrid'], ['hahn', null], ['brutei', null],
  ];
  for (let i = 0; i < n; i++) {
    const kind = i < fixed.length ? fixed[i][0] : pick(s, kinds);
    const breed = (i < fixed.length ? fixed[i][1] : null) ?? pick(s, breeds);
    const base = BREEDS[breed].prices[kind];
    const price = Math.max(1, Math.round(base * between(s, 0.85, 1.2) * 2) / 2);
    const qty = kind === 'brutei' ? intBetween(s, 6, 12) : kind === 'hahn' ? intBetween(s, 1, 2) : intBetween(s, 2, 6);
    const o: MarketOffer = { id: s.nextId++, kind, breed, variant: randomVariant(s, breed), price, qty, seller: pick(s, SELLERS) };
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
const GOAL_TESTS: Record<string, (s: GameState) => boolean> = {
  zaun: s => !!s.equip.fence,
  stall: s => !!s.equip.coop,
  traenke: s => !!s.equip.drinker,
  futter: s => !!s.equip.feeder,
  huehner3: s => flock(s).length >= 3,
  eier10: s => s.stats.eggsSold >= 10,
  hahn: s => living(s).some(a => a.sex === 'hahn' && stage(s, a) !== 'kueken'),
  schlupf: s => s.stats.hatched >= 1,
  aufzucht: s => s.stats.juniorsRaised >= 1,
  fuchs50: s => foxProtection(s) >= 0.5,
  hofladen: s => has(s, 'hofladen'),
  sterne3: s => stars(s) >= 3 && flock(s).length >= 3,
  eier150: s => s.stats.eggsSold >= 150,
  tiere10: s => living(s).length >= 10,
};

export function checkGoals(s: GameState) {
  let changed = false;
  for (const g of s.goals) {
    if (!g.done && GOAL_TESTS[g.id]?.(s)) {
      g.done = true;
      changed = true;
      log(s, `✅ Ziel erreicht: ${g.text}`, 'good');
      s.banners.push(g.text);
    }
  }
  if (changed && s.goals.length && s.goals.every(g => g.done)) {
    const ch = CHAPTERS[s.chapter];
    addMoney(s, ch.reward);
    log(s, `🏆 Kapitel ${s.chapter} „${ch.title}“ geschafft! Opa Heinz ist stolz und schenkt dir ${ch.reward} €.`, 'good');
    const done = s.chapter;
    s.chapter++;
    s.goals = chapterGoals(s.chapter);
    const next = CHAPTERS[s.chapter];
    if (next) log(s, `📖 Kapitel ${s.chapter}: „${next.title}“ beginnt.`, 'info');
    s.celebrations.push({
      emoji: '🏆',
      title: `Kapitel ${done} geschafft!`,
      lines: [
        `„${ch.title}“: alle Ziele erreicht.`,
        `👴 Opa Heinz: „Donnerwetter, ich bin stolz auf dich! Hier, ${ch.reward} € für deinen Hof.“`,
        `💰 +${ch.reward} € wurden deinem Konto gutgeschrieben.`,
        ...(next ? [`📖 Weiter geht's mit Kapitel ${s.chapter}: „${next.title}“`, ...next.goals.map(([, t]) => `⬜ ${t}`)] : ['🎉 Das waren alle Kapitel dieser Version!']),
      ],
    });
  }
}

/* ================================================================== */
/* Hilfsfunktionen                                                    */
/* ================================================================== */
function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}
