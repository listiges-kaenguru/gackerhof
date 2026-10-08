// Geflügelschau: einmal pro Jahreszeit. Bis zu drei Rassetiere werden angemeldet und von Preisrichtern bewertet.
import {
  BREEDS, DAYS_PER_SEASON, SEASON_NAMES, SHOW_DAY, SHOW_FEE, SHOW_GRADES, SHOW_MAX, SHOW_NOTICE, SHOW_TROPHY_PRIZE,
} from './data';
import {
  addMoney, age, breedLabel, dayOfSeason, isSenior, living, log, season, stage, stars,
} from './helpers';
import { intBetween } from './rng';
import type { Animal, GameState, ShowResult } from './types';

const SHOW_NAMES = { fruehling: 'Frühjahrsschau', sommer: 'Sommerschau', herbst: 'Herbstschau', winter: 'Winterschau' } as const;

/** Nächste Schau planen, falls keine ansteht */
export function ensureShow(s: GameState) {
  if (s.show && s.show.day >= s.day) return;
  let day = s.day - (dayOfSeason(s) - 1) + SHOW_DAY - 1;
  if (day < s.day || (day === s.day && s.hour >= 12)) day += DAYS_PER_SEASON;
  s.show = { day, title: showName(s, day, 1), level: 1, entries: [], announced: false };
}

function showName(s: GameState, day: number, level: 1 | 2) {
  const se = season({ ...s, day });
  return `${level === 2 ? 'Landes' : 'Kreis'}-${SHOW_NAMES[se]}`;
}

/** Tage bis zur Schau, null wenn noch nicht angekündigt */
export function showCountdown(s: GameState): number | null {
  return s.show?.announced ? s.show.day - s.day : null;
}

/** Ankündigung eine Woche vorher; ein guter Hof-Ruf öffnet die Landesschau */
export function announceShow(s: GameState) {
  ensureShow(s);
  const sh = s.show!;
  if (sh.announced || sh.day - s.day > SHOW_NOTICE) return;
  sh.announced = true;
  sh.level = stars(s) >= 4 ? 2 : 1;
  sh.title = showName(s, sh.day, sh.level);
  log(s, `🏆 ${sh.title} am Tag ${sh.day} (${SEASON_NAMES[season({ ...s, day: sh.day })]})! Du kannst bis zu ${SHOW_MAX} Rassetiere anmelden (Markt → Schau).${sh.level === 2 ? ' Dein guter Hof-Ruf bringt dich auf die Landesschau: doppelte Preise!' : ''}`, 'info', true);
}

/** Darf das Tier ausgestellt werden? Liefert sonst den Grund. */
export function showProblem(s: GameState, a: Animal): string | null {
  if (a.dead) return 'tot';
  if (!BREEDS[a.breed].showBreed) return 'Hybriden sind auf Rasseschauen nicht zugelassen';
  if (stage(s, a) !== 'erwachsen') return 'noch nicht ausgewachsen';
  if (a.conditions.length) return 'krank';
  if (a.withdrawalUntil >= s.day) return 'Medikamenten-Wartezeit';
  if (a.broodingUntil > s.day) return 'brütet gerade';
  return null;
}

/** Punkte ohne Glück der Preisrichter: 89 bis 97 bei bester Pflege */
export function showBasePoints(s: GameState, a: Animal): number {
  const b = BREEDS[a.breed];
  let p = 89;
  if (a.health >= 90) p += 2; else if (a.health >= 75) p += 1;
  if (a.wellbeing >= 80) p += 2; else if (a.wellbeing >= 60) p += 1;
  const r = a.weight / (a.sex === 'hahn' ? b.weightRooster : b.weightHen);
  if (r >= 0.95 && r <= 1.12) p += 2; else if (r >= 0.88) p += 1;
  if (isSenior(s, a)) p -= 1; else if (age(s, a) <= 240) p += 1;
  if (s.cleanliness >= 60) p += 1; // sauberes Gefieder
  return p;
}

export function gradeFor(points: number) {
  return SHOW_GRADES.find(g => points >= g.min)!;
}

