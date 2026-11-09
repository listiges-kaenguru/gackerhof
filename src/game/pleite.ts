// Geldnot: Kredit, Pleite-Zähler, Warnung von Opa Heinz und Game Over („zurück ins Büro“).
// checkBroke() läuft einmal am Tag beim Tageswechsel.
import { diff, isSenior, living, log, monthResult, stage, addMoney } from './helpers';
import type { GameState } from './types';

/** Nach so vielen Tagen am Stück im Minus warnt Opa Heinz */
export const BROKE_WARN_DAYS = 14;

/** Tage am Stück im Minus (nach dem Kredit), 0 wenn das Konto nicht im Minus ist */
export function brokeDays(s: GameState): number {
  return s.brokeSince == null ? 0 : s.day - s.brokeSince;
}

/** Gibt es noch Aussicht, wieder ins Plus zu kommen? Eine legende Henne und kein Minus im letzten Monat. */
export function hasProspect(s: GameState): boolean {
  const layer = living(s).some(a => a.sex === 'henne' && stage(s, a) === 'erwachsen' && !isSenior(s, a));
  if (!layer || !s.finance) return false;
  const r = s.finance.results;
  const result = r.length ? r[r.length - 1] : monthResult(s.finance.cur);
  return result >= 0;
}

export function checkBroke(s: GameState) {
  if (s.money >= 0) {
    delete s.brokeSince;
    delete s.brokeWarned;
    return;
  }
  const d = diff(s);
  if (!s.loanUsed) {
    s.loanUsed = true;
    if (d.opaLoan) {
      addMoney(s, 200, 'kredit');
      s.debt += 200;
      log(s, '👴 Opa Heinz hilft aus: „Hier sind 200 €. Zahl sie zurück, wenn es wieder läuft.“ (zinslos)', 'info');
      s.celebrations.push({ emoji: '👴', title: 'Opa Heinz hilft aus', lines: ['„Dein Konto ist im Minus. Hier sind 200 €. Zahl sie zurück, wenn es wieder läuft.“', 'Der Kredit ist zinslos. Zurückzahlen kannst du unter „Mehr → Finanzen“.', 'Diese Hilfe gibt es nur einmal!'] });
    } else {
      addMoney(s, 300, 'kredit');
      s.debt += 330;
      log(s, '🏦 Die Bank gibt dir einen Kredit über 300 € (Rückzahlung 330 €).', 'info');
      s.celebrations.push({ emoji: '🏦', title: 'Bankkredit', lines: ['Dein Konto ist im Minus. Die Bank gibt dir einen Kredit über 300 €.', 'Zurückzuzahlen sind 330 €. Einen weiteren Kredit gibt es nicht.'] });
    }
    return;
  }
  // Kein Geld und keine Tiere: sofort Schluss
  if (living(s).length === 0) {
    endGame(s, 'leer');
    return;
  }
  s.brokeSince ??= s.day;
  const n = brokeDays(s);
  if (n >= BROKE_WARN_DAYS && !s.brokeWarned) {
    s.brokeWarned = true;
    const left = Math.max(0, d.brokeDays - n);
    s.celebrations.push({ emoji: '👴', title: 'Opa Heinz macht sich Sorgen', lines: [
      `„Dein Konto ist jetzt seit ${n} Tagen im Minus. So kann das nicht weitergehen.“`,
      `⏳ Kommst du in den nächsten ${left} Tagen nicht ins Plus und legen deine Hennen nicht genug, musst du den Hof aufgeben.`,
      '💡 Verkauf gesammelte Eier, überzählige Hähne und alte Hennen.',
      '💡 Kauf nur das Nötigste und spar dir Extras, bis es wieder läuft.',
      '💡 Unter „Mehr → Finanzen“ siehst du, wo das Geld bleibt.',
    ] });
    log(s, `👴 Opa Heinz warnt: Seit ${n} Tagen im Minus. In ${left} Tagen droht das Aus.`, 'bad', true);
  }
  if (n >= d.brokeDays && !hasProspect(s)) endGame(s, 'pleite');
}

function endGame(s: GameState, reason: 'pleite' | 'leer') {
  s.gameOver = true;
  s.gameOverReason = reason;
  log(s, reason === 'leer'
    ? '😢 Kein Geld und keine Tiere mehr. Der Hof muss aufgeben.'
    : '😢 Zu lange pleite und keine Aussicht auf Besserung. Der Hof muss aufgeben.', 'bad', true);
}
