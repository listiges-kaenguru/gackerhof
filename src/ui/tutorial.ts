// Tutorial-Pfeile: zeigen in den ersten Spieltagen direkt auf das Objekt, das als Nächstes dran ist.
// Jeder Schritt nennt mehrere Ziele (CSS-Selektoren); der Pfeil zeigt auf das erste, das gerade sichtbar ist.
import { eggCount, flock, has, living, outsideAnimals } from '../game/helpers';
import type { GameState } from '../game/types';

export interface TutorialStep {
  id: string;
  text: string;
  targets: string[];
}

/** Ziele für „im Shop diese Kategorie öffnen, dann das erste kaufbare Teil“ */
const shopTargets = (cat: string, scene: string) => [
  `.panel [data-act="shopcat:${cat}"]:not(.on)`,
  '.panel .item:not(.is-owned) [data-act^="buy:"]:not(:disabled)',
  `.scene [data-act="${scene}"] .fence-label`,
  `.scene [data-act="${scene}"]`,
  '[data-act="tab:shop"]',
];

export function tutorialStep(s: GameState): TutorialStep | null {
  if (s.tutorialOff || s.chapter > 1 || s.gameOver) return null;
  // Nach dem ersten Eierverkauf begleiten die Pfeile nur noch die Klappe in den ersten Tagen
  const basics = s.stats.eggsSold === 0;
  if (!basics && s.day > 5) return null;
  const stock = (s.inventory.koerner ?? 0) + (s.inventory.legemehl ?? 0);
  const f = flock(s);

  if (basics) {
    if (!s.equip.fence) return { id: 'zaun', text: 'Zuerst ein Zaun: Er hält die Hühner im Auslauf.', targets: shopTargets('gehege', 'open:shop:gehege') };
    if (!s.equip.coop) return { id: 'stall', text: 'Jetzt einen Stall: Hier schlafen die Hühner und legen ihre Eier.', targets: shopTargets('stall', 'open:shop:stall') };
    if (!s.equip.drinker) return { id: 'traenke', text: 'Hühner brauchen Wasser: Stell eine Tränke auf.', targets: shopTargets('wasser', 'open:shop:wasser') };
    if (!s.equip.feeder) return { id: 'futterstelle', text: 'Noch eine Futterstelle, dann ist der Hof bereit.', targets: shopTargets('futter', 'open:shop:futter') };
    if (s.water < 0.05) return { id: 'wasser', text: 'Die Tränke ist leer: Antippen füllt sie auf.', targets: ['.scene [data-act="water"]', '.quickbar [data-act="water"]'] };
    if (stock <= 0 && s.feed <= 0.05) {
      return { id: 'futterkauf', text: 'Futter kaufen: Körnerfutter gibt es unter „Futter & Medizin“.', targets: [
        '.panel [data-act="shopcat:verbrauch"]:not(.on)', '.panel [data-act="supply:koerner:1"]:not(:disabled)', '[data-act="tab:shop"]',
      ] };
    }
    if (s.feed <= 0.05 && stock > 0) return { id: 'futter', text: 'Futter einfüllen: Tippe auf die Futterstelle.', targets: ['.scene [data-act="feed"]', '.quickbar [data-act="feed"]'] };
    if (!living(s).length) {
      return { id: 'huehner', text: 'Alles bereit! Kauf auf dem Geflügelmarkt ein paar Junghennen.', targets: [
        '.panel [data-act="mtab:kaufen"]:not(.on)', '.panel .offer-buy [data-act^="offer:"]:not(:disabled)', '[data-act="tab:markt"]',
      ] };
    }
  }
  // Klappe: abends zu, wenn alle drin sind; morgens wieder auf
  if (f.length && s.equip.coop && !has(s, 'autoklappe')) {
    if (s.doorOpen && (s.hour >= 21 || s.hour < 5) && !outsideAnimals(s).length) {
      return { id: 'klappe-zu', text: 'Alle Hühner sind im Stall. Jetzt die Klappe schließen, nachts kommt der Fuchs!', targets: ['.quickbar [data-act="door"]'] };
    }
    if (!s.doorOpen && s.hour >= 7 && s.hour < 18) {
      return { id: 'klappe-auf', text: 'Guten Morgen! Klappe auf, damit die Hühner in den Auslauf können.', targets: ['.quickbar [data-act="door"]'] };
    }
  }
  if (basics) {
    const nest = eggCount(s.nestEggs) + s.nestHatchEggs.length + s.blockedEggs;
    const stored = eggCount(s.eggs) + s.hatchEggs.length;
    if (nest && !stored) return { id: 'sammeln', text: 'Eier im Nest! Tippe drauf, um sie einzusammeln.', targets: ['.scene .eggs', '.quickbar [data-act="collect"]'] };
    if (stored) {
      return { id: 'verkaufen', text: 'Verkauf deine ersten Eier auf dem Markt.', targets: [
        '.panel [data-act="mtab:verkaufen"]:not(.on)', '.panel [data-act="sellEggs"]:not(:disabled)', '[data-act="tab:markt"]',
      ] };
    }
  }
  return null;
}