export function toggleShowEntry(s: GameState, id: number): { ok: boolean; msg: string } {
  ensureShow(s);
  const sh = s.show!;
  if (!sh.announced) return { ok: false, msg: 'Die Anmeldung öffnet eine Woche vor der Schau.' };
  const a = s.animals.find(x => x.id === id);
  if (!a) return { ok: false, msg: 'Tier nicht gefunden.' };
  if (sh.entries.includes(id)) {
    sh.entries = sh.entries.filter(x => x !== id);
    addMoney(s, SHOW_FEE);
    return { ok: true, msg: `${a.name} abgemeldet. Standgeld ${SHOW_FEE} € zurück.` };
  }
  const why = showProblem(s, a);
  if (why) return { ok: false, msg: `${a.name} kann nicht ausgestellt werden: ${why}.` };
  if (sh.entries.length >= SHOW_MAX) return { ok: false, msg: `Höchstens ${SHOW_MAX} Tiere pro Schau.` };
  if (s.money < SHOW_FEE) return { ok: false, msg: `Das Standgeld kostet ${SHOW_FEE} €. Nicht genug Geld.` };
  addMoney(s, -SHOW_FEE);
  sh.entries.push(id);
  return { ok: true, msg: `${a.name} ist für die ${sh.title} angemeldet (Standgeld ${SHOW_FEE} €).` };
}

/** Schautag, 12 Uhr: Preisrichter bewerten, Preise und Pokal vergeben */
export function runShow(s: GameState) {
  const sh = s.show;
  if (!sh || sh.day !== s.day) return;
  const results: ShowResult[] = [];
  for (const id of sh.entries) {
    const a = s.animals.find(x => x.id === id);
    if (!a || showProblem(s, a)) continue;
    const points = Math.min(97, showBasePoints(s, a) + intBetween(s, -1, 1));
    const g = gradeFor(points);
    results.push({ animalId: a.id, name: a.name, breed: a.breed, variant: a.variant, points, grade: g.grade, prize: g.prize * sh.level, trophy: false });
  }
  const best = [...results].sort((x, y) => y.points - x.points)[0];
  if (best && best.points >= 97) {
    best.trophy = true;
    best.prize += SHOW_TROPHY_PRIZE * sh.level;
    s.trophies ??= [];
    s.trophies.push({ day: s.day, title: sh.title, animal: best.name, breed: best.breed, variant: best.variant });
  }
  const total = results.reduce((t, r) => t + r.prize, 0);
  if (total) addMoney(s, total);
  if (results.length) {
    s.lastShow = { title: sh.title, day: s.day, results };
    const lines = results.map(r => {
      const g = gradeFor(r.points);
      return `${r.trophy ? '🏆' : g.prize ? '🎀' : '📋'} ${r.name} (${breedLabel(r.breed, r.variant)}): ${r.points} Punkte, „${g.name}“ (${g.grade})${r.prize ? `, ${r.prize} €` : ''}`;
    });
    log(s, `🏆 ${sh.title}: ${lines.join(' · ')}`, 'good');
    s.celebrations.push({
      emoji: best?.trophy ? '🏆' : '🎀',
      title: best?.trophy ? `Pokal auf der ${sh.title}!` : `Ergebnis der ${sh.title}`,
      lines: [
        ...lines,
        total ? `💰 Preisgeld zusammen: ${total} €` : 'Diesmal gab es kein Preisgeld. Gesunde, zufriedene Tiere mit gutem Gewicht schneiden besser ab.',
        best?.trophy ? `🏆 ${best.name} ist das beste Tier der Schau. Der Pokal steht jetzt auf deinem Hof.` : 'Für einen Pokal braucht ein Tier 97 Punkte („vorzüglich“).',
      ],
    });
  } else if (sh.entries.length) {
    log(s, `🏆 ${sh.title}: Keines der angemeldeten Tiere durfte antreten.`, 'warn', true);
  } else if (living(s).some(a => !showProblem(s, a))) {
    log(s, `🏆 Heute war die ${sh.title}. Beim nächsten Mal kannst du deine Rassetiere anmelden.`, 'info');
  }
  s.show = undefined;
  ensureShow(s);
}
